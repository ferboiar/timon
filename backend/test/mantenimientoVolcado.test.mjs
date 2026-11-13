// O-06: el volcado incluye rutinas y eventos y se puede restaurar entre dos bases *_test.
//
// No usa TEST_DB_NAME para no chocar con fase0.test.mjs, que la borra y recrea en paralelo.
// El fichero de configuración es temporal y DB_CONFIG_PATH lo aísla del .db_connection real:
// getDbConfig() lee el fichero, no process.env. Antes de cada operación se comprueba que la
// base efectiva es la esperada y termina en _test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import mysql from 'mysql2/promise';

const ORIGEN = 'conta_hogar_o06_origen_test';
const DESTINO = 'conta_hogar_o06_destino_test';
const NL = String.fromCharCode(10);
const BASE_SEGURA = /^[a-z0-9_]+_test$/;

const entorno = {
    host: process.env.TEST_DB_HOST,
    port: process.env.TEST_DB_PORT,
    user: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD
};

let motivoSalto = '';

if (!entorno.host || !entorno.port || !entorno.user || !entorno.password) {
    motivoSalto = 'faltan TEST_DB_* (configura backend/test/.env.test y usa npm run test:backend:local)';
}

const rutaConfig = path.join(os.tmpdir(), 'timon-o06-' + process.pid + '.cnf');
const rutaDump = path.join(os.tmpdir(), 'timon-o06-' + process.pid + '.sql');

// Debe fijarse antes de importar db_utilsConn: la ruta se resuelve al cargar el módulo.
process.env.DB_CONFIG_PATH = rutaConfig;

let admin = null;
let backupDb = null;
let restoreDb = null;
let getDbConfig = null;
let serializarValor = null;

/** Escribe el fichero de conexión temporal con la base indicada. */
function escribirConfiguracion(base) {
    const lineas = [
        'DB_HOST=' + serializarValor('DB_HOST', entorno.host),
        'DB_PORT=' + serializarValor('DB_PORT', entorno.port),
        'DB_USER=' + serializarValor('DB_USER', entorno.user),
        'DB_PASSWORD=' + serializarValor('DB_PASSWORD', entorno.password),
        'DB_DATABASE=' + serializarValor('DB_DATABASE', base),
        ''
    ];

    fs.writeFileSync(rutaConfig, lineas.join(NL), { mode: 0o600 });
}

/** Comprueba la configuración efectiva antes de volcar o restaurar. */
async function comprobarConfiguracion(baseEsperada) {
    const { config } = await getDbConfig();

    assert.match(baseEsperada, BASE_SEGURA, 'la base debe terminar en _test');
    assert.equal(config.DB_DATABASE, baseEsperada, 'la base efectiva debe ser la esperada');
    assert.equal(String(config.DB_HOST), String(entorno.host), 'el host efectivo debe ser el de TEST_DB_*');
    assert.equal(String(config.DB_PORT), String(entorno.port), 'el puerto efectivo debe ser el de TEST_DB_*');
    assert.equal(String(config.DB_USER), String(entorno.user), 'el usuario efectivo debe ser el de TEST_DB_*');
}

async function crearBase(nombre) {
    await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(nombre));
    await admin.query('CREATE DATABASE ' + mysql.escapeId(nombre) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci');
}

before(async () => {
    if (motivoSalto) return;

    try {
        admin = await mysql.createConnection({ host: entorno.host, port: Number(entorno.port), user: entorno.user, password: entorno.password });
        await crearBase(ORIGEN);
        await crearBase(DESTINO);
    } catch (error) {
        const privilegios = ['ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR', 'ER_TABLEACCESS_DENIED_ERROR'];

        if (privilegios.includes(error.code)) {
            motivoSalto = 'el usuario de pruebas no puede crear ' + ORIGEN + ' y ' + DESTINO + '; aplica los GRANT de backend/test/README.md';
            return;
        }

        throw error;
    }

    process.env.DB_HOST = String(entorno.host);
    process.env.DB_PORT = String(entorno.port);
    process.env.DB_USER = String(entorno.user);
    process.env.DB_PASSWORD = String(entorno.password);
    process.env.DB_DATABASE = ORIGEN;
    delete process.env.DB_SSL_CA;
    delete process.env.DB_MAINT_USER;
    delete process.env.DB_MAINT_PASSWORD;

    ({ backupDb, restoreDb } = await import('../src/db/db_maintenance.mjs'));
    ({ getDbConfig, serializarValor } = await import('../src/db/db_utilsConn.mjs'));

    escribirConfiguracion(ORIGEN);

    const db = await mysql.createConnection({ host: entorno.host, port: Number(entorno.port), user: entorno.user, password: entorno.password, database: ORIGEN });

    await db.query('CREATE TABLE o06_tabla (id INT PRIMARY KEY)');
    await db.query('CREATE PROCEDURE o06_procedimiento() SELECT 1');
    await db.query('CREATE EVENT o06_evento ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP + INTERVAL 1 DAY DISABLE DO CALL o06_procedimiento()');
    await db.end();
});

after(async () => {
    if (admin) {
        for (const nombre of [ORIGEN, DESTINO]) {
            await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(nombre)).catch(() => {});
        }

        await admin.end().catch(() => {});
    }

    for (const ruta of [rutaConfig, rutaDump]) {
        fs.rmSync(ruta, { force: true });
    }
});

describe('O-06: volcado y restauración con rutinas y eventos', () => {
    test('el volcado incluye el procedimiento y el evento, y se restauran dos veces entre bases *_test', async (contexto) => {
        if (motivoSalto) {
            contexto.skip(motivoSalto);
            return;
        }

        await comprobarConfiguracion(ORIGEN);
        await backupDb(rutaDump);

        const sql = fs.readFileSync(rutaDump, 'utf8');
        const extracto = sql
            .split(NL)
            .filter((linea) => /o06_procedimiento|o06_evento|DEFINER/.test(linea))
            .slice(0, 8)
            .join(NL);

        assert.match(sql, /CREATE.*PROCEDURE/i, 'el volcado debe incluir el procedimiento');
        assert.match(sql, /CREATE.*EVENT/i, 'el volcado debe incluir el evento');
        assert.match(sql, /DISABLE/, 'el volcado debe conservar el estado DISABLE');
        assert.match(sql, /DEFINER=/, 'el volcado debe conservar el DEFINER');

        escribirConfiguracion(DESTINO);
        await comprobarConfiguracion(DESTINO);

        const restaurar = async () => {
            try {
                await restoreDb(rutaDump);
            } catch (error) {
                throw new Error(error.message + NL + '--- extracto del volcado ---' + NL + extracto);
            }
        };

        await restaurar();
        await restaurar();

        const db = await mysql.createConnection({ host: entorno.host, port: Number(entorno.port), user: entorno.user, password: entorno.password, database: DESTINO });
        const [rutinas] = await db.query("SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_NAME = 'o06_procedimiento'", [DESTINO]);
        const [eventos] = await db.query("SELECT EVENT_NAME, STATUS FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ? AND EVENT_NAME = 'o06_evento'", [DESTINO]);

        await db.end();

        assert.equal(rutinas.length, 1, 'el procedimiento debe existir una sola vez tras dos restauraciones');
        assert.equal(eventos.length, 1, 'el evento debe existir una sola vez tras dos restauraciones');
        assert.equal(eventos[0].STATUS, 'DISABLED', 'el estado DISABLE debe conservarse');
    });
});
