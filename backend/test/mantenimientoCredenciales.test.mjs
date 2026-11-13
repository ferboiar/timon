// S-02: las credenciales no viajan en los argumentos del proceso hijo y el fichero de
// opciones temporal se crea con modo 600 y se borra siempre (también si falla).
//
// No se ejecuta ningún volcado real: `mysqldump` y `mysql` se sustituyen por un ejecutable
// de prueba (el primero de PATH) que solo anota los argumentos y el fichero de opciones.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { backupDb, restoreDb } from '../src/db/db_maintenance.mjs';
import { getDbConfig, getDbPassword } from '../src/db/db_utilsConn.mjs';

const NL = String.fromCharCode(10);
const RUTA_CONFIG = new URL('../src/db/.db_connection', import.meta.url);
const VOLCADO = [
    '-- MariaDB dump 10.19',
    "DROP TABLE IF EXISTS `x`;",
    'CREATE TABLE `x` (id int);',
    ''
].join(NL);

let dirStub = '';
let anotacion = '';
let pathAnterior = '';
let contrasena = '';
let hayConfiguracion = false;

/** Ejecutable de prueba que anota argumentos, fichero de opciones y su modo. */
function crearStub(nombre, codigo) {
    const ruta = path.join(dirStub, nombre);

    fs.writeFileSync(
        ruta,
        '#!' + process.execPath + NL +
            'const fs = require("node:fs");' + NL +
            'const extra = process.argv.slice(2).find((a) => a.startsWith("--defaults-extra-file="));' + NL +
            'const datos = { args: process.argv.slice(2), fichero: extra ? extra.split("=")[1] : null };' + NL +
            'if (datos.fichero) {' + NL +
            '    datos.modo = (fs.statSync(datos.fichero).mode & 0o777).toString(8);' + NL +
            '    datos.contenido = fs.readFileSync(datos.fichero, "utf8");' + NL +
            '}' + NL +
            'fs.writeFileSync(process.env.STIMON_ANOTACION, JSON.stringify(datos));' + NL +
            'process.exit(' + codigo + ');' + NL
    );
    fs.chmodSync(ruta, 0o755);
}

/** Lee lo que anotó el último ejecutable de prueba. */
function leerAnotacion() {
    return JSON.parse(fs.readFileSync(anotacion, 'utf8'));
}

before(async () => {
    if (!fs.existsSync(RUTA_CONFIG)) return;

    const { config } = await getDbConfig();

    contrasena = await getDbPassword();
    hayConfiguracion = Boolean(config.DB_HOST && contrasena);

    if (!hayConfiguracion) return;

    dirStub = fs.mkdtempSync(path.join(os.tmpdir(), 'timon-stub-'));
    anotacion = path.join(dirStub, 'anotacion.json');
    pathAnterior = process.env.PATH;

    process.env.STIMON_ANOTACION = anotacion;
    process.env.PATH = dirStub + ':' + pathAnterior;
});

after(() => {
    if (pathAnterior) process.env.PATH = pathAnterior;
    delete process.env.STIMON_ANOTACION;
    if (dirStub) fs.rmSync(dirStub, { recursive: true, force: true });
});

describe('S-02: credenciales del mantenimiento', () => {
    test('el backup no lleva la contraseña en los argumentos y borra el fichero de opciones', async (contexto) => {
        if (!hayConfiguracion) {
            contexto.skip('no hay configuración de base de datos');
            return;
        }

        crearStub('mysqldump', 0);

        const destino = path.join(dirStub, 'volcado.sql');

        await backupDb(destino);

        const datos = leerAnotacion();

        assert.equal(datos.args.some((argumento) => argumento.startsWith('--password')), false, 'no debe usarse --password');
        assert.equal(datos.args.some((argumento) => argumento.includes(contrasena)), false, 'la contraseña no puede estar en los argumentos');
        assert.ok(datos.fichero, 'debe usarse --defaults-extra-file');
        assert.equal(datos.modo, '600', 'el fichero de opciones debe ser privado');
        assert.equal(datos.contenido.includes(contrasena), true, 'la contraseña va dentro del fichero de opciones');
        assert.equal(fs.existsSync(datos.fichero), false, 'el fichero de opciones debe borrarse al terminar');
    });

    test('si el proceso falla, el fichero de opciones también se borra', async (contexto) => {
        if (!hayConfiguracion) {
            contexto.skip('no hay configuración de base de datos');
            return;
        }

        crearStub('mysqldump', 2);

        await assert.rejects(() => backupDb(path.join(dirStub, 'fallido.sql')));

        const datos = leerAnotacion();

        assert.equal(fs.existsSync(datos.fichero), false, 'el fichero de opciones debe borrarse también al fallar');
        assert.equal(fs.existsSync(path.join(dirStub, 'fallido.sql')), false, 'no debe quedar un volcado a medias');
    });

    test('la restauración usa el mismo mecanismo y limpia la copia previa', async (contexto) => {
        if (!hayConfiguracion) {
            contexto.skip('no hay configuración de base de datos');
            return;
        }

        crearStub('mysqldump', 0);
        crearStub('mysql', 0);

        const dump = path.join(dirStub, 'volcado-valido.sql');

        fs.writeFileSync(dump, VOLCADO);

        await restoreDb(dump);

        const datos = leerAnotacion();

        assert.equal(datos.args.some((argumento) => argumento.startsWith('--password')), false, 'no debe usarse --password');
        assert.equal(datos.args.some((argumento) => argumento.includes(contrasena)), false, 'la contraseña no puede estar en los argumentos');
        assert.equal(fs.existsSync(datos.fichero), false, 'el fichero de opciones debe borrarse');
        assert.deepEqual(
            fs.readdirSync(os.tmpdir()).filter((fichero) => fichero.startsWith('timon-pre-restore-')),
            [],
            'la copia previa debe borrarse tras una restauración correcta'
        );
    });
});
