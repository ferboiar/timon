// DC-75 / F-49: privacidad editable solo por el propietario o un administrador.
// ======================================================================
//
// Sobre una base `_test` creada de cero con todas las migraciones comprueba:
// - el viaje de ida y vuelta de `es_privado` en pushRecibo, pushAdvance y pushSaving
//   (alta privada, edición con 0, omisión que conserva, «1» como texto) y que
//   `propietario_id` no cambia al editar;
// - la visibilidad por rol de los tres listados (propietario, otro user, reader y admin);
// - que las consultas de propiedad devuelven `es_privado` y `propietario_id`, que es lo que
//   consume `asegurarCambioPrivacidad` en las rutas;
// - la cascada anual de recibos: se abre desde el eslabón central, cambia los eslabones del
//   mismo propietario en los dos sentidos, no toca el de otro propietario ni el recibo con el
//   mismo concepto y sin enlace, solo actúa cuando el valor pedido difiere y revierte entera si
//   la operación falla después;
// - la carrera de la relectura con bloqueo: otra transacción deja el recibo abierto en 1 sin
//   confirmar y el llamante pide 0 creyendo que sigue en 0.
//
// La carrera no se observa con `information_schema.innodb_trx` porque `timon_test` no tiene el
// privilegio PROCESS (comprobado: ER_SPECIFIC_ACCESS_DENIED_ERROR); se comprueba que la promesa
// sigue pendiente tras un segundo mientras la otra transacción mantiene el bloqueo.
//
// Si el usuario de pruebas no puede crear la base, la prueba FALLA con el error real: no se omite.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, describe, test } from 'node:test';
import mysql from 'mysql2/promise';

import { filtrarVisibles } from '../src/utils/autorizacion.mjs';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_f49_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

const ADMIN = 1;
const PROPIETARIO = 2;
const OTRO = 3;
const READER = 4;
const MARCA = 5; // usuario marcador: prueba que una fila no se ha tocado (la FK exige que exista)

let db;
let admin;
let cerrarPool;
let pushRecibo;
let pushAdvance;
let pushSaving;
let getRecibos;
let getAdvances;
let getSavings;
let registroDeRecibo;
let registroDeAhorro;
let registroDeAnticipo;

/** Usuario para las funciones puras de la matriz: solo rol, id y escritura en todo. */
const usuarioDe = (id, rol) => ({
    id,
    rol,
    perm_recibos: 'escritura',
    perm_ahorros: 'escritura',
    perm_anticipos: 'escritura',
    perm_categorias: 'escritura',
    perm_cuentas: 'escritura'
});

const espera = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

async function crearBase(nombre) {
    assert.match(nombre, /_test$/, 'la base debe terminar en _test');
    await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(nombre));
    await admin.query('CREATE DATABASE ' + mysql.escapeId(nombre) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci');
}

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

/** Fila mínima de una tabla con propietario, privacidad y autor. */
async function fila(tabla, id) {
    const [[f]] = await db.query(`SELECT es_privado, propietario_id, modificado_por FROM ${tabla} WHERE id = ?`, [id]);
    return f;
}

async function idPorConcepto(tabla, concepto) {
    const [filas] = await db.query(`SELECT id FROM ${tabla} WHERE concepto = ? ORDER BY id DESC`, [concepto]);
    assert.ok(filas.length > 0, `no existe «${concepto}» en ${tabla}`);
    return Number(filas[0].id);
}

/** Inserta un recibo con su enlace de cadena y cargos pendientes, sin pasar por pushRecibo. */
async function insertarRecibo({ concepto, propietarioId, anio, periodicidad = 'anual', origen = null, esPrivado = 0, cargos = 1 }) {
    const [resultado] = await db.execute(
        'INSERT INTO recibos (concepto, importe, periodicidad, categoria_id, cuenta_id, propietario_id, es_privado, fecha_inicial, recibo_origen_id) VALUES (?, 10, ?, 1, 1, ?, ?, ?, ?)',
        [concepto, periodicidad, propietarioId, esPrivado, `${anio}-12-31`, origen]
    );
    const id = Number(resultado.insertId);

    for (let n = 0; n < cargos; n++) {
        const mes = String(n + 1).padStart(2, '0');
        await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, 'pendiente', '', 1)", [id, `${anio}-${mes}-15`]);
    }

    return id;
}

