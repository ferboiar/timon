// S-03: reglas de la configuración de la conexión (lote 5b).
// No necesita base de datos: el estado guardado se inyecta y el fichero no se toca.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calcularConfiguracionFinal, validarCamposObligatorios } from '../src/db/db_utilsConn.mjs';
import { camposObligatoriosVacios, configuracionParaEnviar, errorPuertoBd, hayCambiosBd } from '../../src/utils/configuracionBd.js';

const BASE = { DB_HOST: 'servidor', DB_PORT: '3306', DB_USER: 'usuario', DB_DATABASE: 'base' };

const GUARDADO = {
    DB_HOST: 'viejo',
    DB_PORT: '3307',
    DB_USER: 'viejo',
    DB_PASSWORD: 'clave-vieja',
    DB_DATABASE: 'vieja',
    DB_SSL_CA: 'CA-VIEJA',
    DB_MAINT_USER: 'mant',
    DB_MAINT_PASSWORD: 'clave-mant'
};

/** Ejecuta y devuelve el error de negocio, o lanza si no hubo error. */
async function errorDe(promesa) {
    try {
        await promesa;
    } catch (error) {
        return error;
    }

    return null;
}

describe('regla 1: campos obligatorios y puerto', () => {
    test('sin host, puerto, usuario o base de datos da 400', () => {
        assert.throws(
            () => validarCamposObligatorios({ DB_HOST: ' ', DB_PORT: '', DB_USER: '', DB_DATABASE: '' }),
            (error) => error.status === 400 && error.codigo === 'CAMPOS_OBLIGATORIOS'
        );
    });

    test('el mensaje nombra los campos que faltan', () => {
        try {
            validarCamposObligatorios({ DB_HOST: 'h', DB_PORT: '', DB_USER: 'u', DB_DATABASE: '' });
            assert.fail('se esperaba el rechazo');
        } catch (error) {
            assert.equal(error.message.includes('puerto'), true);
            assert.equal(error.message.includes('base de datos'), true);
            assert.equal(error.message.includes('host'), false);
        }
    });

    test('el puerto fuera de rango o no numérico da 400', () => {
        for (const puerto of ['0', '65536', 'abc', '-1', '33.5']) {
            assert.throws(
                () => validarCamposObligatorios({ ...BASE, DB_PORT: puerto }),
                (error) => error.status === 400 && error.codigo === 'PUERTO_NO_VALIDO',
                'puerto aceptado: ' + puerto
            );
        }
    });

    test('un puerto válido pasa', () => {
        assert.doesNotThrow(() => validarCamposObligatorios({ ...BASE, DB_PORT: ' 65535 ' }));
        assert.doesNotThrow(() => validarCamposObligatorios({ ...BASE, DB_PORT: '1' }));
    });
});

describe('regla 2: campos opcionales, ausente frente a vacío', () => {
    test('si no se envían, se conservan los guardados', async () => {
        const final = await calcularConfiguracionFinal({ ...BASE }, { actual: GUARDADO });

        assert.equal(final.DB_SSL_CA, 'CA-VIEJA');
        assert.equal(final.DB_MAINT_USER, 'mant');
    });

    test('si se envían vacíos, se eliminan', async () => {
        const final = await calcularConfiguracionFinal({ ...BASE, DB_SSL_CA: '', DB_MAINT_USER: '' }, { actual: GUARDADO });

        assert.equal('DB_SSL_CA' in final, false);
        assert.equal('DB_MAINT_USER' in final, false);
    });

    test('los campos obligatorios se guardan sin espacios sobrantes', async () => {
        const final = await calcularConfiguracionFinal({ ...BASE, DB_HOST: '  servidor  ' }, { actual: {} });

        assert.equal(final.DB_HOST, 'servidor');
    });
});

