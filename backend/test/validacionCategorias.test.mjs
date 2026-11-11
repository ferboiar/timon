// F-41: límite de descripción de categorías sin base de datos.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    LONGITUD_MAXIMA_DESCRIPCION_CATEGORIA,
    validarCategoria
} from '../src/utils/validacionCategorias.mjs';

function rechaza(datos, mensaje) {
    assert.throws(() => validarCategoria(datos), (error) => {
        assert.equal(error.name, 'ErrorDeNegocio');
        assert.equal(error.status, 400);
        assert.equal(error.message, mensaje);
        return true;
    });
}

describe('F-41: descripción de categorías', () => {
    test('acepta 255 caracteres y rechaza 256', () => {
        assert.equal(LONGITUD_MAXIMA_DESCRIPCION_CATEGORIA, 255);
        assert.doesNotThrow(() => validarCategoria({ nombre: 'General', descripcion: 'x'.repeat(255) }));
        rechaza(
            { nombre: 'General', descripcion: 'x'.repeat(256) },
            'La descripción de la categoría no puede superar los 255 caracteres.'
        );
    });

    test('acepta descripción nula o ausente', () => {
        assert.doesNotThrow(() => validarCategoria({ nombre: 'General', descripcion: null }));
        assert.doesNotThrow(() => validarCategoria({ nombre: 'General' }));
    });

    test('rechaza nombre vacío y descripción que no es texto', () => {
        rechaza({ nombre: '   ', descripcion: null }, 'El nombre de la categoría es obligatorio.');
        rechaza({ nombre: 'General', descripcion: 12 }, 'La descripción de la categoría debe ser texto.');
    });
});
