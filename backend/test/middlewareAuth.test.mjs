// S-16: respuestas del middleware de autenticación. No necesita base de datos ni servidor.
import assert from 'node:assert/strict';
import test from 'node:test';

import jwt from 'jsonwebtoken';

import { config } from '#backend/config/env.mjs';
import { verifyAdmin, verifyToken } from '#backend/middleware/auth.mjs';

/** Respuesta de Express simulada que recuerda el estado y el cuerpo. */
function respuestaFalsa() {
    return {
        codigo: null,
        cuerpo: null,
        status(codigo) {
            this.codigo = codigo;
            return this;
        },
        json(cuerpo) {
            this.cuerpo = cuerpo;
            return this;
        }
    };
}

/** Petición simulada con o sin token. */
function peticion(token) {
    return token === undefined ? { headers: {} } : { headers: { authorization: `Bearer ${token}` } };
}

test('sin token responde 401 y no llama a next', () => {
    const res = respuestaFalsa();
    let siguiente = false;

    verifyToken(peticion(undefined), res, () => {
        siguiente = true;
    });

    assert.equal(res.codigo, 401);
    assert.deepEqual(res.cuerpo, { success: false, message: 'Se requiere token de autenticación' });
    assert.equal(siguiente, false);
});

test('un token inválido responde 401 y no 403 (S-16)', () => {
    const res = respuestaFalsa();
    let siguiente = false;

    verifyToken(peticion('esto-no-es-un-jwt'), res, () => {
        siguiente = true;
    });

    assert.equal(res.codigo, 401);
    assert.deepEqual(res.cuerpo, { success: false, message: 'Token inválido o expirado' });
    assert.equal(siguiente, false);
});

test('un token caducado responde 401', () => {
    if (!config.jwt.secret) return;

    const caducado = jwt.sign({ id: 1, rol: 'user' }, config.jwt.secret, { expiresIn: '-1s' });
    const res = respuestaFalsa();

    verifyToken(peticion(caducado), res, () => {});

    assert.equal(res.codigo, 401);
    assert.equal(res.cuerpo.message, 'Token inválido o expirado');
});

test('verifyAdmin propaga el 401 de un token inválido', () => {
    const res = respuestaFalsa();
    let siguiente = false;

    verifyAdmin(peticion('tampoco-es-un-jwt'), res, () => {
        siguiente = true;
    });

    assert.equal(res.codigo, 401);
    assert.equal(siguiente, false);
});

test('verifyAdmin mantiene el 403 cuando el rol no es administrador', () => {
    if (!config.jwt.secret) return;

    const deUsuario = jwt.sign({ id: 2, rol: 'user' }, config.jwt.secret, { expiresIn: '1h' });
    const res = respuestaFalsa();
    let siguiente = false;

    verifyAdmin(peticion(deUsuario), res, () => {
        siguiente = true;
    });

    assert.equal(res.codigo, 403);
    assert.deepEqual(res.cuerpo, { success: false, message: 'Acceso restringido a administradores' });
    assert.equal(siguiente, false);
});

test('verifyAdmin deja pasar a un administrador', () => {
    if (!config.jwt.secret) return;

    const deAdmin = jwt.sign({ id: 3, rol: 'admin' }, config.jwt.secret, { expiresIn: '1h' });
    const res = respuestaFalsa();
    let siguiente = false;

    verifyAdmin(peticion(deAdmin), res, () => {
        siguiente = true;
    });

    assert.equal(siguiente, true);
    assert.equal(res.codigo, null);
});
