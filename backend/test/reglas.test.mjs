// DC-47: los bloques de reglas con centinelas no pueden divergir. No necesita base de datos.
import assert from 'node:assert/strict';
import test from 'node:test';

import { REGLAS, compararReglas, extraerBloque } from '../../scripts/comprobar-reglas.mjs';

const NOMBRE = 'prueba';
const bloque = (contenido) => `antes\n<!-- regla:${NOMBRE} -->\n${contenido}\n<!-- /regla:${NOMBRE} -->\ndespués`;

/** Fichero simulado con los dos bloques reales, para las pruebas de `compararReglas`. */
const ficheroCon = (texto) =>
    Object.keys(REGLAS)
        .map((nombre) => `<!-- regla:${nombre} -->\n${texto}\n<!-- /regla:${nombre} -->`)
        .join('\n');

test('extraerBloque devuelve el contenido entre los centinelas y su línea', () => {
    const { contenido, linea, problemas } = extraerBloque(bloque('texto de la regla'), NOMBRE);

    assert.deepEqual(problemas, []);
    assert.equal(contenido, 'texto de la regla');
    assert.equal(linea, 2);
});

test('extraerBloque informa si falta el centinela de apertura', () => {
    const { problemas } = extraerBloque(`texto\n<!-- /regla:${NOMBRE} -->\n`, NOMBRE);

    assert.equal(problemas.length, 1);
    assert.equal(problemas[0].includes('apertura'), true);
});

test('extraerBloque informa si el centinela de cierre está repetido', () => {
    const { problemas } = extraerBloque(`${bloque('texto')}\n<!-- /regla:${NOMBRE} -->\n`, NOMBRE);

    assert.equal(problemas.length, 1);
    assert.equal(problemas[0].includes('cierre'), true);
});

test('extraerBloque rechaza un bloque vacío', () => {
    const { problemas } = extraerBloque(bloque('   '), NOMBRE);

    assert.equal(problemas.length, 1);
    assert.equal(problemas[0].includes('vacío'), true);
});

test('extraerBloque ignora los saltos CRLF y los espacios de los extremos', () => {
    const conCrlf = `<!-- regla:${NOMBRE} -->\r\n  texto  \r\n<!-- /regla:${NOMBRE} -->\r\n`;
    const { contenido, problemas } = extraerBloque(conCrlf, NOMBRE);

    assert.deepEqual(problemas, []);
    assert.equal(contenido, 'texto');
});

test('compararReglas acepta copias idénticas', () => {
    // Todas las rutas de las dos reglas devuelven el mismo bloque
    const resultado = compararReglas({ leer: () => ficheroCon('misma regla') });

    assert.equal(resultado.ok, true);
    assert.deepEqual(resultado.problemas, []);
});

test('compararReglas señala la copia que diverge', () => {
    // La copia de `.cline/rules` es la que se separa del texto de la instrucción persistente
    const resultado = compararReglas({
        leer: (ruta) => ficheroCon(ruta.includes('.cline/rules') ? 'otra regla' : 'misma regla')
    });

    assert.equal(resultado.ok, false);
    assert.equal(resultado.problemas.length, 2);
    assert.equal(
        resultado.problemas.every((problema) => problema.includes('diverge')),
        true
    );
    assert.equal(
        resultado.problemas.every((problema) => problema.includes('.cline/rules')),
        true
    );
});

test('compararReglas informa si un fichero no se puede leer', () => {
    const resultado = compararReglas({
        leer: (ruta) => {
            if (ruta.endsWith('a.md')) return bloque('misma regla');
            const error = new Error('no existe');
            error.code = 'ENOENT';
            throw error;
        }
    });

    assert.equal(resultado.ok, false);
    assert.equal(
        resultado.problemas.some((problema) => problema.includes('ENOENT')),
        true
    );
});

test('cada regla tiene exactamente dos copias declaradas', () => {
    assert.deepEqual(Object.keys(REGLAS).sort(), ['edicion-ficheros', 'publicacion-fusiones']);

    for (const ficheros of Object.values(REGLAS)) {
        assert.equal(ficheros.length, 2);
        assert.equal(ficheros.includes('.cline/rules/00-timon-obligatorio.md'), true);
    }
});

test('los bloques del repositorio no divergen (prueba de divergencia de DC-47)', () => {
    const { ok, problemas, resumen } = compararReglas();

    assert.deepEqual(problemas, []);
    assert.equal(ok, true);
    assert.equal(resumen.length, 2);
});
