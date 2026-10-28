// Pruebas de la fase 0 (registro de hallazgos: doc/mantenimiento/registro-hallazgos.md).
// 1) Paridad del entorno de pruebas con el entorno de referencia.
// 2) F-01: las altas de la aplicación deben incluir propietario_id.
// Requiere el servicio de docker-compose.test.yml (ver backend/test/README.md).
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, test } from 'node:test';
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

// Ejecuta una migración; si usa DELIMITER (procedimientos y eventos) la parte como lo hace el cliente de línea de comandos
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
let db;
let cerrarPool;
let completarFechasAnio, deleteRecibo, fechasFaltantes, generarFechasDelAnio, getRecibos, importeDelCargo, pushRecibo;

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
    await db.query(`INSERT INTO users (id, username, email, password, rol) VALUES (2, 'tester', 'tester@example.test', 'x', 'admin')`);
    await db.query(`INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (1, 'Cuenta de prueba', 'corriente', 'ES0000000000000000000001', 2)`);
    await db.query(`INSERT INTO categorias (id, nombre, descripcion, propietario_id) VALUES (1, 'General', NULL, 2)`);
    // Las funciones reales de la aplicación se conectan a la base de pruebas (dotenv no pisa las variables ya definidas)
    Object.assign(process.env, { DB_HOST: conexion.host, DB_PORT: String(conexion.port), DB_USER: conexion.user, DB_PASSWORD: conexion.password, DB_DATABASE: dbName });
    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    ({ completarFechasAnio, deleteRecibo, fechasFaltantes, generarFechasDelAnio, getRecibos, importeDelCargo, pushRecibo } = await import('../src/db/db_utils.mjs'));
});

