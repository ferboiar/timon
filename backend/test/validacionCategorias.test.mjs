// F-41 y F-55: límites de nombre y descripción de categorías sin base de datos.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    LONGITUD_MAXIMA_DESCRIPCION_CATEGORIA,
    LONGITUD_MAXIMA_NOMBRE_CATEGORIA,
    mensajeDeCategoriaDemasiadoLarga,
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

describe('F-55: nombre de categorías', () => {
    test('acepta 30 caracteres y rechaza 31', () => {
        assert.equal(LONGITUD_MAXIMA_NOMBRE_CATEGORIA, 30);
        assert.doesNotThrow(() => validarCategoria({ nombre: 'x'.repeat(30) }));
        rechaza({ nombre: 'x'.repeat(31) }, 'El nombre de la categoría no puede superar los 30 caracteres.');
    });

    test('mide el nombre ya recortado, porque así se guarda', () => {
        assert.doesNotThrow(() => validarCategoria({ nombre: '  ' + 'x'.repeat(30) + '  ' }));
        rechaza({ nombre: '  ' + 'x'.repeat(31) + '  ' }, 'El nombre de la categoría no puede superar los 30 caracteres.');
    });

    test('el mensaje de la columna desbordada distingue nombre y descripción', () => {
        assert.equal(mensajeDeCategoriaDemasiadoLarga('nombre'), 'El nombre de la categoría no puede superar los 30 caracteres.');
        assert.equal(mensajeDeCategoriaDemasiadoLarga('descripcion'), 'La descripción de la categoría no puede superar los 255 caracteres.');
        assert.equal(mensajeDeCategoriaDemasiadoLarga('otra_columna'), null);
    });
});
