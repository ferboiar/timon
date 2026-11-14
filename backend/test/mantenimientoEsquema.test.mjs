// O-07 y O-08: los objetos de esquema nacen en las migraciones y el DEFINER queda a nombre
// de la cuenta que las ejecuta. La copia y la restauración son fieles: el DEFINER viaja en
// el volcado y se reproduce tal cual. Con la misma cuenta no hace falta SET USER; con otra
// cuenta, MariaDB responde 1227 y restoreDb lo traduce a 409.
//
// Usa dos bases dedicadas para no chocar con fase0.test.mjs. El fichero de configuración es
// temporal y DB_CONFIG_PATH lo aísla del .db_connection real. Antes de cada operación se
// comprueba que la base efectiva es la esperada y termina en _test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import mysql from 'mysql2/promise';

const ORIGEN = 'conta_hogar_o08_origen_test';
const DESTINO = 'conta_hogar_o08_destino_test';
const NL = String.fromCharCode(10);
const BASE_SEGURA = /^[a-z0-9_]+_test$/;
const SIN_PERMISO = ['ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR', 'ER_TABLEACCESS_DENIED_ERROR'];

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

const rutaConfig = path.join(os.tmpdir(), 'timon-o08-' + process.pid + '.cnf');
const rutaDump = path.join(os.tmpdir(), 'timon-o08-' + process.pid + '.sql');
const rutaDumpRoot = path.join(os.tmpdir(), 'timon-o08-root-' + process.pid + '.sql');

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

function conectar(base) {
    return mysql.createConnection({ ...entorno, port: Number(entorno.port), database: base, multipleStatements: true });
}

/** Divide las migraciones por `DELIMITER`, como el cliente de línea de comandos. */
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

/** Copias previas presentes antes de una restauración, para borrar solo las nuevas. */
function copiasPrevias() {
    return new Set(fs.readdirSync(os.tmpdir()).filter((nombre) => nombre.startsWith('timon-pre-restore-')));
}

function limpiarCopiasNuevas(previas) {
    for (const nombre of fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('timon-pre-restore-'))) {
        if (!previas.has(nombre)) fs.rmSync(path.join(os.tmpdir(), nombre), { force: true });
    }
}

before(async () => {
    if (motivoSalto) return;

    try {
        admin = await mysql.createConnection({ host: entorno.host, port: Number(entorno.port), user: entorno.user, password: entorno.password });
        await crearBase(ORIGEN);
        await crearBase(DESTINO);
    } catch (error) {
        if (SIN_PERMISO.includes(error.code)) {
            motivoSalto = 'timon_test no puede crear las bases O-08 (' + error.code + '); revisa los GRANT de doc/pruebas/entorno-pruebas.md';
            return;
        }

        throw error;
    }

    Object.assign(process.env, {
        DB_HOST: String(entorno.host),
        DB_PORT: String(entorno.port),
        DB_USER: String(entorno.user),
        DB_PASSWORD: String(entorno.password),
        DB_DATABASE: ORIGEN
    });
    delete process.env.DB_SSL_CA;
    delete process.env.DB_MAINT_USER;
    delete process.env.DB_MAINT_PASSWORD;

    ({ backupDb, restoreDb } = await import('../src/db/db_maintenance.mjs'));
    ({ getDbConfig, serializarValor } = await import('../src/db/db_utilsConn.mjs'));

    escribirConfiguracion(ORIGEN);

    const db = await conectar(ORIGEN);
    const migraciones = fs
        .readdirSync(new URL('../src/db/migrations/', import.meta.url))
        .filter((f) => f.endsWith('.sql'))
        .sort();

    for (const fichero of migraciones) {
        await ejecutarMigracion(db, fs.readFileSync(new URL('../src/db/migrations/' + fichero, import.meta.url), 'utf8'));
    }

    await db.end();
});

after(async () => {
    if (admin) {
        for (const nombre of [ORIGEN, DESTINO]) {
            await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(nombre)).catch(() => {});
        }

        await admin.end().catch(() => {});
    }

    for (const ruta of [rutaConfig, rutaDump, rutaDumpRoot]) {
        fs.rmSync(ruta, { force: true });
    }
});

