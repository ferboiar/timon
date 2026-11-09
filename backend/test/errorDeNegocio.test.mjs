// F-47 y F-48: pruebas de la utilidad de errores de negocio y técnicos; no necesitan base de datos.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    detalleParaLog,
    ErrorDeNegocio,
    esErrorDeNegocio,
    MARCA_ERROR_DE_NEGOCIO,
    responderError,
    respuestaDeError,
    sanearParaLog
} from '../src/utils/errorDeNegocio.mjs';
import { AUDIENCIA_ADMIN } from '../src/utils/catalogoErrores.mjs';

const AVISO_GENERAL = 'Inténtalo de nuevo y, si persiste, avisa al administrador.';
const AVISO_ADMIN = 'La causa no se ha podido identificar; consulta el registro del servidor.';

function respuestaFalsa() {
    return {
        status: null,
        cuerpo: null,
        status(codigo) {
            this.status = codigo;
            return this;
        },
        json(cuerpo) {
            this.cuerpo = cuerpo;
            return this;
        }
    };
}

function sinLog(fn) {
    const original = console.error;
    console.error = () => {};
    try {
        return fn();
    } finally {
        console.error = original;
    }
}

describe('ErrorDeNegocio (F-47)', () => {
    test('usa 400 por defecto y admite status y codigo', () => {
        const simple = new ErrorDeNegocio('No se pudo guardar');
        assert.equal(simple.message, 'No se pudo guardar');
        assert.equal(simple.status, 400);
        assert.equal(simple.codigo, null);
        assert.equal(simple.name, 'ErrorDeNegocio');
        assert.equal(simple[MARCA_ERROR_DE_NEGOCIO], true);

        const conCodigo = new ErrorDeNegocio('IBAN repetido', 409, 'IBAN_DUPLICADO');
        assert.equal(conCodigo.status, 409);
        assert.equal(conCodigo.codigo, 'IBAN_DUPLICADO');
    });

    test('es una instancia de Error', () => {
        assert.ok(new ErrorDeNegocio('x') instanceof Error);
    });
});

describe('esErrorDeNegocio (F-47)', () => {
    test('reconoce ErrorDeNegocio y sus subclases', () => {
        class Propio extends ErrorDeNegocio {}
        assert.equal(esErrorDeNegocio(new ErrorDeNegocio('x')), true);
        assert.equal(esErrorDeNegocio(new Propio('x')), true);
    });

    test('reconoce la marca explícita aunque no sea una instancia', () => {
        assert.equal(esErrorDeNegocio({ name: 'Otro', status: 400, [MARCA_ERROR_DE_NEGOCIO]: true }), true);
    });

    test('reconoce las clases heredadas del proyecto por nombre y status entero', () => {
        assert.equal(esErrorDeNegocio({ name: 'ErrorDeRecibo', status: 409 }), true);
        assert.equal(esErrorDeNegocio({ name: 'ErrorDeAjuste', status: 400 }), true);
        assert.equal(esErrorDeNegocio({ name: 'ErrorDeRecibo', status: '409' }), false);
    });

    test('no considera negocio un error cualquiera solo por tener status', () => {
        const tecnico = new Error('connect ECONNREFUSED');
        tecnico.status = 400;
        assert.equal(esErrorDeNegocio(tecnico), false);
        assert.equal(esErrorDeNegocio({ status: 500 }), false);
    });

    test('trata como técnicos los valores vacíos o que no son errores', () => {
        assert.equal(esErrorDeNegocio(null), false);
        assert.equal(esErrorDeNegocio(undefined), false);
        assert.equal(esErrorDeNegocio('texto'), false);
        assert.equal(esErrorDeNegocio(new Error('sin status')), false);
    });
});

