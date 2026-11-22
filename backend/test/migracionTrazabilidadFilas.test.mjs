// F-53 / DC-74: transición de la migración 0010 (autor por fila).
// =================================================================
// Comprueba el paso del esquema anterior (0001…0009) al nuevo, la repetibilidad, la definición
// exacta de columna, índice y FK (SET NULL) en las cinco tablas, el autor de usuario en las
// escrituras directas, NULL en las derivadas, la excepción del activo masivo de fechas_cargo,
// el borrado del usuario que editó filas ajenas y la lectura por la API.
//
// Se aplica todo menos la 0010 para ensayar la transición, como migracionEstadoRechazado.test.mjs.
// Si el usuario de pruebas no puede crear la base, la prueba FALLA con el error real: no se omite.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, describe, test } from 'node:test';

import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_f53_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);

const conexion = {
    host: process.env.TEST_DB_HOST ?? 'mariadb-test',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? 'test_root_pw',
    multipleStatements: true
};

const MIGRACION_0010 = '0010_trazabilidad_filas.sql';
const TABLAS = ['anticipos_pagos', 'ahorros_movimientos', 'categorias', 'cuentas', 'fechas_cargo'];

let db;
let admin;
let cerrarPool;
let pushCategoria, pushAccount, pushSaving, pushMovimiento, pushPago, pushAdvance, pushRecibo;
let completarFechasAnio, handlePaymentDeletion, getAdvances, getRecibos;

async function crearBase(nombre) {
    assert.match(nombre, /_test$/, 'la base debe terminar en _test');
    await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(nombre));
    await admin.query('CREATE DATABASE ' + mysql.escapeId(nombre) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci');
}

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

const sql0010 = () => readFile(new URL(`../src/db/migrations/${MIGRACION_0010}`, import.meta.url), 'utf8');

async function definiciones() {
    const [filas] = await db.query(
        `SELECT TABLE_NAME AS tabla, COLUMN_TYPE AS tipo, IS_NULLABLE AS nula, COLUMN_DEFAULT AS porDefecto
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'modificado_por'
            AND TABLE_NAME IN (${TABLAS.map(() => '?').join(',')})
          ORDER BY TABLE_NAME`,
        [dbName, ...TABLAS]
    );
    return filas;
}

