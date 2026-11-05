// F-28: pruebas de la utilidad de mensajes de error de la API; no necesitan base de datos ni DOM.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getApiErrorMessage } from '../../src/utils/apiError.js';

function errorCon(data, message = 'Request failed with status code 400') {
    return { message, response: { data } };
}

describe('getApiErrorMessage (F-28)', () => {
    test('prefiere el mensaje del servidor en data.error', () => {
        assert.equal(getApiErrorMessage(errorCon({ error: 'El IBAN ya está asignado a la cuenta 3' })), 'El IBAN ya está asignado a la cuenta 3');
    });

    test('entiende también data.message (rutas de usuarios, conexión y mantenimiento)', () => {
        assert.equal(getApiErrorMessage(errorCon({ message: 'Credenciales incorrectas' })), 'Credenciales incorrectas');
    });

    test('data.error manda sobre data.message', () => {
        assert.equal(getApiErrorMessage(errorCon({ error: 'prioritario', message: 'secundario' })), 'prioritario');
    });

    test('cae a error.message cuando el servidor no envía mensaje', () => {
        assert.equal(getApiErrorMessage({ message: 'Network Error' }), 'Network Error');
    });

    test('ignora mensajes vacíos o en blanco', () => {
        assert.equal(getApiErrorMessage(errorCon({ error: '   ', message: '' }, 'texto del propio error')), 'texto del propio error');
    });

    test('acepta que se lance una cadena', () => {
        assert.equal(getApiErrorMessage('fallo directo'), 'fallo directo');
    });

    test('recorta los espacios de los extremos', () => {
        assert.equal(getApiErrorMessage(errorCon({ message: '  con espacios  ' })), 'con espacios');
    });

    test('devuelve el texto genérico solo si no hay nada útil', () => {
        assert.equal(getApiErrorMessage(undefined), 'Error desconocido');
        assert.equal(getApiErrorMessage({}), 'Error desconocido');
        assert.equal(getApiErrorMessage(errorCon({ error: '', message: '  ' }, '')), 'Error desconocido');
    });
});