describe('reglas 3 y 4: contraseñas', () => {
    test('una contraseña vacía conserva la guardada', async () => {
        const final = await calcularConfiguracionFinal({ ...BASE }, { actual: GUARDADO });

        assert.equal(final.DB_PASSWORD, 'clave-vieja');
    });

    test('una contraseña nueva sustituye a la guardada', async () => {
        const final = await calcularConfiguracionFinal({ ...BASE, DB_PASSWORD: 'nueva' }, { actual: GUARDADO });

        assert.equal(final.DB_PASSWORD, 'nueva');
    });

    test('al quitar el usuario de mantenimiento se quita su contraseña', async () => {
        const final = await calcularConfiguracionFinal({ ...BASE, DB_MAINT_USER: '' }, { actual: GUARDADO });

        assert.equal('DB_MAINT_USER' in final, false);
        assert.equal('DB_MAINT_PASSWORD' in final, false);
    });

    test('sin cambios de mantenimiento, su contraseña se conserva', async () => {
        const final = await calcularConfiguracionFinal({ ...BASE, DB_MAINT_USER: 'mant' }, { actual: GUARDADO });

        assert.equal(final.DB_MAINT_PASSWORD, 'clave-mant');
    });
});

describe('reglas 5 y 6: incoherencias del mantenimiento', () => {
    test('regla 5: contraseña de mantenimiento sin usuario da 400', async () => {
        const error = await errorDe(calcularConfiguracionFinal({ ...BASE, DB_MAINT_PASSWORD: 'suelta' }, { actual: {} }));

        assert.ok(error, 'se esperaba el rechazo');
        assert.equal(error.status, 400);
        assert.equal(error.codigo, 'MANTENIMIENTO_SIN_USUARIO');
    });

    test('regla 6: cambiar el usuario sin contraseña nueva da 400', async () => {
        const error = await errorDe(calcularConfiguracionFinal({ ...BASE, DB_MAINT_USER: 'otro' }, { actual: GUARDADO }));

        assert.ok(error, 'se esperaba el rechazo');
        assert.equal(error.status, 400);
        assert.equal(error.codigo, 'MANTENIMIENTO_SIN_CONTRASENA');
    });

    test('usuario nuevo con contraseña nueva se acepta', async () => {
        const final = await calcularConfiguracionFinal({ ...BASE, DB_MAINT_USER: 'otro', DB_MAINT_PASSWORD: 'otra' }, { actual: GUARDADO });

        assert.equal(final.DB_MAINT_USER, 'otro');
        assert.equal(final.DB_MAINT_PASSWORD, 'otra');
    });
});

describe('pantalla: cambios pendientes y cuerpo de la petición', () => {
    test('sin cambios no hay nada pendiente', () => {
        const precargado = { ...BASE, DB_SSL_CA: 'CA', DB_MAINT_USER: 'mant', DB_PASSWORD: '', DB_MAINT_PASSWORD: '' };

        assert.equal(hayCambiosBd(precargado, { ...precargado }), false);
    });

    test('cambiar la CA o el usuario de mantenimiento cuenta como cambio', () => {
        const precargado = { ...BASE, DB_SSL_CA: 'CA', DB_MAINT_USER: 'mant' };

        assert.equal(hayCambiosBd({ ...precargado, DB_SSL_CA: 'OTRA' }, precargado), true);
        assert.equal(hayCambiosBd({ ...precargado, DB_MAINT_USER: 'otro' }, precargado), true);
        assert.equal(hayCambiosBd({ ...precargado, DB_SSL_CA: '' }, precargado), true);
    });

    test('escribir una contraseña cuenta como cambio', () => {
        assert.equal(hayCambiosBd({ ...BASE, DB_PASSWORD: 'x' }, BASE), true);
        assert.equal(hayCambiosBd({ ...BASE, DB_MAINT_PASSWORD: 'x' }, BASE), true);
    });

    test('los campos vacíos se detectan y el puerto se valida', () => {
        assert.deepEqual(camposObligatoriosVacios({ DB_HOST: 'h', DB_PORT: '', DB_USER: ' ', DB_DATABASE: 'd' }), ['puerto', 'usuario']);
        assert.equal(errorPuertoBd({ DB_PORT: '3306' }), '');
        assert.notEqual(errorPuertoBd({ DB_PORT: '0' }), '');
    });

    test('el cuerpo no lleva secretos vacíos y sí la CA vacía', () => {
        const cuerpo = configuracionParaEnviar({ ...BASE, DB_SSL_CA: '', DB_MAINT_USER: '', DB_PASSWORD: '', DB_MAINT_PASSWORD: '' });

        assert.equal('DB_PASSWORD' in cuerpo, false);
        assert.equal('DB_MAINT_PASSWORD' in cuerpo, false);
        assert.equal(cuerpo.DB_SSL_CA, '');
        assert.equal(cuerpo.DB_MAINT_USER, '');
    });
});