before(async () => {
    admin = await mysql.createConnection(conexion);
    await crearBase(dbName);

    db = await mysql.createConnection({ ...conexion, database: dbName });

    const migraciones = (await readdir(new URL('../src/db/migrations/', import.meta.url))).filter((f) => f.endsWith('.sql')).sort();
    for (const fichero of migraciones) {
        await ejecutarMigracion(db, await readFile(new URL(`../src/db/migrations/${fichero}`, import.meta.url), 'utf8'));
    }

    await db.query(
        "INSERT INTO users (id, username, email, password, rol) VALUES (1, 'f49_admin', 'f49_admin@example.test', 'x', 'admin'), (2, 'f49_prop', 'f49_prop@example.test', 'x', 'user'), (3, 'f49_otro', 'f49_otro@example.test', 'x', 'user'), (4, 'f49_reader', 'f49_reader@example.test', 'x', 'reader'), (5, 'f49_marca', 'f49_marca@example.test', 'x', 'user')"
    );
    await db.query("INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (1, 'f49 cuenta', 'corriente', NULL, 2)");
    await db.query("INSERT INTO categorias (id, nombre, descripcion, propietario_id) VALUES (1, 'f49-general', NULL, 2)");

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName
    });

    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    ({ pushRecibo, getRecibos } = await import('../src/db/db_utils.mjs'));
    ({ pushAdvance, getAdvances } = await import('../src/db/db_utilsAdv.mjs'));
    ({ pushSaving, getSavings } = await import('../src/db/db_utilsSav.mjs'));
    ({ registroDeRecibo, registroDeAhorro, registroDeAnticipo } = await import('../src/utils/propiedad.mjs'));
});

after(async () => {
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();
    if (admin) {
        await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(dbName));
        await admin.end();
    }
});

