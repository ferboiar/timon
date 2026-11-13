#!/usr/bin/env node
/**
 * Prepara la base de datos de las pruebas E2E.
 * ============================================
 *
 * Por qué existe: los casos de la pestaña Base de Datos guardan la configuración y
 * restauran un volcado, así que la suite no puede ejecutarse contra la base de desarrollo.
 * Este script deja una base `*_test` y un fichero de configuración aparte, de modo que la
 * aplicación bajo prueba nunca toque `backend/src/db/.db_connection`.
 *
 * Qué hace:
 * 1. Lee `backend/test/.env.test` (credenciales `TEST_DB_*`, sin secretos en el código).
 * 2. Recrea la base `conta_hogar_test` y aplica todas las migraciones.
 * 3. Crea el usuario de las E2E (de `e2e/.env`) con rol de administrador.
 * 4. Escribe el fichero de configuración que usará la aplicación con `DB_CONFIG_PATH`.
 *
 * Uso:
 *   node e2e/scripts/prepara-base-pruebas.mjs [ruta-del-fichero-de-configuración]
 *
 * Ojo: la suite del backend (`npm run test:backend:local`) borra `conta_hogar_test` al
 * terminar, así que hay que volver a ejecutar este script antes de cada tanda de E2E.
 */
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.E2E_TEST_DB_NAME || 'conta_hogar_test';
const RUTA_ENV_PRUEBAS = path.join(RAIZ, 'backend/test/.env.test');
const RUTA_ENV_E2E = path.join(RAIZ, 'e2e/.env');
const RUTA_CONFIG = process.argv[2] || path.join(RAIZ, 'e2e/.runtime-db-connection');

/** Lee un fichero `CLAVE=valor` sin dependencias. */
function leerEnv(ruta) {
    const valores = {};

    for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
        const limpia = linea.trim();

        if (!limpia || limpia.startsWith('#')) continue;

        const corte = limpia.indexOf('=');

        if (corte > 0) valores[limpia.slice(0, corte)] = limpia.slice(corte + 1);
    }

    return valores;
}

/** Divide las migraciones por `DELIMITER`, como hace la suite del backend. */
async function ejecutarMigracion(db, sql) {
    if (!/^\s*DELIMITER\s/im.test(sql)) {
        await db.query(sql);
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
            await db.query(sentencia.slice(0, sentencia.length - delimitador.length));
        }
    }
}

const pruebas = leerEnv(RUTA_ENV_PRUEBAS);
const e2e = leerEnv(RUTA_ENV_E2E);
const conexion = {
    host: pruebas.TEST_DB_HOST,
    port: Number(pruebas.TEST_DB_PORT),
    user: pruebas.TEST_DB_USER,
    password: pruebas.TEST_DB_PASSWORD
};

// Seguridad: este script recrea la base, así que solo puede tocar una base de pruebas
if (!BASE.endsWith('_test')) {
    throw new Error('La base debe terminar en _test (recibido: ' + BASE + '). No se toca nada.');
}

if (!conexion.host || !conexion.user) throw new Error('Faltan TEST_DB_* en backend/test/.env.test');
if (!e2e.E2E_USER || !e2e.E2E_PASSWORD) throw new Error('Faltan E2E_USER y E2E_PASSWORD en e2e/.env');

/**
 * Copia conta_hogar en conta_hogar_test (solo lectura del origen).
 *
 * Se usa `mariadb-dump` con `--single-transaction` y **sin** `--routines` ni `--events`: así
 * el evento horario no se recrea en la base de pruebas y no actúa sobre ella. Además, los
 * objetos de `conta_hogar` tienen `DEFINER=root@%` y la carga la hace `timon_test`, sin
 * `SET USER`, así que un volcado con rutinas fallaría con el error 1227. El origen nunca se
 * modifica.
 */
