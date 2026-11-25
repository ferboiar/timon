// S-25 (#192): pushRecibo solo puede leer y actualizar las filas de fechas_cargo que pertenecen al
// recibo que se está guardando. Monta la ruta real POST /api/recibos en un Express propio y la ataca
// por HTTP con JWT real sobre una base *_test creada de cero con todas las migraciones.
//
// - Sin fecha: guardar el recibo A con el id de un cargo del recibo B responde 400, no modifica el
//   cargo ajeno y revierte los cambios ya escritos en A (la transacción se deshace entera).
// - Con fecha: la rama manual que actualiza fecha, estado y comentario se comporta igual.
// - Control: guardar A con sus propios cargos funciona en las dos ramas.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const base = (process.env.TEST_DB_NAME ?? 'conta_hogar_test').replace(/_test$/, '');
const dbName = base + '_s25_test';
if (!/_test$/.test(dbName)) throw new Error(`La base de pruebas debe terminar en _test: ${dbName}`);
if (dbName === 'conta_hogar') throw new Error('La base de pruebas nunca puede ser conta_hogar');

const PROPIETARIO = 25;

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
let reciboA;
let reciboB;
let cargoA;
let cargoB;

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

    await db.execute(`INSERT INTO users (id, username, email, password, rol, perm_recibos) VALUES (?, 's25_user', 's25_user@example.test', 'x', 'user', 'escritura')`, [PROPIETARIO]);
    await db.execute(`INSERT INTO cuentas (id, nombre, tipo, iban, propietario_id) VALUES (1, 'Cuenta S25', 'corriente', 'ES0000000000000000000025', ?)`, [PROPIETARIO]);
    await db.execute(`INSERT INTO categorias (id, nombre, descripcion, propietario_id) VALUES (1, 'General', NULL, ?)`, [PROPIETARIO]);

    const [a] = await db.execute("INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, cuenta_id, propietario_id, fecha_inicial) VALUES ('s25 recibo a', 'anual', 50, 1, 1, ?, '2026-01-15')", [PROPIETARIO]);
    reciboA = Number(a.insertId);
    const [b] = await db.execute("INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, cuenta_id, propietario_id, fecha_inicial) VALUES ('s25 recibo b', 'anual', 50, 1, 1, ?, '2026-02-20')", [PROPIETARIO]);
    reciboB = Number(b.insertId);

    const [ca] = await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, '2026-03-10', 'pendiente', 'A original', 1)", [reciboA]);
    cargoA = Number(ca.insertId);
    const [cb] = await db.execute("INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, '2026-05-10', 'pendiente', 'B original', 1)", [reciboB]);
    cargoB = Number(cb.insertId);

    Object.assign(process.env, {
        DB_HOST: conexion.host,
        DB_PORT: String(conexion.port),
        DB_USER: conexion.user,
        DB_PASSWORD: conexion.password,
        DB_DATABASE: dbName,
        JWT_SECRET: process.env.JWT_SECRET || 'secreto-s25-recibos',
        JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1h'
    });

    ({ config } = await import('../src/config/env.mjs'));
    ({ closePool: cerrarPool } = await import('../src/db/db_connection.mjs'));
    const { default: router } = await import('../src/routes/recibos.mjs');

    const app = express();
    app.use(express.json());
    app.use('/api/recibos', router);

    await new Promise((resolver) => {
        servidor = app.listen(0, resolver);
    });

    origen = 'http://127.0.0.1:' + servidor.address().port;
    token = jwt.sign({ id: PROPIETARIO, username: 's25_user', rol: 'user', ver: 0 }, config.jwt.secret, { expiresIn: '1h' });
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

async function leerCargo(id) {
    const [[fila]] = await db.execute('SELECT recibo_id, fecha, estado, comentario, activo, importe, modificado_por FROM fechas_cargo WHERE id = ?', [id]);
    return fila;
}

async function leerRecibo(id) {
    const [[fila]] = await db.execute('SELECT concepto, importe, modificado_por FROM recibos WHERE id = ?', [id]);
    return fila;
}

