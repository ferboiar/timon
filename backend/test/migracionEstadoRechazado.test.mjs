// DC-01 / F-15: transición de la migración 0009 (estado `rechazado` en fechas_cargo).
// =================================================================================
// Comprueba el paso del esquema anterior (0001…0008, ENUM de dos valores) al nuevo,
// su repetibilidad, la vuelta `rechazado` → `pendiente`, que `pushRecibo` no escribe
// historial, que pasar de `cargado` a `rechazado` vacía el importe fijado (DC-15) y
// que un cargo rechazado de un año anterior entra en los atrasados (DC-01).
//
// No existe un ayudante compartido `crearBasePruebas`: se replica `crearBase` de
// `mantenimientoEsquema.test.mjs` (mismo patrón de permisos `conta_hogar_%_test`).
// Si el usuario de pruebas no puede crear la base, la prueba FALLA con el error real:
// no se omite, porque una omisión no es evidencia.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, describe, test } from 'node:test';

import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_dc01_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

const MIGRACION_0009 = '0009_fechas_cargo_estado_rechazado.sql';

let db;
let admin;
let cerrarPool;
let pushRecibo, getRecibos;

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

/** Definición exacta de fechas_cargo.estado en la base de la prueba. */
async function definicionEstado() {
    const [[columna]] = await db.query(
        `SELECT COLUMN_TYPE AS tipo, IS_NULLABLE AS nula, CHARACTER_SET_NAME AS juego, COLLATION_NAME AS colacion
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'fechas_cargo' AND COLUMN_NAME = 'estado'`,
        [dbName]
    );

    return columna;
}

/** Id del recibo por su concepto (pushRecibo no devuelve el id del alta: devuelve el resumen de fechas). */
async function idDelRecibo(concepto) {
    const [filas] = await db.query('SELECT id FROM recibos WHERE concepto = ?', [concepto]);

    assert.equal(filas.length, 1, `debe existir un recibo «${concepto}»`);

    return filas[0].id;
}

before(async () => {
    admin = await mysql.createConnection(conexion);
    await crearBase(dbName);

    db = await mysql.createConnection({ ...conexion, database: dbName });

    // Esquema anterior: se aplican todas las migraciones menos la 0009
    const migraciones = (await readdir(new URL('../src/db/migrations/', import.meta.url))).filter((f) => f.endsWith('.sql') && f !== MIGRACION_0009).sort();

    for (const fichero of migraciones) {
        await ejecutarMigracion(db, await readFile(new URL(`../src/db/migrations/${fichero}`, import.meta.url), 'utf8'));
    }

    await db.query(`INSERT INTO users (id, username, email, password, rol) VALUES (1, 'dc01_admin', 'dc01_admin@example.test', 'x', 'admin')`);
    await db.query(`INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (1, 'Cuenta DC-01', 'corriente', 'ES0000000000000000000101', 1)`);
    await db.query(`INSERT INTO categorias (id, nombre, descripcion, propietario_id) VALUES (1, 'General', NULL, 1)`);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName
    });

    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    ({ getRecibos, pushRecibo } = await import('../src/db/db_utils.mjs'));
});

after(async () => {
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();
    if (admin) {
        await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(dbName));
        await admin.end();
    }
});

describe('Migración 0009: ENUM de fechas_cargo (DC-01)', () => {
    const sql0009 = () => readFile(new URL(`../src/db/migrations/${MIGRACION_0009}`, import.meta.url), 'utf8');

    test('el esquema anterior solo admite cargado y pendiente', async () => {
        const columna = await definicionEstado();

        assert.equal(columna.tipo, "enum('cargado','pendiente')");
        assert.equal(columna.nula, 'NO');
    });

    test('amplía el ENUM y conserva NOT NULL, charset y collation', async () => {
        await ejecutarMigracion(db, await sql0009());

        assert.deepEqual(await definicionEstado(), {
            tipo: "enum('cargado','pendiente','rechazado')",
            nula: 'NO',
            juego: 'utf8mb4',
            colacion: 'utf8mb4_spanish_ci'
        });
    });

    test('es repetible y no cambia la definición al aplicarla otra vez', async () => {
        await ejecutarMigracion(db, await sql0009());

        assert.equal((await definicionEstado()).tipo, "enum('cargado','pendiente','rechazado')");
    });

    test('admite rechazado, vuelve a pendiente y rechaza un valor fuera del ENUM', async () => {
        const [recibo] = await db.execute(
            "INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, propietario_id, cuenta_id, fecha_inicial) VALUES ('zz-dc01-estado', 'mensual', 10, 1, 1, 1, '2026-05-10')"
        );
        const [cargo] = await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, '2026-05-10', 'pendiente', '', 1)", [recibo.insertId]);

        await db.execute("UPDATE fechas_cargo SET estado = 'rechazado' WHERE id = ?", [cargo.insertId]);
        const [[rechazado]] = await db.query('SELECT estado FROM fechas_cargo WHERE id = ?', [cargo.insertId]);
        assert.equal(rechazado.estado, 'rechazado');

        await db.execute("UPDATE fechas_cargo SET estado = 'pendiente' WHERE id = ?", [cargo.insertId]);
        const [[pendiente]] = await db.query('SELECT estado FROM fechas_cargo WHERE id = ?', [cargo.insertId]);
        assert.equal(pendiente.estado, 'pendiente');

        // El servidor de referencia está en modo estricto (fase0): fuera del ENUM no se guarda
        await assert.rejects(() => db.execute("UPDATE fechas_cargo SET estado = 'pagado' WHERE id = ?", [cargo.insertId]), /Data truncated|Incorrect enum value/i);
    });
});

