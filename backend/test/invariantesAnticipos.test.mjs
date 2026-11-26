// F-58 (#116): invariantes del plan de pagos de Anticipos.
// ======================================================================
//
// Sobre una base `_test` propia creada de cero con todas las migraciones comprueba, sin cambiar el algoritmo:
//
// - La generación del plan (`pushAdvance` y `recalculatePaymentPlan`) deja la suma de los pagos pendientes igual al
//   importe pendiente, también cuando el pago sugerido no divide el importe en céntimos exactos (100,00 € en cuotas de
//   33,33 €), y ninguna cuota queda a 0,00 € (F-36).
// - La edición de un pago pendiente (`pushPago` → `recalculatePostEditPayments`) reparte la diferencia entre los
//   pendientes posteriores: sube primero las cuotas por debajo del sugerido, reparte enteros y céntimos, y hace el
//   ajuste final sobre el último pendiente, nunca sobre el pago editado (F-62).
// - La reducción topa en 0,01 € por cuota y el ajuste final exige una discrepancia mayor que un céntimo. Cuando no se
//   cumple, el plan no concilia: la prueba afirma el comportamiento observado y lo explica, porque está documentado en
//   `doc/db/db_utilsAdv.md` («no es una garantía incondicional de conciliación»). F-58 no cambia el algoritmo.
// - Una edición que deja el pago pagado reparte solo si el plan cuadraba antes (DC-40).
// - `handlePaymentDeletion` con `redistribuir = true` completa el plan tras el borrado (DC-12).
//
// El caso de fecha e importe nuevos en la misma petición es de F-62 y ya se cubre en `repartoPagoEditado.test.mjs`:
// aquí no se repite.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_f58_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);
if (dbName === 'conta_hogar') throw new Error('La base de pruebas nunca puede ser conta_hogar');

const PROPIETARIO = 58;

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true,
    dateStrings: ['DATE']
};

let db;
let admin;
let cerrarPool;
let pushAdvance;
let pushPago;
let recalculatePaymentPlan;
let handlePaymentDeletion;

/** Aplica una migración respetando los bloques DELIMITER (procedimientos y eventos). */
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

    admin = await mysql.createConnection(conexion);
    const [[{ actual }]] = await admin.query('SELECT DATABASE() AS actual');
    assert.notEqual(actual, 'conta_hogar', 'la conexión administrativa nunca debe estar dentro de conta_hogar');

    await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(dbName));
    await admin.query('CREATE DATABASE ' + mysql.escapeId(dbName) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci');
}

/** Fecha como texto YYYY-MM-DD (la conexión de la prueba pide los DATE como texto). */
function textoFecha(valor) {
    return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor ?? '').slice(0, 10);
}

/** Importe con dos decimales, sin los residuos de coma flotante ni el texto de DECIMAL. */
const centimos = (valor) => Number(Number(valor).toFixed(2));

/**
 * Crea un anticipo por la vía pública (`pushAdvance`) con periodicidad y pago sugerido, de modo que su plan lo genere
 * `generarPlanDePagos` como en la aplicación. Devuelve el id del anticipo.
 */
async function anticipoConPlan({ concepto, importeOriginal, pagoSugerido, periodicidad = 'mensual', fechaInicio = '2026-01-01' }) {
    const id = await pushAdvance(null, concepto, importeOriginal, pagoSugerido, fechaInicio, null, null, 'activo', PROPIETARIO, periodicidad, PROPIETARIO);
    return Number(id);
}

