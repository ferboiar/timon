// S-26 (#194): la capa de base de datos de Anticipos y Ahorros no actúa sobre una fila hija que no pertenece al
// padre recibido. Prueba de integración sobre una base *_test creada de cero con todas las migraciones: llama a las
// funciones reales (db_utilsAdv/db_utilsSav) y monta las rutas POST reales de pagos y movimientos con JWT válido.
//
// - Cruces padre-hijo rechazados con 400 PADRE_INCORRECTO sin escribir nada, ni en la fila ajena ni en la propia.
// - Operaciones válidas sobre el padre correcto (edición, sustitución y borrado de pago, borrado de movimiento) que
//   solo alcanzan a la fila indicada.
// - Borrado por lista de identificadores validados (deleteAdvances/deleteSavings) y rechazo de listas inválidas.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_s26_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);
if (dbName === 'conta_hogar') throw new Error('La base de pruebas nunca puede ser conta_hogar');

const PROPIETARIO = 26;

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
const funciones = {};

let anticipoA;
let anticipoB;
let anticipoC;
let anticipoD;
let pagoA;
let pagoB;
let pagoC;
let pagoD;
let pagoSustituto;
let ahorroA;
let ahorroB;
let ahorroC;
let ahorroD;
let movA;
let movB;
let movC;
let movD;

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

    await db.execute(`INSERT INTO users (id, username, email, password, rol) VALUES (?, 's26_user', 's26_user@example.test', 'x', 'user')`, [PROPIETARIO]);
    await db.execute(`INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (1, 'Cuenta S26', 'corriente', 'ES0000000000000000000026', ?)`, [PROPIETARIO]);

    const crearAnticipo = async (concepto, importe) => {
        const [r] = await db.execute("INSERT INTO anticipos (concepto, importe_original, pago_sugerido, fecha_inicio, estado, cuenta_origen_id, periodicidad, propietario_id) VALUES (?, ?, NULL, '2026-01-01', 'activo', 1, NULL, ?)", [concepto, importe, PROPIETARIO]);
        return Number(r.insertId);
    };
    const crearPago = async (anticipoId, importe) => {
        const [r] = await db.execute("INSERT INTO anticipos_pagos (anticipo_id, importe, fecha, tipo, estado, cuenta_destino_id) VALUES (?, ?, '2026-02-01', 'regular', 'pendiente', 1)", [anticipoId, importe]);
        return Number(r.insertId);
    };
    const crearAhorro = async (concepto, ahorrado) => {
        const [r] = await db.execute('INSERT INTO ahorros (concepto, ahorrado, activo, propietario_id) VALUES (?, ?, 1, ?)', [concepto, ahorrado, PROPIETARIO]);
        return Number(r.insertId);
    };
    const crearMovimiento = async (ahorroId, importe) => {
        const [r] = await db.execute("INSERT INTO ahorros_movimientos (ahorro_id, importe, fecha, tipo) VALUES (?, ?, '2026-02-01', 'regular')", [ahorroId, importe]);
        return Number(r.insertId);
    };

    anticipoA = await crearAnticipo('s26 anticipo a', 10);
    anticipoB = await crearAnticipo('s26 anticipo b', 20);
    anticipoC = await crearAnticipo('s26 anticipo c', 30);
    anticipoD = await crearAnticipo('s26 anticipo d', 40);
    pagoA = await crearPago(anticipoA, 10);
    pagoB = await crearPago(anticipoB, 20);
    pagoC = await crearPago(anticipoC, 30);
    pagoD = await crearPago(anticipoD, 40);

    ahorroA = await crearAhorro('s26 ahorro a', 10);
    ahorroB = await crearAhorro('s26 ahorro b', 20);
    ahorroC = await crearAhorro('s26 ahorro c', 30);
    ahorroD = await crearAhorro('s26 ahorro d', 40);
    movA = await crearMovimiento(ahorroA, 10);
    movB = await crearMovimiento(ahorroB, 20);
    movC = await crearMovimiento(ahorroC, 30);
    movD = await crearMovimiento(ahorroD, 40);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName,
        JWT_SECRET: process.env.JWT_SECRET || 'secreto-s26-subrecursos',
        JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1h'
    });

    ({ config } = await import('../src/config/env.mjs'));
    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    funciones.adv = await import('../src/db/db_utilsAdv.mjs');
    funciones.sav = await import('../src/db/db_utilsSav.mjs');
    const { default: routerAnticipos } = await import('../src/routes/anticipos.mjs');
    const { default: routerAhorros } = await import('../src/routes/ahorros.mjs');

    const app = express();
    app.use(express.json());
    app.use('/api/anticipos', routerAnticipos);
    app.use('/api/ahorros', routerAhorros);

    await new Promise((resolver) => {
        servidor = app.listen(0, resolver);
    });

    origen = 'http://127.0.0.1:' + servidor.address().port;
    token = jwt.sign({ id: PROPIETARIO, username: 's26_user', rol: 'user', ver: 0 }, config.jwt.secret, { expiresIn: '1h' });
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

