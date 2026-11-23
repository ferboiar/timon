// S-01, S-12, DC-48 y DC-75: matriz de autorización, visibilidad, propiedad y privacidad editable.
// No necesita base de datos: `propiedad.mjs` importa el pool pero no lo crea hasta la primera consulta.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ACCIONES,
    MODULOS,
    MODULOS_COMPARTIDOS,
    filtrarVisibles,
    puedeAcceder,
    puedeBorrarRegistro,
    puedeCambiarPrivacidad,
    puedeEditarRegistro,
    puedeVerRegistro
} from '#backend/utils/autorizacion.mjs';
import { asegurarCambioPrivacidad, privacidadSolicitada } from '#backend/utils/propiedad.mjs';

/** Usuario con todos los permisos en el valor indicado. */
function usuario(rol, permiso = 'escritura') {
    return {
        id: 7,
        rol,
        perm_recibos: permiso,
        perm_ahorros: permiso,
        perm_anticipos: permiso,
        perm_categorias: permiso,
        perm_cuentas: permiso,
        perm_presupuestos: permiso,
        perm_transacciones: permiso
    };
}

const PUBLICO = { id: 10, propietario_id: 99, es_privado: 0 };
const PRIVADO_AJENO = { id: 11, propietario_id: 99, es_privado: 1 };
const PRIVADO_PROPIO = { id: 12, propietario_id: 7, es_privado: 1 };

test('la matriz declara los siete módulos y las tres acciones', () => {
    assert.deepEqual(MODULOS, ['recibos', 'presupuestos', 'ahorros', 'anticipos', 'transacciones', 'categorias', 'cuentas']);
    assert.deepEqual(ACCIONES, ['lectura', 'escritura', 'borrado']);
    assert.deepEqual(MODULOS_COMPARTIDOS, ['cuentas', 'categorias']);
});

test('admin puede todo en todos los módulos y acciones', () => {
    for (const modulo of MODULOS) {
        for (const accion of ACCIONES) {
            assert.equal(puedeAcceder(usuario('admin', 'no'), modulo, accion), true, `${modulo}/${accion}`);
        }
    }
});

test('user depende de perm_*: escritura completa, lectura solo lectura y no sin acceso', () => {
    for (const modulo of MODULOS) {
        assert.equal(puedeAcceder(usuario('user', 'escritura'), modulo, 'lectura'), true);
        assert.equal(puedeAcceder(usuario('user', 'escritura'), modulo, 'escritura'), true);
        assert.equal(puedeAcceder(usuario('user', 'escritura'), modulo, 'borrado'), true);
        assert.equal(puedeAcceder(usuario('user', 'lectura'), modulo, 'lectura'), true);
        assert.equal(puedeAcceder(usuario('user', 'lectura'), modulo, 'escritura'), false);
        assert.equal(puedeAcceder(usuario('user', 'lectura'), modulo, 'borrado'), false);
        assert.equal(puedeAcceder(usuario('user', 'no'), modulo, 'lectura'), MODULOS_COMPARTIDOS.includes(modulo), `${modulo} (DC-49)`);
    }
});

test('limited_user lee y escribe con escritura, pero nunca borra', () => {
    for (const modulo of MODULOS) {
        assert.equal(puedeAcceder(usuario('limited_user', 'escritura'), modulo, 'lectura'), true);
        assert.equal(puedeAcceder(usuario('limited_user', 'escritura'), modulo, 'escritura'), true);
        assert.equal(puedeAcceder(usuario('limited_user', 'escritura'), modulo, 'borrado'), false);
        assert.equal(puedeAcceder(usuario('limited_user', 'lectura'), modulo, 'escritura'), false);
        assert.equal(puedeAcceder(usuario('limited_user', 'no'), modulo, 'lectura'), MODULOS_COMPARTIDOS.includes(modulo), `${modulo} (DC-49)`);
    }
});

test('reader solo lee, y solo los módulos con permiso distinto de no', () => {
    for (const modulo of MODULOS) {
        assert.equal(puedeAcceder(usuario('reader', 'escritura'), modulo, 'lectura'), true);
        assert.equal(puedeAcceder(usuario('reader', 'escritura'), modulo, 'escritura'), false);
        assert.equal(puedeAcceder(usuario('reader', 'escritura'), modulo, 'borrado'), false);
        assert.equal(puedeAcceder(usuario('reader', 'no'), modulo, 'lectura'), MODULOS_COMPARTIDOS.includes(modulo), `${modulo} (DC-49)`);
    }
});