/** Cuerpo manual para guardar el recibo indicado con los cargos de la prueba. */
function cuerpoDelRecibo(id, concepto, cargo) {
    return { id, concepto, periodicidad: 'anual', importe: 50, categoria: 'General', cuenta_id: 1, modoFechas: 'manual', cargo };
}

async function postRecibo(cuerpo) {
    const respuesta = await fetch(origen + '/api/recibos', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
    });
    return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

/** El cargo de B sigue intacto y el recibo A no conserva ningún cambio parcial. */
async function assertNadaEscrito() {
    const ajeno = await leerCargo(cargoB);
    assert.equal(ajeno.recibo_id, reciboB, 'el cargo debe seguir en el recibo B');
    assert.equal(textoFecha(ajeno.fecha), '2026-05-10');
    assert.equal(ajeno.estado, 'pendiente');
    assert.equal(ajeno.comentario, 'B original');
    assert.equal(Number(ajeno.activo), 1);
    assert.equal(ajeno.modificado_por, null);

    const recibo = await leerRecibo(reciboA);
    assert.equal(recibo.concepto, 's25 recibo a', 'el UPDATE de A ya ejecutado debe revertirse');
    assert.equal(Number(recibo.importe), 50);
    assert.equal(recibo.modificado_por, null);
}

test('sin fecha: guardar el recibo A con un cargo de B responde 400 y no escribe nada', async () => {
    const respuesta = await postRecibo(cuerpoDelRecibo(reciboA, 's25 recibo a intruso', [{ id: cargoB, estado: 'cargado', comentario: 'intruso sin fecha', activo: 0 }]));

    assert.equal(respuesta.estado, 400, 'un cargo de otro recibo no puede actualizarse');
    assert.match(respuesta.cuerpo.error, /no pertenece a este recibo/);
    await assertNadaEscrito();
});

test('con fecha: guardar el recibo A con un cargo de B responde 400 y no escribe nada', async () => {
    const respuesta = await postRecibo(cuerpoDelRecibo(reciboA, 's25 recibo a intruso con fecha', [{ id: cargoB, fecha: '2026-06-10', estado: 'cargado', comentario: 'intruso con fecha', activo: 0 }]));

    assert.equal(respuesta.estado, 400, 'un cargo de otro recibo no puede actualizarse');
    assert.match(respuesta.cuerpo.error, /no pertenece a este recibo/);
    await assertNadaEscrito();
});

test('control sin fecha: guardar el recibo A con su propio cargo lo actualiza', async () => {
    const respuesta = await postRecibo(cuerpoDelRecibo(reciboA, 's25 recibo a editado', [{ id: cargoA, estado: 'cargado', comentario: 'pagado en A', activo: 1 }]));

    assert.equal(respuesta.estado, 201, JSON.stringify(respuesta.cuerpo));

    const propio = await leerCargo(cargoA);
    assert.equal(textoFecha(propio.fecha), '2026-03-10', 'la rama parcial conserva la fecha guardada');
    assert.equal(propio.estado, 'cargado');
    assert.equal(propio.comentario, 'pagado en A');
    assert.equal(Number(propio.modificado_por), PROPIETARIO);

    const recibo = await leerRecibo(reciboA);
    assert.equal(recibo.concepto, 's25 recibo a editado');
    assert.equal(Number(recibo.modificado_por), PROPIETARIO);
});

test('control con fecha: guardar el recibo A con su propio cargo lo actualiza', async () => {
    const respuesta = await postRecibo(cuerpoDelRecibo(reciboA, 's25 recibo a reprogramado', [{ id: cargoA, fecha: '2026-04-10', estado: 'pendiente', comentario: 'reprogramado en A', activo: 1 }]));

    assert.equal(respuesta.estado, 201, JSON.stringify(respuesta.cuerpo));

    const propio = await leerCargo(cargoA);
    assert.equal(textoFecha(propio.fecha), '2026-04-10');
    assert.equal(propio.estado, 'pendiente');
    assert.equal(propio.comentario, 'reprogramado en A');
    assert.equal(Number(propio.modificado_por), PROPIETARIO);
});
