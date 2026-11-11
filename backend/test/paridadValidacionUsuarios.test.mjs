// F-42, DC-51: la validación del servidor y la de la pantalla deben dar el mismo resultado.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as backend from '../src/utils/validacionUsuarios.mjs';
import * as frontend from '../../src/utils/validacionUsuarios.js';

const CASOS_NOMBRE = ['', '   ', 'ana', 'a'.repeat(50), 'a'.repeat(51), 3, 'a\u0000b'];
const CASOS_EMAIL = ['', 'ana@example.test', 'sin-arroba', 'a@b', 'a b@c.d', 'a'.repeat(96) + '@x.es', 3];
const CASOS_ROL = ['', 'admin', 'user', 'limited_user', 'reader', 'superadmin', 3];
const CASOS_PASSWORD = [
    ['', { obligatoria: true }],
    ['', { obligatoria: false }],
    ['Abcdef1', { obligatoria: true }],
    ['Abcdef12', { obligatoria: true }],
    ['a'.repeat(71) + '1', { obligatoria: true }],
    ['a'.repeat(73), { obligatoria: true }],
    ['12345678', { obligatoria: true }],
    ['abcdefgh', { obligatoria: true }],
    ['a'.repeat(68) + '😀1', { obligatoria: true }],
    [12, { obligatoria: true }]
];

describe('F-42, DC-51: paridad de validación backend/frontend', () => {
    test('las constantes coinciden', () => {
        assert.equal(backend.LONGITUD_MAXIMA_USUARIO, frontend.LONGITUD_MAXIMA_USUARIO);
        assert.equal(backend.LONGITUD_MAXIMA_EMAIL, frontend.LONGITUD_MAXIMA_EMAIL);
        assert.equal(backend.LONGITUD_MINIMA_PASSWORD, frontend.LONGITUD_MINIMA_PASSWORD);
        assert.equal(backend.LONGITUD_MAXIMA_PASSWORD, frontend.LONGITUD_MAXIMA_PASSWORD);
        assert.equal(backend.LONGITUD_MAXIMA_PASSWORD_BYTES, frontend.LONGITUD_MAXIMA_PASSWORD_BYTES);
        assert.deepEqual(backend.ROLES_USUARIO, frontend.ROLES_USUARIO);
        assert.deepEqual(backend.PERMISOS_USUARIO, frontend.PERMISOS_USUARIO);
    });

    test('nombre de usuario da el mismo mensaje o null', () => {
        for (const valor of CASOS_NOMBRE) {
            assert.equal(backend.errorNombreUsuario(valor), frontend.errorNombreUsuario(valor), String(valor));
        }
    });

    test('correo da el mismo mensaje o null', () => {
        for (const valor of CASOS_EMAIL) {
            assert.equal(backend.errorEmail(valor), frontend.errorEmail(valor), String(valor));
        }
    });

    test('rol da el mismo mensaje o null', () => {
        for (const valor of CASOS_ROL) {
            assert.equal(backend.errorRol(valor), frontend.errorRol(valor), String(valor));
        }
    });

    test('contraseña da el mismo mensaje o null, incluida la edición opcional', () => {
        for (const [valor, opciones] of CASOS_PASSWORD) {
            assert.equal(
                backend.errorPassword(valor, opciones),
                frontend.errorPassword(valor, opciones),
                String(valor) + ' ' + JSON.stringify(opciones)
            );
        }
    });

    test('permisos dan el mismo mensaje o null', () => {
        const casos = [{}, { perm_recibos: 'lectura' }, { perm_ahorros: 'total' }, { perm_cuentas: 'no' }];
        for (const datos of casos) {
            assert.equal(backend.errorPermisos(datos), frontend.errorPermisos(datos), JSON.stringify(datos));
        }
    });
});
