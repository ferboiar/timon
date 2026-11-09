import assert from 'node:assert/strict';
import test from 'node:test';

import { CABECERA_GITCRYPT, blobsEnClaro, esSensible, estaCifrado, rutasDeGitattributes } from '../../scripts/comprobar-cifrado.mjs';

/** Contenido cifrado simulado: cabecera de git-crypt y bytes arbitrarios. */
function contenidoCifrado() {
    return Buffer.concat([CABECERA_GITCRYPT, Buffer.from('datos cifrados', 'utf8')]);
}

test('esSensible reconoce los ficheros de secretos y no marca documentación', () => {
    assert.equal(esSensible('backend/.env'), true);
    assert.equal(esSensible('e2e/.env'), true);
    assert.equal(esSensible('backend/src/db/.db_connection'), true);
    assert.equal(esSensible('backend/src/db/.db_connection.backup'), true);
    assert.equal(esSensible('clave.key'), true);
    assert.equal(esSensible('servidor.pem'), true);
    assert.equal(esSensible('backend/test/.env.test'), true);
    assert.equal(esSensible('e2e/.env.example'), false);
    assert.equal(esSensible('.env'), false);
    assert.equal(esSensible('README.md'), false);
    assert.equal(esSensible('scripts/comprobar-cifrado.mjs'), false);
});

test('estaCifrado exige la cabecera de git-crypt al principio', () => {
    assert.equal(estaCifrado(contenidoCifrado()), true);
    assert.equal(estaCifrado(Buffer.from('DB_HOST=mariadb01\n')), false);
    assert.equal(estaCifrado(Buffer.from('')), false);
    assert.equal(estaCifrado('texto'), false);
    assert.equal(estaCifrado(Buffer.concat([Buffer.from('x'), CABECERA_GITCRYPT])), false);
});

test('rutasDeGitattributes extrae solo las rutas con filter=git-crypt', () => {
    const texto = [
        '# Archivos a cifrar con git-crypt',
        'backend/.env filter=git-crypt diff=git-crypt',
        'backend/src/db/.db_connection filter=git-crypt diff=git-crypt',
        'backend/src/db/.db_connection.backup filter=git-crypt diff=git-crypt',
        'e2e/.env filter=git-crypt diff=git-crypt',
        '*.txt text'
    ].join('\n');

    assert.deepEqual(rutasDeGitattributes(texto), ['backend/.env', 'backend/src/db/.db_connection', 'backend/src/db/.db_connection.backup', 'e2e/.env']);
});

test('rutasDeGitattributes devuelve una lista vacía sin coincidencias', () => {
    assert.deepEqual(rutasDeGitattributes('# nada\n*.txt text\n'), []);
});

test('blobsEnClaro no consulta git cuando la lista está vacía', () => {
    assert.deepEqual(blobsEnClaro([]), []);
});
