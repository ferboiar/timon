// S-20: POST /api/recibos ignora `permitirFueraDeAnio` cuando quien guarda no es administrador
// (DC-29/DC-14). Monta la ruta real en un Express propio y la ataca por HTTP con JWT real.
// Negativa: usuario no admin con `permitirFueraDeAnio: true` recibe 400 de DC-14.
// Control: un administrador con el mismo cuerpo recibe 201.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_s20_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

let servidor;
let origen;
let tokenAdmin;
let tokenUsuario;
let db;
let cerrarPool;
let config;

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

    await db.query(`INSERT INTO users (id, username, email, password, rol, perm_recibos) VALUES
        (1, 's20_admin', 's20_admin@example.test', 'x', 'admin', 'escritura'),
        (20, 's20_user', 's20_user@example.test', 'x', 'user', 'escritura')`);
    await db.query(`INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (1, 'Cuenta S20', 'corriente', 'ES0000000000000000000020', 1)`);
    await db.query(`INSERT INTO categorias (id, nombre, descripcion, propietario_id) VALUES (1, 'General', NULL, 1)`);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName,
        JWT_SECRET: process.env.JWT_SECRET || 'secreto-s20-recibos',
        JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1h'
    });

    ({ config } = await import('../src/config/env.mjs'));
    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    const { default: router } = await import('../src/routes/recibos.mjs');

    const app = express();
    app.use(express.json());
    app.use('/api/recibos', router);

    await new Promise((resolver) => {
        servidor = app.listen(0, resolver);
    });

    origen = 'http://127.0.0.1:' + servidor.address().port;
    tokenAdmin = jwt.sign({ id: 1, username: 's20_admin', rol: 'admin', ver: 0 }, config.jwt.secret, { expiresIn: '1h' });
    tokenUsuario = jwt.sign({ id: 20, username: 's20_user', rol: 'user', ver: 0 }, config.jwt.secret, { expiresIn: '1h' });
});

after(async () => {
    if (servidor) servidor.close();
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();
    const admin = await mysql.createConnection(conexion);
    await admin.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(dbName)}`);
    await admin.end();
});

/** Cuerpo manual con dos fechas de años distintos (2026 y 2027). */
function cuerpoFueraDeAnio() {
    return {
        concepto: 'S20 fuera de año',
        periodicidad: 'bimestral',
        importe: 35,
        categoria: 'General',
        cuenta_id: 1,
        modoFechas: 'manual',
        cargo: [
            { fecha: '2026-11-07', estado: 'pendiente', comentario: '', activo: 1 },
            { fecha: '2027-01-07', estado: 'pendiente', comentario: '', activo: 1 }
        ],
        permitirFueraDeAnio: true
    };
}

async function postRecibo(token, cuerpo) {
    const respuesta = await fetch(origen + '/api/recibos', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
    });
    return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

test('un usuario no administrador con permitirFueraDeAnio: true recibe 400 de DC-14', async () => {
    const respuesta = await postRecibo(tokenUsuario, cuerpoFueraDeAnio());
    assert.equal(respuesta.estado, 400, 'el rol no admin no debe poder saltarse la regla del año');
    assert.match(respuesta.cuerpo.error, /deben ser del año 2026/);
});

test('control: un administrador con permitirFueraDeAnio: true recibe 201', async () => {
    const respuesta = await postRecibo(tokenAdmin, cuerpoFueraDeAnio());
    assert.equal(respuesta.estado, 201, 'el administrador sí puede saltarse la regla del año (DC-29)');
    assert.match(respuesta.cuerpo.message, /Recibo insertado o actualizado correctamente/);
});
