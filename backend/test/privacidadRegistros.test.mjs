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
//   confirmar y el llamante pide 0 creyendo que sigue en 0;
// - la carrera de F-61 con el recibo del año siguiente, con dos conexiones reales en READ COMMITTED
//   (el aislamiento del servidor) y en REPEATABLE READ: la relectura con bloqueo incorpora el
//   eslabón creado en el hueco y el INSERT ... SELECT de generar_recibos_anio espera al COMMIT.
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
let asegurarCambioPrivacidad;
let privacidadParaGuardar;
let bloquearCadenaDeRecibos;
let aplicarPrivacidadEnCadena;

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
    ({ pushRecibo, getRecibos, bloquearCadenaDeRecibos, aplicarPrivacidadEnCadena } = await import('../src/db/db_utils.mjs'));
    ({ pushAdvance, getAdvances } = await import('../src/db/db_utilsAdv.mjs'));
    ({ pushSaving, getSavings } = await import('../src/db/db_utilsSav.mjs'));
    ({ registroDeRecibo, registroDeAhorro, registroDeAnticipo, asegurarCambioPrivacidad, privacidadParaGuardar } = await import('../src/utils/propiedad.mjs'));
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

describe('Carrera de autorización (DC-75)', () => {
    // Reproduce lo que hace la ruta, en su orden: lectura sin bloqueo, tolerancia del valor igual y
    // valor efectivo. Entre la lectura y el bloqueo, el propietario deja el registro en privado.
    const noPropietario = usuarioDe(OTRO, 'user');

    test('recibos: un no propietario que envía el valor que creía actual no escribe la privacidad ni cascadea', async () => {
        const a = await insertarRecibo({ concepto: 'f49_carrera_auth', propietarioId: PROPIETARIO, anio: 2030, esPrivado: 1 });
        const b = await insertarRecibo({ concepto: 'f49_carrera_auth', propietarioId: PROPIETARIO, anio: 2031, origen: a, esPrivado: 0 });
        const c = await insertarRecibo({ concepto: 'f49_carrera_auth', propietarioId: PROPIETARIO, anio: 2032, origen: b, esPrivado: 1 });

        const otra = await mysql.createConnection({ ...conexion, database: dbName });

        try {
            await otra.beginTransaction();
            await otra.execute('UPDATE recibos SET es_privado = 1 WHERE id = ?', [b]);

            const registro = await registroDeRecibo(b);
            assert.equal(Number(registro.es_privado), 0, 'la ruta lee el valor anterior');

            asegurarCambioPrivacidad(noPropietario, registro, 'recibos', 0); // el valor igual se tolera
            const efectiva = privacidadParaGuardar(noPropietario, registro, 'recibos', 0);
            assert.equal(efectiva, null, 'un no propietario no escribe la privacidad');

            const promesa = pushRecibo(b, 'f49_carrera_auth', 'anual', 10, 'f49-general', [], OTRO, 1, '2031-06-30', 'auto', false, efectiva, OTRO);
            const carrera = await Promise.race([promesa.then(() => 'resuelta', (error) => 'error: ' + error.message), espera(1000).then(() => 'pendiente')]);

            assert.equal(carrera, 'pendiente', 'la escritura debe esperar al bloqueo de la otra transacción');

            await otra.commit();
            await promesa;
        } finally {
            await otra.end();
        }

        assert.equal(Number((await fila('recibos', a)).es_privado), 1, 'eslabón anterior intacto');
        assert.equal(Number((await fila('recibos', b)).es_privado), 1, 'la decisión del propietario se conserva');
        assert.equal(Number((await fila('recibos', c)).es_privado), 1, 'eslabón posterior intacto');
    });

    test('anticipos: un no propietario que envía el valor que creía actual no escribe la privacidad', async () => {
        const id = await pushAdvance(null, 'f49_carrera_auth_ant', 100, 0, '2030-01-01', null, null, 'activo', 1, null, PROPIETARIO, 0, PROPIETARIO);
        const otra = await mysql.createConnection({ ...conexion, database: dbName });

        try {
            await otra.beginTransaction();
            await otra.execute('UPDATE anticipos SET es_privado = 1 WHERE id = ?', [id]);

            const registro = await registroDeAnticipo(id);
            assert.equal(Number(registro.es_privado), 0, 'la ruta lee el valor anterior');

            asegurarCambioPrivacidad(noPropietario, registro, 'anticipos', 0);
            const efectiva = privacidadParaGuardar(noPropietario, registro, 'anticipos', 0);
            assert.equal(efectiva, null);

            const promesa = pushAdvance(id, 'f49_carrera_auth_ant', 100, 0, '2030-01-01', null, null, 'activo', 1, null, OTRO, efectiva, OTRO);
            const carrera = await Promise.race([promesa.then(() => 'resuelta', (error) => 'error: ' + error.message), espera(1000).then(() => 'pendiente')]);

            assert.equal(carrera, 'pendiente');

            await otra.commit();
            await promesa;
        } finally {
            await otra.end();
        }

        assert.equal(Number((await fila('anticipos', id)).es_privado), 1, 'la decisión del propietario se conserva');
    });

    test('ahorros: un no propietario que envía el valor que creía actual no escribe la privacidad', async () => {
        const concepto = 'f49_carrera_auth_ahorro';
        await pushSaving(null, concepto, null, 0, null, null, null, 1, PROPIETARIO, 0, PROPIETARIO);
        const id = await idPorConcepto('ahorros', concepto);
        const otra = await mysql.createConnection({ ...conexion, database: dbName });

        try {
            await otra.beginTransaction();
            await otra.execute('UPDATE ahorros SET es_privado = 1 WHERE id = ?', [id]);

            const registro = await registroDeAhorro(id);
            assert.equal(Number(registro.es_privado), 0, 'la ruta lee el valor anterior');

            asegurarCambioPrivacidad(noPropietario, registro, 'ahorros', 0);
            const efectiva = privacidadParaGuardar(noPropietario, registro, 'ahorros', 0);
            assert.equal(efectiva, null);

            const promesa = pushSaving(id, concepto, null, 0, null, null, null, 1, OTRO, efectiva, OTRO);
            const carrera = await Promise.race([promesa.then(() => 'resuelta', (error) => 'error: ' + error.message), espera(1000).then(() => 'pendiente')]);

            assert.equal(carrera, 'pendiente');

            await otra.commit();
            await promesa;
        } finally {
            await otra.end();
        }

        assert.equal(Number((await fila('ahorros', id)).es_privado), 1, 'la decisión del propietario se conserva');
    });
});

