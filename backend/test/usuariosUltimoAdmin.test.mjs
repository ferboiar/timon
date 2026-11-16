// S-04c (DC-62/DC-39): la guarda de último administrador es transaccional.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_s04_admin_test';
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
let dbUsers;

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

function exigeUltimoAdmin(error) {
    assert.equal(error.name, 'ErrorDeNegocio');
    assert.equal(error.status, 409);
    assert.equal(error.codigo, 'ULTIMO_ADMIN');
    return true;
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
        (20, 'admin_unico', 'admin_unico@example.test', 'x', 'admin'),
        (21, 'usuario_normal', 'usuario_normal@example.test', 'x', 'user')
    `);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName
    });

    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    dbUsers = await import('../src/db/db_utilsUsers.mjs');
});

after(async () => {
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();

    const admin = await mysql.createConnection(conexion);
    await admin.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(dbName)}`);
    await admin.end();
});

test('borrar el último administrador responde 409 y no borra', async () => {
    await assert.rejects(() => dbUsers.deleteUsers([20]), exigeUltimoAdmin);

    const [filas] = await db.query('SELECT id, rol FROM users WHERE id = 20');
    assert.equal(filas.length, 1);
    assert.equal(filas[0].rol, 'admin');
});

test('degradar el último administrador responde 409 y no cambia el rol', async () => {
    await assert.rejects(() => dbUsers.updateUser(20, { username: 'admin_unico', email: 'admin_unico@example.test', rol: 'user' }), exigeUltimoAdmin);

    const [[fila]] = await db.query('SELECT rol FROM users WHERE id = 20');
    assert.equal(fila.rol, 'admin');
});

test('con dos administradores se puede borrar uno', async () => {
    await db.query(`INSERT INTO users (id, username, email, password, rol) VALUES (22, 'admin_segundo', 'admin_segundo@example.test', 'x', 'admin')`);

    assert.equal(await dbUsers.deleteUsers([20]), true);
    const [filas] = await db.query('SELECT id FROM users WHERE id IN (20, 22)');
    assert.deepEqual(
        filas.map((f) => f.id),
        [22]
    );
});

test('con dos administradores se puede degradar uno', async () => {
    await db.query(`INSERT INTO users (id, username, email, password, rol) VALUES (23, 'admin_tercero', 'admin_tercero@example.test', 'x', 'admin')`);

    const actualizado = await dbUsers.updateUser(22, { username: 'admin_segundo', email: 'admin_segundo@example.test', rol: 'user' });
    assert.equal(actualizado.rol, 'user');
    assert.equal(actualizado.token_version, undefined);
});

test('un borrado en lote que dejaría cero administradores se revierte', async () => {
    await db.query(`INSERT INTO users (id, username, email, password, rol) VALUES (30, 'admin_lote_a', 'admin_lote_a@example.test', 'x', 'admin'), (31, 'admin_lote_b', 'admin_lote_b@example.test', 'x', 'admin')`);

    await assert.rejects(() => dbUsers.deleteUsers([23, 30, 31]), exigeUltimoAdmin);

    const [filas] = await db.query('SELECT id FROM users WHERE id IN (23, 30, 31) ORDER BY id');
    assert.deepEqual(
        filas.map((f) => f.id),
        [23, 30, 31]
    );
});
