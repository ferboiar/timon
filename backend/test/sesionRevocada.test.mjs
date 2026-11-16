// S-04a (DC-62): revocación de JWT, versión de token y rol vigente.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_s04_sesion_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

let db;
let cerrarPool;
let sesion;
let dbUsers;
let auth;

async function ejecutarMigracion(conexion, sql) {
    if (!/^\s*DELIMITER\s/im.test(sql)) {
        await conexion.query(sql);
        return;
    }

    let delimitador = ';';
    let acumulado = [];
    for (const linea of sql.split('\n')) {
        const texto = linea.replace(/\r$/, '');
        const cambio = texto.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
        if (cambio) {
            delimitador = cambio[1];
            continue;
        }
        if (texto.trim() === '' || texto.trim().startsWith('--')) continue;
        acumulado.push(texto);
        if (texto.trimEnd().endsWith(delimitador)) {
            const sentencia = acumulado.join('\n').trimEnd();
            acumulado = [];
            await conexion.query(sentencia.slice(0, sentencia.length - delimitador.length));
        }
    }
}

function peticion(token) {
    return { headers: { authorization: `Bearer ${token}` } };
}

function respuestaFalsa() {
    return {
        codigo: null,
        cuerpo: null,
        status(codigo) {
            this.codigo = codigo;
            return this;
        },
        json(cuerpo) {
            this.cuerpo = cuerpo;
            return this;
        }
    };
}

before(async () => {
    const admin = await mysql.createConnection(conexion);
    await admin.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(dbName)}`);
    await admin.query(`CREATE DATABASE ${mysql.escapeId(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci`);
    await admin.end();

    db = await mysql.createConnection({ ...conexion, database: dbName });
    const migraciones = (await readdir(new URL('../src/db/migrations/', import.meta.url))).filter((f) => f.endsWith('.sql')).sort();
    for (const fichero of migraciones) {
        await ejecutarMigracion(db, await readFile(new URL(`../src/db/migrations/${fichero}`, import.meta.url), 'utf8'));
    }

    await db.query(`
        INSERT INTO users (id, username, email, password, rol) VALUES
        (10, 'admin_s04', 'admin_s04@example.test', 'x', 'admin'),
        (11, 'user_s04', 'user_s04@example.test', 'x', 'user'),
        (12, 'borrado_s04', 'borrado_s04@example.test', 'x', 'user')
    `);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName,
        JWT_SECRET: process.env.JWT_SECRET || 'secreto-s04-test',
        JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1h'
    });

    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    sesion = await import('../src/utils/sesion.mjs');
    dbUsers = await import('../src/db/db_utilsUsers.mjs');
    auth = await import('../src/middleware/auth.mjs');
});

after(async () => {
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();

    const admin = await mysql.createConnection(conexion);
    await admin.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(dbName)}`);
    await admin.end();
});

test('el token nuevo lleva la versión y la sesión vigente se acepta', async () => {
    const token = sesion.firmarToken({ id: 10, username: 'admin_s04', email: 'admin_s04@example.test', rol: 'admin', token_version: 0 });
    const usuario = await sesion.autenticarSesion(peticion(token));

    assert.equal(usuario.id, 10);
    assert.equal(usuario.rol, 'admin');
    assert.equal(usuario.token_version, 0);
});

test('revocar la sesión invalida el token antes de su caducidad', async () => {
    const token = sesion.firmarToken({ id: 10, username: 'admin_s04', email: 'admin_s04@example.test', rol: 'admin', token_version: 0 });
    const version = await dbUsers.revocarSesiones(10);

    assert.equal(version, 1);
    await assert.rejects(
        () => sesion.autenticarSesion(peticion(token)),
        (error) => error instanceof sesion.ErrorDeSesion && error.status === 401 && error.message === 'Token inválido o expirado'
    );
});

test('un token sin ver se rechaza (tokens anteriores al despliegue)', async () => {
    const { config } = await import('../src/config/env.mjs');
    const token = jwt.sign({ id: 10, username: 'admin_s04', email: 'admin_s04@example.test', rol: 'admin' }, config.jwt.secret, { expiresIn: '1h' });

    await assert.rejects(
        () => sesion.autenticarSesion(peticion(token)),
        (error) => error instanceof sesion.ErrorDeSesion
    );
});

test('el rol vigente es el de la base, no el del token', async () => {
    const token = sesion.firmarToken({ id: 11, username: 'user_s04', email: 'user_s04@example.test', rol: 'admin', token_version: 0 });
    const res = respuestaFalsa();
    let siguiente = false;

    await auth.crearVerifyAdmin()(peticion(token), res, () => {
        siguiente = true;
    });

    assert.equal(res.codigo, 403);
    assert.equal(siguiente, false);
});

test('un token de un usuario eliminado responde 401', async () => {
    const token = sesion.firmarToken({ id: 12, username: 'borrado_s04', email: 'borrado_s04@example.test', rol: 'user', token_version: 0 });
    await db.query('DELETE FROM users WHERE id = 12');

    await assert.rejects(
        () => sesion.autenticarSesion(peticion(token)),
        (error) => error instanceof sesion.ErrorDeSesion
    );
});