async function clonarBase(conexionDestino) {
    const config = dotenv.parse(fs.readFileSync(path.join(RAIZ, 'backend/src/db/.db_connection'), 'utf8'));

    if (!config.DB_HOST || !config.DB_DATABASE) throw new Error('No se ha podido leer la configuración de origen');
    if (!config.DB_DATABASE.endsWith('hogar')) throw new Error('El origen inesperado no es la base de desarrollo: ' + config.DB_DATABASE);

    const volcado = path.join(os.tmpdir(), 'timon-clon-' + Date.now() + '.sql');

    await new Promise((resolver, rechazar) => {
        const salida = fs.openSync(volcado, 'w');
        const proceso = spawn(
            'mariadb-dump',
            [
                '--host=' + config.DB_HOST,
                '--port=' + config.DB_PORT,
                '--user=' + config.DB_USER,
                '--single-transaction',
                '--skip-lock-tables',
                '--no-tablespaces',
                config.DB_DATABASE
            ],
            { env: { ...process.env, MYSQL_PWD: config.DB_PASSWORD }, stdio: ['ignore', salida, 'inherit'] }
        );

        proceso.on('close', (codigo) => (codigo === 0 ? resolver() : rechazar(new Error('mariadb-dump terminó con ' + codigo))));
        proceso.on('error', rechazar);
    });

    // Carga por entrada estándar con el cliente mariadb, igual que la restauración real:
    // sin contraseña en los argumentos (fichero de opciones 600) y sin --force.
    const BARRA = String.fromCharCode(92);
    const COMILLA = String.fromCharCode(34);
    const clave = String(conexionDestino.password).split(BARRA).join(BARRA + BARRA).split(COMILLA).join(BARRA + COMILLA);
    const cnf = path.join(os.tmpdir(), 'timon-clon-' + Date.now() + '.cnf');

    fs.writeFileSync(
        cnf,
        ['[client]', 'host="' + conexionDestino.host + '"', 'port=' + conexionDestino.port, 'user="' + conexionDestino.user + '"', 'password="' + clave + '"', ''].join(String.fromCharCode(10)),
        { mode: 0o600 }
    );

    try {
        await new Promise((resolver, rechazar) => {
            const proceso = spawn('mariadb', ['--defaults-extra-file=' + cnf, BASE], { stdio: ['pipe', 'inherit', 'inherit'] });

            fs.createReadStream(volcado).pipe(proceso.stdin);
            proceso.on('close', (codigo) => (codigo === 0 ? resolver() : rechazar(new Error('mariadb terminó con ' + codigo))));
            proceso.on('error', rechazar);
        });
    } finally {
        fs.rmSync(volcado, { force: true });
        fs.rmSync(cnf, { force: true });
    }

    console.log('Clon cargado en', BASE, 'desde', config.DB_DATABASE);
}

const admin = await mysql.createConnection(conexion);
await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(BASE));
await admin.query('CREATE DATABASE ' + mysql.escapeId(BASE) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci');
await admin.end();

// Con E2E_CLONAR=1 se replica conta_hogar (solo lectura del origen); si no, se migran las tablas.
const clonar = process.env.E2E_CLONAR === '1';

if (clonar) await clonarBase(conexion);

// Conexión con la base ya recreada: alta del usuario de las E2E, datos mínimos y
// comprobaciones finales. Sin `multipleStatements` ya no hace falta para cargar el volcado.
const db = await mysql.createConnection({ ...conexion, database: BASE, multipleStatements: true });

// Solo se rellenan sin clonar; con réplica no se aplica ninguna migración.
let migraciones = [];

if (!clonar) {
    migraciones = fs.readdirSync(path.join(RAIZ, 'backend/src/db/migrations')).filter((f) => f.endsWith('.sql')).sort();

    for (const fichero of migraciones) {
        await ejecutarMigracion(db, fs.readFileSync(path.join(RAIZ, 'backend/src/db/migrations', fichero), 'utf8'));
    }
}

const hash = await bcrypt.hash(e2e.E2E_PASSWORD, 10);
const [alta] = await db.query('INSERT INTO users (username, email, password, rol) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password), rol = VALUES(rol)', [e2e.E2E_USER, e2e.E2E_USER + '@example.test', hash, 'admin']);

// Datos mínimos si la base está vacía: los specs de autorización y de recibos exigen al
// menos una cuenta y una categoría. Con un clon de conta_hogar ya existen y no se tocan.
const [[{ cuentas }]] = await db.query('SELECT COUNT(*) AS cuentas FROM cuentas');
const [[{ categorias }]] = await db.query('SELECT COUNT(*) AS categorias FROM categorias');

if (cuentas === 0) {
    await db.query('INSERT INTO cuentas (nombre, tipo, iban, propietario_id) VALUES (?, ?, ?, ?)', ['Cuenta de pruebas E2E', 'corriente', null, alta.insertId]);
}

if (categorias === 0) {
    await db.query('INSERT INTO categorias (nombre, descripcion, propietario_id) VALUES (?, ?, ?)', ['general', null, alta.insertId]);
}
await db.end();

// Fichero de configuración de la aplicación, fuera del repositorio y del fichero real
const lineas = [
    'DB_HOST=' + pruebas.TEST_DB_HOST,
    'DB_PORT=' + pruebas.TEST_DB_PORT,
    'DB_USER=' + pruebas.TEST_DB_USER,
    'DB_PASSWORD=' + pruebas.TEST_DB_PASSWORD,
    'DB_DATABASE=' + BASE,
    ''
];

fs.writeFileSync(RUTA_CONFIG, lineas.join('\n'), { mode: 0o600 });

console.log('Base de pruebas preparada:', BASE, clonar ? '(réplica de la base de desarrollo)' : '(' + migraciones.length + ' migraciones)');
console.log('Usuario de las E2E:', e2e.E2E_USER, '(administrador)');
console.log('Fichero de configuración:', RUTA_CONFIG);
console.log('');
console.log('Arranca la aplicación con ese fichero y ejecuta la suite:');
console.log('  DB_CONFIG_PATH=' + RUTA_CONFIG + ' npm run nas');
console.log('  E2E_DB_CONFIG=' + RUTA_CONFIG + ' E2E_MANT_USER=' + pruebas.TEST_DB_USER + ' npm run e2e');