test('DC-49: la lectura de cuentas y categorías no depende de perm_*', () => {
    for (const rol of ['user', 'limited_user', 'reader']) {
        assert.equal(puedeAcceder(usuario(rol, 'no'), 'cuentas', 'lectura'), true, `${rol}/cuentas`);
        assert.equal(puedeAcceder(usuario(rol, 'no'), 'categorias', 'lectura'), true, `${rol}/categorias`);
        assert.equal(puedeAcceder(usuario(rol, 'no'), 'cuentas', 'escritura'), false, `${rol}/cuentas escritura`);
        assert.equal(puedeAcceder(usuario(rol, 'no'), 'categorias', 'escritura'), false, `${rol}/categorias escritura`);
        assert.equal(puedeAcceder(usuario(rol, 'no'), 'cuentas', 'borrado'), false, `${rol}/cuentas borrado`);
        assert.equal(puedeAcceder(usuario(rol, 'no'), 'categorias', 'borrado'), false, `${rol}/categorias borrado`);
    }

    // El resto de módulos sigue sujeto a perm_*: la lectura compartida no los abre
    for (const modulo of MODULOS.filter((m) => !MODULOS_COMPARTIDOS.includes(m))) {
        assert.equal(puedeAcceder(usuario('reader', 'no'), modulo, 'lectura'), false, modulo);
    }
});

test('visibilidad: privados solo para el propietario y admin; compartidos para todos', () => {
    assert.equal(puedeVerRegistro(usuario('user'), PUBLICO, 'recibos'), true);
    assert.equal(puedeVerRegistro(usuario('user'), PRIVADO_AJENO, 'recibos'), false);
    assert.equal(puedeVerRegistro(usuario('user'), PRIVADO_PROPIO, 'recibos'), true);
    assert.equal(puedeVerRegistro(usuario('reader'), PRIVADO_AJENO, 'recibos'), false);
    assert.equal(puedeVerRegistro(usuario('limited_user'), PRIVADO_AJENO, 'ahorros'), false);
    assert.equal(puedeVerRegistro(usuario('admin'), PRIVADO_AJENO, 'recibos'), true);
    assert.equal(puedeVerRegistro(usuario('reader'), PRIVADO_AJENO, 'cuentas'), true);
    assert.equal(puedeVerRegistro(usuario('reader'), PRIVADO_AJENO, 'categorias'), true);
});

test('edición: user edita lo visible; limited_user solo lo propio; reader nunca', () => {
    assert.equal(puedeEditarRegistro(usuario('admin'), PRIVADO_AJENO, 'recibos'), true);
    assert.equal(puedeEditarRegistro(usuario('user'), PUBLICO, 'recibos'), true);
    assert.equal(puedeEditarRegistro(usuario('user'), PRIVADO_AJENO, 'recibos'), false);
    assert.equal(puedeEditarRegistro(usuario('user'), PRIVADO_PROPIO, 'recibos'), true);
    assert.equal(puedeEditarRegistro(usuario('limited_user'), PUBLICO, 'recibos'), false);
    assert.equal(puedeEditarRegistro(usuario('limited_user'), PRIVADO_PROPIO, 'recibos'), true);
    assert.equal(puedeEditarRegistro(usuario('reader'), PRIVADO_PROPIO, 'recibos'), false);
    assert.equal(puedeEditarRegistro(usuario('limited_user'), PRIVADO_AJENO, 'cuentas'), true);
});

test('borrado: user borra lo visible; limited_user y reader nunca; admin siempre', () => {
    assert.equal(puedeBorrarRegistro(usuario('admin'), PRIVADO_AJENO, 'recibos'), true);
    assert.equal(puedeBorrarRegistro(usuario('user'), PUBLICO, 'recibos'), true);
    assert.equal(puedeBorrarRegistro(usuario('user'), PRIVADO_AJENO, 'recibos'), false);
    assert.equal(puedeBorrarRegistro(usuario('user'), PRIVADO_PROPIO, 'recibos'), true);
    assert.equal(puedeBorrarRegistro(usuario('limited_user'), PRIVADO_PROPIO, 'recibos'), false);
    assert.equal(puedeBorrarRegistro(usuario('reader'), PRIVADO_PROPIO, 'recibos'), false);
    assert.equal(puedeBorrarRegistro(usuario('limited_user'), PRIVADO_AJENO, 'cuentas'), true);
});

test('filtrarVisibles respeta admin, compartidos y privados', () => {
    const filas = [PUBLICO, PRIVADO_AJENO, PRIVADO_PROPIO];

    assert.deepEqual(filtrarVisibles(usuario('admin'), filas, 'recibos'), filas);
    assert.deepEqual(filtrarVisibles(usuario('user'), filas, 'recibos'), [PUBLICO, PRIVADO_PROPIO]);
    assert.deepEqual(filtrarVisibles(usuario('reader'), filas, 'recibos'), [PUBLICO, PRIVADO_PROPIO]);
    assert.deepEqual(filtrarVisibles(usuario('reader'), filas, 'cuentas'), filas);
});

test('sin usuario no se autoriza nada', () => {
    assert.equal(puedeAcceder(null, 'recibos', 'lectura'), false);
    assert.equal(puedeVerRegistro(null, PUBLICO, 'recibos'), false);
    assert.equal(puedeEditarRegistro(null, PUBLICO, 'recibos'), false);
    assert.equal(puedeBorrarRegistro(null, PUBLICO, 'recibos'), false);
});