// F-61 (DC-75): la cascada anual de `es_privado` frente al recibo que crea el procedimiento
// `generar_recibos_anio`. Se reproduce con dos conexiones reales sobre esta base `*_test`, en el
// aislamiento por defecto del servidor y en READ COMMITTED, que es el que puede tener producción:
//
// - Ventana A: el sucesor entra entre el CTE recursivo (lectura sin bloqueo) y el `FOR UPDATE`.
//   La relectura posterior tiene que ser con bloqueo, porque en snapshot una lectura normal no ve
//   lo confirmado después de abrir la transacción, y ante un INSERT sin confirmar el bloqueo de la
//   FK detiene al que lee. Con la relectura acotada a MAX_PASADAS = 3 el eslabón nuevo termina con
//   el valor pedido.
// - Ventana B: el `INSERT INTO recibos (...) SELECT ... FROM recibos WHERE id = ?` del
//   procedimiento, lanzado mientras la cascada sostiene el `FOR UPDATE` del padre. Se comprueba que
//   espera al COMMIT y qué queda en el hijo: en READ COMMITTED aborta con ER_CHECKREAD (fallo
//   cerrado, nunca con el valor anterior) y en REPEATABLE READ copia el valor ya confirmado.
describe('Carrera con el recibo del año siguiente (F-61)', () => {
    // El servidor de desarrollo y pruebas está en READ COMMITTED por defecto; se prueba además
    // REPEATABLE READ para dejar constancia de lo que ve el snapshot y del aislamiento del servidor.
    const AISLAMIENTOS = [
        { nombre: 'por defecto', sql: null },
        { nombre: 'READ COMMITTED', sql: 'SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED' },
        { nombre: 'REPEATABLE READ', sql: 'SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ' }
    ];

    /** Conexión propia con el aislamiento pedido, para no depender del que tenga el pool. */
    const abrir = async (sql) => {
        const propia = await mysql.createConnection({ ...conexion, database: dbName });
        if (sql) await propia.query(sql);
        return propia;
    };

    /** Fila mínima que el procedimiento anual copia del padre (`recibo_origen_id` y `replicar` fijos). */
    const insertarSucesor = (destino, padre, esPrivado, anio) =>
        destino.execute(
            'INSERT INTO recibos (concepto, importe, periodicidad, categoria_id, cuenta_id, propietario_id, es_privado, fecha_inicial, recibo_origen_id) VALUES (?, 10, ?, 1, 1, ?, ?, ?, ?)',
            ['f61_cadena', 'anual', PROPIETARIO, esPrivado, `${anio}-12-31`, padre]
        );

    /** La sentencia exacta de `generar_recibos_anio` para la tabla `recibos` (migración 0007). */
    const INSERT_ANUAL =
        'INSERT INTO recibos (concepto, importe, periodicidad, categoria_id, cuenta_id, propietario_id, es_privado, fecha_inicial, recibo_origen_id, replicar) ' +
        'SELECT concepto, ?, periodicidad, categoria_id, cuenta_id, propietario_id, es_privado, ?, id, 1 FROM recibos WHERE id = ?';

    test('ventana A: el sucesor confirmado entre el CTE y el bloqueo acaba con el valor nuevo', async () => {
        for (const aislamiento of AISLAMIENTOS) {
            const contexto = `[${aislamiento.nombre}] `;
            const a = await insertarRecibo({ concepto: 'f61_cadena', propietarioId: PROPIETARIO, anio: 2030, esPrivado: 0 });
            const b = await insertarRecibo({ concepto: 'f61_cadena', propietarioId: PROPIETARIO, anio: 2031, origen: a, esPrivado: 0 });

            const c1 = await abrir(aislamiento.sql);
            const c2 = await abrir(aislamiento.sql);
            let sucesor = 0;
            let leidoSinBloqueo = 0;
            let pasadas = 0;
            let cadena = null;
            let errorRelectura = null;

            try {
                await c1.beginTransaction();

                // Conexión 1 tal cual, salvo que justo después del CTE recursivo (lectura sin
                // bloqueo) Conexión 2 inserta y confirma —autocommit— el eslabón del año siguiente.
                const envuelta = {
                    execute: async (sql, params) => {
                        const resultado = await c1.execute(sql, params);

                        if (/WITH RECURSIVE anteriores/.test(String(sql))) {
                            const [creado] = await insertarSucesor(c2, b, 0, 2032);
                            sucesor = Number(creado.insertId);

                            // Lectura normal desde Conexión 1, la que no bloquea: sirve para dejar
                            // constancia de lo que alcanza el snapshot y por qué no basta.
                            const [visibles] = await c1.execute('SELECT id FROM recibos WHERE id = ?', [sucesor]);
                            leidoSinBloqueo = visibles.length;
                        }

                        if (/recibo_origen_id IN/.test(String(sql))) pasadas++;

                        return resultado;
                    }
                };

                const [[{ iso }]] = await c1.query('SELECT @@transaction_isolation AS iso');

                // Lo que hace pushRecibo tras bloquear: bloquear la cadena, fijar el valor en el
                // recibo abierto y aplicarlo al resto de eslabones del mismo propietario.
                try {
                    cadena = await bloquearCadenaDeRecibos(envuelta, b);
                    await c1.execute('UPDATE recibos SET es_privado = 1 WHERE id = ?', [b]);
                    await aplicarPrivacidadEnCadena(envuelta, cadena, b, PROPIETARIO, 1, PROPIETARIO);
                    await c1.commit();
                } catch (error) {
                    errorRelectura = error.code || error.message;
                    await c1.rollback().catch(() => {});
                }

                const privacidadSucesor = Number((await fila('recibos', sucesor)).es_privado);

                console.log(`F-61 - ventana A [${aislamiento.nombre} / ${iso}]: lectura normal ve ${leidoSinBloqueo}, pasadas=${pasadas}, relectura=${errorRelectura ?? 'correcta'}, sucesor con es_privado=${privacidadSucesor}`);

                // Lo que ve una lectura normal depende del aislamiento y se mide, no se impone: en
                // READ COMMITTED cada sentencia abre su snapshot y sí ve lo confirmado después de
                // empezar; en REPEATABLE READ el snapshot se abrió con el CTE y no lo ve.
                assert.equal(leidoSinBloqueo, /READ-COMMITTED/.test(iso) ? 1 : 0, contexto + `lectura normal en ${iso}`);

                if (/REPEATABLE-READ/.test(iso)) {
                    // Límite conocido de F-61: en REPEATABLE READ, una fila confirmada después del
                    // snapshot no se puede releer con bloqueo —ER_CHECKREAD (1020)— y la cascada
                    // revierte. No deja el eslabón con el valor anterior: falla cerrada. Se anota en
                    // DC-75 al cerrar la iteración.
                    assert.equal(errorRelectura, 'ER_CHECKREAD', contexto + 'en REPEATABLE READ la relectura con bloqueo no puede ver el eslabón nuevo');
                    assert.equal(privacidadSucesor, 0, contexto + 'la cascada revierte y el eslabón conserva su valor');
                } else {
                    assert.equal(errorRelectura, null, contexto + 'sin error en la relectura con bloqueo');
                    assert.equal(cadena.includes(sucesor), true, contexto + 'la relectura con bloqueo incorpora el sucesor creado en el hueco');
                    assert.ok(pasadas >= 1 && pasadas <= 3, contexto + `pasadas de relectura dentro del tope: ${pasadas}`);
                    assert.equal(Number((await fila('recibos', a)).es_privado), 1, contexto + 'eslabón anterior');
                    assert.equal(Number((await fila('recibos', b)).es_privado), 1, contexto + 'recibo abierto');
                    assert.equal(privacidadSucesor, 1, contexto + 'el eslabón creado en el hueco queda con el valor pedido');
                }
            } finally {
                await c1.end().catch(() => {});
                await c2.end().catch(() => {});
            }
        }
    });

    test('ventana A de extremo a extremo: el sucesor insertado sin confirmar en el hueco entra en la cascada', async () => {
        const a = await insertarRecibo({ concepto: 'f61_cadena', propietarioId: PROPIETARIO, anio: 2030, esPrivado: 0 });
        const b = await insertarRecibo({ concepto: 'f61_cadena', propietarioId: PROPIETARIO, anio: 2031, origen: a, esPrivado: 0 });
        const otra = await abrir(null);
        let sucesor = 0;

        try {
            // El INSERT sin confirmar deja el bloqueo compartido de la FK sobre `b`, así que el
            // `FOR UPDATE` de la cascada espera: la ventana aparece sola, sin ganchos en pushRecibo.
            await otra.beginTransaction();
            const [creado] = await insertarSucesor(otra, b, 0, 2032);
            sucesor = Number(creado.insertId);

            const promesa = pushRecibo(b, 'f61_cadena', 'anual', 10, 'f49-general', [], PROPIETARIO, 1, '2031-06-30', 'auto', false, 1, PROPIETARIO);
            const carrera = await Promise.race([promesa.then(() => 'resuelta', (error) => 'error: ' + error.message), espera(1000).then(() => 'pendiente')]);

            assert.equal(carrera, 'pendiente', 'la cascada debe esperar al eslabón del año siguiente sin confirmar');

            await otra.commit();
            await promesa;
        } finally {
            await otra.end().catch(() => {});
        }

        assert.equal(Number((await fila('recibos', a)).es_privado), 1, 'eslabón anterior');
        assert.equal(Number((await fila('recibos', b)).es_privado), 1, 'recibo abierto');
        assert.equal(Number((await fila('recibos', sucesor)).es_privado), 1, 'eslabón creado en el hueco');
    });

    test('ventana B: el INSERT ... SELECT del procedimiento anual espera al bloqueo del padre', async () => {
        const observaciones = [];

        for (const aislamiento of AISLAMIENTOS) {
            const padre = await insertarRecibo({ concepto: 'f61_cadena', propietarioId: PROPIETARIO, anio: 2030, esPrivado: 0 });

            const c1 = await abrir(aislamiento.sql);
            const c2 = await abrir(aislamiento.sql);

            try {
                // La cascada: bloquea la cadena y deja el valor nuevo sin confirmar.
                await c1.beginTransaction();
                const [[{ iso }]] = await c1.query('SELECT @@transaction_isolation AS iso');
                await c1.execute('SELECT id FROM recibos WHERE id = ? FOR UPDATE', [padre]);
                await c1.execute('UPDATE recibos SET es_privado = 1 WHERE id = ?', [padre]);

                // El procedimiento copia el padre con la sentencia de la migración 0007.
                const insert = c2.execute(INSERT_ANUAL, [10, '2031-12-31', padre]);
                const estado = await Promise.race([insert.then(() => 'hecho', (error) => 'error: ' + error.code), espera(1000).then(() => 'pendiente')]);

                let privacidadHijo = null;

                if (estado === 'pendiente') {
                    await c1.commit();

                    try {
                        const [resultado] = await insert;
                        const [filaHijo] = await c2.execute('SELECT id, es_privado FROM recibos WHERE id = ?', [Number(resultado.insertId)]);
                        privacidadHijo = Number(filaHijo[0].es_privado);
                    } catch (error) {
                        privacidadHijo = 'error ' + (error.code || error.message);
                    }
                }

                console.log(`F-61 - ventana B [${aislamiento.nombre} / ${iso}]: bloqueo=${estado}, hijo con es_privado=${privacidadHijo}`);
                observaciones.push({ nombre: aislamiento.nombre, iso, bloqueo: estado, hijo: privacidadHijo });
            } finally {
                await c1.end().catch(() => {});
                await c2.end().catch(() => {});
            }
        }

        console.log('F-61 - ventana B (resumen): ' + observaciones.map((o) => `${o.nombre} / ${o.iso}: bloqueo=${o.bloqueo}, hijo=${o.hijo}`).join(' | '));

        // Comportamiento observado y asumido en F-61 mientras el procedimiento no lea el origen con
        // bloqueo compartido (issue abierta para el SQL): el INSERT espera al COMMIT de la cascada y
        // - en READ COMMITTED, el aislamiento del servidor, aborta con ER_CHECKREAD (1020): la serie
        //   no se crea en esa pasada, su transacción revierte en generar_recibos_anio y la reintenta
        //   la ejecución siguiente. Falla cerrada: no guarda el es_privado anterior.
        // - en REPEATABLE READ converge, porque el propio INSERT ... SELECT toma bloqueos
        //   compartidos sobre las filas de origen y copia el valor ya confirmado.
        for (const observacion of observaciones) {
            const contexto = `[${observacion.nombre} / ${observacion.iso}] `;

            assert.equal(observacion.bloqueo, 'pendiente', contexto + 'el INSERT del año siguiente espera al bloqueo del padre');

            if (/READ-COMMITTED/.test(observacion.iso)) {
                assert.equal(observacion.hijo, 'error ER_CHECKREAD', contexto + 'en READ COMMITTED el INSERT aborta y no guarda el valor anterior');
            } else {
                assert.equal(observacion.hijo, 1, contexto + 'en REPEATABLE READ copia el valor ya confirmado');
            }
        }
    });
});
