// S-16 y S-04a: respuestas del middleware de autenticación. No necesita base de datos.
import assert from 'node:assert/strict';
import test from 'node:test';

import jwt from 'jsonwebtoken';

import { config } from '#backend/config/env.mjs';
import { crearCheckRole, crearVerifyAdmin, crearVerifyToken, verifyToken } from '#backend/middleware/auth.mjs';
import { manejarErrores } from '#backend/middleware/errores.mjs';

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

test('sin token responde 401 y no llama a next', async () => {
    const res = respuestaFalsa();
    let siguiente = false;

    await verifyToken(peticion(undefined), res, () => {
        siguiente = true;
    });

    assert.equal(res.codigo, 401);
    assert.deepEqual(res.cuerpo, { success: false, message: 'Se requiere token de autenticación' });
    assert.equal(siguiente, false);
});

test('un token inválido responde 401 y no 403 (S-16)', async () => {
    const res = respuestaFalsa();
    let siguiente = false;

    await verifyToken(peticion('esto-no-es-un-jwt'), res, () => {
        siguiente = true;
    });

    assert.equal(res.codigo, 401);
    assert.deepEqual(res.cuerpo, { success: false, message: 'Token inválido o expirado' });
    assert.equal(siguiente, false);
});

test('un token caducado responde 401', async () => {
    if (!config.jwt.secret) return;

    const caducado = jwt.sign({ id: 1, rol: 'user', ver: 0 }, config.jwt.secret, { expiresIn: '-1s' });
    const res = respuestaFalsa();

    await verifyToken(peticion(caducado), res, () => {});

    assert.equal(res.codigo, 401);
    assert.equal(res.cuerpo.message, 'Token inválido o expirado');
});

test('verifyAdmin propaga el 401 de un token inválido', async () => {
    const res = respuestaFalsa();
    let siguiente = false;

    await crearVerifyAdmin()(peticion('tampoco-es-un-jwt'), res, () => {
        siguiente = true;
    });

    assert.equal(res.codigo, 401);
    assert.equal(siguiente, false);
});

test('verifyAdmin mantiene el 403 cuando el rol no es administrador', async () => {
    const res = respuestaFalsa();
    let siguiente = false;
    const middleware = crearVerifyAdmin({ autenticar: async () => ({ id: 2, rol: 'user' }) });

    await middleware(peticion('token-de-prueba'), res, () => {
        siguiente = true;
    });

    assert.equal(res.codigo, 403);
    assert.deepEqual(res.cuerpo, { success: false, message: 'Acceso restringido a administradores' });
    assert.equal(siguiente, false);
});

test('verifyAdmin deja pasar a un administrador', async () => {
    const res = respuestaFalsa();
    let siguiente = false;
    const middleware = crearVerifyAdmin({ autenticar: async () => ({ id: 3, rol: 'admin' }) });

    await middleware(peticion('token-de-prueba'), res, () => {
        siguiente = true;
    });

    assert.equal(siguiente, true);
    assert.equal(res.codigo, null);
});

test('verifyToken deja el usuario vigente en la petición', async () => {
    const req = peticion('token-de-prueba');
    const middleware = crearVerifyToken({ autenticar: async () => ({ id: 4, rol: 'reader', token_version: 2 }) });
    let siguiente = false;

    await middleware(req, respuestaFalsa(), () => {
        siguiente = true;
    });

    assert.equal(siguiente, true);
    assert.deepEqual(req.user, { id: 4, rol: 'reader', token_version: 2 });
});

test('checkRole responde 403 con un rol no permitido y deja pasar el permitido', async () => {
    const res = respuestaFalsa();
    const middleware = crearCheckRole(['admin'], { autenticar: async () => ({ id: 5, rol: 'user' }) });

    await middleware(peticion('token-de-prueba'), res, () => {});
    assert.equal(res.codigo, 403);

    let siguiente = false;
    const permitido = crearCheckRole(['user'], { autenticar: async () => ({ id: 5, rol: 'user' }) });
    await permitido(peticion('token-de-prueba'), respuestaFalsa(), () => {
        siguiente = true;
    });
    assert.equal(siguiente, true);
});

test('un fallo de base de datos se entrega a next(err) y no se responde como sesión', async () => {
    const res = respuestaFalsa();
    let recibido = null;
    const middleware = crearVerifyToken({
        autenticar: async () => {
            throw new Error('BD caída');
        }
    });

    await middleware(peticion('token-de-prueba'), res, (error) => {
        recibido = error;
    });

    assert.equal(res.codigo, null);
    assert.equal(recibido.message, 'BD caída');
});

test('el manejador central responde 500 en JSON ante un error técnico', () => {
    const res = respuestaFalsa();

    manejarErrores(new Error('BD caída'), {}, res, () => {});

    assert.equal(res.codigo, 500);
    assert.match(res.cuerpo.error, /No se ha podido completar la operación/);
});
