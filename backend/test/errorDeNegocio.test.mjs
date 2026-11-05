// F-47: pruebas de la utilidad de errores de negocio y técnicos; no necesitan base de datos.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ErrorDeNegocio, esErrorDeNegocio, MARCA_ERROR_DE_NEGOCIO, responderError, respuestaDeError } from '../src/utils/errorDeNegocio.mjs';

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
        const original = console.error;
        let llamadas = 0;
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

    test('responde un texto genérico y registra el detalle técnico', () => {
        const original = console.error;
        const registros = [];
        console.error = (...args) => {
            registros.push(args);
        };
        try {
            const res = respuestaFalsa();
            const tecnico = new Error('Table timon.recibos doesnt exist');
            responderError(res, tecnico, 'No se pudo guardar el recibo.', { contexto: 'recibos - POST' });
            assert.equal(res.status, 500);
            assert.deepEqual(res.cuerpo, { error: 'No se pudo guardar el recibo.' });
            assert.equal(registros.length, 1);
            assert.equal(registros[0][0].includes('recibos - POST'), true);
            assert.equal(registros[0][1], tecnico);
        } finally {
            console.error = original;
        }
    });

    test('respeta la clave message y publica el código de negocio', () => {
        const res = respuestaFalsa();
        responderError(res, new ErrorDeNegocio('IBAN repetido', 409, 'IBAN_DUPLICADO'), 'Fallo interno', { clave: 'message' });
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

    test('un error técnico de cuentas no filtra el detalle', () => {
        const res = respuestaFalsa();
        const original = console.error;
        console.error = () => {};
        try {
            responderError(res, new Error('ER_DUP_ENTRY: Duplicate entry'), 'No se pudo guardar la cuenta.');
        } finally {
            console.error = original;
        }
        assert.equal(res.status, 500);
        assert.deepEqual(res.cuerpo, { error: 'No se pudo guardar la cuenta.' });
    });
});

describe('respuestaDeError (F-47)', () => {
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

    test('responde un texto genérico y 500 ante un error técnico', () => {
        const tecnico = new Error('ER_NO_SUCH_TABLE: Table contahogar.recibos doesn exist');
        assert.deepEqual(respuestaDeError(tecnico, 'No se pudo guardar el recibo.'), {
            status: 500,
            cuerpo: { error: 'No se pudo guardar el recibo.' },
            tecnico: true
        });
    });

    test('no filtra el mensaje técnico aunque el error lleve status', () => {
        const conStatus = new Error('SQL interno');
        conStatus.status = 400;
        const { status, cuerpo, tecnico } = respuestaDeError(conStatus, 'Fallo interno');
        assert.equal(status, 500);
        assert.deepEqual(cuerpo, { error: 'Fallo interno' });
        assert.equal(tecnico, true);
    });
});