/** Valida que el rechazo sea el error de negocio del padre incorrecto (S-26). */
function padreIncorrecto(error) {
    assert.equal(error.status, 400, error.message);
    assert.equal(error.codigo, 'PADRE_INCORRECTO');
    return true;
}

async function leerPago(id) {
    const [[fila]] = await db.execute('SELECT anticipo_id, importe, fecha, estado, modificado_por FROM anticipos_pagos WHERE id = ?', [id]);
    return fila ?? null;
}

async function leerAnticipo(id) {
    const [[fila]] = await db.execute('SELECT modificado_por FROM anticipos WHERE id = ?', [id]);
    return fila ?? null;
}

async function contarPagos(anticipoId) {
    const [[fila]] = await db.execute('SELECT COUNT(*) AS n FROM anticipos_pagos WHERE anticipo_id = ?', [anticipoId]);
    return Number(fila.n);
}

async function leerMovimiento(id) {
    const [[fila]] = await db.execute('SELECT ahorro_id, importe, fecha, descripcion, modificado_por FROM ahorros_movimientos WHERE id = ?', [id]);
    return fila ?? null;
}

async function leerAhorro(id) {
    const [[fila]] = await db.execute('SELECT ahorrado, modificado_por FROM ahorros WHERE id = ?', [id]);
    return fila ?? null;
}

async function contarMovimientos(ahorroId) {
    const [[fila]] = await db.execute('SELECT COUNT(*) AS n FROM ahorros_movimientos WHERE ahorro_id = ?', [ahorroId]);
    return Number(fila.n);
}

/** El pago de B sigue intacto y el anticipo A, que se indicó como padre, tampoco se ha tocado. */
async function assertPagoAjenoIntacto() {
    const ajeno = await leerPago(pagoB);
    assert.equal(ajeno.anticipo_id, anticipoB);
    assert.equal(Number(ajeno.importe), 20);
    assert.equal(textoFecha(ajeno.fecha), '2026-02-01');
    assert.equal(ajeno.estado, 'pendiente');
    assert.equal(ajeno.modificado_por, null);
    assert.equal(await contarPagos(anticipoB), 1);
    assert.equal((await leerAnticipo(anticipoA)).modificado_por, null);
    assert.equal((await leerAnticipo(anticipoB)).modificado_por, null);
}

/** El movimiento de B sigue intacto y el ahorro A, indicado como padre, tampoco se ha tocado. */
async function assertMovimientoAjenoIntacto() {
    const ajeno = await leerMovimiento(movB);
    assert.equal(ajeno.ahorro_id, ahorroB);
    assert.equal(Number(ajeno.importe), 20);
    assert.equal(textoFecha(ajeno.fecha), '2026-02-01');
    assert.equal(ajeno.modificado_por, null);
    assert.equal(Number((await leerAhorro(ahorroA)).ahorrado), 10);
    assert.equal((await leerAhorro(ahorroA)).modificado_por, null);
    assert.equal(Number((await leerAhorro(ahorroB)).ahorrado), 20);
    assert.equal(await contarMovimientos(ahorroB), 1);
}

test('pushPago rechaza con 400 el id de un pago de otro anticipo y no escribe nada', async () => {
    await assert.rejects(() => funciones.adv.pushPago(pagoB, anticipoA, 99, '2026-03-01', 'regular', 'cruce', 'pendiente', 1, PROPIETARIO), padreIncorrecto);
    await assertPagoAjenoIntacto();
});

test('POST /api/anticipos/pagos rechaza el cruce con 400 PADRE_INCORRECTO', async () => {
    const respuesta = await postRuta('/api/anticipos/pagos', { id: pagoB, anticipo_id: anticipoA, importe: 99, fecha: '2026-03-01', tipo: 'regular', estado: 'pendiente', cuenta_destino_id: 1 });

    assert.equal(respuesta.estado, 400, JSON.stringify(respuesta.cuerpo));
    assert.equal(respuesta.cuerpo.codigo, 'PADRE_INCORRECTO');
    await assertPagoAjenoIntacto();
});

