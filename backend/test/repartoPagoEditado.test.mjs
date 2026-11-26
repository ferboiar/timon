// F-62 (#200): al editar fecha e importe de un pago pendiente en la misma petición, el pago editado no puede entrar en
// su propio reparto ni en el ajuste residual final. La prueba no fija a mano los importes repartidos: para cada
// escenario siembra dos anticipos idénticos, edita el de referencia conservando la fecha original (caso equivalente sin
// cambio de fecha) y usa el resultado real del algoritmo como referencia. El anticipo de prueba aplica importe y fecha
// nueva en una sola petición y debe producir el mismo reparto, conservando en el pago editado el importe pedido.
//
// Solo cubre la regresión de F-62; las invariantes generales de suma y redondeo son de F-58 (#116).
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_f62_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);
if (dbName === 'conta_hogar') throw new Error('La base de pruebas nunca puede ser conta_hogar');

const PROPIETARIO = 62;

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

let servidor;
let origen;
let token;
let db;
let cerrarPool;
let config;

async function ejecutarMigracion(conexionDestino, sql) {
    if (!/^\s*DELIMITER\s/im.test(sql)) {
        await conexionDestino.query(sql);
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
            await conexionDestino.query(sentencia.slice(0, sentencia.length - delimitador.length));
        }
    }
}

/** Crea la base dedicada comprobando el destino: solo nombres que acaban en `_test`. */
async function crearBase() {
    assert.match(dbName, /_test$/, 'la base debe terminar en _test');
    assert.notEqual(dbName, 'conta_hogar');

    const admin = await mysql.createConnection(conexion);
    try {
        await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(dbName));
        await admin.query('CREATE DATABASE ' + mysql.escapeId(dbName) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci');
    } finally {
        await admin.end();
    }
}

before(async () => {
    await crearBase();

    db = await mysql.createConnection({ ...conexion, database: dbName });
    const migraciones = (await readdir(new URL('../src/db/migrations/', import.meta.url))).filter((f) => f.endsWith('.sql')).sort();
    for (const fichero of migraciones) {
        await ejecutarMigracion(db, await readFile(new URL(`../src/db/migrations/${fichero}`, import.meta.url), 'utf8'));
    }

    await db.execute(`INSERT INTO users (id, username, email, password, rol) VALUES (?, 'f62_user', 'f62_user@example.test', 'x', 'user')`, [PROPIETARIO]);
    await db.execute(`INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (?, 'Cuenta F62', 'corriente', 'ES0000000000000000000062', ?)`, [PROPIETARIO, PROPIETARIO]);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName,
        JWT_SECRET: process.env.JWT_SECRET || 'secreto-f62-reparto',
        JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1h'
    });

    ({ config } = await import('../src/config/env.mjs'));
    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    const { default: routerAnticipos } = await import('../src/routes/anticipos.mjs');

    const app = express();
    app.use(express.json());
    app.use('/api/anticipos', routerAnticipos);

    await new Promise((resolver) => {
        servidor = app.listen(0, resolver);
    });

    origen = 'http://127.0.0.1:' + servidor.address().port;
    token = jwt.sign({ id: PROPIETARIO, username: 'f62_user', rol: 'user', ver: 0 }, config.jwt.secret, { expiresIn: '1h' });
});

after(async () => {
    if (servidor) servidor.close();
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();
    const admin = await mysql.createConnection(conexion);
    try {
        if (/_test$/.test(dbName) && dbName !== 'conta_hogar') await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(dbName));
    } finally {
        await admin.end();
    }
});

/** Fecha como texto YYYY-MM-DD (mysql2 devuelve Date para las columnas DATE). */
function textoFecha(valor) {
    return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor ?? '').slice(0, 10);
}

async function postRuta(ruta, cuerpo) {
    const respuesta = await fetch(origen + ruta, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
    });
    return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

/** Siembra un anticipo con sus pagos pendientes y devuelve los ids en orden de inserción. */
async function crearAnticipo({ concepto, importeOriginal, pagoSugerido = null, pagos }) {
    const [anticipo] = await db.execute(
        "INSERT INTO anticipos (concepto, importe_original, pago_sugerido, fecha_inicio, estado, cuenta_origen_id, periodicidad, propietario_id) VALUES (?, ?, ?, '2026-01-01', 'activo', ?, NULL, ?)",
        [concepto, importeOriginal, pagoSugerido, PROPIETARIO, PROPIETARIO]
    );

    const pagoIds = [];
    for (const [importe, fecha] of pagos) {
        const [pago] = await db.execute("INSERT INTO anticipos_pagos (anticipo_id, importe, fecha, tipo, estado, cuenta_destino_id) VALUES (?, ?, ?, 'regular', 'pendiente', ?)", [
            anticipo.insertId,
            importe,
            fecha,
            PROPIETARIO
        ]);
        pagoIds.push(Number(pago.insertId));
    }

    return { anticipoId: Number(anticipo.insertId), pagoIds };
}