describe('Ida y vuelta de es_privado (DC-75)', () => {
    test('recibos: alta privada, omisión que conserva y valor explícito 0 o «1»', async () => {
        const concepto = 'f49_rt_recibo';

        await pushRecibo(null, concepto, 'anual', 10, 'f49-general', [], PROPIETARIO, 1, '2030-12-31', 'auto', false, 1, PROPIETARIO);
        const id = await idPorConcepto('recibos', concepto);
        assert.equal(Number((await fila('recibos', id)).es_privado), 1, 'el alta guarda el valor enviado');

        // Omitido: conserva, y el propietario no cambia aunque edite otro usuario
        await pushRecibo(id, concepto, 'anual', 11, 'f49-general', [], PROPIETARIO, 1, '2030-06-30', 'auto', false, null, OTRO);
        let actual = await fila('recibos', id);
        assert.equal(Number(actual.es_privado), 1, 'omitir es_privado conserva el valor');
        assert.equal(Number(actual.propietario_id), PROPIETARIO, 'el propietario no cambia al editar');
        assert.equal(Number(actual.modificado_por), OTRO, 'la edición deja autor');

        await pushRecibo(id, concepto, 'anual', 12, 'f49-general', [], PROPIETARIO, 1, '2030-06-30', 'auto', false, 0, OTRO);
        assert.equal(Number((await fila('recibos', id)).es_privado), 0, 'el 0 explícito desmarca');

        await pushRecibo(id, concepto, 'anual', 13, 'f49-general', [], PROPIETARIO, 1, '2030-06-30', 'auto', false, '1', OTRO);
        assert.equal(Number((await fila('recibos', id)).es_privado), 1, '«1» como texto se guarda como 1');
    });

    test('anticipos: alta privada, omisión que conserva y valor explícito 0 o «1»', async () => {
        const id = await pushAdvance(null, 'f49_rt_anticipo', 100, 0, '2030-01-01', null, null, 'activo', 1, null, PROPIETARIO, 1, PROPIETARIO);
        assert.ok(id > 0);
        assert.equal(Number((await fila('anticipos', id)).es_privado), 1);

        await pushAdvance(id, 'f49_rt_anticipo', 100, 0, '2030-01-01', null, null, 'activo', 1, null, PROPIETARIO, null, OTRO);
        let actual = await fila('anticipos', id);
        assert.equal(Number(actual.es_privado), 1, 'omitir conserva');
        assert.equal(Number(actual.propietario_id), PROPIETARIO, 'el propietario no cambia al editar');

        await pushAdvance(id, 'f49_rt_anticipo', 100, 0, '2030-01-01', null, null, 'activo', 1, null, PROPIETARIO, 0, OTRO);
        assert.equal(Number((await fila('anticipos', id)).es_privado), 0);

        await pushAdvance(id, 'f49_rt_anticipo', 100, 0, '2030-01-01', null, null, 'activo', 1, null, PROPIETARIO, '1', OTRO);
        assert.equal(Number((await fila('anticipos', id)).es_privado), 1);
    });

    test('ahorros: alta privada, omisión que conserva y valor explícito 0 o «1»', async () => {
        const concepto = 'f49_rt_ahorro';

        await pushSaving(null, concepto, null, 0, null, null, null, 1, PROPIETARIO, 1, PROPIETARIO);
        const id = await idPorConcepto('ahorros', concepto);
        assert.equal(Number((await fila('ahorros', id)).es_privado), 1);

        await pushSaving(id, concepto, null, 0, null, null, null, 1, PROPIETARIO, null, OTRO);
        let actual = await fila('ahorros', id);
        assert.equal(Number(actual.es_privado), 1, 'omitir conserva');
        assert.equal(Number(actual.propietario_id), PROPIETARIO, 'el propietario no cambia al editar');

        await pushSaving(id, concepto, null, 0, null, null, null, 1, PROPIETARIO, 0, OTRO);
        assert.equal(Number((await fila('ahorros', id)).es_privado), 0);

        await pushSaving(id, concepto, null, 0, null, null, null, 1, PROPIETARIO, '1', OTRO);
        assert.equal(Number((await fila('ahorros', id)).es_privado), 1);
    });

    test('las consultas de propiedad devuelven es_privado y propietario_id', async () => {
        const recibo = await registroDeRecibo(await idPorConcepto('recibos', 'f49_rt_recibo'));
        assert.equal(Number(recibo.es_privado), 1);
        assert.equal(Number(recibo.propietario_id), PROPIETARIO);

        const anticipo = await registroDeAnticipo(await idPorConcepto('anticipos', 'f49_rt_anticipo'));
        assert.equal(Number(anticipo.es_privado), 1);
        assert.equal(Number(anticipo.propietario_id), PROPIETARIO);

        const ahorro = await registroDeAhorro(await idPorConcepto('ahorros', 'f49_rt_ahorro'));
        assert.equal(Number(ahorro.es_privado), 1);
        assert.equal(Number(ahorro.propietario_id), PROPIETARIO);
    });
});