async function objetos(tabla) {
    const [[indice]] = await db.query(
        `SELECT COUNT(*) AS n, COALESCE(MAX(NON_UNIQUE), 1) AS noUnico FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        [dbName, tabla, `idx_${tabla}_modificado_por`]
    );
    const [[fk]] = await db.query(
        `SELECT COUNT(*) AS n, COALESCE(MAX(DELETE_RULE), '') AS regla FROM information_schema.REFERENTIAL_CONSTRAINTS
          WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_NAME = ?`,
        [dbName, `fk_${tabla}_modificado_por`]
    );
    return { indice: Number(indice.n), noUnico: Number(indice.noUnico), fk: Number(fk.n), regla: String(fk.regla).toUpperCase() };
}

const crearUsuario = async (nombre) => {
    const [resultado] = await db.execute('INSERT INTO users (username, email, password, rol) VALUES (?, ?, ?, ?)', [nombre, nombre + '@example.test', 'x', 'user']);
    return resultado.insertId;
};

const idPorConcepto = async (tabla, columna, valor) => {
    const [filas] = await db.query(`SELECT id FROM ${tabla} WHERE ${columna} = ?`, [valor]);
    return filas.length ? filas[0].id : null;
};

before(async () => {
    admin = await mysql.createConnection(conexion);
    await crearBase(dbName);

    db = await mysql.createConnection({ ...conexion, database: dbName });

    // Esquema anterior: todas las migraciones menos la 0010
    const migraciones = (await readdir(new URL('../src/db/migrations/', import.meta.url))).filter((f) => f.endsWith('.sql') && f !== MIGRACION_0010).sort();

    for (const fichero of migraciones) {
        await ejecutarMigracion(db, await readFile(new URL(`../src/db/migrations/${fichero}`, import.meta.url), 'utf8'));
    }

    await db.query("INSERT INTO users (id, username, email, password, rol) VALUES (1, 'f53_admin', 'f53_admin@example.test', 'x', 'admin'), (2, 'f53_prop', 'f53_prop@example.test', 'x', 'user')");
    await db.query("INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (1, 'cuenta f53', 'corriente', NULL, 1)");
    await db.query("INSERT INTO categorias (id, nombre, descripcion, propietario_id) VALUES (1, 'general', NULL, 1)");

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName
    });

    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    ({ pushCategoria } = await import('../src/db/db_utilsCats.mjs'));
    ({ pushAccount } = await import('../src/db/db_utilsAcc.mjs'));
    ({ pushSaving, pushMovimiento } = await import('../src/db/db_utilsSav.mjs'));
    ({ pushAdvance, pushPago, handlePaymentDeletion } = await import('../src/db/db_utilsAdv.mjs'));
    ({ completarFechasAnio, getRecibos, pushRecibo } = await import('../src/db/db_utils.mjs'));
    ({ getAdvances } = await import('../src/db/db_utilsAdv.mjs'));
});

after(async () => {
    if (cerrarPool) await cerrarPool();
    if (db) await db.end();
    if (admin) {
        await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(dbName));
        await admin.end();
    }
});

describe('Migración 0010: columnas, índices y FK (F-53, DC-74)', () => {
    test('el esquema anterior no tiene modificado_por en las cinco tablas', async () => {
        assert.deepEqual(await definiciones(), []);
    });

    test('crea la columna, un índice y una FK SET NULL en cada tabla', async () => {
        await ejecutarMigracion(db, await sql0010());

        assert.deepEqual(
            (await definiciones()).map((fila) => [fila.tabla, fila.tipo, fila.nula, fila.porDefecto]),
            TABLAS.slice().sort().map((tabla) => [tabla, 'int(11)', 'YES', 'NULL'])
        );

        for (const tabla of TABLAS) {
            assert.deepEqual(await objetos(tabla), { indice: 1, noUnico: 1, fk: 1, regla: 'SET NULL' }, `objetos de ${tabla}`);
        }
    });

    test('es repetible y no duplica índices ni claves', async () => {
        await ejecutarMigracion(db, await sql0010());

        for (const tabla of TABLAS) {
            assert.deepEqual(await objetos(tabla), { indice: 1, noUnico: 1, fk: 1, regla: 'SET NULL' }, `objetos de ${tabla}`);
        }
    });
});

describe('Escrituras de usuario (DC-74)', () => {
    test('categorías y cuentas guardan el autor en alta y edición, y conservan el propietario', async () => {
        const autor = await crearUsuario('f53_autor_cat');

        await pushCategoria(undefined, 'f53-cat', null, 2, autor);
        const categoriaId = await idPorConcepto('categorias', 'nombre', 'f53-cat');
        let [[fila]] = await db.query('SELECT modificado_por, propietario_id FROM categorias WHERE id = ?', [categoriaId]);
        assert.equal(Number(fila.modificado_por), autor);
        assert.equal(Number(fila.propietario_id), 2);

        await pushCategoria(categoriaId, 'f53-cat-edit', 'texto', 2, autor);
        [[fila]] = await db.query('SELECT modificado_por, propietario_id FROM categorias WHERE id = ?', [categoriaId]);
        assert.equal(Number(fila.modificado_por), autor);
        assert.equal(Number(fila.propietario_id), 2);

        await pushAccount(undefined, 'f53-cuenta', 'corriente', null, 0, null, 1, 2, autor);
        const cuentaId = await idPorConcepto('cuentas', 'nombre', 'f53-cuenta');
        [[fila]] = await db.query('SELECT modificado_por, propietario_id FROM cuentas WHERE id = ?', [cuentaId]);
        assert.equal(Number(fila.modificado_por), autor);
        assert.equal(Number(fila.propietario_id), 2);

        await pushAccount(cuentaId, 'f53-cuenta-edit', 'corriente', null, 5, null, 1, 2, autor);
        [[fila]] = await db.query('SELECT modificado_por, propietario_id FROM cuentas WHERE id = ?', [cuentaId]);
        assert.equal(Number(fila.modificado_por), autor);
        assert.equal(Number(fila.propietario_id), 2);
    });

    test('movimientos, pagos y fechas de cargo guardan el autor de la fila', async () => {
        const autor = await crearUsuario('f53_autor_hijos');

        await pushSaving(undefined, 'f53-ahorro', null, 0, null, null, 0, 1, 2, null, autor);
        const ahorroId = await idPorConcepto('ahorros', 'concepto', 'f53-ahorro');
        await pushMovimiento(undefined, ahorroId, 10, '2026-01-01', 'regular', null, autor);
        const [[movimiento]] = await db.query('SELECT modificado_por FROM ahorros_movimientos WHERE ahorro_id = ?', [ahorroId]);
        assert.equal(Number(movimiento.modificado_por), autor);

        await pushAdvance(undefined, 'f53-ant-pago', 20, null, '2026-01-01', null, null, 'activo', 1, null, 2, null, autor);
        const anticipoId = await idPorConcepto('anticipos', 'concepto', 'f53-ant-pago');
        const pagoId = await pushPago(undefined, anticipoId, 5, '2026-02-01', 'regular', null, 'pendiente', 1, autor);
        const [[pago]] = await db.query('SELECT modificado_por FROM anticipos_pagos WHERE id = ?', [pagoId]);
        assert.equal(Number(pago.modificado_por), autor);

        await pushRecibo(undefined, 'f53-recibo', 'mensual', 10, 'general', [], 2, 1, '2026-01-15', 'auto', false, null, autor);
        const reciboId = await idPorConcepto('recibos', 'concepto', 'f53-recibo');
        const [[cargos]] = await db.query('SELECT COUNT(*) AS total, SUM(modificado_por = ?) AS conAutor FROM fechas_cargo WHERE recibo_id = ?', [autor, reciboId]);
        assert.ok(Number(cargos.total) >= 12);
        assert.equal(Number(cargos.conAutor), Number(cargos.total));
    });
});

describe('Escrituras del sistema (DC-74)', () => {
    test('la generación del plan de pagos deja NULL', async () => {
        const autor = await crearUsuario('f53_autor_plan');

        await pushAdvance(undefined, 'f53-ant-plan', 100, 25, '2026-01-01', null, null, 'activo', 1, 'mensual', 2, null, autor);
        const anticipoId = await idPorConcepto('anticipos', 'concepto', 'f53-ant-plan');
        const [[filas]] = await db.query('SELECT COUNT(*) AS total, SUM(modificado_por IS NOT NULL) AS conAutor FROM anticipos_pagos WHERE anticipo_id = ?', [anticipoId]);
        assert.equal(Number(filas.total), 4);
        assert.equal(Number(filas.conAutor), 0);
    });

    test('el reparto posterior a un borrado deja NULL en la fila ajustada y el usuario en el padre', async () => {
        const autor = await crearUsuario('f53_autor_reparto');

        await pushAdvance(undefined, 'f53-ant-reparto', 100, 25, '2026-01-01', null, null, 'activo', 1, 'mensual', 2, null, autor);
        const anticipoId = await idPorConcepto('anticipos', 'concepto', 'f53-ant-reparto');
        const pagoBajo = await pushPago(undefined, anticipoId, 10, '2026-06-01', 'regular', null, 'pendiente', 1, autor);

        const [[aBorrar]] = await db.query("SELECT id FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente' AND importe = 25 ORDER BY id LIMIT 1", [anticipoId]);
        await handlePaymentDeletion(aBorrar.id, true, autor);

        const [[ajustado]] = await db.query('SELECT importe, modificado_por FROM anticipos_pagos WHERE id = ?', [pagoBajo]);
        assert.equal(Number(ajustado.importe), 25);
        assert.equal(ajustado.modificado_por, null);

        const [[padre]] = await db.query('SELECT modificado_por FROM anticipos WHERE id = ?', [anticipoId]);
        assert.equal(Number(padre.modificado_por), autor);
    });

    test('completarFechasAnio deja NULL las fechas nuevas y conserva el autor de la existente', async () => {
        const autor = await crearUsuario('f53_autor_fechas');
        const cargo = [{ fecha: '2026-01-15', estado: 'pendiente', comentario: '', activo: 1 }];

        await pushRecibo(undefined, 'f53-recibo-sys', 'mensual', 10, 'general', cargo, 2, 1, '2026-01-15', 'manual', false, null, autor);
        const reciboId = await idPorConcepto('recibos', 'concepto', 'f53-recibo-sys');
        const creadas = await completarFechasAnio(reciboId, 2026, new Date('2026-11-21T00:00:00Z'), autor);
        assert.equal(creadas, 11);

        const [[enero]] = await db.query("SELECT modificado_por FROM fechas_cargo WHERE recibo_id = ? AND MONTH(fecha) = 1", [reciboId]);
        assert.equal(Number(enero.modificado_por), autor);

        const [[resto]] = await db.query('SELECT COUNT(*) AS total, SUM(modificado_por IS NOT NULL) AS conAutor FROM fechas_cargo WHERE recibo_id = ? AND MONTH(fecha) > 1', [reciboId]);
        assert.equal(Number(resto.total), 11);
        assert.equal(Number(resto.conAutor), 0);
    });

    test('el cambio masivo de activo propaga el usuario a todas las fechas', async () => {
        const autor = await crearUsuario('f53_autor_activo_a');
        const autorEdit = await crearUsuario('f53_autor_activo_b');

        await pushRecibo(undefined, 'f53-recibo-activo', 'mensual', 10, 'general', [], 2, 1, '2026-01-15', 'auto', false, null, autor);
        const reciboId = await idPorConcepto('recibos', 'concepto', 'f53-recibo-activo');

        await pushRecibo(reciboId, 'f53-recibo-activo', 'mensual', 10, 'general', [{ activo: 0 }], 2, 1, '2026-01-15', 'auto', false, null, autorEdit);

        const [[filas]] = await db.query('SELECT COUNT(*) AS total, SUM(modificado_por = ?) AS conAutor FROM fechas_cargo WHERE recibo_id = ?', [autorEdit, reciboId]);
        assert.ok(Number(filas.total) >= 12);
        assert.equal(Number(filas.conAutor), Number(filas.total));
    });
});

describe('Borrado del usuario (SET NULL)', () => {
    test('deja NULL en las cinco tablas sin perder ninguna fila', async () => {
        const autor = await crearUsuario('f53_autor_borrado');

        await pushCategoria(undefined, 'f53-cat-borrado', null, 2, autor);
        await pushAccount(undefined, 'f53-cuenta-borrada', 'corriente', null, 0, null, 1, 2, autor);

        await pushSaving(undefined, 'f53-ahorro-borrado', null, 0, null, null, 0, 1, 2, null, autor);
        const ahorroId = await idPorConcepto('ahorros', 'concepto', 'f53-ahorro-borrado');
        await pushMovimiento(undefined, ahorroId, 5, '2026-03-01', 'regular', null, autor);

        await pushAdvance(undefined, 'f53-ant-borrado', 50, null, '2026-03-01', null, null, 'activo', 1, null, 2, null, autor);
        const anticipoId = await idPorConcepto('anticipos', 'concepto', 'f53-ant-borrado');
        await pushPago(undefined, anticipoId, 5, '2026-03-01', 'regular', null, 'pendiente', 1, autor);

        await pushRecibo(undefined, 'f53-recibo-borrado', 'mensual', 10, 'general', [], 2, 1, '2026-01-15', 'auto', false, null, autor);
        const reciboId = await idPorConcepto('recibos', 'concepto', 'f53-recibo-borrado');

        await db.query('DELETE FROM users WHERE id = ?', [autor]);

        const [[categoria]] = await db.query("SELECT modificado_por FROM categorias WHERE nombre = 'f53-cat-borrado'");
        assert.equal(categoria.modificado_por, null);
        const [[cuenta]] = await db.query("SELECT modificado_por FROM cuentas WHERE nombre = 'f53-cuenta-borrada'");
        assert.equal(cuenta.modificado_por, null);
        const [[movimiento]] = await db.query('SELECT modificado_por FROM ahorros_movimientos WHERE ahorro_id = ?', [ahorroId]);
        assert.equal(movimiento.modificado_por, null);
        const [[pago]] = await db.query('SELECT modificado_por FROM anticipos_pagos WHERE anticipo_id = ?', [anticipoId]);
        assert.equal(pago.modificado_por, null);
        const [[cargos]] = await db.query('SELECT COUNT(*) AS total, SUM(modificado_por IS NOT NULL) AS conAutor FROM fechas_cargo WHERE recibo_id = ?', [reciboId]);
        assert.ok(Number(cargos.total) >= 12);
        assert.equal(Number(cargos.conAutor), 0);
    });
});

describe('Lectura por la API (solo id, sin username)', () => {
    test('GET /api/recibos devuelve el autor del cargo con alias cargo_modificado_por', async () => {
        const filas = await getRecibos({ concepto: 'f53-recibo' });
        assert.ok(filas.length > 0);
        assert.ok(Object.hasOwn(filas[0], 'cargo_modificado_por'));
        assert.ok(Object.hasOwn(filas[0], 'modificado_por'));
    });

    test('GET /api/anticipos devuelve modificado_por', async () => {
        const anticipos = await getAdvances();
        const anticipo = anticipos.find((fila) => fila.concepto === 'f53-ant-plan');
        assert.ok(anticipo);
        assert.ok(Object.hasOwn(anticipo, 'modificado_por'));
    });
});
