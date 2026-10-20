// Pruebas de la fase 0 (registro de hallazgos: doc/mantenimiento/registro-hallazgos.md).
// 1) Paridad del entorno de pruebas con el entorno de referencia.
// 2) F-01: las altas de la aplicación deben incluir propietario_id.
// Requiere el servicio de docker-compose.test.yml (ver backend/test/README.md).
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, describe, test } from 'node:test';
import mysql from 'mysql2/promise';

const dbName = process.env.TEST_DB_NAME ?? 'conta_hogar_test';
const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

// Salvaguarda: estas pruebas borran y recrean la base indicada.
if (!/^[a-z0-9_]+_test$/.test(dbName)) {
    throw new Error(`TEST_DB_NAME debe terminar en _test (recibido: ${dbName}).`);
}

let db;

before(async () => {
    const admin = await mysql.createConnection(conexion);
    await admin.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(dbName)}`);
    await admin.query(`CREATE DATABASE ${mysql.escapeId(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci`);
    await admin.end();

    db = await mysql.createConnection({ ...conexion, database: dbName });
    const migraciones = (await readdir(new URL('../src/db/migrations/', import.meta.url))).filter((f) => f.endsWith('.sql')).sort();
    for (const fichero of migraciones) {
        await db.query(await readFile(new URL(`../src/db/migrations/${fichero}`, import.meta.url), 'utf8'));
    }
    await db.query(`INSERT INTO users (id, username, email, password, rol) VALUES (2, 'tester', 'tester@example.test', 'x', 'admin')`);
    await db.query(`INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (1, 'Cuenta de prueba', 'corriente', 'ES0000000000000000000001', 2)`);
});

after(async () => {
    if (db) await db.end();
    const admin = await mysql.createConnection(conexion);
    await admin.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(dbName)}`);
    await admin.end();
});

