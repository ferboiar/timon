// S-03: rutas de la configuración de la conexión (regresión de S-02/S-03).
// S-04a: el token lleva `ver` y verifyAdmin carga el usuario vigente; la prueba usa
// una base *_test y un fichero de configuración temporal (DB_CONFIG_PATH).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { after, before, describe, test } from 'node:test';

import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_s04_rutas_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

const configPath = '/tmp/timon-s04-rutas-' + process.pid + '.env';

let servidor;
let origen;
let token;
let db;
let cerrarPool;
let config;
let getDbConfig;
let router;

before(async () => {
    const admin = await mysql.createConnection(conexion);
    await admin.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(dbName)}`);
    await admin.query(`CREATE DATABASE ${mysql.escapeId(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci`);
    await admin.end();

    db = await mysql.createConnection({ ...conexion, database: dbName });
    for (const fichero of ['0001_baseline.sql', '0008_sesion_revocable.sql']) {
        await db.query(await readFile(new URL(`../src/db/migrations/${fichero}`, import.meta.url), 'utf8'));
    }
    await db.query(`INSERT INTO users (id, username, email, password, rol) VALUES (1, 'prueba', 'prueba@example.test', 'x', 'admin')`);

    fs.writeFileSync(configPath, `DB_HOST=${conexion.host}\nDB_PORT=${conexion.port}\nDB_USER=${conexion.user}\nDB_PASSWORD=${conexion.password}\nDB_DATABASE=${dbName}\n`, { mode: 0o600 });

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName,
        DB_CONFIG_PATH: configPath,
        JWT_SECRET: process.env.JWT_SECRET || 'secreto-s04-rutas',
        JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1h'
    });

    ({ default: router } = await import('../src/routes/conexionDB.mjs'));
    ({ config } = await import('../src/config/env.mjs'));
    ({ getDbConfig } = await import('../src/db/db_utilsConn.mjs'));
    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));

    const app = express();
    app.use(express.json());
    app.use('/api/db-config', router);

    await new Promise((resolver) => {
        servidor = app.listen(0, resolver);
    });

    origen = 'http://127.0.0.1:' + servidor.address().port;
    token = jwt.sign({ id: 1, username: 'prueba', rol: 'admin', ver: 0 }, config.jwt.secret, { expiresIn: '1h' });
});

after(async () => {
    if (servidor) servidor.close();
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();

    const admin = await mysql.createConnection(conexion);
    await admin.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(dbName)}`);
    await admin.end();

    try {
        fs.unlinkSync(configPath);
    } catch {
        // El temporal puede no existir si el before falló antes de crearlo.
    }
});

/** Petición con el token de administrador. */
async function peticion(ruta, metodo, cuerpo) {
    const opciones = { method: metodo, headers: { Authorization: 'Bearer ' + token } };

    if (cuerpo) {
        opciones.headers['Content-Type'] = 'application/json';
        opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(origen + ruta, opciones);

    return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

const CAMPOS = {
    DB_HOST: 'servidor',
    DB_PORT: '3306',
    DB_USER: 'usuario',
    DB_DATABASE: 'base'
};

describe('S-03: rutas de configuración de la conexión', () => {
    test('GET /api/db-config/password ya no existe', async () => {
        const respuesta = await peticion('/api/db-config/password', 'GET');

        assert.equal(respuesta.estado, 404);
    });

    test('PUT con los campos obligatorios vacíos responde 400', async () => {
        const respuesta = await peticion('/api/db-config', 'PUT', { DB_HOST: ' ', DB_PORT: '', DB_USER: '', DB_DATABASE: '' });

        assert.equal(respuesta.estado, 400);
        assert.equal(respuesta.cuerpo.codigo, 'CAMPOS_OBLIGATORIOS');
    });

    test('PUT con el puerto fuera de rango responde 400', async () => {
        const respuesta = await peticion('/api/db-config', 'PUT', { ...CAMPOS, DB_PORT: '70000' });

        assert.equal(respuesta.estado, 400);
        assert.equal(respuesta.cuerpo.codigo, 'PUERTO_NO_VALIDO');
    });

    test('PUT con una clave no admitida responde 400', async () => {
        const respuesta = await peticion('/api/db-config', 'PUT', { ...CAMPOS, CLAVE_INVENTADA: 'x' });

        assert.equal(respuesta.estado, 400);
        assert.equal(respuesta.cuerpo.codigo, 'CLAVES_NO_ADMITIDAS');
    });
});

describe('S-02: la prueba de conexión usa la contraseña guardada', () => {
    test('POST /api/db-config/test con la contraseña vacía conecta con la guardada', async (contexto) => {
        const { config: guardada } = await getDbConfig();

        if (!guardada.DB_HOST) {
            contexto.skip('la configuración no tiene host');
            return;
        }

        const respuesta = await peticion('/api/db-config/test', 'POST', {
            DB_HOST: guardada.DB_HOST,
            DB_PORT: guardada.DB_PORT,
            DB_USER: guardada.DB_USER,
            DB_DATABASE: guardada.DB_DATABASE,
            DB_PASSWORD: ''
        });

        assert.equal(respuesta.estado, 200, 'la contraseña guardada debe usarse cuando el campo va vacío');
    });
});