/** Devuelve `usuario@host` de la cuenta que ejecuta la conexión. */
async function usuarioActual(base) {
    const db = await conectar(base);
    try {
        const [[{ usuario }]] = await db.query('SELECT CURRENT_USER() AS usuario');
        return usuario;
    } finally {
        await db.end();
    }
}

describe('O-07 y O-08: objetos de esquema y DEFINER', () => {
    test('la 0007 crea los cuatro objetos con el DEFINER del ejecutor y es repetible', async (contexto) => {
        if (motivoSalto) {
            contexto.skip(motivoSalto);
            return;
        }

        await comprobarConfiguracion(ORIGEN);
        const db = await conectar(ORIGEN);

        try {
            const [[{ usuario }]] = await db.query('SELECT CURRENT_USER() AS usuario');
            const [rutinas] = await db.query('SELECT ROUTINE_NAME, DEFINER FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? ORDER BY ROUTINE_NAME', [ORIGEN]);

            assert.deepEqual(
                rutinas.map((r) => r.ROUTINE_NAME),
                ['generar_recibos_anio', 'realizar_mantenimiento_indices']
            );
            assert.ok(
                rutinas.every((r) => r.DEFINER === usuario),
                'las rutinas deben tener el DEFINER del ejecutor'
            );

            const [eventos] = await db.query('SELECT EVENT_NAME, DEFINER, STATUS, INTERVAL_VALUE, INTERVAL_FIELD, TIME_ZONE, ON_COMPLETION, STARTS FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ? ORDER BY EVENT_NAME', [ORIGEN]);

            assert.deepEqual(
                eventos.map((e) => e.EVENT_NAME),
                ['generar_recibos_anio_evento', 'indice_mantenimiento_mensual']
            );
            assert.ok(
                eventos.every((e) => e.DEFINER === usuario && e.STATUS === 'ENABLED'),
                'los eventos deben estar a nombre del ejecutor y activos'
            );

            const recibos = eventos[0];
            const indice = eventos[1];

            assert.equal(Number(recibos.INTERVAL_VALUE), 1);
            assert.equal(recibos.INTERVAL_FIELD, 'HOUR');
            assert.equal(recibos.TIME_ZONE, '+00:00');
            assert.equal(recibos.ON_COMPLETION, 'PRESERVE');
            assert.equal(Number(indice.INTERVAL_VALUE), 1);
            assert.equal(indice.INTERVAL_FIELD, 'MONTH');
            assert.equal(indice.TIME_ZONE, 'Europe/Madrid');
            assert.equal(indice.ON_COMPLETION, 'NOT PRESERVE');

            const [[{ ahora }]] = await db.query('SELECT NOW() AS ahora');

            for (const evento of eventos) {
                assert.ok(new Date(evento.STARTS).getTime() > new Date(ahora).getTime(), 'STARTS debe ser futuro');
            }

            await ejecutarMigracion(db, fs.readFileSync(new URL('../src/db/migrations/0007_objetos_esquema_definer.sql', import.meta.url), 'utf8'));

            const [[{ rutinas: nRutinas }]] = await db.query('SELECT COUNT(*) AS rutinas FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?', [ORIGEN]);
            const [[{ eventos: nEventos }]] = await db.query('SELECT COUNT(*) AS eventos FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ?', [ORIGEN]);

            assert.equal(nRutinas, 2, 'la 0007 debe ser repetible sin duplicar rutinas');
            assert.equal(nEventos, 2, 'la 0007 debe ser repetible sin duplicar eventos');
        } finally {
            await db.end();
        }
    });

    test('el volcado conserva el DEFINER y se restaura con la misma cuenta sin SET USER', async (contexto) => {
        if (motivoSalto) {
            contexto.skip(motivoSalto);
            return;
        }

        await comprobarConfiguracion(ORIGEN);

        const usuario = await usuarioActual(ORIGEN);

        await backupDb(rutaDump);

        const sql = fs.readFileSync(rutaDump, 'utf8');

        for (const nombre of ['realizar_mantenimiento_indices', 'generar_recibos_anio', 'indice_mantenimiento_mensual', 'generar_recibos_anio_evento']) {
            assert.ok(sql.includes(nombre), 'el volcado debe incluir ' + nombre);
        }

        const [cuenta, host] = usuario.split('@');

        assert.ok(sql.includes('DEFINER=`' + cuenta + '`@`' + host + '`'), 'el volcado debe conservar el DEFINER del ejecutor');
        assert.equal(/DEFINER=`?root`?@/.test(sql), false, 'el volcado no debe contener un DEFINER de root');

        escribirConfiguracion(DESTINO);
        await comprobarConfiguracion(DESTINO);

        await restoreDb(rutaDump);
        await restoreDb(rutaDump);

        const db = await conectar(DESTINO);

        try {
            const [[{ usuario: usuarioDestino }]] = await db.query('SELECT CURRENT_USER() AS usuario');
            const [rutinas] = await db.query('SELECT ROUTINE_NAME, DEFINER FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? ORDER BY ROUTINE_NAME', [DESTINO]);
            const [eventos] = await db.query('SELECT EVENT_NAME, DEFINER, STATUS FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ? ORDER BY EVENT_NAME', [DESTINO]);

            assert.equal(rutinas.length, 2, 'deben existir dos procedimientos tras dos restauraciones');
            assert.ok(
                rutinas.every((r) => r.DEFINER === usuarioDestino),
                'el DEFINER debe conservarse'
            );
            assert.equal(eventos.length, 2, 'deben existir dos eventos tras dos restauraciones');
            assert.ok(
                eventos.every((e) => e.DEFINER === usuarioDestino && e.STATUS === 'ENABLED'),
                'los eventos deben conservar DEFINER y estado'
            );

            await db.query('CALL `realizar_mantenimiento_indices`()');

            const [[{ trazas }]] = await db.query("SELECT COUNT(*) AS trazas FROM mantenimiento_logs WHERE operacion = 'Mantenimiento índices'");

            assert.ok(trazas >= 1, 'el procedimiento de mantenimiento debe dejar traza');

            const [filas] = await db.query("CALL `generar_recibos_anio`(1, 1, '2026-12-01 03:00:00')");

            assert.ok(Array.isArray(filas), 'la simulación debe devolver un resultado');
        } finally {
            await db.end();
        }
    });

    test('una copia con DEFINER=root@% no se restaura con timon_test: la fidelidad exige SET USER', async (contexto) => {
        if (motivoSalto) {
            contexto.skip(motivoSalto);
            return;
        }

        escribirConfiguracion(DESTINO);
        await comprobarConfiguracion(DESTINO);

        const volcadoRoot = [
            '-- MariaDB dump 10.19',
            'DROP TABLE IF EXISTS `o08_fidelidad`;',
            'CREATE TABLE `o08_fidelidad` (`id` int(11) NOT NULL, PRIMARY KEY (`id`));',
            'DELIMITER ;;',
            '/*!50003 CREATE*/ /*!50020 DEFINER=`root`@`%`*/ /*!50003 PROCEDURE `o08_fidelidad_p`() SELECT 1 */;;',
            'DELIMITER ;',
            '-- Dump completed',
            ''
        ].join(NL);

        fs.writeFileSync(rutaDumpRoot, volcadoRoot);

        const previas = copiasPrevias();
        const error = await restoreDb(rutaDumpRoot)
            .then(() => null)
            .catch((capturado) => capturado);

        limpiarCopiasNuevas(previas);

        assert.ok(error, 'la restauración debe fallar sin SET USER');
        assert.equal(error.status, 409);
        assert.equal(error.codigo, 'RESTAURACION_SIN_SET_USER');
        assert.match(error.message, /SET USER/);

        const db = await conectar(DESTINO);

        try {
            const [[{ rutinas }]] = await db.query('SELECT COUNT(*) AS rutinas FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?', [DESTINO]);
            const [[{ eventos }]] = await db.query('SELECT COUNT(*) AS eventos FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ?', [DESTINO]);

            assert.equal(rutinas, 2, 'el fallo del fixture no debe borrar los procedimientos restaurados');
            assert.equal(eventos, 2, 'el fallo del fixture no debe borrar los eventos restaurados');
        } finally {
            await db.end();
        }
    });
});