test('POST /api/anticipos/pagos guarda la edición del pago en su propio anticipo', async () => {
    // Importe primero y fecha después: cambiar las dos cosas en la misma petición dispara el reparto de
    // recalculatePostEditPayments (el pago editado pasa a contar como posterior por su fecha nueva) y desvía el importe.
    const respuestaImporte = await postRuta('/api/anticipos/pagos', { id: pagoA, anticipo_id: anticipoA, importe: 12, fecha: '2026-02-01', tipo: 'regular', descripcion: 'editado en A', estado: 'pendiente', cuenta_destino_id: 1 });
    assert.equal(respuestaImporte.estado, 201, JSON.stringify(respuestaImporte.cuerpo));

    const respuestaFecha = await postRuta('/api/anticipos/pagos', { id: pagoA, anticipo_id: anticipoA, importe: 12, fecha: '2026-02-05', tipo: 'regular', descripcion: 'editado en A', estado: 'pendiente', cuenta_destino_id: 1 });
    assert.equal(respuestaFecha.estado, 201, JSON.stringify(respuestaFecha.cuerpo));

    const propio = await leerPago(pagoA);
    assert.equal(Number(propio.importe), 12);
    assert.equal(textoFecha(propio.fecha), '2026-02-05');
    assert.equal(Number(propio.modificado_por), PROPIETARIO);
    assert.equal(Number((await leerAnticipo(anticipoA)).modificado_por), PROPIETARIO);
    assert.equal(Number((await leerPago(pagoB)).importe), 20, 'el pago del otro anticipo no cambia');
    assert.equal((await leerAnticipo(anticipoB)).modificado_por, null);
});

test('pushMovimiento rechaza con 400 el id de un movimiento de otro ahorro y no escribe nada', async () => {
    await assert.rejects(() => funciones.sav.pushMovimiento(movB, ahorroA, 99, '2026-03-01', 'regular', 'cruce', PROPIETARIO), padreIncorrecto);
    await assertMovimientoAjenoIntacto();
});

test('POST /api/ahorros/movimientos rechaza el cruce con 400 PADRE_INCORRECTO', async () => {
    const respuesta = await postRuta('/api/ahorros/movimientos', { id: movB, ahorro_id: ahorroA, importe: 99, fecha: '2026-03-01', tipo: 'regular' });

    assert.equal(respuesta.estado, 400, JSON.stringify(respuesta.cuerpo));
    assert.equal(respuesta.cuerpo.codigo, 'PADRE_INCORRECTO');
    await assertMovimientoAjenoIntacto();
});

test('POST /api/ahorros/movimientos guarda la edición del movimiento en su propio ahorro', async () => {
    const respuesta = await postRuta('/api/ahorros/movimientos', { id: movA, ahorro_id: ahorroA, importe: 15, fecha: '2026-03-01', tipo: 'regular', descripcion: 'editado en A' });

    assert.equal(respuesta.estado, 201, JSON.stringify(respuesta.cuerpo));

    const propio = await leerMovimiento(movA);
    assert.equal(Number(propio.importe), 15);
    assert.equal(propio.descripcion, 'editado en A');
    assert.equal(Number(propio.modificado_por), PROPIETARIO);
    assert.equal(Number((await leerAhorro(ahorroA)).ahorrado), 15, 'solo se aplica la diferencia de importe');
    assert.equal(Number((await leerAhorro(ahorroA)).modificado_por), PROPIETARIO);
    assert.equal(Number((await leerAhorro(ahorroB)).ahorrado), 20);
    assert.equal((await leerAhorro(ahorroB)).modificado_por, null);
});

test('sustituirPago sustituye solo el pago indicado y no toca el otro anticipo', async () => {
    const resultado = await funciones.adv.sustituirPago(pagoA, { importe: 7, fecha: '2026-04-01', tipo: 'regular', descripcion: 'sustituto', cuenta_destino_id: 1 }, PROPIETARIO);

    assert.equal(resultado.anticipoId, anticipoA);
    assert.equal(await leerPago(pagoA), null, 'el pago antiguo se borra acotado a su anticipo');

    pagoSustituto = resultado.pagoNuevoId;
    const nuevo = await leerPago(pagoSustituto);
    assert.equal(nuevo.anticipo_id, anticipoA);
    assert.equal(Number(nuevo.importe), 7);
    assert.equal(Number(nuevo.modificado_por), PROPIETARIO);

    assert.equal(Number((await leerPago(pagoB)).importe), 20);
    assert.equal(await contarPagos(anticipoB), 1);
    assert.equal((await leerAnticipo(anticipoB)).modificado_por, null);
});

