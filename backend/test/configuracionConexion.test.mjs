// S-03: configuración de la conexión (claves, serialización, TLS, precedencia y pool).
// No necesita base de datos: el pool de mysql2 es perezoso y no conecta al crearse.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import dotenv from 'dotenv';
import { CLAVES_PERMITIDAS, saveDbConfig, serializarValor } from '../src/db/db_utilsConn.mjs';
import { closePool, configuracionEfectiva, construirConfiguracionPool, initPool, recrearPool } from '../src/db/db_connection.mjs';

/** Sin fichero de conexión utilizable, la prueba de recreación no aplica. */
const saltarRecreacion = !configuracionEfectiva({}).valores.DB_HOST || Boolean(process.env.DB_HOST);

const SALTO = String.fromCharCode(10);
const BARRA = String.fromCharCode(92);

/** Valores de una sola línea que no pueden perderse al guardar y releer el fichero. */
const VALORES = [
    'simple',
    'con espacio',
    'con # almohadilla',
    'con = igual',
    'con "comilla doble"',
    "con 'comilla simple'",
    'con backtick `',
    'con ' + BARRA + ' barra',
    'con $dolar',
    'padded   ',
    '  padded',
    'clave#con#almohadillas'
];

describe('S-03: claves del fichero de conexión', () => {
    test('solo admite las claves previstas', () => {
        assert.deepEqual(CLAVES_PERMITIDAS, [
            'DB_HOST',
            'DB_PORT',
            'DB_USER',
            'DB_PASSWORD',
            'DB_DATABASE',
            'DB_SSL_CA',
            'DB_MAINT_USER',
            'DB_MAINT_PASSWORD'
        ]);
    });

    test('una clave desconocida da un 400 y no escribe nada', async () => {
        const error = await saveDbConfig({ DB_HOST: 'x', CLAVE_INVENTADA: 'y' })
            .then(() => null)
            .catch((capturado) => capturado);

        assert.ok(error, 'se esperaba el rechazo de la clave');
        assert.equal(error.status, 400);
        assert.equal(error.codigo, 'CLAVES_NO_ADMITIDAS');
    });
});

describe('S-03: ida y vuelta de los valores', () => {
    test('los valores especiales se guardan y se releen igual', () => {
        for (const valor of VALORES) {
            const guardado = 'K=' + serializarValor('DB_PASSWORD', valor);

            assert.equal(dotenv.parse(guardado).K, valor, 'no sobrevive: ' + JSON.stringify(valor));
        }
    });

    test('el certificado admite varias líneas y queda en una sola', () => {
        const pem = '-----BEGIN CERT-----' + SALTO + 'MIIB' + SALTO + 'abc/def+ghi=' + SALTO + '-----END CERT-----';
        const guardado = 'CA=' + serializarValor('DB_SSL_CA', pem);

        assert.equal(dotenv.parse(guardado).CA, pem);
        assert.equal(guardado.includes(SALTO), false, 'el certificado debe quedar en una sola línea');
    });

    test('un salto de línea en otro campo da 400', () => {
        assert.throws(
            () => serializarValor('DB_HOST', 'a' + SALTO + 'b'),
            (error) => error.status === 400 && error.codigo === 'VALOR_CON_SALTO'
        );
    });

    test('la secuencia de escape literal da 400', () => {
        assert.throws(
            () => serializarValor('DB_PASSWORD', 'a' + BARRA + 'nb'),
            (error) => error.status === 400 && error.codigo === 'VALOR_AMBIGUO'
        );
    });

    test('mezclar comillas simples y dobles da 400', () => {
        assert.throws(
            () => serializarValor('DB_PASSWORD', 'a"b' + "'" + 'c'),
            (error) => error.status === 400 && error.codigo === 'VALOR_CON_COMILLAS'
        );
    });
});

describe('S-03: TLS configurable', () => {
    const entorno = { DB_HOST: 'h', DB_PORT: '3306', DB_USER: 'u', DB_PASSWORD: 'p', DB_DATABASE: 'd' };

    test('con CA exige verificación', () => {
        assert.deepEqual(construirConfiguracionPool(entorno, { ca: 'PEM' }).ssl, { ca: 'PEM', rejectUnauthorized: true });
    });

    test('sin CA mantiene la conexión sin verificar', () => {
        assert.deepEqual(construirConfiguracionPool(entorno).ssl, { rejectUnauthorized: false });
    });
});

