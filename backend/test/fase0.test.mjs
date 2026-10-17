// Pruebas de la fase 0 (registro de hallazgos: doc/mantenimiento/registro-hallazgos.md).
// 1) Paridad del entorno de pruebas con el entorno de referencia.
// 2) F-01: las altas de la aplicación deben incluir propietario_id.
// Requiere el servicio de docker-compose.test.yml (ver backend/test/README.md).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
    const baseline = await readFile(new URL('../src/db/migrations/0001_baseline.sql', import.meta.url), 'utf8');
    await db.query(baseline);
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
    test('14 tablas y 18 claves foráneas', async () => {
        const [[v]] = await db.query(
            `SELECT
               (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?) AS tablas,
               (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY') AS fks`,
            [dbName, dbName]
        );
        assert.equal(Number(v.tablas), 14);
        assert.equal(Number(v.fks), 18);
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
