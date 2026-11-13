// S-03: rutas de la configuración de la conexión (regresión de S-02/S-03).
// No necesita base de datos, salvo la comprobación de la contraseña guardada, que se salta
// si no hay fichero de configuración.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, describe, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.mjs';
import { getDbConfig } from '../src/db/db_utilsConn.mjs';

const { default: router } = await import('../src/routes/conexionDB.mjs');

let servidor;
let origen;
let token;

before(async () => {
    const app = express();

    app.use(express.json());
    app.use('/api/db-config', router);

    await new Promise((resolver) => {
        servidor = app.listen(0, resolver);
    });

    origen = 'http://127.0.0.1:' + servidor.address().port;
    token = jwt.sign({ id: 1, username: 'prueba', rol: 'admin' }, config.jwt.secret);
});

after(() => servidor.close());

/** Petición con el token de administrador. */
async function peticion(ruta, metodo, cuerpo) {
    const opciones = { method: metodo, headers: { Authorization: 'Bearer ' + token } };

    if (cuerpo) {
        opciones.headers['Content-Type'] = 'application/json';
        opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(origen + ruta, opciones);

    return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

const CAMPOS = {
    DB_HOST: 'servidor',
    DB_PORT: '3306',
    DB_USER: 'usuario',
    DB_DATABASE: 'base'
};

describe('S-03: rutas de configuración de la conexión', () => {
    test('GET /api/db-config/password ya no existe', async () => {
        const respuesta = await peticion('/api/db-config/password', 'GET');

        assert.equal(respuesta.estado, 404);
    });

    test('PUT con los campos obligatorios vacíos responde 400', async () => {
        const respuesta = await peticion('/api/db-config', 'PUT', { DB_HOST: ' ', DB_PORT: '', DB_USER: '', DB_DATABASE: '' });

        assert.equal(respuesta.estado, 400);
        assert.equal(respuesta.cuerpo.codigo, 'CAMPOS_OBLIGATORIOS');
    });

    test('PUT con el puerto fuera de rango responde 400', async () => {
        const respuesta = await peticion('/api/db-config', 'PUT', { ...CAMPOS, DB_PORT: '70000' });

        assert.equal(respuesta.estado, 400);
        assert.equal(respuesta.cuerpo.codigo, 'PUERTO_NO_VALIDO');
    });

    test('PUT con una clave no admitida responde 400', async () => {
        const respuesta = await peticion('/api/db-config', 'PUT', { ...CAMPOS, CLAVE_INVENTADA: 'x' });

        assert.equal(respuesta.estado, 400);
        assert.equal(respuesta.cuerpo.codigo, 'CLAVES_NO_ADMITIDAS');
    });
});

describe('S-02: la prueba de conexión usa la contraseña guardada', () => {
    test('POST /api/db-config/test con la contraseña vacía conecta con la guardada', async (contexto) => {
        const ruta = new URL('../src/db/.db_connection', import.meta.url);

        if (!fs.existsSync(ruta)) {
            contexto.skip('no hay fichero de configuración');
            return;
        }

        const { config: guardada } = await getDbConfig();

        if (!guardada.DB_HOST) {
            contexto.skip('la configuración no tiene host');
            return;
        }

        const respuesta = await peticion('/api/db-config/test', 'POST', {
            DB_HOST: guardada.DB_HOST,
            DB_PORT: guardada.DB_PORT,
            DB_USER: guardada.DB_USER,
            DB_DATABASE: guardada.DB_DATABASE,
            DB_PASSWORD: ''
        });

        assert.equal(respuesta.estado, 200, 'la contraseña guardada debe usarse cuando el campo va vacío');
    });
});