/** Siembra un anticipo con importes de cuota fijados a mano (mismo patrón que repartoPagoEditado.test.mjs). */
async function sembrarAnticipo({ concepto, importeOriginal, pagoSugerido, periodicidad = 'mensual', pagos }) {
    const [anticipo] = await db.execute(
        "INSERT INTO anticipos (concepto, importe_original, pago_sugerido, fecha_inicio, estado, cuenta_origen_id, periodicidad, propietario_id) VALUES (?, ?, ?, '2026-01-01', 'activo', ?, ?, ?)",
        [concepto, importeOriginal, pagoSugerido, PROPIETARIO, periodicidad, PROPIETARIO]
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

/** Pagos del anticipo en orden de fecha (el que usa el algoritmo como «posteriores»). */
async function leerPagos(anticipoId) {
    const [filas] = await db.execute('SELECT id, importe, fecha, estado FROM anticipos_pagos WHERE anticipo_id = ? ORDER BY fecha ASC, id ASC', [anticipoId]);
    return filas;
}

async function leerAnticipo(anticipoId) {
    const [[fila]] = await db.execute('SELECT importe_original, pago_sugerido, fecha_fin_prevista FROM anticipos WHERE id = ?', [anticipoId]);
    return fila;
}

/** Importe pendiente derivado del anticipo, con la misma fórmula que la capa de datos (DC-38). */
async function importePendiente(anticipoId) {
    const [[fila]] = await db.execute(
        "SELECT ROUND(a.importe_original - COALESCE((SELECT SUM(p.importe) FROM anticipos_pagos p WHERE p.anticipo_id = a.id AND p.estado = 'pagado'), 0), 2) AS pendiente FROM anticipos a WHERE a.id = ?",
        [anticipoId]
    );
    return centimos(fila.pendiente);
}

/** Suma de los pagos pendientes del anticipo. */
async function sumaPendientes(anticipoId) {
    const [[fila]] = await db.execute("SELECT COALESCE(SUM(importe), 0) AS suma FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente'", [anticipoId]);
    return centimos(fila.suma);
}

const importes = (pagos) => pagos.map((pago) => centimos(pago.importe));
const fechas = (pagos) => pagos.map((pago) => textoFecha(pago.fecha));

/** Afirma que la suma de los pagos pendientes iguala el importe pendiente del anticipo. */
async function assertCuadra(anticipoId, mensaje) {
    const suma = await sumaPendientes(anticipoId);
    const pendiente = await importePendiente(anticipoId);
    assert.equal(suma, pendiente, `${mensaje}: la suma de los pagos pendientes (${suma}) debe igualar el importe pendiente (${pendiente})`);
}

/** Edita un pago existente por la vía pública (`pushPago`), con el estado indicado. */
async function editarPago({ anticipoId, pagoId, importe, fecha, estado = 'pendiente' }) {
    await pushPago(pagoId, anticipoId, importe, fecha, 'regular', null, estado, PROPIETARIO);
}

before(async () => {
    await crearBase();

    db = await mysql.createConnection({ ...conexion, database: dbName });
    const migraciones = (await readdir(new URL('../src/db/migrations/', import.meta.url))).filter((f) => f.endsWith('.sql')).sort();
    for (const fichero of migraciones) {
        await ejecutarMigracion(db, await readFile(new URL(`../src/db/migrations/${fichero}`, import.meta.url), 'utf8'));
    }

    await db.execute("INSERT INTO users (id, username, email, password, rol) VALUES (?, 'f58_user', 'f58_user@example.test', 'x', 'user')", [PROPIETARIO]);
    await db.execute("INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (?, 'Cuenta F58', 'corriente', 'ES0000000000000000000058', ?)", [PROPIETARIO, PROPIETARIO]);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName
    });

    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    ({ pushAdvance, pushPago, recalculatePaymentPlan, handlePaymentDeletion } = await import('../src/db/db_utilsAdv.mjs'));
});

after(async () => {
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();
    if (admin) {
        if (/_test$/.test(dbName) && dbName !== 'conta_hogar') await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(dbName));
        await admin.end();
    }
});

// ---------------------------------------------------------------------------------------------------------------
// Generación del plan (pushAdvance, recalculatePaymentPlan)
// ---------------------------------------------------------------------------------------------------------------