async function leerPagos(anticipoId) {
    const [filas] = await db.execute('SELECT id, importe, fecha, estado, modificado_por FROM anticipos_pagos WHERE anticipo_id = ? ORDER BY id', [anticipoId]);
    return filas;
}

async function editarPago({ pagoId, anticipoId, importe, fecha, estado = 'pendiente' }) {
    const respuesta = await postRuta('/api/anticipos/pagos', { id: pagoId, anticipo_id: anticipoId, importe, fecha, tipo: 'regular', estado, cuenta_destino_id: PROPIETARIO });
    assert.equal(respuesta.estado, 201, JSON.stringify(respuesta.cuerpo));
}

/**
 * Compara el reparto de F-62 con el caso equivalente sin cambio de fecha. La referencia se edita con la fecha original
 * del pago y su resultado real (leído de la base) es el valor esperado; el anticipo de prueba cambia importe y fecha
 * en una sola petición y debe producir el mismo reparto conservando el importe pedido en el pago editado.
 */
async function compararConReferencia({ concepto, importeOriginal, pagoSugerido = null, pagos, indiceEditado = 0, importePedido, fechaNueva, estado = 'pendiente' }) {
    const referencia = await crearAnticipo({ concepto: concepto + ' ref', importeOriginal, pagoSugerido, pagos });
    const prueba = await crearAnticipo({ concepto: concepto + ' f62', importeOriginal, pagoSugerido, pagos });

    await editarPago({ pagoId: referencia.pagoIds[indiceEditado], anticipoId: referencia.anticipoId, importe: importePedido, fecha: pagos[indiceEditado][1], estado });
    await editarPago({ pagoId: prueba.pagoIds[indiceEditado], anticipoId: prueba.anticipoId, importe: importePedido, fecha: fechaNueva, estado });

    const pagosReferencia = await leerPagos(referencia.anticipoId);
    const pagosPrueba = await leerPagos(prueba.anticipoId);
    assert.equal(pagosPrueba.length, pagosReferencia.length, 'el número de pagos no cambia');

    for (let i = 0; i < pagosReferencia.length; i++) {
        if (i === indiceEditado) continue;
        assert.equal(Number(pagosPrueba[i].importe), Number(pagosReferencia[i].importe), `la cuota ${i + 1} difiere de la referencia sin cambio de fecha`);
        assert.equal(textoFecha(pagosPrueba[i].fecha), textoFecha(pagosReferencia[i].fecha));
        assert.equal(pagosPrueba[i].modificado_por, pagosReferencia[i].modificado_por, `la autoría derivada de la cuota ${i + 1} difiere de la referencia`);
    }

    const editadoReferencia = pagosReferencia[indiceEditado];
    const editadoPrueba = pagosPrueba[indiceEditado];
    assert.equal(Number(editadoPrueba.importe), importePedido, 'el pago editado conserva el importe pedido');
    assert.equal(textoFecha(editadoPrueba.fecha), fechaNueva, 'el pago editado conserva la fecha pedida');
    assert.equal(Number(editadoPrueba.modificado_por), PROPIETARIO, 'el pago editado conserva el autor de la edición');
    assert.equal(Number(editadoPrueba.importe), Number(editadoReferencia.importe), 'el pago editado coincide con la referencia sin cambio de fecha');
    assert.equal(editadoPrueba.estado, estado);

    return { pagosReferencia, pagosPrueba };
}

test('un único pago pendiente conserva el importe pedido al cambiar fecha e importe a la vez', async () => {
    await compararConReferencia({
        concepto: 'f62 unico',
        importeOriginal: 100,
        pagos: [[10, '2026-02-01']],
        importePedido: 12,
        fechaNueva: '2026-02-05'
    });
});

test('con varios pendientes, el pago editado no entra en el reparto al retrasar la fecha', async () => {
    await compararConReferencia({
        concepto: 'f62 varios',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [10, '2026-03-01'], [10, '2026-04-01']],
        importePedido: 15,
        fechaNueva: '2026-02-15'
    });
});

test('el pago editado tampoco entra al quedar como la cuota más tardía', async () => {
    await compararConReferencia({
        concepto: 'f62 ultima fecha',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [10, '2026-03-01'], [10, '2026-04-01']],
        importePedido: 15,
        fechaNueva: '2026-05-01'
    });
});

test('el ajuste residual final no devuelve otro importe al pago editado', async () => {
    await compararConReferencia({
        concepto: 'f62 residuo',
        importeOriginal: 10,
        pagoSugerido: 3,
        pagos: [[4, '2026-02-01'], [3, '2026-03-01'], [3, '2026-04-01']],
        importePedido: 12,
        fechaNueva: '2026-05-01'
    });
});

test('control DC-40: pasar a pagado con fecha e importe nuevos reparte solo entre los demás pendientes', async () => {
    await compararConReferencia({
        concepto: 'f62 pagado',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [10, '2026-03-01'], [10, '2026-04-01']],
        importePedido: 15,
        fechaNueva: '2026-02-15',
        estado: 'pagado'
    });
});