describe('paridad con el entorno de referencia', () => {
    test('configuración del servidor', async () => {
        const [[v]] = await db.query(
            'SELECT @@global.sql_mode AS sql_mode, @@global.transaction_isolation AS aislamiento, @@character_set_server AS juego, @@collation_server AS colacion, @@global.time_zone AS zona, @@event_scheduler AS eventos'
        );
        assert.equal(v.sql_mode, 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION');
        assert.equal(v.aislamiento, 'READ-COMMITTED');
        assert.equal(v.juego, 'utf8mb4');
        assert.equal(v.colacion, 'utf8mb4_spanish_ci');
        assert.equal(v.zona, '+00:00');
        assert.equal(v.eventos, 'ON');
    });

    test('las zonas horarias están cargadas', async () => {
        const [[v]] = await db.query(`SELECT DATE_FORMAT(CONVERT_TZ('2026-10-17 12:00:00', '+00:00', 'Europe/Madrid'), '%Y-%m-%d %H:%i:%s') AS madrid`);
        assert.equal(v.madrid, '2026-10-17 14:00:00');
    });
});

describe('esquema de la línea base', () => {
    test('14 tablas y 19 claves foráneas', async () => {
        const [[v]] = await db.query(
            `SELECT
               (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?) AS tablas,
               (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY') AS fks`,
            [dbName, dbName]
        );
        assert.equal(Number(v.tablas), 14);
        assert.equal(Number(v.fks), 19);
    });

    test('propietario_id es obligatorio y no tiene valor por defecto', async () => {
        const [filas] = await db.query(
            `SELECT TABLE_NAME AS tabla FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'propietario_id' AND IS_NULLABLE = 'NO' AND COLUMN_DEFAULT IS NULL
             ORDER BY TABLE_NAME`,
            [dbName]
        );
        assert.deepEqual(
            filas.map((f) => f.tabla),
            ['ahorros', 'anticipos', 'categorias', 'cuentas', 'presupuestos', 'recibos']
        );
    });
});

describe('F-01: altas de la aplicación con propietario_id', () => {
    // Sentencias copiadas de db_utilsSav, db_utilsAdv, db_utilsAcc y db_utilsCats.
    // Mantenerlas sincronizadas con los INSERT de la aplicación, que deben incluir propietario_id (F-01).
    const altas = [
        ['ahorros', 'INSERT INTO ahorros (concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo, propietario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Prueba', null, 0, null, null, 0, 1, 2]],
        ['anticipos', 'INSERT INTO anticipos (concepto, importe_total, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad, propietario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['Prueba', 100, 10, '2026-01-01', null, null, 'activo', 1, 'mensual', 2]],
        ['cuentas', 'INSERT INTO cuentas (nombre, tipo, iban, saldo_actual, descripcion, activa, propietario_id) VALUES (?, ?, ?, ?, ?, ?, ?)', ['Prueba', 'corriente', 'ES0000000000000000000002', 0, null, 1, 2]],
        ['categorias', 'INSERT INTO categorias (nombre, descripcion, propietario_id) VALUES (?, ?, ?)', ['zz_prueba', null, 2]]
    ];

    for (const [tabla, sql, params] of altas) {
        test(`la sentencia de la aplicación crea un registro en ${tabla}`, async () => {
            await db.beginTransaction();
            try {
                await db.execute(sql, params);
            } finally {
                await db.rollback();
            }
        });
    }

    test('control: la misma alta de categorías con propietario_id funciona', async () => {
        await db.beginTransaction();
        try {
            await db.execute('INSERT INTO categorias (nombre, descripcion, propietario_id) VALUES (?, ?, ?)', ['zz_control', null, 2]);
        } finally {
            await db.rollback();
        }
    });
});

describe('F-06: IBAN opcional en cuentas', () => {
    const alta = 'INSERT INTO cuentas (nombre, tipo, iban, saldo_actual, descripcion, activa, propietario_id) VALUES (?, ?, ?, ?, ?, ?, ?)';

    test('varias cuentas sin IBAN (NULL) se admiten', async () => {
        await db.beginTransaction();
        try {
            await db.execute(alta, ['Sin IBAN 1', 'corriente', null, 0, null, 1, 2]);
            await db.execute(alta, ['Sin IBAN 2', 'corriente', null, 0, null, 1, 2]);
        } finally {
            await db.rollback();
        }
    });

    test('la cadena vacía no sirve como «sin IBAN»: la segunda falla por duplicado', async () => {
        await db.beginTransaction();
        try {
            await db.execute(alta, ['Vacío 1', 'corriente', '', 0, null, 1, 2]);
            await assert.rejects(() => db.execute(alta, ['Vacío 2', 'corriente', '', 0, null, 1, 2]), { code: 'ER_DUP_ENTRY' });
        } finally {
            await db.rollback();
        }
    });
});

describe('DC-14: esquema de recibo por año', () => {
    const altaRecibo = 'INSERT INTO recibos (concepto, periodicidad, importe, cuenta_id, propietario_id, fecha_inicial, recibo_origen_id) VALUES (?, ?, ?, ?, ?, ?, ?)';

    test('fechas_cargo tiene importe y recibos tiene recibo_origen_id y replicar', async () => {
        const [filas] = await db.query(
            `SELECT CONCAT(TABLE_NAME, '.', COLUMN_NAME) AS columna FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND ((TABLE_NAME = 'fechas_cargo' AND COLUMN_NAME = 'importe') OR (TABLE_NAME = 'recibos' AND COLUMN_NAME IN ('recibo_origen_id', 'replicar')))
             ORDER BY 1`,
            [dbName]
        );
        assert.deepEqual(
            filas.map((f) => f.columna),
            ['fechas_cargo.importe', 'recibos.recibo_origen_id', 'recibos.replicar']
        );
    });

    test('replicar vale 1 por defecto', async () => {
        await db.beginTransaction();
        try {
            const [recibo] = await db.execute(altaRecibo, ['Prueba DC-14', 'anual', 10, 1, 2, '2026-03-15', null]);
            const [[fila]] = await db.execute('SELECT replicar FROM recibos WHERE id = ?', [recibo.insertId]);
            assert.equal(fila.replicar, 1);
        } finally {
            await db.rollback();
        }
    });

    test('un recibo solo puede tener un sucesor', async () => {
        await db.beginTransaction();
        try {
            const [origen] = await db.execute(altaRecibo, ['Origen', 'anual', 10, 1, 2, '2026-03-15', null]);
            await db.execute(altaRecibo, ['Sucesor', 'anual', 10, 1, 2, '2027-03-15', origen.insertId]);
            await assert.rejects(() => db.execute(altaRecibo, ['Segundo sucesor', 'anual', 10, 1, 2, '2027-03-15', origen.insertId]), { code: 'ER_DUP_ENTRY' });
        } finally {
            await db.rollback();
        }
    });

    test('no se puede borrar un recibo que tiene sucesor', async () => {
        await db.beginTransaction();
        try {
            const [origen] = await db.execute(altaRecibo, ['Origen', 'anual', 10, 1, 2, '2026-03-15', null]);
            await db.execute(altaRecibo, ['Sucesor', 'anual', 10, 1, 2, '2027-03-15', origen.insertId]);
            await assert.rejects(() => db.execute('DELETE FROM recibos WHERE id = ?', [origen.insertId]), { code: 'ER_ROW_IS_REFERENCED_2' });
        } finally {
            await db.rollback();
        }
    });
});
