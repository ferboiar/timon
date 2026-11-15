// S-04b (DC-63): tope por IP con express-rate-limit, sin base de datos.
import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';

import { crearLimitadorIp } from '#backend/middleware/limitadorIp.mjs';
import { claveDeIntento, crearLimitador } from '#backend/utils/limitadorIntentos.mjs';

const MENSAJE = 'Límite de prueba';

/** Arranca una app mínima con el tope por IP y un manejador de login simulado. */
async function arrancarApp({ maxIntentos = 30 } = {}) {
    const app = express();
    app.use(express.json());
    app.post('/login', crearLimitadorIp({ maxIntentos, ventanaMs: 60_000, mensaje: MENSAJE }), (req, res) => {
        if (req.body?.username === 'ok') return res.json({ ok: true });
        return res.status(401).json({ ok: false });
    });

    const servidor = await new Promise((resolver) => {
        const s = app.listen(0, () => resolver(s));
    });

    return {
        origen: 'http://127.0.0.1:' + servidor.address().port,
        cerrar: () => new Promise((resolver) => servidor.close(resolver))
    };
}

async function intentar(origen, username) {
    const respuesta = await fetch(origen + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: 'x' })
    });

    return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null), headers: respuesta.headers };
}

test('el fallo 31 desde la misma IP con usuarios distintos responde 429', async () => {
    const app = await arrancarApp({ maxIntentos: 30 });

    try {
        for (let intento = 1; intento <= 30; intento += 1) {
            const respuesta = await intentar(app.origen, `usuario_${intento}`);
            assert.equal(respuesta.estado, 401, `intento ${intento}`);
        }

        const bloqueada = await intentar(app.origen, 'usuario_31');
        assert.equal(bloqueada.estado, 429);
        assert.deepEqual(bloqueada.cuerpo, { success: false, message: MENSAJE });
        assert.ok(bloqueada.headers.get('retry-after'), 'debe incluir Retry-After');
    } finally {
        await app.cerrar();
    }
});

test('un login correcto no consume cupo del tope por IP', async () => {
    const app = await arrancarApp({ maxIntentos: 3 });

    try {
        for (let intento = 1; intento <= 3; intento += 1) {
            const respuesta = await intentar(app.origen, 'ok');
            assert.equal(respuesta.estado, 200, `acceso ${intento}`);
        }

        for (let intento = 1; intento <= 3; intento += 1) {
            const respuesta = await intentar(app.origen, `fallo_${intento}`);
            assert.equal(respuesta.estado, 401, `fallo ${intento}`);
        }

        const cuarto = await intentar(app.origen, 'fallo_4');
        assert.equal(cuarto.estado, 429);
    } finally {
        await app.cerrar();
    }
});

test('el tope por IP no cambia la política del limitador por IP+usuario', async () => {
    const app = await arrancarApp({ maxIntentos: 30 });

    try {
        for (let intento = 1; intento <= 30; intento += 1) {
            await intentar(app.origen, `rotacion_${intento}`);
        }
        assert.equal((await intentar(app.origen, 'rotacion_31')).estado, 429);

        // El limitador propio mantiene 5 fallos por IP+usuario y sigue libre para una clave nueva.
        const propio = crearLimitador({ maxIntentos: 5, ventanaMs: 60_000, programarLimpieza: false });
        const clave = claveDeIntento('127.0.0.1', 'cuenta_nueva');
        assert.equal(propio.comprobar(clave).bloqueado, false);
        for (let intento = 1; intento <= 5; intento += 1) propio.registrarFallo(clave);
        assert.equal(propio.comprobar(clave).bloqueado, true);
    } finally {
        await app.cerrar();
    }
});
