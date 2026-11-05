// F-19: pruebas de la utilidad de exportación CSV; no necesitan base de datos ni DOM.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { BOM, FIN_DE_LINEA, SEPARADOR, construirCsv, escaparCampo, filaCsv, ibanSeguro, valorCsv } from '../../src/utils/csv.js';

describe('construirCsv (F-19)', () => {
    test('empieza por BOM y usa punto y coma y salto de línea', () => {
        assert.equal(SEPARADOR, ';');
        assert.equal(FIN_DE_LINEA, '\n');
        assert.equal(construirCsv(['A', 'B'], [['1', '2'], ['3', '4']]), `${BOM}A;B\n1;2\n3;4`);
    });

    test('exporta las cabeceras literales, con acentos y sin neutralizar', () => {
        assert.equal(construirCsv(['Período', 'Descripción'], []), `${BOM}Período;Descripción`);
    });

    test('mantiene columnas, orden y BOM en una exportación completa', () => {
        const columnas = ['Nombre', 'Tipo', 'IBAN', 'Saldo Actual', 'Descripción'];
        const filas = [
            ['Cuenta; principal', 'Ahorro', ibanSeguro('ES9121000418450200051332'), '-12,34', 'Nómina'],
            ['Sin IBAN', 'Gastos', ibanSeguro(''), '0,00', '']
        ];

        const esperado = `${BOM}Nombre;Tipo;IBAN;Saldo Actual;Descripción\n"Cuenta; principal";Ahorro;"=""ES9121000418450200051332""";-12,34;Nómina\nSin IBAN;Gastos;;0,00;`;

        assert.equal(construirCsv(columnas, filas), esperado);
    });
});

describe('escaparCampo (F-19)', () => {
    test('entrecomilla el separador', () => {
        assert.equal(escaparCampo('a;b'), '"a;b"');
    });

    test('duplica y entrecomilla las comillas interiores', () => {
        assert.equal(escaparCampo('di "hola"'), '"di ""hola"""');
    });

    test('entrecomilla los saltos de línea', () => {
        assert.equal(escaparCampo('línea\nnueva'), '"línea\nnueva"');
    });

    test('entrecomilla los espacios de los extremos para conservarlos', () => {
        assert.equal(escaparCampo(' hola '), '" hola "');
    });

    test('no entrecomilla un campo que no lo necesita', () => {
        assert.equal(escaparCampo('normal'), 'normal');
    });

    test('trata null y undefined como campo vacío', () => {
        assert.equal(escaparCampo(null), '');
        assert.equal(escaparCampo(undefined), '');
    });
});

describe('valorCsv (F-19)', () => {
    test('neutraliza las fórmulas con apóstrofo', () => {
        for (const valor of ['=1+1', '+1', '-1+1', '@SUM(A1)']) {
            assert.equal(valorCsv(valor), `'${valor}`);
        }
    });

    test('neutraliza tabulación y retorno de carro iniciales', () => {
        assert.equal(valorCsv('\t=1+1'), "'\t=1+1");
        assert.equal(valorCsv('\r=1+1'), "'\r=1+1");
    });

    test('no neutraliza los importes con coma decimal ni los negativos', () => {
        for (const valor of ['-12,34', '1234,56', '0,00', '-0,01']) {
            assert.equal(valorCsv(valor), valor);
        }
    });

    test('trata null, undefined y cero como texto exportable', () => {
        assert.equal(valorCsv(null), '');
        assert.equal(valorCsv(undefined), '');
        assert.equal(valorCsv(0), '0');
    });

    test('es idempotente: no duplica el apóstrofo', () => {
        assert.equal(valorCsv(valorCsv('=1+1')), "'=1+1");
    });
});

describe('filaCsv (F-19)', () => {
    test('neutraliza y escapa en la misma fila', () => {
        assert.equal(filaCsv(['=1+1', 'a;b']), `'=1+1;"a;b"`);
    });

    test('conserva los campos vacíos como columnas', () => {
        assert.equal(filaCsv(['', 'x']), ';x');
    });
});

describe('ibanSeguro (F-19)', () => {
    test('envuelve un IBAN válido como fórmula de texto', () => {
        assert.equal(filaCsv([ibanSeguro('ES91 2100 0418 4502 0005 1332')]), '"=""ES91 2100 0418 4502 0005 1332"""');
    });

    test('deja vacío un IBAN ausente', () => {
        assert.equal(ibanSeguro(''), '');
        assert.equal(ibanSeguro(null), '');
    });

    test('no construye la fórmula con un valor sospechoso', () => {
        // La comilla inicial es la del campo CSV; el valor empieza por apóstrofo.
        assert.equal(filaCsv([ibanSeguro('=cmd|"x"')]), `"'=cmd|""x"""`);
    });
});