describe('S-03/V6: precedencia de la configuración', () => {
    const CLAVES = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_DATABASE', 'DB_SSL_CA', 'DB_PASSWORD'];
    const anteriores = {};

    beforeEach(() => {
        for (const clave of CLAVES) anteriores[clave] = process.env[clave];
    });

    afterEach(async () => {
        for (const clave of CLAVES) {
            if (anteriores[clave] === undefined) delete process.env[clave];
            else process.env[clave] = anteriores[clave];
        }

        await closePool();
    });

    test('manda el entorno y nunca la base del fichero', () => {
        process.env.DB_HOST = 'mariadb01';
        process.env.DB_PORT = '3306';
        process.env.DB_USER = 'timon_test';
        process.env.DB_DATABASE = 'conta_hogar_test';

        const { valores, delEntorno } = configuracionEfectiva();

        assert.equal(valores.DB_DATABASE, 'conta_hogar_test');
        assert.notEqual(valores.DB_DATABASE, 'conta_hogar');
        assert.ok(delEntorno.includes('DB_DATABASE'));
    });

    test('sin variables definidas se usa el fichero', () => {
        const { delEntorno } = configuracionEfectiva({});

        assert.deepEqual(delEntorno, []);
    });

    test('con la conexión definida por el entorno, recrearPool no cambia nada', async () => {
        process.env.DB_HOST = 'mariadb01';
        process.env.DB_PORT = '3306';
        process.env.DB_USER = 'timon_test';
        process.env.DB_DATABASE = 'conta_hogar_test';

        assert.deepEqual(await recrearPool(), { recreado: false, motivo: 'entorno' });
    });

    test('dos llamadas seguidas a initPool devuelven el mismo pool', async () => {
        const primero = initPool();
        const segundo = initPool();
        const [a, b] = await Promise.all([primero, segundo]);

        assert.equal(a, b, 'no deben crearse dos pools');
    });

    test('recrearPool crea otro pool y no corta la petición', { skip: saltarRecreacion }, async () => {
        const primero = await initPool();
        const resultado = await recrearPool();
        const segundo = await initPool();

        assert.equal(resultado.recreado, true);
        assert.notEqual(primero, segundo, 'debe haber un pool nuevo');
    });
});

describe('S-03: aislamiento del fichero de configuración', () => {
    test('DB_CONFIG_PATH apunta a otro fichero y no toca el real', async () => {
        const real = new URL('../src/db/.db_connection', import.meta.url);
        const antes = fs.readFileSync(real);
        const ruta = path.join(os.tmpdir(), 'timon-config-' + Date.now() + '.env');

        fs.writeFileSync(ruta, ['DB_HOST=otro-host', 'DB_PORT=3307', 'DB_USER=otro', 'DB_PASSWORD=otra', 'DB_DATABASE=otra_base'].join(String.fromCharCode(10)) + String.fromCharCode(10));
        process.env.DB_CONFIG_PATH = ruta;

        try {
            const modulo = await import('../src/db/db_utilsConn.mjs?config=' + Date.now());
            const { config } = await modulo.getDbConfig();

            assert.equal(config.DB_HOST, 'otro-host');

            await modulo.saveDbConfig({ DB_HOST: 'otro-host', DB_PORT: '3307', DB_USER: 'otro', DB_DATABASE: 'otra_base', DB_MAINT_USER: 'mant', DB_MAINT_PASSWORD: 'clave-mant' });
            assert.equal(fs.readFileSync(ruta, 'utf8').includes('DB_MAINT_USER=mant'), true);
        } finally {
            delete process.env.DB_CONFIG_PATH;
            fs.rmSync(ruta, { force: true });
            fs.rmSync(ruta + '.backup', { force: true });
        }

        assert.equal(fs.readFileSync(real).equals(antes), true, 'el fichero real no debe cambiar');
    });
});
