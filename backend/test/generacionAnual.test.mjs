import assert from 'node:assert/strict';
import { test } from 'node:test';
import { opcionesGeneracion, separarResultado } from '../src/utils/generacionAnual.mjs';

test('diciembre antes, el mismo día y después del 1', () => {
    for (const [hoy, fecha] of [
        ['2026-11-02', '2026-12-01'],
        ['2026-12-01', '2026-12-01'],
        ['2026-12-02', '2027-12-01']
    ]) {
        assert.equal(opcionesGeneracion(true, true, hoy).fecha, fecha);
    }
});

test('hoy no introduce una fecha simulada', () => {
    assert.equal(opcionesGeneracion(true, false, '2026-11-02').fecha, null);
    assert.equal(opcionesGeneracion(false, false, '2026-11-02').fecha, null);
});

test('no permite escritura futura ni opciones no booleanas', () => {
    assert.throws(() => opcionesGeneracion(false, true, '2026-11-02'), { status: 400 });
    assert.throws(() => opcionesGeneracion('false', false, '2026-11-02'), { status: 400 });
});

test('separa avisos generales sin perder el aviso de cadencia', () => {
    const recibo = { origen_id: 1, anio_nuevo: 2027, aviso: 'Cadencia' };
    assert.deepEqual(separarResultado([recibo, { aviso: 'Hay otra ejecucion en curso' }]), {
        filas: [recibo],
        avisos: ['Hay otra ejecucion en curso']
    });
    assert.deepEqual(separarResultado([]), { filas: [], avisos: [] });
});