test('100,00 € en cuotas de 33,33 € deja la última en 0,01 y suma el importe pendiente', async () => {
    const anticipoId = await anticipoConPlan({ concepto: 'f58 centimos 3333', importeOriginal: 100, pagoSugerido: 33.33 });

    const pagos = await leerPagos(anticipoId);
    assert.deepEqual(importes(pagos), [33.33, 33.33, 33.33, 0.01]);
    assert.deepEqual(fechas(pagos), ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']);
    assert.equal(textoFecha((await leerAnticipo(anticipoId)).fecha_fin_prevista), '2026-04-01');
    await assertCuadra(anticipoId, 'plan de céntimos indivisibles');
});

test('100,00 € en cuotas de 33,34 € reparte el céntimo de la última y no deja cuotas a cero', async () => {
    const anticipoId = await anticipoConPlan({ concepto: 'f58 centimos 3334', importeOriginal: 100, pagoSugerido: 33.34 });

    const pagos = await leerPagos(anticipoId);
    assert.deepEqual(importes(pagos), [33.34, 33.34, 33.32]);
    assert.deepEqual(fechas(pagos), ['2026-01-01', '2026-02-01', '2026-03-01']);
    await assertCuadra(anticipoId, 'plan en tres cuotas');
});

test('recalculatePaymentPlan vuelve a colocar el hueco que deja un borrado sin reparto', async () => {
    const anticipoId = await anticipoConPlan({ concepto: 'f58 recalcular', importeOriginal: 100, pagoSugerido: 30 });

    const iniciales = await leerPagos(anticipoId);
    assert.deepEqual(importes(iniciales), [30, 30, 30, 10]);
    await assertCuadra(anticipoId, 'plan inicial');

    await handlePaymentDeletion(iniciales[3].id, false);
    assert.equal(await sumaPendientes(anticipoId), 90);

    await recalculatePaymentPlan(anticipoId);

    const tras = await leerPagos(anticipoId);
    assert.deepEqual(importes(tras), [30, 30, 30, 10]);
    assert.deepEqual(fechas(tras), ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']);
    await assertCuadra(anticipoId, 'plan recalculado');
});

// ---------------------------------------------------------------------------------------------------------------
// Edición de un pago pendiente (pushPago → recalculatePostEditPayments)
// ---------------------------------------------------------------------------------------------------------------

test('bajar un pago pendiente sube primero las cuotas por debajo del sugerido', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 escalon',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [5, '2026-03-01'], [15, '2026-04-01']]
    });
    await assertCuadra(anticipoId, 'plan de partida cuadrado');

    // La diferencia de 4,00 € cabe en el escalón: la cuota de 5,00 sube hasta el sugerido y las demás no se tocan.
    await editarPago({ anticipoId, pagoId: pagoIds[0], importe: 6, fecha: '2026-02-01' });

    assert.deepEqual(importes(await leerPagos(anticipoId)), [6, 9, 15]);
    await assertCuadra(anticipoId, 'escalón hasta el sugerido');
});

test('si el escalón no consume la diferencia, el resto se reparte entre todos los posteriores', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 escalon y resto',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [5, '2026-03-01'], [15, '2026-04-01']]
    });

    // Diferencia de 8,00 €: 5,00 llevan la cuota de 5,00 hasta el sugerido y los 3,00 restantes se reparten a partes
    // iguales entre las dos posteriores (1,00 cada una más 1,00 de resto a la primera por fecha). La última supera el
    // sugerido: el reparto residual no lo respeta, como ya documenta doc/db/db_utilsAdv.md.
    await editarPago({ anticipoId, pagoId: pagoIds[0], importe: 2, fecha: '2026-02-01' });

    assert.deepEqual(importes(await leerPagos(anticipoId)), [2, 12, 16]);
    await assertCuadra(anticipoId, 'escalón y reparto del resto');
});

test('subir un pago pendiente reduce a partes iguales las cuotas que no superan el sugerido', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 reduccion igual',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [10, '2026-03-01'], [10, '2026-04-01']]
    });

    // Diferencia de -6,00 €: ninguna cuota supera el sugerido, así que se reparte 3,00 a cada posterior.
    await editarPago({ anticipoId, pagoId: pagoIds[0], importe: 16, fecha: '2026-02-01' });

    assert.deepEqual(importes(await leerPagos(anticipoId)), [16, 7, 7]);
    await assertCuadra(anticipoId, 'reducción a partes iguales');
});