describe('pushRecibo con rechazado (DC-01)', () => {
    const cargoDe = (fecha, extra = {}) => ({ fecha, estado: 'pendiente', comentario: '', activo: 1, ...extra });

    test('guarda el estado y no escribe historial ni añade filas', async () => {
        await pushRecibo(undefined, 'zz-dc01-rechazado', 'mensual', 10, 'General', [cargoDe('2026-05-10', { estado: 'rechazado' })], 1, 1, undefined, 'manual');
        const id = await idDelRecibo('zz-dc01-rechazado');
        const [cargos] = await db.query('SELECT id, estado, comentario FROM fechas_cargo WHERE recibo_id = ?', [id]);

        assert.deepEqual(cargos.map((c) => c.estado), ['rechazado']);
        assert.equal(cargos[0].comentario, '');

        await pushRecibo(id, 'zz-dc01-rechazado', 'mensual', 10, 'General', [{ id: cargos[0].id, fecha: '2026-05-10', estado: 'rechazado', comentario: '', activo: 1 }], 1, 1, undefined, 'manual');

        const [[despues]] = await db.query('SELECT COUNT(*) AS total FROM fechas_cargo WHERE recibo_id = ?', [id]);
        assert.equal(Number(despues.total), 1, 'rechazado no debe añadir filas de historial');

        const [historicos] = await db.query("SHOW TABLES LIKE '%historico%'");
        assert.deepEqual(historicos, [], 'no debe existir tabla de historial (DC-14)');
    });

    test('pasar de cargado a rechazado vacía el importe fijado (DC-15)', async () => {
        await pushRecibo(undefined, 'zz-dc01-importe', 'mensual', 10, 'General', [cargoDe('2026-06-10', { estado: 'cargado', importe: 37.5 })], 1, 1, undefined, 'manual');
        const id = await idDelRecibo('zz-dc01-importe');
        const [[cargado]] = await db.query('SELECT id, importe FROM fechas_cargo WHERE recibo_id = ?', [id]);

        assert.equal(Number(cargado.importe), 37.5);

        await pushRecibo(id, 'zz-dc01-importe', 'mensual', 10, 'General', [{ id: cargado.id, fecha: '2026-06-10', estado: 'rechazado', comentario: '', activo: 1 }], 1, 1, undefined, 'manual');

        const [[rechazado]] = await db.query('SELECT estado, importe FROM fechas_cargo WHERE id = ?', [cargado.id]);
        assert.equal(rechazado.estado, 'rechazado');
        assert.equal(rechazado.importe, null);
    });
});

describe('Atrasados con rechazado (DC-01)', () => {
    // Mismo formato que BillService.getOverdueBills: '1900-01-01a' + (año - 1) + '-12-31'
    const RANGO_ATRASADOS = '1900-01-01a2025-12-31';

    test('el cargo rechazado de un año anterior aparece como atrasado', async () => {
        await pushRecibo(undefined, 'zz-dc01-atrasado', 'mensual', 10, 'General', [{ fecha: '2025-05-10', estado: 'rechazado', comentario: '', activo: 1 }], 1, 1, '2025-05-10', 'manual');

        const atrasados = await getRecibos({ periodicidad: 'mensual', estado: 'pendiente,rechazado', fecha: RANGO_ATRASADOS });
        assert.ok(atrasados.some((fila) => fila.concepto === 'zz-dc01-atrasado'), 'un rechazado sigue debiéndose y entra en atrasados');

        const soloPendientes = await getRecibos({ periodicidad: 'mensual', estado: 'pendiente', fecha: RANGO_ATRASADOS });
        assert.equal(soloPendientes.some((fila) => fila.concepto === 'zz-dc01-atrasado'), false);
    });

    test('un estado fuera del ENUM en el filtro es un error de negocio', async () => {
        await assert.rejects(() => getRecibos({ estado: 'pendiente,pagado' }), /El estado del cargo debe ser uno de los siguientes/);
        await assert.rejects(() => getRecibos({ estado: '' }), /El estado del cargo debe ser uno de los siguientes/);
    });
});

describe('F-15: el modo automático no escribe «Fecha inicial»', () => {
    test('todas las fechas generadas se guardan con comentario vacío', async () => {
        await pushRecibo(undefined, 'zz-f15-auto', 'trimestral', 10, 'General', [], 1, 1, '2026-01-15', 'auto');
        const id = await idDelRecibo('zz-f15-auto');
        const [cargos] = await db.query("SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, comentario FROM fechas_cargo WHERE recibo_id = ? ORDER BY fecha", [id]);

        assert.ok(cargos.length >= 4, 'un trimestral en 2026 debe generar al menos cuatro fechas');
        assert.deepEqual(
            cargos.map((c) => c.comentario),
            cargos.map(() => '')
        );
    });
});