after(async () => {
    if (cerrarPool) await cerrarPool();
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

describe('DC-14 a DC-18: lógica de recibos con las funciones reales de la aplicación', () => {
    const crear = async (concepto, periodicidad, fechaInicial, importe = 35) => {
        await pushRecibo(undefined, concepto, periodicidad, importe, 'General', undefined, 2, 1, fechaInicial, 'auto');
        const [[fila]] = await db.query('SELECT id FROM recibos WHERE concepto = ?', [concepto]);
        return fila.id;
    };
    const cargosDe = async (reciboId) => {
        const [filas] = await db.query("SELECT id, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, estado, importe FROM fechas_cargo WHERE recibo_id = ? ORDER BY fecha", [reciboId]);
        return filas;
    };
    const actualizarCargos = (id, concepto, periodicidad, importe, cargo) => pushRecibo(id, concepto, periodicidad, importe, 'General', cargo, 2, 1, undefined, 'manual');

    test('generarFechasDelAnio: un trimestral que empieza en agosto solo llega a noviembre', () => {
        assert.deepEqual(
            generarFechasDelAnio('2026-08-15', 'trimestral').map((f) => f.fecha),
            ['2026-08-15', '2026-11-15']
        );
    });

    test('generarFechasDelAnio: un año completo da 12, 6, 4 y 1 fechas', () => {
        assert.equal(generarFechasDelAnio('2026-01-09', 'mensual').length, 12);
        assert.equal(generarFechasDelAnio('2026-01-07', 'bimestral').length, 6);
        assert.deepEqual(
            generarFechasDelAnio('2026-01-09', 'trimestral').map((f) => f.fecha),
            ['2026-01-09', '2026-04-09', '2026-07-09', '2026-10-09']
        );
        assert.equal(generarFechasDelAnio('2026-05-26', 'anual').length, 1);
    });

    test('generarFechasDelAnio: ajusta al último día del mes sin acumular desvíos', () => {
        assert.deepEqual(
            generarFechasDelAnio('2026-10-31', 'mensual').map((f) => f.fecha),
            ['2026-10-31', '2026-11-30', '2026-12-31']
        );
        const bisiesto = generarFechasDelAnio('2028-01-31', 'mensual').map((f) => f.fecha);
        assert.equal(bisiesto[1], '2028-02-29');
        assert.equal(bisiesto[2], '2028-03-31');
    });

    test('importeDelCargo: vacío si no está cargado; si lo está, el indicado, el que tenía o el del recibo', () => {
        assert.equal(importeDelCargo('pendiente', { estado: 'cargado', importe: '35.00' }, {}, 40), null);
        assert.equal(importeDelCargo('pendiente', { estado: 'pendiente', importe: '20.00' }, {}, 40), 20);
        assert.equal(importeDelCargo('pendiente', { estado: 'pendiente', importe: null }, { importe: 52.3 }, 40), 52.3);
        assert.equal(importeDelCargo('pendiente', { estado: 'pendiente', importe: '20.00' }, { importe: 40 }, 40), null);
        assert.equal(importeDelCargo('cargado', null, { importe: 37.5 }, 40), 37.5);
        assert.equal(importeDelCargo('cargado', { importe: '35.00' }, {}, 40), 35);
        assert.equal(importeDelCargo('cargado', { importe: null }, {}, 40), 40);
        assert.throws(() => importeDelCargo('cargado', null, { importe: -1 }, 40), /importe del cargo/);
    });

    test('el alta automática solo crea fechas del año de fecha_inicial', async () => {
        const id = await crear('DC16 trimestral agosto', 'trimestral', '2026-08-15');
        const cargos = await cargosDe(id);
        assert.deepEqual(
            cargos.map((c) => c.fecha),
            ['2026-08-15', '2026-11-15']
        );
        assert.ok(cargos.every((c) => c.estado === 'pendiente' && c.importe === null));
    });

    test('al pagar un cargo se guarda su importe y se conserva si cambia el del recibo', async () => {
        const concepto = 'DC15 pago e importe';
        const id = await crear(concepto, 'trimestral', '2026-01-09');
        let cargos = await cargosDe(id);
        assert.equal(cargos.length, 4);

        await actualizarCargos(id, concepto, 'trimestral', 35, [{ id: cargos[0].id, fecha: '2026-01-09', estado: 'cargado', comentario: '', activo: 1 }]);
        await actualizarCargos(id, concepto, 'trimestral', 35, [{ id: cargos[1].id, fecha: '2026-04-09', estado: 'cargado', comentario: '', activo: 1, importe: 37.5 }]);
        cargos = await cargosDe(id);
        assert.deepEqual(
            cargos.map((c) => c.importe),
            ['35.00', '37.50', null, null]
        );

        // Cambiar el importe del recibo no altera lo ya pagado
        await actualizarCargos(id, concepto, 'trimestral', 40, [{ id: cargos[0].id, fecha: '2026-01-09', estado: 'cargado', comentario: '', activo: 1 }]);
        cargos = await cargosDe(id);
        assert.equal(cargos[0].importe, '35.00');

        // Volver a pendiente vacía el importe
        await actualizarCargos(id, concepto, 'trimestral', 40, [{ id: cargos[1].id, fecha: '2026-04-09', estado: 'pendiente', comentario: '', activo: 1 }]);
        cargos = await cargosDe(id);
        assert.equal(cargos[1].importe, null);

    });

    test('un cargo pendiente puede tener un importe propio; si coincide con el del recibo, lo sigue', async () => {
        const concepto = 'DC15 importe propio';
        const id = await crear(concepto, 'mensual', '2026-10-05', 30);
        let cargos = await cargosDe(id);
        assert.equal(cargos.length, 3);

        await actualizarCargos(id, concepto, 'mensual', 30, [{ id: cargos[1].id, fecha: '2026-11-05', estado: 'pendiente', comentario: '', activo: 1, importe: 52.3 }]);
        cargos = await cargosDe(id);
        assert.deepEqual(
            cargos.map((c) => c.importe),
            [null, '52.30', null]
        );

        // Guardar sin indicar importe no lo pierde
        await actualizarCargos(id, concepto, 'mensual', 30, [{ id: cargos[1].id, fecha: '2026-11-05', estado: 'pendiente', comentario: 'luz', activo: 1 }]);
        cargos = await cargosDe(id);
        assert.equal(cargos[1].importe, '52.30');

        // Al volver al importe del recibo, el cargo vuelve a seguirlo
        await actualizarCargos(id, concepto, 'mensual', 30, [{ id: cargos[1].id, fecha: '2026-11-05', estado: 'pendiente', comentario: 'luz', activo: 1, importe: 30 }]);
        cargos = await cargosDe(id);
        assert.equal(cargos[1].importe, null);
    });

    test('se puede borrar una sola fecha de un recibo mensual', async () => {
        const id = await crear('DC18 mensual fecha', 'mensual', '2026-10-05');
        assert.equal(await deleteRecibo(id, '2026-11-05', 'mensual'), true);
        assert.deepEqual(
            (await cargosDe(id)).map((c) => c.fecha),
            ['2026-10-05', '2026-12-05']
        );
        const [[recibo]] = await db.query('SELECT COUNT(*) AS total FROM recibos WHERE id = ?', [id]);
        assert.equal(Number(recibo.total), 1);
    });

    test('fechasFaltantes: generables son las posteriores al último cargo y los huecos aún no alcanzados', () => {
        const hoy = new Date(2026, 9, 21);
        const faltan = (ancla, periodicidad, existentes) => fechasFaltantes(ancla, periodicidad, existentes, 2026, hoy).map((f) => [f.fecha, f.generable]);
        // Posteriores al último cargo: todas son generables, aunque ya hayan pasado
        assert.deepEqual(faltan('2025-08-18', 'trimestral', ['2025-08-18', '2025-11-18', '2026-02-18']), [['2026-05-18', true], ['2026-08-18', true], ['2026-11-18', true]]);
        // Hueco intermedio con fecha ya pasada: se puede añadir a mano, pero no se genera
        assert.deepEqual(faltan('2025-08-18', 'trimestral', ['2025-08-18', '2025-11-18', '2026-02-18', '2026-08-18', '2026-11-18']), [['2026-05-18', false]]);
        // Hueco intermedio con fecha futura: se genera
        assert.deepEqual(faltan('2026-10-05', 'mensual', ['2026-10-05', '2026-12-05']), [['2026-11-05', true]]);
        // Un ejercicio cerrado no se completa, y un recibo completo tampoco
        assert.deepEqual(faltan('2025-01-09', 'trimestral', ['2025-01-09', '2025-04-25', '2025-07-25']), []);
        assert.deepEqual(faltan('2026-10-21', 'mensual', ['2026-10-21', '2026-11-21', '2026-12-21']), []);
        // Nunca antes de la fecha inicial; el día se ajusta al último del mes
        assert.deepEqual(faltan('2026-01-31', 'mensual', ['2026-01-31', '2026-10-31']), [
            ['2026-02-28', false], ['2026-03-31', false], ['2026-04-30', false], ['2026-05-31', false], ['2026-06-30', false], ['2026-07-31', false], ['2026-08-31', false], ['2026-09-30', false],
            ['2026-11-30', true], ['2026-12-31', true]
        ]);
        assert.deepEqual(faltan('2026-03-15', 'anual', ['2026-03-15']), []);
    });

    test('completarFechasAnio añade las posteriores al último cargo y deja los huecos pasados', async () => {
        const id = await crear('DC16 completar año', 'trimestral', '2026-01-09');
        await db.query('DELETE FROM fechas_cargo WHERE recibo_id = ? AND fecha = ?', [id, '2026-04-09']); // hueco que ya ha pasado
        await db.query('DELETE FROM fechas_cargo WHERE recibo_id = ? AND fecha > ?', [id, '2026-07-09']); // y el último cargo
        const hoy = new Date(2026, 9, 21);

        assert.equal(await completarFechasAnio(id, 2026, hoy), 1);
        assert.deepEqual(
            (await cargosDe(id)).map((c) => c.fecha),
            ['2026-01-09', '2026-07-09', '2026-10-09']
        );
        assert.equal(await completarFechasAnio(id, 2026, hoy), 0);

        // Con el año en curso posterior al de la última fecha, el ejercicio está cerrado
        await assert.rejects(() => completarFechasAnio(id, 2027, hoy), { status: 409 });
    });

    test('completarFechasAnio rellena un hueco intermedio cuya fecha aún no ha llegado', async () => {
        const id = await crear('DC16 hueco futuro', 'mensual', '2026-10-05');
        await db.query('DELETE FROM fechas_cargo WHERE recibo_id = ? AND fecha = ?', [id, '2026-11-05']);
        assert.equal(await completarFechasAnio(id, 2026, new Date(2026, 9, 21)), 1);
        assert.deepEqual(
            (await cargosDe(id)).map((c) => c.fecha),
            ['2026-10-05', '2026-11-05', '2026-12-05']
        );
    });

    test('getRecibos devuelve importe_cargo junto al importe del recibo', async () => {
        const concepto = 'DC15 lectura';
        const id = await crear(concepto, 'bimestral', '2026-01-07', 69);
        const cargos = await cargosDe(id);
        await actualizarCargos(id, concepto, 'bimestral', 69, [{ id: cargos[0].id, fecha: '2026-01-07', estado: 'cargado', comentario: '', activo: 1, importe: 65.5 }]);
        const filas = await getRecibos({ concepto });
        assert.equal(filas.length, 6);
        const pagada = filas.find((f) => f.estado === 'cargado');
        assert.equal(pagada.importe, '69.00');
        assert.equal(pagada.importe_cargo, '65.50');
        assert.ok(filas.filter((f) => f.estado === 'pendiente').every((f) => f.importe_cargo === null));
    });

    test('no se borra un recibo ni una fecha con cargos pagados (409)', async () => {
        const concepto = 'DC18 borrado bloqueado';
        const id = await crear(concepto, 'trimestral', '2026-01-09');
        const cargos = await cargosDe(id);
        await actualizarCargos(id, concepto, 'trimestral', 35, [{ id: cargos[0].id, fecha: '2026-01-09', estado: 'cargado', comentario: '', activo: 1 }]);

        await assert.rejects(() => deleteRecibo(id, null, 'trimestral'), { status: 409 });
        await assert.rejects(() => deleteRecibo(id, '2026-01-09', 'trimestral', new Date(2026, 9, 21)), { status: 409 });
        assert.equal((await cargosDe(id)).length, 4);

        assert.equal(await deleteRecibo(id, '2026-04-09', 'trimestral'), true);
        assert.equal((await cargosDe(id)).length, 3);
    });

    test('un cargo pagado solo se puede borrar durante su mes; los de meses anteriores quedan cerrados', async () => {
        const concepto = 'DC18 pagado del mes';
        const id = await crear(concepto, 'mensual', '2026-10-05');
        const cargos = await cargosDe(id);
        await actualizarCargos(id, concepto, 'mensual', 35, [{ id: cargos[0].id, fecha: '2026-10-05', estado: 'cargado', comentario: '', activo: 1 }]);
        await actualizarCargos(id, concepto, 'mensual', 35, [{ id: cargos[1].id, fecha: '2026-11-05', estado: 'cargado', comentario: '', activo: 1 }]);

        const hoy = new Date(2026, 10, 20);
        await assert.rejects(() => deleteRecibo(id, '2026-10-05', 'mensual', hoy), { status: 409 }); // octubre ya está cerrado
        assert.equal(await deleteRecibo(id, '2026-11-05', 'mensual', hoy), true); // noviembre es el mes en curso
        assert.deepEqual(
            (await cargosDe(id)).map((c) => c.fecha),
            ['2026-10-05', '2026-12-05']
        );
    });

    test('se borra un recibo sin cargos pagados con todas sus fechas', async () => {
        const id = await crear('DC18 borrado libre', 'bimestral', '2026-01-07');
        assert.equal(await deleteRecibo(id, null, 'bimestral'), true);
        const [[recibos]] = await db.query('SELECT COUNT(*) AS total FROM recibos WHERE id = ?', [id]);
        assert.equal(Number(recibos.total), 0);
        assert.equal((await cargosDe(id)).length, 0);
        assert.equal(await deleteRecibo(id, null, 'bimestral'), false);
    });

    test('con sucesor no se borra el origen; al borrar el sucesor el origen deja de replicarse', async () => {
        const origen = await crear('DC18 origen', 'anual', '2026-03-15');
        const [sucesor] = await db.execute('INSERT INTO recibos (concepto, periodicidad, importe, cuenta_id, propietario_id, fecha_inicial, recibo_origen_id) VALUES (?, ?, ?, ?, ?, ?, ?)', ['DC18 sucesor', 'anual', 35, 1, 2, '2027-03-15', origen]);
        await assert.rejects(() => deleteRecibo(origen, null, 'anual'), { status: 409 });
        assert.equal((await cargosDe(origen)).length, 1);

        assert.equal(await deleteRecibo(sucesor.insertId, null, 'anual'), true);
        const [[fila]] = await db.query('SELECT replicar FROM recibos WHERE id = ?', [origen]);
        assert.equal(fila.replicar, 0);
    });
});

describe('DC-14: un recibo no puede tener fechas de más de un año', () => {
    const crear = async (concepto, periodicidad, fechaInicial) => {
        await pushRecibo(undefined, concepto, periodicidad, 35, 'General', undefined, 2, 1, fechaInicial, 'auto');
        const [[fila]] = await db.query('SELECT id FROM recibos WHERE concepto = ?', [concepto]);
        return fila.id;
    };
    const fechasDe = async (reciboId) => (await db.query("SELECT id, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha FROM fechas_cargo WHERE recibo_id = ? ORDER BY fecha", [reciboId]))[0];
    const fechaInicialDe = async (reciboId) => (await db.query("SELECT DATE_FORMAT(fecha_inicial, '%Y-%m-%d') AS fecha FROM recibos WHERE id = ?", [reciboId]))[0][0].fecha;
    const guardar = (id, concepto, periodicidad, cargo, fechaInicial, modo, permitirFueraDeAnio) => pushRecibo(id, concepto, periodicidad, 35, 'General', cargo, 2, 1, fechaInicial, modo, permitirFueraDeAnio);
    const cargoDe = (fecha, extra = {}) => ({ fecha, estado: 'pendiente', comentario: '', activo: 1, ...extra });

    test('un alta manual con fechas de dos años se rechaza y no crea nada', async () => {
        await assert.rejects(() => guardar(undefined, 'DC14 alta dos años', 'bimestral', [cargoDe('2026-11-07'), cargoDe('2027-01-07')], undefined, 'manual'), /deben ser del año 2026.*2027-01-07/);
        const [[recibos]] = await db.query('SELECT COUNT(*) AS total FROM recibos WHERE concepto = ?', ['DC14 alta dos años']);
        assert.equal(Number(recibos.total), 0);
    });

    test('un alta manual con todas las fechas del mismo año se admite', async () => {
        await guardar(undefined, 'DC14 alta un año', 'bimestral', [cargoDe('2026-11-07'), cargoDe('2026-12-07')], undefined, 'manual');
        const [[fila]] = await db.query('SELECT id FROM recibos WHERE concepto = ?', ['DC14 alta un año']);
        assert.deepEqual((await fechasDe(fila.id)).map((c) => c.fecha), ['2026-11-07', '2026-12-07']);
    });

    test('en la edición manual no se puede llevar un cargo a otro año, pero sí moverlo dentro del año', async () => {
        const id = await crear('DC14 mover cargo', 'trimestral', '2026-01-09');
        const cargos = await fechasDe(id);
        await assert.rejects(() => guardar(id, 'DC14 mover cargo', 'trimestral', [cargoDe('2027-01-09', { id: cargos[3].id })], undefined, 'manual'), /deben ser del año 2026.*2027-01-09/);
        assert.deepEqual((await fechasDe(id)).map((c) => c.fecha), ['2026-01-09', '2026-04-09', '2026-07-09', '2026-10-09']);

        await guardar(id, 'DC14 mover cargo', 'trimestral', [cargoDe('2026-12-09', { id: cargos[3].id })], undefined, 'manual');
        assert.deepEqual((await fechasDe(id)).map((c) => c.fecha), ['2026-01-09', '2026-04-09', '2026-07-09', '2026-12-09']);
    });

    test('la fecha inicial de un recibo existente no puede cambiar de año', async () => {
        const id = await crear('DC14 fecha inicial', 'anual', '2026-03-15');
        const [cargo] = await fechasDe(id);
        await assert.rejects(() => guardar(id, 'DC14 fecha inicial', 'anual', [cargoDe('2026-03-15', { id: cargo.id })], '2027-03-15', 'manual'), /deben ser del año 2026.*2027-03-15/);
        assert.equal(await fechaInicialDe(id), '2026-03-15');
    });

    test('en automático no se reescriben fechas pendientes fuera del año; dentro del año sí', async () => {
        const id = await crear('DC14 automatico', 'mensual', '2026-10-05');
        await assert.rejects(() => guardar(id, 'DC14 automatico', 'mensual', undefined, '2026-11-05', 'auto'), /deben ser del año 2026.*2027-01-05/);
        assert.deepEqual((await fechasDe(id)).map((c) => c.fecha), ['2026-10-05', '2026-11-05', '2026-12-05']);
        assert.equal(await fechaInicialDe(id), '2026-10-05');

        const resultado = await guardar(id, 'DC14 automatico', 'mensual', undefined, '2026-10-06', 'auto');
        assert.deepEqual(resultado, { fechasReescritas: 3, fechasConservadas: 0 });
        assert.deepEqual((await fechasDe(id)).map((c) => c.fecha), ['2026-10-06', '2026-11-06', '2026-12-06']);
    });

    test('un cargo sin fecha (solo comentario o estado) no se valida contra el año', async () => {
        const id = await crear('DC14 comentario', 'trimestral', '2026-01-09');
        const cargos = await fechasDe(id);
        await guardar(id, 'DC14 comentario', 'trimestral', [{ id: cargos[0].id, comentario: 'solo comentario', estado: 'pendiente', activo: 1 }], undefined, 'manual');
        const [[fila]] = await db.query('SELECT comentario FROM fechas_cargo WHERE id = ?', [cargos[0].id]);
        assert.equal(fila.comentario, 'solo comentario');
    });

    test('con permitirFueraDeAnio se admiten fechas de otro año en el alta y en la edición (DC-29)', async () => {
        await guardar(undefined, 'DC29 alta dos años', 'bimestral', [cargoDe('2026-11-07'), cargoDe('2027-01-07')], undefined, 'manual', true);
        const [[alta]] = await db.query('SELECT id FROM recibos WHERE concepto = ?', ['DC29 alta dos años']);
        assert.deepEqual((await fechasDe(alta.id)).map((c) => c.fecha), ['2026-11-07', '2027-01-07']);

        const id = await crear('DC29 mover cargo', 'trimestral', '2026-01-09');
        const cargos = await fechasDe(id);
        await guardar(id, 'DC29 mover cargo', 'trimestral', [cargoDe('2027-01-09', { id: cargos[3].id })], undefined, 'manual', true);
        assert.deepEqual((await fechasDe(id)).map((c) => c.fecha), ['2026-01-09', '2026-04-09', '2026-07-09', '2027-01-09']);
    });
});

describe('Migración 0003: un recibo por año', () => {
    let sqlMigracion;
    const alta = async (concepto, periodicidad, fechaInicial, fechas) => {
        const [r] = await db.execute('INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, cuenta_id, propietario_id, fecha_inicial) VALUES (?, ?, ?, 1, 1, 2, ?)', [concepto, periodicidad, 20, fechaInicial]);
        for (const [fecha, estado] of fechas) {
            await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, ?, '', 1)", [r.insertId, fecha, estado]);
        }
        return r.insertId;
    };
    const fechasDe = async (id) => (await db.query("SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha FROM fechas_cargo WHERE recibo_id = ? ORDER BY fecha", [id]))[0].map((f) => f.fecha);
    const recibos = async () => (await db.query("SELECT id, concepto, recibo_origen_id, DATE_FORMAT(fecha_inicial, '%Y-%m-%d') AS fecha_inicial FROM recibos ORDER BY id"))[0];

    before(async () => {
        sqlMigracion = await readFile(new URL('../src/db/migrations/0003_partir_recibos_por_anio.sql', import.meta.url), 'utf8');
    });

    beforeEach(async () => {
        await db.query('DELETE FROM fechas_cargo');
        await db.query('UPDATE recibos SET recibo_origen_id = NULL');
        await db.query('DELETE FROM recibos');
    });

    test('parte un recibo que cruza de año en un recibo por año, enlazados y con sus fechas', async () => {
        const x = await alta('X cruza año', 'trimestral', '2025-08-18', [['2025-08-18', 'cargado'], ['2025-11-18', 'pendiente'], ['2026-02-18', 'pendiente'], ['2026-05-18', 'pendiente']]);
        const unico = await alta('Y un año', 'anual', '2025-05-26', [['2025-05-26', 'pendiente']]);
        await db.query(sqlMigracion);

        const filas = await recibos();
        assert.equal(filas.length, 3);
        const parte = filas.find((r) => r.recibo_origen_id === x);
        assert.equal(parte.fecha_inicial, '2026-02-18');
        assert.deepEqual(await fechasDe(x), ['2025-08-18', '2025-11-18']);
        assert.deepEqual(await fechasDe(parte.id), ['2026-02-18', '2026-05-18']);
        assert.deepEqual(await fechasDe(unico), ['2025-05-26']);
        assert.equal(filas.find((r) => r.id === unico).recibo_origen_id, null);
        const [[pagado]] = await db.query("SELECT COUNT(*) AS total FROM fechas_cargo WHERE recibo_id = ? AND estado = 'cargado'", [x]);
        assert.equal(Number(pagado.total), 1);
    });

    test('en tres años cada trozo se enlaza con el anterior y la fecha inicial sigue la secuencia', async () => {
        const x = await alta('X tres años', 'trimestral', '2025-11-30', [['2025-11-30', 'pendiente'], ['2026-02-28', 'pendiente'], ['2027-02-28', 'pendiente']]);
        await db.query(sqlMigracion);

        const filas = await recibos();
        assert.equal(filas.length, 3);
        const de2026 = filas.find((r) => r.recibo_origen_id === x);
        const de2027 = filas.find((r) => r.recibo_origen_id === de2026.id);
        assert.equal(de2026.fecha_inicial, '2026-02-28');
        assert.equal(de2027.fecha_inicial, '2027-02-28');
        assert.deepEqual(await fechasDe(de2027.id), ['2027-02-28']);
    });

    test('una segunda ejecución no cambia nada', async () => {
        await alta('X cruza año', 'trimestral', '2025-08-18', [['2025-08-18', 'pendiente'], ['2026-02-18', 'pendiente']]);
        await db.query(sqlMigracion);
        const antes = await recibos();
        await db.query(sqlMigracion);
        assert.deepEqual(await recibos(), antes);
    });
});

describe('Procedimiento generar_recibos_anio (DC-17, DC-24, DC-25)', () => {
    const alta = async (concepto, periodicidad, fechaInicial, fechas, { replicar = 1, activo = 1 } = {}) => {
        const [r] = await db.execute('INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, cuenta_id, propietario_id, fecha_inicial, replicar) VALUES (?, ?, ?, 1, 1, 2, ?, ?)', [concepto, periodicidad, 35, fechaInicial, replicar]);
        for (const [fecha, estado, importe] of fechas) {
            await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo, importe) VALUES (?, ?, ?, '', ?, ?)", [r.insertId, fecha, estado, activo, importe ?? null]);
        }
        return r.insertId;
    };
    const llamar = async (simular, forzar, ahoraUtc) => {
        const [resultado] = await db.query('CALL generar_recibos_anio(?, ?, ?)', [simular, forzar, ahoraUtc]);
        return resultado[0];
    };
    const sucesor = async (id) => (await db.query("SELECT id, importe, periodicidad, DATE_FORMAT(fecha_inicial, '%Y-%m-%d') AS fecha_inicial FROM recibos WHERE recibo_origen_id = ?", [id]))[0][0];
    const fechasDe = async (id) => (await db.query("SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha FROM fechas_cargo WHERE recibo_id = ? ORDER BY fecha", [id]))[0].map((f) => f.fecha);
    const total = async () => Number((await db.query('SELECT COUNT(*) AS n FROM recibos'))[0][0].n);
    const DICIEMBRE = '2026-12-01 02:00:00'; // 03:00 en Madrid (UTC+1)

    beforeEach(async () => {
        await db.query('DELETE FROM fechas_cargo');
        await db.query('UPDATE recibos SET recibo_origen_id = NULL');
        await db.query('DELETE FROM recibos');
        await db.query('DELETE FROM mantenimiento_logs');
        await db.query("UPDATE ajustes_sistema SET valor = '1' WHERE clave = 'crear_recibos_automaticamente'");
        await db.query("UPDATE ajustes_sistema SET valor = 'Europe/Madrid' WHERE clave = 'zona_horaria'");
    });

    const trimestral = () => alta('A trimestral', 'trimestral', '2026-01-09', [['2026-01-09', 'cargado', 35], ['2026-04-25', 'cargado', 37.5], ['2026-07-09', 'pendiente', null], ['2026-10-09', 'pendiente', null]]);

    test('antes del 1 de diciembre no crea el año siguiente', async () => {
        await trimestral();
        assert.equal((await llamar(0, 0, '2026-11-30 02:00:00')).length, 0);
        assert.equal(await total(), 1);
    });

    test('el evento solo actúa a las 03:00 de la zona horaria; la ejecución manual no tiene esa restricción', async () => {
        await trimestral();
        const fuera = await llamar(0, 0, '2026-12-01 10:00:00');
        assert.match(fuera[0].aviso, /hora programada/);
        assert.equal(await total(), 1);
        assert.equal((await llamar(0, 1, '2026-12-01 10:00:00')).length, 1);
    });

    test('desde el 1 de diciembre crea el año siguiente: importe del último pago, día del último pago, estado y activo', async () => {
        const a = await trimestral();
        const b = await alta('B mensual inactivo', 'mensual', '2026-10-05', [['2026-10-05', 'pendiente', null], ['2026-11-05', 'pendiente', null], ['2026-12-05', 'pendiente', null]], { activo: 0 });
        const c = await alta('C anual', 'anual', '2026-03-15', [['2026-03-15', 'pendiente', null]]);
        const d = await alta('D sin replicar', 'anual', '2026-03-15', [['2026-03-15', 'pendiente', null]], { replicar: 0 });
        const f = await alta('E fin de mes', 'mensual', '2026-01-31', [['2026-01-31', 'pendiente', null]]);

        assert.equal((await llamar(0, 0, DICIEMBRE)).length, 4);

        const a2 = await sucesor(a);
        assert.equal(a2.importe, '37.50');
        assert.equal(a2.fecha_inicial, '2027-01-25');
        assert.deepEqual(await fechasDe(a2.id), ['2027-01-25', '2027-04-25', '2027-07-25', '2027-10-25']);
        const [[pendientes]] = await db.query("SELECT COUNT(*) AS n FROM fechas_cargo WHERE recibo_id = ? AND estado = 'pendiente' AND importe IS NULL", [a2.id]);
        assert.equal(Number(pendientes.n), 4);

        const b2 = await sucesor(b);
        assert.equal(b2.fecha_inicial, '2027-01-05');
        assert.equal((await fechasDe(b2.id)).length, 12);
        const [[activos]] = await db.query('SELECT COUNT(*) AS n FROM fechas_cargo WHERE recibo_id = ? AND activo = 1', [b2.id]);
        assert.equal(Number(activos.n), 0);

        assert.deepEqual(await fechasDe((await sucesor(c)).id), ['2027-03-15']);
        assert.equal(await sucesor(d), undefined);
        assert.deepEqual(await fechasDe((await sucesor(f)).id), ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31', '2027-06-30', '2027-07-31', '2027-08-31', '2027-09-30', '2027-10-31', '2027-11-30', '2027-12-31']);
    });

    test('un servicio contratado antes mantiene su cadencia: el gas del 13 de agosto da febrero, mayo, agosto y noviembre', async () => {
        const g = await alta('G gas', 'trimestral', '2025-08-13', [['2025-08-13', 'pendiente', null], ['2025-11-13', 'pendiente', null]]);
        assert.equal((await llamar(0, 0, '2025-12-01 02:00:00')).length, 1);
        const g26 = await sucesor(g);
        assert.equal(g26.fecha_inicial, '2026-02-13');
        assert.deepEqual(await fechasDe(g26.id), ['2026-02-13', '2026-05-13', '2026-08-13', '2026-11-13']);

        assert.equal((await llamar(0, 0, DICIEMBRE)).length, 1);
        const g27 = await sucesor(g26.id);
        assert.deepEqual(await fechasDe(g27.id), ['2027-02-13', '2027-05-13', '2027-08-13', '2027-11-13']);
    });

    test('es repetible: una segunda ejecución no crea nada', async () => {
        await trimestral();
        assert.equal((await llamar(0, 0, DICIEMBRE)).length, 1);
        const antes = await total();
        assert.equal((await llamar(0, 0, DICIEMBRE)).length, 0);
        assert.equal(await total(), antes);
    });

    test('con el interruptor desactivado no crea nada, salvo en la ejecución manual', async () => {
        await trimestral();
        await db.query("UPDATE ajustes_sistema SET valor = '0' WHERE clave = 'crear_recibos_automaticamente'");
        const filas = await llamar(0, 0, DICIEMBRE);
        assert.match(filas[0].aviso, /desactivada/);
        assert.equal(await total(), 1);
        assert.equal((await llamar(0, 1, DICIEMBRE)).length, 1);
        assert.equal(await total(), 2);
    });

    test('la vista previa no escribe nada y muestra primera y última fecha', async () => {
        const a = await trimestral();
        const filas = await llamar(1, 1, DICIEMBRE);
        assert.equal(filas.length, 1);
        assert.equal(filas[0].origen_id, a);
        assert.equal(filas[0].anio_nuevo, 2027);
        assert.equal(filas[0].fechas, 4);
        assert.equal(filas[0].primera, '2027-01-25');
        assert.equal(filas[0].ultima, '2027-10-25');
        assert.equal(filas[0].aviso, null);
        assert.equal(await total(), 1);
    });

    test('la vista previa avisa si el mes del último pago no encaja con la cadencia', async () => {
        await alta('H desfase', 'trimestral', '2026-01-09', [['2026-01-09', 'pendiente', null], ['2026-02-20', 'cargado', 30]]);
        const filas = await llamar(1, 1, DICIEMBRE);
        assert.equal(filas[0].primera, '2027-01-20');
        assert.match(filas[0].aviso, /cadencia/);
    });

    test('se pone al día año a año sin pasar del año en curso', async () => {
        const f = await alta('F anual antiguo', 'anual', '2024-05-10', [['2024-05-10', 'pendiente', null]]);
        assert.equal((await llamar(0, 0, '2026-06-15 01:00:00')).length, 2); // 03:00 en Madrid (UTC+2)
        const f1 = await sucesor(f);
        const f2 = await sucesor(f1.id);
        assert.equal(f1.fecha_inicial, '2025-05-10');
        assert.equal(f2.fecha_inicial, '2026-05-10');
        assert.equal(await sucesor(f2.id), undefined);
        assert.equal(await total(), 3);
    });

    test('"hoy" se calcula en la zona horaria de los ajustes', async () => {
        await alta('Z mensual', 'mensual', '2026-01-10', [['2026-01-10', 'pendiente', null]]);
        // 22:30 UTC del 30 de noviembre: en Madrid todavía es 30 de noviembre
        assert.equal((await llamar(0, 1, '2026-11-30 22:30:00')).length, 0);
        // En Auckland (UTC+13) ya es 1 de diciembre
        await db.query("UPDATE ajustes_sistema SET valor = 'Pacific/Auckland' WHERE clave = 'zona_horaria'");
        assert.equal((await llamar(0, 1, '2026-11-30 22:30:00')).length, 1);
    });

    test('anota en mantenimiento_logs la ejecución que crea recibos', async () => {
        await trimestral();
        await llamar(0, 0, DICIEMBRE);
        const [filas] = await db.query("SELECT detalles FROM mantenimiento_logs WHERE operacion = 'Generar recibos del anio'");
        assert.equal(filas.length, 1);
        assert.match(filas[0].detalles, /^1 recibos y 4 fechas creados hasta 2027/);
    });

    test('el evento existe, está activado y se lanza cada hora', async () => {
        const [[evento]] = await db.query("SELECT STATUS AS estado, INTERVAL_VALUE AS valor, INTERVAL_FIELD AS campo FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ? AND EVENT_NAME = 'generar_recibos_anio_evento'", [dbName]);
        assert.equal(evento.estado, 'ENABLED');
        assert.equal(Number(evento.valor), 1);
        assert.equal(evento.campo, 'HOUR');
    });
});

describe('Ajustes del sistema y zona horaria (DC-25)', () => {
    let aj;
    let tiempo;
    let util;

    before(async () => {
        aj = await import('../src/db/db_ajustes.mjs');
        tiempo = await import('../src/utils/tiempo.mjs');
        util = await import('../src/db/db_utils.mjs');
    });

    beforeEach(async () => {
        await db.query('DELETE FROM fechas_cargo');
        await db.query('UPDATE recibos SET recibo_origen_id = NULL');
        await db.query('DELETE FROM recibos');
        await db.query("UPDATE ajustes_sistema SET valor = 'Europe/Madrid' WHERE clave = 'zona_horaria'");
        await db.query("UPDATE ajustes_sistema SET valor = '1' WHERE clave = 'crear_recibos_automaticamente'");
        aj.reiniciarCacheAjustes();
    });

    test('hoyIsoEnZonaDe calcula el día en la zona indicada, con el cambio de hora incluido', () => {
        const instante = new Date('2026-11-30T22:30:00Z');
        assert.equal(tiempo.hoyIsoEnZonaDe('Europe/Madrid', instante), '2026-11-30');
        assert.equal(tiempo.hoyIsoEnZonaDe('Pacific/Auckland', instante), '2026-12-01');
        assert.equal(tiempo.hoyIsoEnZonaDe('Europe/Madrid', new Date('2026-06-30T22:30:00Z')), '2026-07-01'); // horario de verano (UTC+2)
        assert.equal(tiempo.hoyIsoEnZonaDe('Europe/Madrid', new Date('2026-12-31T22:30:00Z')), '2026-12-31'); // horario de invierno (UTC+1)
        assert.ok(tiempo.esZonaValida('Europe/Madrid'));
        assert.ok(!tiempo.esZonaValida('No/Existe'));
        assert.ok(!tiempo.esZonaValida(''));
    });

    test('la zona horaria por defecto es Europe/Madrid y el cambio persiste y afecta a "hoy"', async () => {
        assert.equal(await aj.getZonaHoraria(), 'Europe/Madrid');
        await aj.setZonaHoraria('Pacific/Auckland');
        assert.equal(await aj.getZonaHoraria(), 'Pacific/Auckland');
        const [[fila]] = await db.query("SELECT valor FROM ajustes_sistema WHERE clave = 'zona_horaria'");
        assert.equal(fila.valor, 'Pacific/Auckland');
        const hoy = await aj.hoyEnZona(new Date('2026-11-30T22:30:00Z'));
        assert.equal(hoy.getFullYear() + '-' + (hoy.getMonth() + 1) + '-' + hoy.getDate(), '2026-12-1');
    });

    test('una zona inválida se rechaza y no cambia el ajuste', async () => {
        await assert.rejects(() => aj.setZonaHoraria('No/Existe'), { status: 400 });
        await assert.rejects(() => aj.setZonaHoraria(''), { status: 400 });
        assert.equal(await aj.getZonaHoraria(), 'Europe/Madrid');
    });

    test('el interruptor de creación automática se lee y se guarda', async () => {
        assert.equal(await aj.getCrearRecibosAutomaticamente(), true);
        await aj.setCrearRecibosAutomaticamente(false);
        const [[fila]] = await db.query("SELECT valor FROM ajustes_sistema WHERE clave = 'crear_recibos_automaticamente'");
        assert.equal(fila.valor, '0');
        assert.equal(await aj.getCrearRecibosAutomaticamente(), false);
    });

    test('generarRecibosAnio(true) devuelve la vista previa sin escribir nada', async () => {
        const [r] = await db.execute("INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, cuenta_id, propietario_id, fecha_inicial) VALUES ('Antiguo', 'anual', 10, 1, 1, 2, '2020-03-01')");
        await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, '2020-03-01', 'pendiente', '', 1)", [r.insertId]);
        const filas = await util.generarRecibosAnio(true);
        assert.ok(filas.some((f) => f.origen_id === r.insertId && f.anio_nuevo === 2021));
        const [[total]] = await db.query('SELECT COUNT(*) AS n FROM recibos');
        assert.equal(Number(total.n), 1);
    });

    test('con forzar se borra un cargo pagado de un mes cerrado; sin forzar, no', async () => {
        const [r] = await db.execute("INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, cuenta_id, propietario_id, fecha_inicial) VALUES ('Forzar', 'mensual', 10, 1, 1, 2, '2026-01-05')");
        await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, '2026-01-05', 'cargado', '', 1), (?, '2026-02-05', 'pendiente', '', 1)", [r.insertId, r.insertId]);
        const hoy = new Date(2026, 5, 15);
        await assert.rejects(() => util.deleteRecibo(r.insertId, '2026-01-05', 'mensual', hoy), { status: 409 });
        assert.equal(await util.deleteRecibo(r.insertId, '2026-01-05', 'mensual', hoy, true), true);
        const [[restantes]] = await db.query('SELECT COUNT(*) AS n FROM fechas_cargo WHERE recibo_id = ?', [r.insertId]);
        assert.equal(Number(restantes.n), 1);
    });

    test('las conexiones de la aplicación trabajan en UTC', async () => {
        const { getConnection } = await import('../src/db/db_connection.mjs');
        const conexion = await getConnection();
        try {
            const [[fila]] = await conexion.query('SELECT @@session.time_zone AS zona');
            assert.equal(fila.zona, '+00:00');
        } finally {
            conexion.release();
        }
    });
});
