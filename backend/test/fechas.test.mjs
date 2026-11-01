// Pruebas de generarFechasFuturas (F-12, DC-16): no necesitan base de datos.
// Se pueden ejecutar solas: node --test backend/test/fechas.test.mjs
import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { generarFechasFuturas } from '../src/db/db_utils.mjs';

const fechas = (inicial, periodicidad, cantidad) => generarFechasFuturas(inicial, periodicidad, cantidad).map((f) => f.fecha);
const tzOriginal = process.env.TZ;

afterEach(() => {
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
});

describe('generarFechasFuturas: secuencia anclada (F-12, DC-16)', () => {
    test('mensual desde el día 31 ajusta al último día de cada mes sin arrastrar desvíos', () => {
        assert.deepEqual(fechas('2026-01-31', 'mensual', 5), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
    });

    test('mensual desde el día 31 en año bisiesto da el 29 de febrero', () => {
        assert.deepEqual(fechas('2028-01-31', 'mensual', 3), ['2028-01-31', '2028-02-29', '2028-03-31']);
    });

    test('mensual desde los días 29 y 30', () => {
        assert.deepEqual(fechas('2026-01-29', 'mensual', 3), ['2026-01-29', '2026-02-28', '2026-03-29']);
        assert.deepEqual(fechas('2026-01-30', 'mensual', 3), ['2026-01-30', '2026-02-28', '2026-03-30']);
    });

    test('bimestral y trimestral desde el día 31', () => {
        assert.deepEqual(fechas('2026-01-31', 'bimestral', 6), ['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31', '2026-09-30', '2026-11-30']);
        assert.deepEqual(fechas('2026-01-31', 'trimestral', 4), ['2026-01-31', '2026-04-30', '2026-07-31', '2026-10-31']);
    });

    test('anual desde el 29 de febrero vuelve al 29 en los años bisiestos', () => {
        assert.deepEqual(fechas('2024-02-29', 'anual', 5), ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
    });

    test('la serie puede cruzar de año', () => {
        assert.deepEqual(fechas('2026-11-30', 'mensual', 4), ['2026-11-30', '2026-12-30', '2027-01-30', '2027-02-28']);
    });

    test('cada elemento conserva la forma esperada por pushRecibo', () => {
        const [primera, segunda] = generarFechasFuturas('2026-03-15', 'mensual', 2);
        assert.deepEqual(primera, { fecha: '2026-03-15', estado: 'pendiente', comentario: 'Fecha inicial', activo: 1 });
        assert.deepEqual(segunda, { fecha: '2026-04-15', estado: 'pendiente', comentario: '', activo: 1 });
        assert.deepEqual(generarFechasFuturas('2026-03-15', 'mensual', 0), []);
    });

    test('rechaza una periodicidad o una fecha inicial no válidas', () => {
        assert.throws(() => generarFechasFuturas('2026-01-31', 'semanal', 3), /Periodicidad no válida/);
        assert.throws(() => generarFechasFuturas('no-es-fecha', 'mensual', 3), /formato YYYY-MM-DD/);
    });

    test('el resultado no depende de la zona horaria del proceso (F-13)', () => {
        const esperado = fechas('2026-01-31', 'mensual', 14);
        for (const tz of ['UTC', 'Pacific/Auckland', 'America/Los_Angeles', 'Asia/Kolkata']) {
            process.env.TZ = tz;
            assert.deepEqual(fechas('2026-01-31', 'mensual', 14), esperado, `zona ${tz}`);
        }
    });
});
