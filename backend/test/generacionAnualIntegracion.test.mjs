// O-10: verificaciones pendientes de U-13 y del borrado con cargos pagados.
// ========================================================================
// 1) U-13: ejecución real de `generarRecibosAnio(false)`, con alta del sucesor y rastro en
//    `mantenimiento_logs`.
// 2) U-13: bloqueo concurrente real: con `GET_LOCK('timon_generar_recibos')` tomado por otra
//    conexión, la llamada devuelve el aviso y no escribe nada.
// 3) Borrado de un recibo completo con cargos pagados: 409 sin permiso de sesión y borrado con
//    `forzar` (opción de administrador, DC-21).
//
// Usa una base propia `conta_hogar_o10_test` (sufijo `_test` comprobado) y las funciones reales de
// `backend/src/db`. Si el usuario de pruebas no puede crear la base, la prueba falla con el error
// real: no se omite, porque una omisión no es evidencia.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, describe, test } from 'node:test';

import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_o10_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

let db;
let admin;
let cerrarPool;
let deleteRecibo, generarRecibosAnio;

/** Crea la base de la prueba; si el usuario no tiene permiso, el error se propaga. */
async function crearBase(nombre) {
    assert.match(nombre, /_test$/, 'la base debe terminar en _test');
    await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(nombre));
    await admin.query('CREATE DATABASE ' + mysql.escapeId(nombre) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci');
}

/** Divide las migraciones por `DELIMITER`, como el cliente de línea de comandos. */
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

/** Id del recibo por concepto (`pushRecibo` no devuelve el id del alta). */
async function idDelRecibo(concepto) {
    const [filas] = await db.query('SELECT id FROM recibos WHERE concepto = ? ORDER BY id ASC', [concepto]);

    assert.ok(filas.length >= 1, `debe existir un recibo «${concepto}»`);

    return filas[0].id;
}

/** Número de recibos con ese concepto (el origen y sus sucesores anuales). */
async function contarRecibos(concepto) {
    const [[fila]] = await db.query('SELECT COUNT(*) AS n FROM recibos WHERE concepto = ?', [concepto]);

    return Number(fila.n);
}

/** Número de ejecuciones anotadas en el log de mantenimiento. */
async function contarLogs() {
    const [[fila]] = await db.query("SELECT COUNT(*) AS n FROM mantenimiento_logs WHERE operacion = 'Generar recibos del anio'");

    return Number(fila.n);
}

before(async () => {
    admin = await mysql.createConnection(conexion);
    await crearBase(dbName);

    db = await mysql.createConnection({ ...conexion, database: dbName });

    const migraciones = (await readdir(new URL('../src/db/migrations/', import.meta.url))).filter((f) => f.endsWith('.sql')).sort();

    for (const fichero of migraciones) {
        await ejecutarMigracion(db, await readFile(new URL(`../src/db/migrations/${fichero}`, import.meta.url), 'utf8'));
    }

    await db.query(`INSERT INTO users (id, username, email, password, rol) VALUES (1, 'o10_admin', 'o10_admin@example.test', 'x', 'admin')`);
    await db.query(`INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (1, 'Cuenta O-10', 'corriente', 'ES0000000000000000000110', 1)`);
    await db.query(`INSERT INTO categorias (id, nombre, descripcion, propietario_id) VALUES (1, 'General', NULL, 1)`);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName
    });

    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    ({ deleteRecibo, generarRecibosAnio } = await import('../src/db/db_utils.mjs'));
});

after(async () => {
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();
    if (admin) {
        await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(dbName));
        await admin.end();
    }
});

describe('O-10 / U-13: ejecución real del proceso anual', () => {
    test('generarRecibosAnio(false) crea el sucesor y deja rastro en mantenimiento_logs', async () => {
        const concepto = 'zz-O10 ejecucion real';
        const [alta] = await db.query("INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, cuenta_id, propietario_id, fecha_inicial) VALUES (?, 'anual', 10, 1, 1, 1, '2020-03-01')", [concepto]);
        const reciboId = alta.insertId;
        await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, '2020-03-01', 'pendiente', '', 1)", [reciboId]);

        const antesLogs = await contarLogs();
        const filas = await generarRecibosAnio(false);

        assert.ok(Array.isArray(filas), 'debe devolver las filas del procedimiento');
        assert.ok(filas.some((fila) => fila.origen_id === reciboId && Number(fila.anio_nuevo) > 2020), 'debe crear al menos un sucesor del recibo');
        assert.ok((await contarRecibos(concepto)) >= 2, 'el origen y su sucesor deben existir');

        const despuesLogs = await contarLogs();
        assert.ok(despuesLogs > antesLogs, 'la ejecución real debe dejar rastro en mantenimiento_logs');

        const [[ultimo]] = await db.query("SELECT operacion, detalles FROM mantenimiento_logs WHERE operacion = 'Generar recibos del anio' ORDER BY id DESC LIMIT 1");
        assert.equal(ultimo.operacion, 'Generar recibos del anio');
        assert.match(ultimo.detalles, /\d+ recibos y \d+ fechas creados/);
    });

    test('con el bloqueo ocupado por otra conexión avisa, no escribe y no lanza', async () => {
        await db.query("INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, cuenta_id, propietario_id, fecha_inicial) VALUES ('zz-O10 bloqueo', 'anual', 10, 1, 1, 1, '2020-04-01')");
        const reciboId = await idDelRecibo('zz-O10 bloqueo');
        await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, '2020-04-01', 'pendiente', '', 1)", [reciboId]);

        const [[lock]] = await db.query("SELECT GET_LOCK('timon_generar_recibos', 5) AS tomado");
        assert.equal(Number(lock.tomado), 1, 'la conexión de la prueba debe tomar el bloqueo');

        try {
            const filas = await generarRecibosAnio(false);

            assert.equal(filas.length, 1, 'solo debe devolver el aviso');
            assert.equal(filas[0].aviso, 'Hay otra ejecucion en curso');
            assert.equal(await contarRecibos('zz-O10 bloqueo'), 1, 'no debe crear ningún sucesor');
        } finally {
            await db.query("SELECT RELEASE_LOCK('timon_generar_recibos')");
        }
    });
});

describe('O-10: borrado de un recibo completo con cargos pagados', () => {
    test('sin la opción de administrador responde 409 y con forzar lo borra', async () => {
        const concepto = 'zz-O10 cargos pagados';
        const [alta] = await db.query("INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, cuenta_id, propietario_id, fecha_inicial) VALUES (?, 'mensual', 10, 1, 1, 1, '2026-01-05')", [concepto]);
        const reciboId = alta.insertId;
        await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, '2026-01-05', 'cargado', '', 1), (?, '2026-02-05', 'pendiente', '', 1)", [reciboId, reciboId]);

        const hoy = new Date(2026, 5, 15);

        await assert.rejects(() => deleteRecibo(reciboId, null, 'mensual', hoy), (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.message, 'No se puede borrar un recibo con cargos pagados.');

            return true;
        });

        assert.equal(await contarRecibos(concepto), 1, 'el recibo debe seguir existiendo tras el 409');

        assert.equal(await deleteRecibo(reciboId, null, 'mensual', hoy, true), true);
        assert.equal(await contarRecibos(concepto), 0, 'con forzar debe borrarse el recibo completo');
    });
});

