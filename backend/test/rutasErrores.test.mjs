// F-47: guarda estática de las rutas incluidas en la iteración. No necesita base de datos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, test } from 'node:test';

const RUTAS = ['cuentas', 'ahorros', 'categorias', 'recibos'];

const PREFIJOS = [
    'Error al insertar o actualizar la cuenta: ',
    'Error al insertar o actualizar el ahorro: ',
    'Error al insertar o actualizar el movimiento: ',
    'Error al insertar o actualizar la categoría: ',
    'Error al insertar o actualizar el recibo: '
];

function leerRuta(nombre) {
    return fs.readFileSync(new URL(`../src/routes/${nombre}.mjs`, import.meta.url), 'utf8');
}

/** Líneas que responden al cliente (se excluyen las trazas de consola). */
function lineasDeRespuesta(texto) {
    return texto
        .split('\n')
        .filter((linea) => !linea.includes('console.'))
        .filter((linea) => /\bres\.(status|json|send)\b/.test(linea));
}

describe('rutas incluidas en F-47', () => {
    for (const nombre of RUTAS) {
        test(`${nombre}.mjs no responde con details: error.stack`, () => {
            const texto = leerRuta(nombre);
            assert.equal(texto.includes('details: error.stack'), false, 'queda details: error.stack');
        });

        test(`${nombre}.mjs no usa los prefijos técnicos conocidos`, () => {
            const texto = leerRuta(nombre);
            for (const prefijo of PREFIJOS) {
                assert.equal(texto.includes(prefijo), false, `queda el prefijo «${prefijo}»`);
            }
        });

        test(`${nombre}.mjs no devuelve error.message directamente al cliente`, () => {
            const sospechosas = lineasDeRespuesta(leerRuta(nombre)).filter((linea) => linea.includes('error.message'));
            assert.deepEqual(sospechosas, [], `respuestas con error.message: ${sospechosas.join(' | ')}`);
        });

        test(`${nombre}.mjs usa la utilidad compartida`, () => {
            assert.equal(leerRuta(nombre).includes('responderError'), true, 'no importa responderError');
        });
    }

    test('cuentas.mjs conserva el 409 del IBAN sin doble respuesta', () => {
        const texto = leerRuta('cuentas');
        assert.equal(texto.includes("error.codigo === 'IBAN_DUPLICADO'"), true, 'no comprueba el código de negocio');
        assert.equal(texto.includes('return res.status(409)'), false, 'queda una respuesta propia del 409');
        assert.equal(texto.includes('responderError(res, error'), true, 'no responde con la utilidad');
    });
});
