// Pruebas de las utilidades de parámetros de las rutas (F-43, DC-39): no necesitan base de datos.
// Se pueden ejecutar solas: node --test backend/test/parametros.test.mjs
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { leerBooleano, leerEnteroPositivo, leerEsPrivado, leerListaEnterosPositivos } from '../src/utils/parametros.mjs';

describe('parámetros de las rutas (F-43, DC-39)', () => {
    test('leerBooleano admite true y false como booleano o texto, y usa el valor por defecto si falta', () => {
        assert.equal(leerBooleano(undefined, 'redistribuir'), false);
        assert.equal(leerBooleano(undefined, 'redistribuir', true), true);
        assert.equal(leerBooleano('true', 'redistribuir'), true);
        assert.equal(leerBooleano(true, 'redistribuir'), true);
        assert.equal(leerBooleano('false', 'redistribuir'), false);
        assert.equal(leerBooleano(false, 'redistribuir'), false);
    });

    test('leerBooleano rechaza cualquier otro valor con 400', () => {
        for (const valor of ['TRUE', 'ture', '1', 1, 0, '', null, ['true'], {}]) {
            assert.throws(() => leerBooleano(valor, 'redistribuir'), { status: 400 }, 'valor: ' + JSON.stringify(valor));
        }
    });

    test('leerEnteroPositivo admite enteros positivos como texto o número', () => {
        assert.equal(leerEnteroPositivo('7', 'id'), 7);
        assert.equal(leerEnteroPositivo(7, 'id'), 7);
        assert.equal(leerEnteroPositivo(' 12 ', 'id'), 12);
    });

    test('leerEnteroPositivo rechaza decimales, signos, ceros, texto, tipos raros y enteros inseguros con 400', () => {
        for (const valor of ['0', '-1', '1.5', 'abc', '', '12abc', '012', null, undefined, [3], true, 0, 1.5, '99999999999999999999']) {
            assert.throws(() => leerEnteroPositivo(valor, 'id'), { status: 400 }, 'valor: ' + JSON.stringify(valor));
        }
    });

    test('leerListaEnterosPositivos convierte una lista válida', () => {
        assert.deepEqual(leerListaEnterosPositivos([1, '2', 3], 'advances'), [1, 2, 3]);
    });

    test('leerListaEnterosPositivos rechaza listas vacías, no listas y elementos no válidos con 400', () => {
        for (const valor of [[], 'x', undefined, [1, 'a'], [0]]) {
            assert.throws(() => leerListaEnterosPositivos(valor, 'advances'), { status: 400 }, 'valor: ' + JSON.stringify(valor));
        }
    });

    test('leerEsPrivado admite 0 y 1 como número o texto, y devuelve null cuando el campo no viaja (DC-75)', () => {
        assert.equal(leerEsPrivado(undefined), null);
        assert.equal(leerEsPrivado(null), null);
        assert.equal(leerEsPrivado(''), null);
        assert.equal(leerEsPrivado(0), 0);
        assert.equal(leerEsPrivado('0'), 0);
        assert.equal(leerEsPrivado(1), 1);
        assert.equal(leerEsPrivado('1'), 1);
    });

    test('leerEsPrivado rechaza booleanos, otros números y texto con 400 (DC-75)', () => {
        for (const valor of [true, false, 2, -1, '2', '01', 'si', [], {}]) {
            assert.throws(() => leerEsPrivado(valor), { status: 400 }, 'valor: ' + JSON.stringify(valor));
        }
    });
});
