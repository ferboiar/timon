// Pruebas de fechas ancladas de Anticipos (F-46, DC-41): no necesitan base de datos.
// Se pueden ejecutar solas: node --test backend/test/fechasAnticipos.test.mjs
import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { fechaAnclada, fechaISO, siguienteFechaAnclada, sumarMesesAnclado } from '../src/utils/fechasAnticipos.mjs';

const tzOriginal = process.env.TZ;

afterEach(() => {
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
});

describe('fechas ancladas de Anticipos (F-46, DC-41)', () => {
    test('mensual desde el día 31 ajusta al último día de cada mes sin arrastrar desvíos', () => {
        const esperado = ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31'];
        const obtenido = esperado.map((_, k) => fechaAnclada('2026-01-31', k, 1));
        assert.deepEqual(obtenido, esperado);
    });

    test('mensual desde el día 31 en año bisiesto da el 29 de febrero', () => {
        assert.equal(fechaAnclada('2028-01-31', 1, 1), '2028-02-29');
        assert.equal(fechaAnclada('2028-01-31', 2, 1), '2028-03-31');
    });

    test('mensual desde los días 29 y 30', () => {
        assert.deepEqual(
            [0, 1, 2].map((k) => fechaAnclada('2026-01-29', k, 1)),
            ['2026-01-29', '2026-02-28', '2026-03-29']
        );
        assert.deepEqual(
            [0, 1, 2].map((k) => fechaAnclada('2026-01-30', k, 1)),
            ['2026-01-30', '2026-02-28', '2026-03-30']
        );
    });

    test('bimestral, trimestral y anual desde el día 31 o el 29 de febrero', () => {
        assert.deepEqual(
            [0, 1, 2, 3, 4, 5].map((k) => fechaAnclada('2026-01-31', k, 2)),
            ['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31', '2026-09-30', '2026-11-30']
        );
        assert.deepEqual(
            [0, 1, 2, 3].map((k) => fechaAnclada('2026-01-31', k, 3)),
            ['2026-01-31', '2026-04-30', '2026-07-31', '2026-10-31']
        );
        assert.deepEqual(
            [0, 1, 2, 3, 4].map((k) => fechaAnclada('2024-02-29', k, 12)),
            ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']
        );
    });

    test('la serie puede cruzar de año', () => {
        assert.deepEqual(
            [0, 1, 2, 3].map((k) => fechaAnclada('2026-11-30', k, 1)),
            ['2026-11-30', '2026-12-30', '2027-01-30', '2027-02-28']
        );
    });

    test('siguienteFechaAnclada continúa desde el último pago sin arrastrar desvíos', () => {
        assert.equal(siguienteFechaAnclada('2026-02-28', '2026-01-31', 1), '2026-03-31');
        assert.equal(siguienteFechaAnclada('2026-03-03', '2026-01-31', 1), '2026-03-31');
        assert.equal(siguienteFechaAnclada('2026-04-30', '2026-01-31', 3), '2026-07-31');
        assert.equal(siguienteFechaAnclada('2026-01-31', '2026-01-31', 1), '2026-02-28');
    });

    test('sumarMesesAnclado conserva el día de anclaje aunque la fecha de partida esté recortada', () => {
        assert.equal(sumarMesesAnclado('2026-02-28', 1, 31), '2026-03-31');
        assert.equal(sumarMesesAnclado('2026-04-30', 1, 31), '2026-05-31');
        assert.equal(sumarMesesAnclado('2026-02-28', 1, 29), '2026-03-29');
    });

    test('fechaISO acepta texto y Date y rechaza formatos no válidos', () => {
        assert.equal(fechaISO('2026-01-31'), '2026-01-31');
        assert.equal(fechaISO(new Date(Date.UTC(2026, 0, 31))), '2026-01-31');
        assert.throws(() => fechaISO('no-es-fecha'), /YYYY-MM-DD/);
    });

    test('rechaza periodicidades, periodos o días de anclaje no válidos', () => {
        assert.throws(() => fechaAnclada('2026-01-31', 1, 0), /meses por periodo/);
        assert.throws(() => siguienteFechaAnclada('2026-02-28', '2026-01-31', 0), /meses por periodo/);
        assert.throws(() => sumarMesesAnclado('2026-01-31', 1, 0), /día de anclaje/);
        assert.throws(() => sumarMesesAnclado('2026-01-31', 0, 31), /meses a sumar/);
    });

    test('el resultado no depende de la zona horaria del proceso', () => {
        const esperado = [0, 1, 2, 3].map((k) => fechaAnclada('2026-01-31', k, 1));
        for (const tz of ['UTC', 'Pacific/Auckland', 'America/Los_Angeles', 'Asia/Kolkata']) {
            process.env.TZ = tz;
            const obtenido = [0, 1, 2, 3].map((k) => fechaAnclada('2026-01-31', k, 1));
            assert.deepEqual(obtenido, esperado, `zona ${tz}`);
        }
    });
});