test('handlePaymentDeletion borra el pago indicado y deja intacto el de otro anticipo', async () => {
    const pagosDeAAntes = await contarPagos(anticipoA);
    const resultado = await funciones.adv.handlePaymentDeletion(pagoB, false, PROPIETARIO);

    assert.equal(resultado.anticipoId, anticipoB);
    assert.equal(await leerPago(pagoB), null);
    assert.equal(await contarPagos(anticipoB), 0);
    assert.equal(await contarPagos(anticipoA), pagosDeAAntes, 'los pagos del otro anticipo no se tocan');
    assert.equal(Number((await leerPago(pagoSustituto)).importe), 7);
    assert.equal(Number((await leerAnticipo(anticipoB)).modificado_por), PROPIETARIO);
});

test('deleteMovimiento borra solo el movimiento indicado y ajusta su propio ahorro', async () => {
    const ahorradoAAntes = Number((await leerAhorro(ahorroA)).ahorrado);

    await funciones.sav.deleteMovimiento(movB, PROPIETARIO);

    assert.equal(await leerMovimiento(movB), null);
    assert.equal(Number((await leerAhorro(ahorroB)).ahorrado), 0, 'el ahorro B resta su propio movimiento');
    assert.equal(Number((await leerAhorro(ahorroA)).ahorrado), ahorradoAAntes, 'el ahorro A no se toca');
    assert.equal(await contarMovimientos(ahorroA), 1);
    assert.equal(Number((await leerMovimiento(movA)).importe), 15);
});

test('deleteAdvances borra por la lista validada y no alcanza a otro anticipo', async () => {
    const borrados = await funciones.adv.deleteAdvances([anticipoC, 999999]);

    assert.equal(borrados, 1, 'solo existe uno de los identificadores de la lista');
    const [[fuera]] = await db.execute('SELECT COUNT(*) AS n FROM anticipos WHERE id = ?', [anticipoC]);
    assert.equal(Number(fuera.n), 0);
    assert.equal(await contarPagos(anticipoC), 0, 'los pagos del anticipo borrado caen con él');
    assert.equal(await leerPago(pagoC), null);
    assert.equal(await contarPagos(anticipoD), 1);
    assert.equal(Number((await leerPago(pagoD)).importe), 40);
    const [[queda]] = await db.execute('SELECT COUNT(*) AS n FROM anticipos WHERE id = ?', [anticipoD]);
    assert.equal(Number(queda.n), 1);
});

test('deleteSavings borra por la lista validada y no alcanza a otro ahorro', async () => {
    await funciones.sav.deleteSavings([ahorroC]);

    const [[fuera]] = await db.execute('SELECT COUNT(*) AS n FROM ahorros WHERE id = ?', [ahorroC]);
    assert.equal(Number(fuera.n), 0);
    const [[movimientosFuera]] = await db.execute('SELECT COUNT(*) AS n FROM ahorros_movimientos WHERE ahorro_id = ?', [ahorroC]);
    assert.equal(Number(movimientosFuera.n), 0, 'los movimientos caen por la clave foránea en cascada');
    assert.equal(await leerMovimiento(movC), null);
    assert.equal(await contarMovimientos(ahorroD), 1);
    assert.equal(Number((await leerMovimiento(movD)).importe), 40);
    const [[queda]] = await db.execute('SELECT COUNT(*) AS n FROM ahorros WHERE id = ?', [ahorroD]);
    assert.equal(Number(queda.n), 1);
});

test('las listas vacías o con identificadores inválidos se rechazan con 400', async () => {
    await assert.rejects(() => funciones.adv.deleteAdvances([]), { status: 400 });
    await assert.rejects(() => funciones.adv.deleteAdvances([0]), { status: 400 });
    await assert.rejects(() => funciones.sav.deleteSavings([]), { status: 400 });
    await assert.rejects(() => funciones.sav.deleteSavings(['no-es-un-id']), { status: 400 });

    const [[siguen]] = await db.execute('SELECT COUNT(*) AS n FROM anticipos WHERE id = ?', [anticipoD]);
    assert.equal(Number(siguen.n), 1, 'una lista rechazada no borra nada');
    assert.equal(await contarMovimientos(ahorroD), 1);
});