test('DC-75: cambiar la privacidad es del propietario con escritura o del admin; un reader nunca', () => {
    // admin: cualquier registro, propio o ajeno
    assert.equal(puedeCambiarPrivacidad(usuario('admin', 'no'), PUBLICO, 'recibos'), true);
    assert.equal(puedeCambiarPrivacidad(usuario('admin', 'no'), PRIVADO_AJENO, 'ahorros'), true);

    // user: solo lo suyo, y solo con escritura
    assert.equal(puedeCambiarPrivacidad(usuario('user', 'escritura'), PRIVADO_PROPIO, 'recibos'), true);
    assert.equal(puedeCambiarPrivacidad(usuario('user', 'escritura'), PUBLICO, 'recibos'), false);
    assert.equal(puedeCambiarPrivacidad(usuario('user', 'escritura'), PRIVADO_AJENO, 'recibos'), false);
    assert.equal(puedeCambiarPrivacidad(usuario('user', 'lectura'), PRIVADO_PROPIO, 'recibos'), false);
    assert.equal(puedeCambiarPrivacidad(usuario('user', 'no'), PRIVADO_PROPIO, 'recibos'), false);

    // limited_user: igual que user en esta regla (no borra, pero edita lo suyo)
    assert.equal(puedeCambiarPrivacidad(usuario('limited_user', 'escritura'), PRIVADO_PROPIO, 'anticipos'), true);
    assert.equal(puedeCambiarPrivacidad(usuario('limited_user', 'escritura'), PUBLICO, 'anticipos'), false);

    // reader: nunca, ni siquiera lo propio
    assert.equal(puedeCambiarPrivacidad(usuario('reader', 'escritura'), PRIVADO_PROPIO, 'recibos'), false);

    // cuentas y categorías quedan fuera (DC-49)
    assert.equal(puedeCambiarPrivacidad(usuario('user', 'escritura'), PRIVADO_PROPIO, 'cuentas'), false);
    assert.equal(puedeCambiarPrivacidad(usuario('user', 'escritura'), PRIVADO_PROPIO, 'categorias'), false);

    // sin usuario o sin registro
    assert.equal(puedeCambiarPrivacidad(null, PUBLICO, 'recibos'), false);
    assert.equal(puedeCambiarPrivacidad(usuario('admin'), null, 'recibos'), false);
});

test('DC-75: el valor omitido y el valor igual se toleran aunque el usuario no sea el propietario', () => {
    const ajeno = { id: 10, propietario_id: 99, es_privado: 0 };
    const otroUser = usuario('user', 'escritura'); // id 7, no es el propietario

    // omitido: no hay cambio que autorizar (COALESCE conserva)
    assert.equal(asegurarCambioPrivacidad(otroUser, ajeno, 'recibos', undefined), ajeno);
    assert.equal(asegurarCambioPrivacidad(otroUser, ajeno, 'recibos', null), ajeno);

    // igual al actual: se tolera, para que editar otro campo de un registro ajeno siga funcionando
    assert.equal(asegurarCambioPrivacidad(otroUser, ajeno, 'recibos', 0), ajeno);
    assert.equal(asegurarCambioPrivacidad(otroUser, ajeno, 'recibos', '0'), ajeno);

    // distinto: 403 con código de negocio
    assert.throws(() => asegurarCambioPrivacidad(otroUser, ajeno, 'recibos', 1), {
        status: 403,
        codigo: 'PRIVACIDAD_NO_PERMITIDA'
    });

    // el propietario y el admin sí pueden cambiarlo
    assert.equal(asegurarCambioPrivacidad(usuario('user', 'escritura'), PRIVADO_PROPIO, 'recibos', 0), PRIVADO_PROPIO);
    assert.equal(asegurarCambioPrivacidad(usuario('admin', 'no'), ajeno, 'recibos', 1), ajeno);

    // un reader no puede cambiarlo ni en lo suyo
    assert.throws(() => asegurarCambioPrivacidad(usuario('reader', 'escritura'), PRIVADO_PROPIO, 'recibos', 0), {
        status: 403,
        codigo: 'PRIVACIDAD_NO_PERMITIDA'
    });
});

test('DC-75: normalización de es_privado en la ruta y en los push*', () => {
    assert.equal(privacidadSolicitada(undefined), null);
    assert.equal(privacidadSolicitada(null), null);
    assert.equal(privacidadSolicitada(''), null);
    assert.equal(privacidadSolicitada(1), 1);
    assert.equal(privacidadSolicitada('1'), 1);
    assert.equal(privacidadSolicitada(0), 0);
    assert.equal(privacidadSolicitada('0'), 0);
    // Un valor fuera de 0/1 no llega aquí: `leerEsPrivado` responde 400 antes.
    assert.equal(privacidadSolicitada('2'), 0);
});
