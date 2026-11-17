// S-05: CORS restringido a la configuración acordada.
// Sin base de datos: valida la política y el comportamiento del preflight.
import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';

import { crearMiddlewareCors, leerConfigCors, permiteOrigen } from '#backend/config/cors.mjs';

function configDev() {
    return leerConfigCors({ CORS_ALLOWED_ORIGINS: 'localhost', CORS_ALLOWED_NETWORKS: '192.168.0.0/24' });
}

/** Arranca una app mínima con el middleware CORS y una ruta de respuesta. */
async function arrancarApp(configCors) {
    const app = express();
    app.use(crearMiddlewareCors(configCors));
    app.get('/salud', (req, res) => res.json({ ok: true }));

    const servidor = await new Promise((resolver) => {
        const s = app.listen(0, () => resolver(s));
    });

    return {
        origen: 'http://127.0.0.1:' + servidor.address().port,
        cerrar: () => new Promise((resolver) => servidor.close(resolver))
    };
}

function preflight(app, origin) {
    return fetch(app.origen + '/salud', {
        method: 'OPTIONS',
        headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'GET'
        }
    });
}

test('sin variables, CORS queda cerrado: ningún origen se permite', () => {
    const config = leerConfigCors({});
    assert.equal(permiteOrigen('http://localhost:5173', config), false);
    assert.equal(permiteOrigen('http://192.168.0.166:3000', config), false);
});

test('rechaza * y true como valor global y como entrada', () => {
    assert.throws(() => leerConfigCors({ CORS_ALLOWED_ORIGINS: '*' }), /CORS/);
    assert.throws(() => leerConfigCors({ CORS_ALLOWED_NETWORKS: 'true' }), /CORS/);
    assert.throws(() => leerConfigCors({ CORS_ALLOWED_ORIGINS: 'localhost,*' }), /CORS/);
    assert.throws(() => leerConfigCors({ CORS_ALLOWED_NETWORKS: '192.168.0.0/24,true' }), /CORS/);
});

test('rechaza una IP literal en CORS_ALLOWED_ORIGINS', () => {
    assert.throws(() => leerConfigCors({ CORS_ALLOWED_ORIGINS: '192.168.0.166' }), /CORS_ALLOWED_NETWORKS/);
});

test('rechaza nombres de host inválidos y CIDR mal formados', () => {
    assert.throws(() => leerConfigCors({ CORS_ALLOWED_ORIGINS: 'http://localhost' }), /CORS/);
    assert.throws(() => leerConfigCors({ CORS_ALLOWED_ORIGINS: 'localhost:3000' }), /CORS/);
    assert.throws(() => leerConfigCors({ CORS_ALLOWED_NETWORKS: '192.168.0.0' }), /CORS/);
    assert.throws(() => leerConfigCors({ CORS_ALLOWED_NETWORKS: '192.168.0.0/33' }), /CORS/);
});

test('permite hostname por nombre, sin exigir esquema ni puerto', () => {
    const config = configDev();
    assert.equal(permiteOrigen('http://localhost:5173', config), true);
    assert.equal(permiteOrigen('https://localhost', config), true);
});

test('permite una IP dentro de la red y rechaza una IP fuera (10.0.0.5)', () => {
    const config = configDev();
    assert.equal(permiteOrigen('http://192.168.0.166:3000', config), true);
    assert.equal(permiteOrigen('http://10.0.0.5:3000', config), false);
});

test('no resuelve DNS: un nombre no listado se rechaza aunque apuntara a la red', () => {
    const config = configDev();
    assert.equal(permiteOrigen('http://mi-nas.local:3000', config), false);
});

test('sin Origin (petición no de navegador) se permite', () => {
    const config = configDev();
    assert.equal(permiteOrigen(undefined, config), true);
});

test('preflight: origen permitido recibe Access-Control-Allow-Origin', async () => {
    const app = await arrancarApp(configDev());
    try {
        const respuesta = await preflight(app, 'http://localhost:5173');
        assert.equal(respuesta.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    } finally {
        await app.cerrar();
    }
});

test('preflight: origen no permitido no recibe la cabecera', async () => {
    const app = await arrancarApp(configDev());
    try {
        const respuesta = await preflight(app, 'http://atacante.example');
        assert.equal(respuesta.headers.get('access-control-allow-origin'), null);
    } finally {
        await app.cerrar();
    }
});

test('preflight: un host de la red permitida recibe la cabecera', async () => {
    const app = await arrancarApp(configDev());
    try {
        const respuesta = await preflight(app, 'http://192.168.0.50:8080');
        assert.equal(respuesta.headers.get('access-control-allow-origin'), 'http://192.168.0.50:8080');
    } finally {
        await app.cerrar();
    }
});