describe('Visibilidad por rol (DC-48) con registros privados (DC-75)', () => {
    const propietario = usuarioDe(PROPIETARIO, 'user');
    const otro = usuarioDe(OTRO, 'user');
    const reader = usuarioDe(READER, 'reader');
    const administrador = usuarioDe(ADMIN, 'admin');

    const veredicto = (filas, modulo, usuario, id) => filtrarVisibles(usuario, filas, modulo).some((f) => Number(f.id) === Number(id));

    test('el recibo privado solo llega a su propietario y al admin', async () => {
        const id = await idPorConcepto('recibos', 'f49_rt_recibo');
        const filas = await getRecibos({});

        assert.equal(veredicto(filas, 'recibos', propietario, id), true, 'propietario');
        assert.equal(veredicto(filas, 'recibos', otro, id), false, 'otro user');
        assert.equal(veredicto(filas, 'recibos', reader, id), false, 'reader');
        assert.equal(veredicto(filas, 'recibos', administrador, id), true, 'admin');
    });

    test('el anticipo privado solo llega a su propietario y al admin', async () => {
        const id = await idPorConcepto('anticipos', 'f49_rt_anticipo');
        const filas = await getAdvances();

        assert.equal(veredicto(filas, 'anticipos', propietario, id), true, 'propietario');
        assert.equal(veredicto(filas, 'anticipos', otro, id), false, 'otro user');
        assert.equal(veredicto(filas, 'anticipos', reader, id), false, 'reader');
        assert.equal(veredicto(filas, 'anticipos', administrador, id), true, 'admin');
    });

    test('el ahorro privado solo llega a su propietario y al admin', async () => {
        const id = await idPorConcepto('ahorros', 'f49_rt_ahorro');
        const filas = await getSavings();

        assert.equal(veredicto(filas, 'ahorros', propietario, id), true, 'propietario');
        assert.equal(veredicto(filas, 'ahorros', otro, id), false, 'otro user');
        assert.equal(veredicto(filas, 'ahorros', reader, id), false, 'reader');
        assert.equal(veredicto(filas, 'ahorros', administrador, id), true, 'admin');
    });
});