test('subir un pago pendiente reduce antes las cuotas que superan el sugerido', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 reduccion alta',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [15, '2026-03-01'], [5, '2026-04-01']]
    });

    // Los 4,00 € de aumento salen íntegros de la cuota de 15,00, que baja hasta 11,00 y sigue por encima del sugerido;
    // la de 5,00 no se toca.
    await editarPago({ anticipoId, pagoId: pagoIds[0], importe: 14, fecha: '2026-02-01' });

    assert.deepEqual(importes(await leerPagos(anticipoId)), [14, 11, 5]);
    await assertCuadra(anticipoId, 'reducción de la cuota alta');
});

// ---------------------------------------------------------------------------------------------------------------
// Límites del reparto: enteros y céntimos, mínimo de 0,01 y ajuste final
// ---------------------------------------------------------------------------------------------------------------

test('el reparto de céntimos deja un residuo de 0,01 que el ajuste final no corrige', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 residuo centimo',
        importeOriginal: 34,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [12, '2026-03-01'], [12, '2026-04-01']]
    });
    await assertCuadra(anticipoId, 'plan de partida cuadrado');

    // Diferencia de 1,03 €: el reparto da 1,00 y un céntimo a la primera posterior y un céntimo a la segunda, o sea
    // 1,02 de los 1,03; sobra exactamente un céntimo.
    await editarPago({ anticipoId, pagoId: pagoIds[0], importe: 8.97, fecha: '2026-02-01' });

    // Comportamiento observado (F-58, sin cambiar el algoritmo): el ajuste final solo actúa si la discrepancia supera
    // un céntimo (`Math.abs(diferenciaTotales) > 0.01`), así que el céntimo que falta se queda sin colocar y la suma de
    // los pendientes queda en 33,99 frente a un importe pendiente de 34,00. Está documentado en doc/db/db_utilsAdv.md
    // («no es una garantía incondicional de conciliación»).
    assert.deepEqual(importes(await leerPagos(anticipoId)), [8.97, 13.01, 12.01]);
    assert.equal(await sumaPendientes(anticipoId), 33.99);
    assert.equal(await importePendiente(anticipoId), 34);
});

test('la reducción topa en 0,01 por cuota y deja el plan descuadrado', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 minimo centimo',
        importeOriginal: 10,
        pagoSugerido: 3,
        pagos: [[4, '2026-02-01'], [3, '2026-03-01'], [3, '2026-04-01']]
    });
    await assertCuadra(anticipoId, 'plan de partida cuadrado');

    // La diferencia de -16,00 € supera de largo los 6,00 € que suman las dos cuotas posteriores.
    await editarPago({ anticipoId, pagoId: pagoIds[0], importe: 20, fecha: '2026-02-01' });

    // Comportamiento observado: cada cuota posterior baja hasta el mínimo de 0,01 (`Math.max(0.01, …)`) y el ajuste
    // final, que también respeta ese mínimo, no puede devolver el plan a 10,00. Queda en 20,02. Es el límite que ya
    // documenta doc/db/db_utilsAdv.md: el mínimo de 0,01 impide conciliar cuando la reducción no cabe en el plan.
    assert.deepEqual(importes(await leerPagos(anticipoId)), [20, 0.01, 0.01]);
    assert.equal(await sumaPendientes(anticipoId), 20.02);
    assert.equal(await importePendiente(anticipoId), 10);
});

test('el ajuste final coloca los céntimos que sobran en el último pago pendiente', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 ajuste final',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [10, '2026-03-01'], [10, '2026-04-01']]
    });

    // Diferencia de 0,05 €: un céntimo a cada posterior (0,02) y el ajuste final suma los 0,03 restantes al último
    // pendiente por fecha, no al pago editado (F-62).
    await editarPago({ anticipoId, pagoId: pagoIds[0], importe: 9.95, fecha: '2026-02-01' });

    assert.deepEqual(importes(await leerPagos(anticipoId)), [9.95, 10.01, 10.04]);
    await assertCuadra(anticipoId, 'ajuste final en el último pendiente');
});

// ---------------------------------------------------------------------------------------------------------------
// Edición que deja el pago pagado (DC-40)
// ---------------------------------------------------------------------------------------------------------------

