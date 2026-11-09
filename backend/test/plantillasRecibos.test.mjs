// F-30 y F-31: guarda estática de la plantilla de Recibos. No necesita base de datos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const VISTA = new URL('../../src/views/pages/ListBills.vue', import.meta.url);
const plantilla = fs.readFileSync(VISTA, 'utf8');

/** Bloque de la plantilla que empieza en la etiqueta `<DataTable` de la referencia dada. */
function bloqueDeTabla(ref) {
    const inicio = plantilla.indexOf(`ref="${ref}"`);
    assert.notEqual(inicio, -1, `no se encuentra la tabla ${ref}`);

    const desde = plantilla.lastIndexOf('<DataTable', inicio);
    const hasta = plantilla.indexOf('>', inicio);

    return plantilla.slice(desde, hasta + 1);
}

test('F-30: la tabla de trimestrales usa su propia selección', () => {
    const bloque = bloqueDeTabla('dt_trimestral');

    assert.equal(bloque.includes('v-model:selection="selectedQuarterlyBills"'), true, 'la tabla de trimestrales no usa selectedQuarterlyBills');
    assert.equal(bloque.includes('selectedBimonthlyBills'), false, 'la tabla de trimestrales comparte la selección de bimestrales');
});

test('F-30: la tabla de bimestrales conserva la suya', () => {
    const bloque = bloqueDeTabla('dt_bimestral');

    assert.equal(bloque.includes('v-model:selection="selectedBimonthlyBills"'), true);
    assert.equal(bloque.includes('selectedQuarterlyBills'), false);
});

test('F-31: el diálogo de borrado muestra el concepto del recibo', () => {
    assert.equal(plantilla.includes('{{ bill.concepto }}'), true, 'el diálogo no muestra bill.concepto');
    assert.equal(plantilla.includes('bill.name'), false, 'queda bill.name, que no existe en los datos');
});