describe('Cascada anual de recibos (DC-75)', () => {
    const ids = {};

    test('se abre desde el eslabón central y cambia los del mismo propietario en los dos sentidos', async () => {
        ids.a = await insertarRecibo({ concepto: 'f49_cadena', propietarioId: PROPIETARIO, anio: 2030 });
        ids.b = await insertarRecibo({ concepto: 'f49_cadena', propietarioId: PROPIETARIO, anio: 2031, origen: ids.a });
        ids.c = await insertarRecibo({ concepto: 'f49_cadena', propietarioId: OTRO, anio: 2032, origen: ids.b });
        ids.d = await insertarRecibo({ concepto: 'f49_cadena', propietarioId: PROPIETARIO, anio: 2033, origen: ids.c });
        ids.e = await insertarRecibo({ concepto: 'f49_cadena', propietarioId: PROPIETARIO, anio: 2034 }); // homónimo sin enlace

        await db.execute('UPDATE recibos SET modificado_por = ? WHERE id IN (?, ?)', [MARCA, ids.c, ids.e]);

        await pushRecibo(ids.b, 'f49_cadena', 'anual', 10, 'f49-general', [], PROPIETARIO, 1, '2031-06-30', 'auto', false, 1, PROPIETARIO);

        assert.equal(Number((await fila('recibos', ids.a)).es_privado), 1, 'eslabón anterior');
        assert.equal(Number((await fila('recibos', ids.b)).es_privado), 1, 'recibo abierto');
        assert.equal(Number((await fila('recibos', ids.d)).es_privado), 1, 'eslabón posterior, detrás del de otro propietario');
        assert.equal(Number((await fila('recibos', ids.a)).modificado_por), PROPIETARIO, 'el eslabón anterior queda con el autor');
        assert.equal(Number((await fila('recibos', ids.d)).modificado_por), PROPIETARIO, 'el eslabón posterior queda con el autor');
    });

    test('no toca el eslabón de otro propietario ni el recibo homónimo sin enlace', async () => {
        assert.equal(Number((await fila('recibos', ids.c)).es_privado), 0, 'el eslabón de otro propietario no cambia');
        assert.equal(Number((await fila('recibos', ids.c)).modificado_por), MARCA, 'ni se toca su autor');
        assert.equal(Number((await fila('recibos', ids.e)).es_privado), 0, 'el homónimo sin enlace no cambia');
        assert.equal(Number((await fila('recibos', ids.e)).modificado_por), MARCA, 'ni se toca su autor');
    });

    test('solo actúa cuando el valor pedido difiere del actual', async () => {
        await db.execute('UPDATE recibos SET modificado_por = ? WHERE id = ?', [MARCA, ids.a]);

        await pushRecibo(ids.b, 'f49_cadena', 'anual', 10, 'f49-general', [], PROPIETARIO, 1, '2031-06-30', 'auto', false, 1, PROPIETARIO);

        assert.equal(Number((await fila('recibos', ids.a)).modificado_por), MARCA, 'sin cambio de valor no se recorre la cadena');
    });

    test('revierte la cascada si la operación falla después', async () => {
        const r1 = await insertarRecibo({ concepto: 'f49_rollback', propietarioId: PROPIETARIO, anio: 2031, periodicidad: 'mensual', esPrivado: 1, cargos: 2 });
        const r2 = await insertarRecibo({ concepto: 'f49_rollback', propietarioId: PROPIETARIO, anio: 2032, periodicidad: 'mensual', origen: r1, esPrivado: 1, cargos: 2 });

        // La fecha inicial de diciembre con dos cargos mensuales hace que la segunda fecha
        // reescrita caiga en el año siguiente: el rechazo llega después de la cascada y la revierte.
        await assert.rejects(pushRecibo(r1, 'f49_rollback', 'mensual', 10, 'f49-general', [], PROPIETARIO, 1, '2031-12-15', 'auto', false, 0, PROPIETARIO), { status: 400 });

        assert.equal(Number((await fila('recibos', r1)).es_privado), 1, 'el recibo abierto vuelve a su valor');
        assert.equal(Number((await fila('recibos', r2)).es_privado), 1, 'el eslabón de la cascada se revierte');
    });

    test('la relectura con bloqueo impone el valor pedido a toda la cadena (carrera)', async () => {
        const a = await insertarRecibo({ concepto: 'f49_carrera', propietarioId: PROPIETARIO, anio: 2030, esPrivado: 1 });
        const b = await insertarRecibo({ concepto: 'f49_carrera', propietarioId: PROPIETARIO, anio: 2031, origen: a, esPrivado: 0 });
        const c = await insertarRecibo({ concepto: 'f49_carrera', propietarioId: PROPIETARIO, anio: 2032, origen: b, esPrivado: 1 });

        // Otra transacción deja el recibo abierto en 1 sin confirmar.
        const otra = await mysql.createConnection({ ...conexion, database: dbName });

        try {
            await otra.beginTransaction();
            await otra.execute('UPDATE recibos SET es_privado = 1 WHERE id = ?', [b]);

            // El llamante cree que el recibo sigue en 0 (su lectura sin bloqueo) y pide 0.
            const promesa = pushRecibo(b, 'f49_carrera', 'anual', 10, 'f49-general', [], PROPIETARIO, 1, '2031-06-30', 'auto', false, 0, PROPIETARIO);
            const carrera = await Promise.race([promesa.then(() => 'resuelta', (error) => 'error: ' + error.message), espera(1000).then(() => 'pendiente')]);

            assert.equal(carrera, 'pendiente', 'la escritura debe esperar al bloqueo de la otra transacción');

            await otra.commit();
            await promesa;
        } finally {
            await otra.end();
        }

        assert.equal(Number((await fila('recibos', a)).es_privado), 0, 'eslabón anterior con el valor pedido');
        assert.equal(Number((await fila('recibos', b)).es_privado), 0, 'recibo abierto con el valor pedido');
        assert.equal(Number((await fila('recibos', c)).es_privado), 0, 'eslabón posterior con el valor pedido');
    });
});