test('pasar a pagado con el plan cuadrado reparte entre los demás pendientes (DC-40)', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 pagado cuadrado',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [10, '2026-03-01'], [10, '2026-04-01']]
    });
    await assertCuadra(anticipoId, 'plan de partida cuadrado');

    // El plan cuadraba antes: la diferencia de -5,00 € se reparte entre las dos posteriores.
    await editarPago({ anticipoId, pagoId: pagoIds[0], importe: 15, fecha: '2026-02-01', estado: 'pagado' });

    const pagos = await leerPagos(anticipoId);
    assert.deepEqual(importes(pagos), [15, 7, 8]);
    assert.equal(pagos[0].estado, 'pagado');
    assert.equal(await importePendiente(anticipoId), 15);
    await assertCuadra(anticipoId, 'reparto con el pago ya pagado');
});

test('pasar a pagado con el plan descuadrado no toca los pendientes (DC-40)', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 pagado descuadrado',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [5, '2026-03-01'], [5, '2026-04-01']]
    });
    assert.equal(await sumaPendientes(anticipoId), 20); // 20,00 planificados frente a 30,00 pendientes

    await editarPago({ anticipoId, pagoId: pagoIds[0], importe: 15, fecha: '2026-02-01', estado: 'pagado' });

    // Comportamiento observado (DC-40): si el plan no cuadraba antes de la edición, el hueco previo no se reparte a
    // escondidas entre los pendientes. Queda 15,00 pagado, 15,00 pendiente del anticipo y 10,00 planificado.
    const pagos = await leerPagos(anticipoId);
    assert.deepEqual(importes(pagos), [15, 5, 5]);
    assert.equal(pagos[0].estado, 'pagado');
    assert.equal(await importePendiente(anticipoId), 15);
    assert.equal(await sumaPendientes(anticipoId), 10);
});

// ---------------------------------------------------------------------------------------------------------------
// Borrado con reparto (handlePaymentDeletion, completarPlanTrasBorrado; DC-12)
// ---------------------------------------------------------------------------------------------------------------

test('borrar con redistribuir sube las cuotas por debajo del sugerido y crea la que falta (DC-12)', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 borrado reparto',
        importeOriginal: 30,
        pagoSugerido: 10,
        pagos: [[10, '2026-02-01'], [5, '2026-03-01'], [15, '2026-04-01']]
    });

    const resultado = await handlePaymentDeletion(pagoIds[2], true);

    assert.equal(Number(resultado.pendiente), 30);
    assert.equal(resultado.anticipoId, anticipoId);
    assert.equal(resultado.redistribuido, true);
    assert.equal(resultado.pagosAjustados, 1);
    assert.equal(resultado.pagosCreados, 1);

    const pagos = await leerPagos(anticipoId);
    assert.deepEqual(importes(pagos), [10, 10, 10]);
    assert.deepEqual(fechas(pagos), ['2026-02-01', '2026-03-01', '2026-04-01']);
    assert.equal(pagos.some((pago) => pago.id === pagoIds[2]), false, 'el pago borrado ya no está');
    await assertCuadra(anticipoId, 'plan completado tras el borrado');
});

test('borrar con redistribuir no reduce un plan que ya cubre el pendiente', async () => {
    const { anticipoId, pagoIds } = await sembrarAnticipo({
        concepto: 'f58 borrado sin hueco',
        importeOriginal: 20,
        pagoSugerido: 10,
        pagos: [[12, '2026-02-01'], [12, '2026-03-01'], [6, '2026-04-01']]
    });
    assert.equal(await sumaPendientes(anticipoId), 30); // ya superaba el pendiente de 20,00

    const resultado = await handlePaymentDeletion(pagoIds[2], true);

    // Observado: el reparto solo coloca importe que falta; si los pendientes ya cubren el importe pendiente no ajusta ni
    // crea nada y `redistribuido` queda en falso, sin reducir las cuotas que sobran.
    assert.equal(resultado.redistribuido, false);
    assert.equal(resultado.pagosAjustados, 0);
    assert.equal(resultado.pagosCreados, 0);
    assert.deepEqual(importes(await leerPagos(anticipoId)), [12, 12]);
});
