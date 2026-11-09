// F-48: mensajes de los módulos de conexión y mantenimiento. No necesita base de datos:
// la validación del volcado falla antes de tocar nada y la conexión se prueba contra un
// puerto local cerrado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, describe, test } from 'node:test';
import { restoreDb } from '../src/db/db_maintenance.mjs';
import { testDbConnection } from '../src/db/db_utilsConn.mjs';
import { ErrorDeAjuste } from '../src/db/db_ajustes.mjs';
import { ErrorDeNegocio, esErrorDeNegocio } from '../src/utils/errorDeNegocio.mjs';

const BASE_NO_ACCESIBLE =
    'No se puede acceder a la base de datos. Comprueba que el servicio esté en marcha y que la dirección y el puerto sean correctos.';

const FICHERO_NO_VOLCADO = '/tmp/timon-f48-no-es-volcado.sql';

/** Silencia el log esperado de las pruebas. */
async function sinLog(fn) {
    const original = console.error;
    console.error = () => {};
    try {
        return await fn();
    } finally {
        console.error = original;
    }
}

describe('prueba de conexión (F-48)', () => {
    test('traduce la base no accesible a un error de negocio con mensaje de usuario', async () => {
        const error = await sinLog(async () => {
            try {
                await testDbConnection({ DB_HOST: '127.0.0.1', DB_PORT: '3399', DB_USER: 'nadie', DB_PASSWORD: 'nada', DB_DATABASE: 'ninguna' });
                return null;
            } catch (capturado) {
                return capturado;
            }
        });

        assert.ok(error, 'se esperaba un error de conexión en un puerto local cerrado');
        assert.equal(esErrorDeNegocio(error), true);
        assert.equal(error.status, 400);
        assert.equal(error.message, BASE_NO_ACCESIBLE);
        // Nunca el texto del motor ni el código del sistema
        for (const prohibido of ['ECONNREFUSED', 'errno', 'connect ']) {
            assert.equal(error.message.includes(prohibido), false, `el mensaje contiene «${prohibido}»`);
        }
    });
});

describe('restauración de la base de datos (F-48)', () => {
    before(() => {
        fs.writeFileSync(FICHERO_NO_VOLCADO, 'esto no es una copia de seguridad de Timon\n', 'utf8');
    });

    after(() => {
        fs.rmSync(FICHERO_NO_VOLCADO, { force: true });
    });

    test('un fichero que no es un volcado da un 400 de negocio y no toca la base', async () => {
        const error = await sinLog(async () => {
            try {
                await restoreDb(FICHERO_NO_VOLCADO);
                return null;
            } catch (capturado) {
                return capturado;
            }
        });

        assert.ok(error, 'se esperaba el rechazo de la validación');
        assert.equal(esErrorDeNegocio(error), true);
        assert.equal(error.status, 400);
        assert.equal(error.codigo, 'VOLCADO_NO_VALIDO');
        assert.equal(
            error.message,
            'El archivo no es una copia de seguridad de Timón: no contiene una cabecera de volcado de MySQL o MariaDB.'
        );
    });
});

describe('ajustes (F-48)', () => {
    test('ErrorDeAjuste es un error de negocio de la utilidad compartida', () => {
        const error = new ErrorDeAjuste('La zona horaria elegida no es válida.', 400);

        assert.ok(error instanceof ErrorDeNegocio);
        assert.ok(error instanceof Error);
        assert.equal(error.name, 'ErrorDeAjuste');
        assert.equal(esErrorDeNegocio(error), true);
        assert.equal(error.status, 400);
    });
});
