// F-59: los caminos «usuario inexistente» y «contraseña incorrecta» de verifyCredentials
// deben pasar por bcrypt, para que el tiempo de respuesta no revele qué nombres existen.
// Prueba de integración: base *_test propia y espía sobre bcrypt.compare.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, beforeEach, mock, test } from 'node:test';

import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_f59_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

const CLAVE = 'Clave-de-prueba-f59-123';
let db;
let cerrarPool;
let verifyCredentials;

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

    const hash = await bcrypt.hash(CLAVE, 10);
    await db.query('INSERT INTO users (id, username, email, password, rol) VALUES (?, ?, ?, ?, ?)', [50, 'f59_existe', 'f59_existe@example.test', hash, 'user']);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName
    });

    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    ({ verifyCredentials } = await import('../src/db/db_utilsUsers.mjs'));
});

after(async () => {
    mock.restoreAll();
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();
    const admin = await mysql.createConnection(conexion);
    await admin.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(dbName)}`);
    await admin.end();
});

beforeEach(() => {
    mock.restoreAll();
});

/** Espía bcrypt.compare conservando la comparación real; registra los hashes comparados. */
function espiarCompare() {
    const real = bcrypt.compare.bind(bcrypt);
    const hashes = [];
    const espia = mock.method(bcrypt, 'compare', async (dato, hash) => {
        hashes.push(hash);
        return real(dato, hash);
    });
    return { espia, hashes };
}

test('el camino «usuario inexistente» ejecuta bcrypt una vez y devuelve null', async () => {
    const { espia, hashes } = espiarCompare();
    const resultado = await verifyCredentials('f59_no_existe', 'cualquiera');
    assert.equal(resultado, null);
    assert.equal(espia.mock.callCount(), 1, 'bcrypt.compare debe ejecutarse una vez aunque el usuario no exista');
    assert.equal(bcrypt.getRounds(hashes[0]), 10, 'el hash ficticio debe tener coste 10, igual que los reales');
});

test('el camino «contraseña incorrecta» también ejecuta bcrypt una vez', async () => {
    const { espia, hashes } = espiarCompare();
    const resultado = await verifyCredentials('f59_existe', CLAVE + '-mal');
    assert.equal(resultado, null);
    assert.equal(espia.mock.callCount(), 1, 'bcrypt.compare debe ejecutarse en el camino de contraseña incorrecta');
    assert.equal(bcrypt.getRounds(hashes[0]), 10);
});

test('las credenciales correctas devuelven el usuario sin contraseña y pasan por bcrypt', async () => {
    const { espia } = espiarCompare();
    const usuario = await verifyCredentials('f59_existe', CLAVE);
    assert.ok(usuario);
    assert.equal(usuario.username, 'f59_existe');
    assert.equal(usuario.password, undefined);
    assert.equal(espia.mock.callCount(), 1);
});
