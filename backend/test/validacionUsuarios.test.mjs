// F-42, DC-51: validación de usuarios sin base de datos.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    errorEmail,
    errorNombreUsuario,
    errorPassword,
    errorRol,
    validarAltaUsuario,
    validarCambioPassword,
    validarEdicionUsuario
} from '../src/utils/validacionUsuarios.mjs';

function rechaza(fn, mensaje) {
    assert.throws(fn, (error) => {
        assert.equal(error.name, 'ErrorDeNegocio');
        assert.equal(error.status, 400);
        assert.equal(error.message, mensaje);
        return true;
    });
}

const VALIDO = {
    username: 'Ana',
    email: 'ana@example.test',
    password: 'Abcdef12',
    rol: 'user'
};

describe('F-42: alta de usuario', () => {
    test('normaliza espacios y devuelve los permisos enviados', () => {
        assert.deepEqual(
            validarAltaUsuario({
                username: '  Ana  ',
                email: ' ana@example.test ',
                password: 'Abcdef12',
                rol: ' user ',
                perm_recibos: 'lectura'
            }),
            {
                username: 'Ana',
                email: 'ana@example.test',
                password: 'Abcdef12',
                rol: 'user',
                permisos: { perm_recibos: 'lectura' }
            }
        );
    });

    test('acepta el alta sin permisos y deja que la base aplique sus valores por defecto', () => {
        assert.deepEqual(validarAltaUsuario(VALIDO).permisos, {});
    });

    test('rechaza nombre vacío, largo, no texto o con caracteres de control', () => {
        rechaza(() => validarAltaUsuario({ ...VALIDO, username: '' }), 'El nombre de usuario es obligatorio.');
        rechaza(() => validarAltaUsuario({ ...VALIDO, username: 'a'.repeat(51) }), 'El nombre de usuario no puede superar los 50 caracteres.');
        rechaza(() => validarAltaUsuario({ ...VALIDO, username: 3 }), 'El nombre de usuario debe ser texto.');
        rechaza(() => validarAltaUsuario({ ...VALIDO, username: 'a\u0000b' }), 'El nombre de usuario no puede contener caracteres de control.');
    });

    test('rechaza correo vacío, largo o con formato inválido', () => {
        rechaza(() => validarAltaUsuario({ ...VALIDO, email: '' }), 'El correo es obligatorio.');
        rechaza(() => validarAltaUsuario({ ...VALIDO, email: 'a'.repeat(96) + '@x.es' }), 'El correo no puede superar los 100 caracteres.');
        for (const email of ['sin-arroba', 'a@b', 'a b@c.d', 'a@b c.d']) {
            rechaza(() => validarAltaUsuario({ ...VALIDO, email }), 'El correo no tiene un formato válido.');
        }
    });

    test('rechaza contraseñas fuera de la política DC-51', () => {
        rechaza(() => validarAltaUsuario({ ...VALIDO, password: 'Abcdef1' }), 'La contraseña debe tener entre 8 y 72 caracteres.');
        rechaza(() => validarAltaUsuario({ ...VALIDO, password: 'a'.repeat(73) }), 'La contraseña debe tener entre 8 y 72 caracteres.');
        rechaza(() => validarAltaUsuario({ ...VALIDO, password: '12345678' }), 'La contraseña debe incluir al menos una letra y un número.');
        rechaza(() => validarAltaUsuario({ ...VALIDO, password: 'abcdefgh' }), 'La contraseña debe incluir al menos una letra y un número.');
        rechaza(() => validarAltaUsuario({ ...VALIDO, password: 'a'.repeat(68) + '😀1' }), 'La contraseña no puede superar los 72 bytes.');
        assert.equal(errorPassword('a'.repeat(71) + '1'), null);
        assert.equal(errorPassword('Abcdef12'), null);
    });

    test('rechaza rol y permisos fuera del catálogo', () => {
        rechaza(() => validarAltaUsuario({ ...VALIDO, rol: 'superadmin' }), 'El rol debe ser admin, user, limited_user o reader.');
        rechaza(() => validarAltaUsuario({ ...VALIDO, perm_ahorros: 'total' }), 'El permiso de ahorros debe ser no, lectura o escritura.');
        assert.equal(errorRol('limited_user'), null);
    });
});

describe('F-42: edición y cambio de contraseña', () => {
    test('la contraseña es opcional en la edición', () => {
        const datos = validarEdicionUsuario({ id: 7, ...VALIDO, password: '' });
        assert.equal(datos.password, '');
        assert.equal(datos.id, 7);
        assert.equal(validarEdicionUsuario({ id: 7, ...VALIDO, password: undefined }).password, undefined);
    });

    test('si la contraseña llega en la edición, se valida igual', () => {
        rechaza(() => validarEdicionUsuario({ id: 7, ...VALIDO, password: 'corta' }), 'La contraseña debe tener entre 8 y 72 caracteres.');
        assert.equal(validarEdicionUsuario({ id: 7, ...VALIDO, password: 'Abcdef12' }).password, 'Abcdef12');
    });

    test('la edición exige un usuario identificado', () => {
        rechaza(() => validarEdicionUsuario({ ...VALIDO }), 'El usuario indicado no es válido.');
    });

    test('el cambio de contraseña exige usuario y política DC-51', () => {
        rechaza(() => validarCambioPassword({ password: 'Abcdef12' }), 'El usuario indicado no es válido.');
        rechaza(() => validarCambioPassword({ id: 7, password: '' }), 'La contraseña es obligatoria.');
        rechaza(() => validarCambioPassword({ id: 7, password: 'corta' }), 'La contraseña debe tener entre 8 y 72 caracteres.');
        assert.deepEqual(validarCambioPassword({ id: 7, password: 'Abcdef12' }), { id: 7, password: 'Abcdef12' });
    });
});

describe('F-42: mensajes directos', () => {
    test('errorEmail y errorNombreUsuario devuelven null con valores válidos', () => {
        assert.equal(errorEmail('ana@example.test'), null);
        assert.equal(errorNombreUsuario('ana'), null);
    });
});