describe('responderError (F-47)', () => {
    test('responde el error de negocio y no escribe en el log', () => {
        let llamadas = 0;
        const original = console.error;
        console.error = () => {
            llamadas++;
        };
        try {
            const res = respuestaFalsa();
            responderError(res, new ErrorDeNegocio('El recibo está cerrado.', 409), 'Fallo interno');
            assert.equal(res.status, 409);
            assert.deepEqual(res.cuerpo, { error: 'El recibo está cerrado.' });
            assert.equal(llamadas, 0);
        } finally {
            console.error = original;
        }
    });

    test('responde un 500 técnico añadiendo el aviso de la audiencia general', () => {
        const res = sinLog(() => {
            const respuesta = respuestaFalsa();
            responderError(respuesta, new Error('minero interno'), 'No se pudo guardar el ahorro.');
            return respuesta;
        });

        assert.equal(res.status, 500);
        assert.deepEqual(res.cuerpo, { error: 'No se pudo guardar el ahorro. ' + AVISO_GENERAL });
    });

    test('con audiencia de administrador el aviso remite al registro del servidor', () => {
        const res = sinLog(() => {
            const respuesta = respuestaFalsa();
            responderError(respuesta, new Error('minero interno'), 'No se han podido cargar los usuarios.', { audiencia: AUDIENCIA_ADMIN });
            return respuesta;
        });

        assert.equal(res.status, 500);
        assert.deepEqual(res.cuerpo, { error: 'No se han podido cargar los usuarios. ' + AVISO_ADMIN });
    });

    test('una causa identificada se añade al mensaje propio', () => {
        const error = new Error('connect ECONNREFUSED 127.0.0.1:3399');
        error.code = 'ECONNREFUSED';

        const res = sinLog(() => {
            const respuesta = respuestaFalsa();
            responderError(respuesta, error, 'No se ha podido conectar con esos datos.');
            return respuesta;
        });

        assert.equal(res.status, 500);
        assert.deepEqual(res.cuerpo, {
            error: 'No se ha podido conectar con esos datos. No se puede acceder a la base de datos. Comprueba que el servicio esté en marcha y que la dirección y el puerto sean correctos.'
        });
    });

    test('usa la clave indicada y publica el código de negocio', () => {
        const res = respuestaFalsa();
        responderError(res, new ErrorDeNegocio('IBAN repetido', 409, 'IBAN_DUPLICADO'), 'No se pudo guardar la cuenta.', { clave: 'message' });

        assert.equal(res.status, 409);
        assert.deepEqual(res.cuerpo, { message: 'IBAN repetido', codigo: 'IBAN_DUPLICADO' });
    });
});

describe('IBAN duplicado (F-47)', () => {
    const MENSAJE = 'El IBAN ES9121000418450200051332 ya está asignado a la cuenta «Ahorros Fer».';

    test('respuestaDeError conserva 409, el mensaje y el código', () => {
        const duplicado = new ErrorDeNegocio(MENSAJE, 409, 'IBAN_DUPLICADO');
        assert.deepEqual(respuestaDeError(duplicado, 'No se pudo guardar la cuenta.'), {
            status: 409,
            cuerpo: { error: MENSAJE, codigo: 'IBAN_DUPLICADO' },
            tecnico: false
        });
    });

    test('responderError responde una sola vez con 409 y el cuerpo esperado', () => {
        let estados = 0;
        let cuerpos = 0;
        const res = {
            status(codigo) {
                estados++;
                this.codigo = codigo;
                return this;
            },
            json(cuerpo) {
                cuerpos++;
                this.cuerpo = cuerpo;
                return this;
            }
        };

        responderError(res, new ErrorDeNegocio(MENSAJE, 409, 'IBAN_DUPLICADO'), 'No se pudo guardar la cuenta.', { contexto: 'cuentas - POST' });

        assert.equal(estados, 1);
        assert.equal(cuerpos, 1);
        assert.equal(res.codigo, 409);
        assert.deepEqual(res.cuerpo, { error: MENSAJE, codigo: 'IBAN_DUPLICADO' });
    });

    test('un error técnico de cuentas no filtra el detalle del motor', () => {
        const res = sinLog(() => {
            const respuesta = respuestaFalsa();
            responderError(respuesta, new Error('ER_DUP_ENTRY: Duplicate entry'), 'No se pudo guardar la cuenta.');
            return respuesta;
        });

        assert.equal(res.status, 500);
        assert.equal(res.cuerpo.error, 'No se pudo guardar la cuenta. ' + AVISO_GENERAL);
        assert.equal(res.cuerpo.error.includes('ER_DUP_ENTRY'), false);
    });
});

