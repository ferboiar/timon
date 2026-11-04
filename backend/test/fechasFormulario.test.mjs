// F-16: pruebas de la utilidad de fechas de formulario; no necesitan base de datos.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fechaIsoDeCalendario } from '../../src/utils/fechasFormulario.js';

describe('fechaIsoDeCalendario (F-16)', () => {
    test('convierte un Date local sin depender de la zona horaria', () => {
        const fecha = new Date(2026, 0, 31);
        assert.equal(fechaIsoDeCalendario(fecha), '2026-01-31');
    });

    test('conserva null y acepta un texto ISO ya válido', () => {
        assert.equal(fechaIsoDeCalendario(null), null);
        assert.equal(fechaIsoDeCalendario('2026-02-28'), '2026-02-28');
    });

    test('rechaza un texto que no es una fecha ISO de calendario', () => {
        assert.equal(fechaIsoDeCalendario('texto'), null);
    });
});
