// DC-46: comprobador del entorno de pruebas. No necesita base de datos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { asegurarPermisos, basesConcedidas, basesPeligrosas, parsearEnv, revisarFichero } from '../../scripts/comprobar-entorno-pruebas.mjs';

const TEMPORAL = path.join('/tmp', 'timon-entorno-pruebas');

function escribirFichero(nombre, contenido, modo) {
    const ruta = path.join(TEMPORAL, nombre);
    fs.mkdirSync(TEMPORAL, { recursive: true });
    fs.writeFileSync(ruta, contenido, { mode: modo });
    fs.chmodSync(ruta, modo);
    return ruta;
}

test('parsearEnv lee el formato de node --env-file', () => {
    const variables = parsearEnv(['# comentario', 'TEST_DB_HOST=mariadb01', '', '  TEST_DB_PORT = 3306  ', 'sin_igual'].join('\n'));

    assert.equal(variables.get('TEST_DB_HOST'), 'mariadb01');
    assert.equal(variables.get('TEST_DB_PORT'), '3306');
    assert.equal(variables.has('sin_igual'), false);
    assert.equal(variables.size, 2);
});

test('basesConcedidas reconoce las bases y el permiso global', () => {
    const filas = [
        'GRANT USAGE ON *.* TO `timon_test`@`%`',
        'GRANT ALL PRIVILEGES ON `conta_hogar_test`.* TO `timon_test`@`%`',
        'GRANT SELECT ON `otra_test`.* TO `timon_test`@`%`',
        'GRANT ALL PRIVILEGES ON `conta_hogar`.* TO `timon_test`@`%`'
    ];

    // `GRANT USAGE ON *.*` no concede nada y no debe aparecer
    assert.deepEqual(basesConcedidas(filas), ['conta_hogar', 'conta_hogar_test', 'otra_test']);
});

test('basesConcedidas ignora filas sin ON base.*', () => {
    assert.deepEqual(basesConcedidas(['GRANT USAGE ON *.* TO x']), []);
    assert.deepEqual(basesConcedidas(['GRANT ALL PRIVILEGES ON *.* TO x']), ['*']);
    assert.deepEqual(basesConcedidas([]), []);
    assert.deepEqual(basesConcedidas(undefined), []);
});

test('basesPeligrosas señala el permiso global y las bases que no acaban en _test', () => {
    assert.deepEqual(basesPeligrosas(['*', 'conta_hogar', 'conta_hogar_test']), ['*', 'conta_hogar']);
    assert.deepEqual(basesPeligrosas(['conta_hogar_test', 'otra_test']), []);
});

test('revisarFichero acepta un fichero completo con permisos 600', () => {
    const contenido = [
        'TEST_DB_HOST=mariadb01',
        'TEST_DB_PORT=3306',
        'TEST_DB_USER=timon_test',
        'TEST_DB_PASSWORD=secreta',
        'TEST_DB_NAME=conta_hogar_test'
    ].join('\n') + '\n';
    const ruta = escribirFichero('.env.test-bueno', contenido, 0o600);
    const { problemas, variables } = revisarFichero(ruta);

    assert.deepEqual(problemas, []);
    assert.equal(variables.get('TEST_DB_NAME'), 'conta_hogar_test');
});

test('asegurarPermisos restablece el 600 que git no conserva', () => {
    const ruta = escribirFichero('.env.test-permisos', 'TEST_DB_HOST=x\n', 0o644);

    assert.equal(asegurarPermisos(ruta), true);
    assert.equal(fs.statSync(ruta).mode & 0o777, 0o600);
    assert.equal(asegurarPermisos(ruta), false);
});

test('revisarFichero enumera las variables que faltan', () => {
    const ruta = escribirFichero('.env.test-incompleto', 'TEST_DB_HOST=mariadb01\nTEST_DB_PORT=3306\n', 0o600);
    const { problemas } = revisarFichero(ruta);

    for (const nombre of ['TEST_DB_USER', 'TEST_DB_PASSWORD', 'TEST_DB_NAME']) {
        assert.equal(problemas.some((problema) => problema.includes(nombre)), true, nombre);
    }
});

test('revisarFichero exige que la base acabe en _test', () => {
    const contenido = [
        'TEST_DB_HOST=mariadb01',
        'TEST_DB_PORT=3306',
        'TEST_DB_USER=timon_test',
        'TEST_DB_PASSWORD=secreta',
        'TEST_DB_NAME=conta_hogar'
    ].join('\n');

    const ruta = escribirFichero('.env.test-base-mala', contenido, 0o600);
    const { problemas } = revisarFichero(ruta);

    assert.equal(problemas.some((problema) => problema.includes('acabar en _test')), true);
});

test('revisarFichero informa si el fichero no existe', () => {
    const { problemas } = revisarFichero(path.join(TEMPORAL, 'no-existe.env.test'));

    assert.equal(problemas.length, 1);
    assert.equal(problemas[0].includes('No existe'), true);
});

test('limpia los temporales de la prueba', () => {
    fs.rmSync(TEMPORAL, { recursive: true, force: true });
    assert.equal(fs.existsSync(TEMPORAL), false);
});