describe('respuestaDeError (F-47, F-48)', () => {
    test('devuelve el mensaje de negocio con su status', () => {
        assert.deepEqual(respuestaDeError(new ErrorDeNegocio('El recibo está cerrado.', 409), 'Fallo interno'), {
            status: 409,
            cuerpo: { error: 'El recibo está cerrado.' },
            tecnico: false
        });
    });

    test('publica el código de negocio cuando existe', () => {
        assert.deepEqual(respuestaDeError(new ErrorDeNegocio('IBAN repetido', 409, 'IBAN_DUPLICADO'), 'Fallo interno'), {
            status: 409,
            cuerpo: { error: 'IBAN repetido', codigo: 'IBAN_DUPLICADO' },
            tecnico: false
        });
    });

    test('un error técnico da 500 con el mensaje propio y el aviso, sin texto del motor', () => {
        const tecnico = new Error('ER_NO_SUCH_TABLE: Table contahogar.recibos doesn exist');
        const { status, cuerpo, tecnico: esTecnico } = respuestaDeError(tecnico, 'No se pudo guardar el recibo.');

        assert.equal(status, 500);
        assert.deepEqual(cuerpo, { error: 'No se pudo guardar el recibo. ' + AVISO_GENERAL });
        assert.equal(esTecnico, true);
    });

    test('no filtra el mensaje técnico aunque el error lleve status', () => {
        const conStatus = new Error('SQL interno');
        conStatus.status = 400;
        const { status, cuerpo, tecnico } = respuestaDeError(conStatus, 'Fallo interno');

        assert.equal(status, 500);
        assert.deepEqual(cuerpo, { error: 'Fallo interno ' + AVISO_GENERAL });
        assert.equal(tecnico, true);
    });
});

describe('log saneado (F-48)', () => {
    test('detalleParaLog incluye código y mensaje del error', () => {
        const error = new Error('connect ECONNREFUSED 127.0.0.1:3399');
        error.code = 'ECONNREFUSED';

        assert.equal(detalleParaLog(error), 'código ECONNREFUSED - connect ECONNREFUSED 127.0.0.1:3399');
        assert.equal(detalleParaLog(null), 'sin detalle');
    });

    test('oculta contraseñas y credenciales de las cadenas de conexión', () => {
        assert.equal(sanearParaLog('DB_PASSWORD=s3cr3t0'), 'DB_PASSWORD=<oculto>');
        assert.equal(sanearParaLog('password: s3cr3t0'), 'password: <oculto>');
        assert.equal(sanearParaLog('mysql://timon:s3cr3t0@mariadb01:3306/conta_hogar'), 'mysql://timon:<oculto>@mariadb01:3306/conta_hogar');
    });

    test('el log recibe el error real aunque el cliente vea el texto genérico', () => {
        const registrado = [];
        const original = console.error;
        console.error = (mensaje) => registrado.push(String(mensaje));
        try {
            const error = new Error('ER_NO_SUCH_TABLE: Table x doesn exist');
            error.code = 'ER_NO_SUCH_TABLE';
            responderError(respuestaFalsa(), error, 'No se han podido cargar los usuarios.', { contexto: 'usuarios - listado', audiencia: AUDIENCIA_ADMIN });
        } finally {
            console.error = original;
        }

        assert.equal(registrado.length, 1);
        assert.match(registrado[0], /^usuarios - listado: error técnico \(500\) - código ER_NO_SUCH_TABLE/);
        assert.equal(registrado[0].includes('ER_NO_SUCH_TABLE: Table x'), true);
    });
});
