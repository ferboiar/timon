// Selección de pruebas por impacto, manifiesto y guardas (DC-69). Sin base de datos.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    cercasDesbalanceadas,
    compararManifiesto,
    esRutaProhibida,
    filtrarExistentes,
    lineasAnadidasConCR,
    necesitaBd,
    resumirSalida,
    seleccionarPruebas,
    ultimoIdPorFamilia,
    validarInvocacionCierre
} from '../../scripts/lib/iteracion.mjs';

const indice = {
    testsBackend: {
        'backend/test/fechas.test.mjs': "import { generarFechasFuturas } from '../src/utils/fechas.mjs';",
        'backend/test/ahorros.test.mjs': "process.env.TEST_DB_NAME; import 'db_utilsSav'"
    },
    specsE2e: { 'e2e/tests/recibosBorrado.spec.mjs': 'ListBills', 'e2e/tests/smoke.spec.mjs': 'smoke' }
};

test('solo documentación: pruebas de documentación y ninguna de BD', () => {
    const r = seleccionarPruebas(['doc/mantenimiento/README.md'], indice);

    assert.equal(r.backendCompleto, false);
    assert.deepEqual(r.backend, ['backend/test/coherenciaDocumental.test.mjs', 'backend/test/reglasCline.test.mjs']);
    assert.deepEqual(r.e2e, []);
});

test('los nombres con metacaracteres no se interpretan como expresión regular', () => {
    const indiceMeta = { testsBackend: { 'backend/test/meta.test.mjs': 'usa aaab, aaXb y aXb en el texto' }, specsE2e: {} };

    // `a+b` no debe casar con «aaab»: un patrón \ba+b\b sí casaría.
    assert.equal(seleccionarPruebas(['backend/src/utils/a+b.mjs'], indiceMeta).backendCompleto, true);
    // `a.b` no debe casar con «aaXb» ni con «aaab».
    assert.equal(seleccionarPruebas(['backend/src/utils/a.b.mjs'], indiceMeta).backendCompleto, true);
});

test('un módulo con pruebas que lo nombran lanza solo esas', () => {
    const r = seleccionarPruebas(['backend/src/utils/fechas.mjs'], indice);

    assert.equal(r.backendCompleto, false);
    assert.ok(r.backend.includes('backend/test/fechas.test.mjs'));
});

test('un módulo que ninguna prueba nombra o una migración piden la suite completa', () => {
    assert.equal(seleccionarPruebas(['backend/src/routes/nuevo.mjs'], indice).backendCompleto, true);
    assert.equal(seleccionarPruebas(['backend/src/db/migrations/0009_x.sql'], indice).backendCompleto, true);
    assert.equal(seleccionarPruebas(['package.json'], indice).backendCompleto, true);
});

test('un componente de interfaz elige su E2E, o el humo si ninguno lo nombra', () => {
    assert.deepEqual(seleccionarPruebas(['src/views/pages/ListBills.vue'], indice).e2e, ['e2e/tests/recibosBorrado.spec.mjs']);
    assert.deepEqual(seleccionarPruebas(['src/views/pages/Otra.vue'], indice).e2e, ['e2e/tests/smoke.spec.mjs']);
    assert.equal(seleccionarPruebas(['src/router/index.js'], indice).build, true);
});

test('un cambio de sesión, configuración, estructura o router exige E2E completa y build', () => {
    for (const f of ['src/composables/useAuth.js', 'src/config/x.js', 'src/layout/AppMenu.vue', 'src/router/index.js']) {
        const r = seleccionarPruebas([f], indice);

        assert.equal(r.e2eCompleta, true, f);
        assert.equal(r.build, true, f);
        assert.deepEqual(r.e2e, [], f);
    }

    assert.equal(seleccionarPruebas(['src/views/pages/ListBills.vue'], indice).e2eCompleta, false);
});

test('un cambio en los servicios pide E2E completa y build (S-07)', () => {
    const r = seleccionarPruebas(['src/service/BillService.js'], indice);

    assert.equal(r.e2eCompleta, true);
    assert.equal(r.build, true);
    assert.deepEqual(r.e2e, []);
});

test('lint solo de src/ y e2e/, y sintaxis de los .mjs fuera de src/', () => {
    const r = seleccionarPruebas(['src/views/pages/ListBills.vue', 'scripts/iteracion.mjs', 'e2e/tests/smoke.spec.mjs'], indice);

    assert.deepEqual(r.lint, ['e2e/tests/smoke.spec.mjs', 'src/views/pages/ListBills.vue']);
    assert.deepEqual(r.sintaxis, ['e2e/tests/smoke.spec.mjs', 'scripts/iteracion.mjs']);
});

test('las rutas prohibidas no entran nunca', () => {
    for (const ruta of ['backend/src/db/.db_connection', 'backend/src/db/.db_connection.backup', 'node_modules/x/a.js', 'backend/.env']) {
        assert.equal(esRutaProhibida(ruta), true, ruta);
    }

    assert.equal(esRutaProhibida('backend/test/.env.test'), false);
    assert.equal(seleccionarPruebas(['backend/src/db/.db_connection'], indice).backendCompleto, false);
});

test('el manifiesto se compara con el índice', () => {
    assert.deepEqual(compararManifiesto(['a', 'b'], ['b', 'a']), { faltan: [], sobran: [] });
    assert.deepEqual(compararManifiesto(['a', 'b'], ['b', 'c']), { faltan: ['a'], sobran: ['c'] });
});

test('detecta qué pruebas necesitan base de datos', () => {
    assert.equal(necesitaBd(indice.testsBackend['backend/test/ahorros.test.mjs']), true);
    assert.equal(necesitaBd(indice.testsBackend['backend/test/fechas.test.mjs']), false);
});

test('resumirSalida deja solo el resumen de node --test y los errores si falla', () => {
    const salida = ['TAP version 13', 'ok 1 - a', 'not ok 2 - b', '  error: |-', '    boom', '# tests 2', '# pass 1', '# fail 1', '# cancelled 0', '# duration_ms 5'].join('\n');
    const ok = resumirSalida(['ok 1 - a', '# tests 1', '# pass 1', '# fail 0', '# duration_ms 5'].join('\n'), { codigo: 0, esTest: true });
    const mal = resumirSalida(salida, { codigo: 1, esTest: true });

    assert.equal(ok, '# tests 1\n# pass 1\n# fail 0');
    assert.match(mal, /not ok 2 - b/);
    assert.match(mal, /boom/);
    assert.ok(!/TAP version|duration_ms/.test(mal));
});

test('resumirSalida no muestra nada si una orden ordinaria acaba bien y corta si falla', () => {
    assert.equal(resumirSalida('mucho texto\n'.repeat(500), { codigo: 0 }), '');
    assert.equal(resumirSalida('x\n'.repeat(500), { codigo: 1, max: 10 }).split('\n').length, 10);
});

test('detecta CR solo en las líneas que añade el diff', () => {
    const diff = [
        'diff --git a/doc/x.md b/doc/x.md',
        '--- a/doc/x.md',
        '+++ b/doc/x.md',
        '@@ -1 +1,2 @@',
        '-linea vieja',
        '+linea nueva\r',
        '+linea normal'
    ].join('\n');
    const avisos = lineasAnadidasConCR(diff);

    assert.equal(avisos.length, 1);
    assert.equal(avisos[0].ruta, 'doc/x.md');
    assert.equal(avisos[0].texto, 'linea nueva');
    assert.deepEqual(lineasAnadidasConCR(['+++ b/doc/y.md', '@@ -1 +1 @@', ' contexto con CR\r'].join('\n')), []);
});

test('detecta cercas de código desbalanceadas', () => {
    assert.deepEqual(cercasDesbalanceadas('```\ntexto\n```\n'), { total: 2, impar: false });
    assert.deepEqual(cercasDesbalanceadas('```\ntexto\n'), { total: 1, impar: true });
    assert.equal(cercasDesbalanceadas('sin bloques').impar, false);
});

test('el último ID por familia usa orden numérico y no cuenta menciones', () => {
    const registro = ['| DC-9 | viejo |', '| DC-68 | menciona DC-99 en el texto |', '| F-59 | menciona F-200 en el texto |', '| DC-70 | nuevo |'].join('\n');

    assert.deepEqual(ultimoIdPorFamilia(registro), { DC: 'DC-70', F: 'F-59' });
    assert.equal(ultimoIdPorFamilia('| DC-9 | a |\n| DC-68 | b |').DC, 'DC-68');
});

test('descarta pruebas que aún no existen', () => {
    const existe = (r) => r !== 'backend/test/coherenciaDocumental.test.mjs';

    assert.deepEqual(
        filtrarExistentes(['backend/test/reglasCline.test.mjs', 'backend/test/coherenciaDocumental.test.mjs'], existe),
        ['backend/test/reglasCline.test.mjs']
    );
});

test('cierre distingue falta de tema, falta de lista y lista vacía', () => {
    assert.equal(validarInvocacionCierre(['cierre']), 'falta-tema');
    assert.equal(validarInvocacionCierre(['cierre', 'x']), 'falta-lista');
    assert.equal(validarInvocacionCierre(['cierre', 'x', '--ficheros']), 'lista-vacia');
    assert.equal(validarInvocacionCierre(['cierre', 'x', '--ficheros', ' , ']), 'lista-vacia');
    assert.equal(validarInvocacionCierre(['cierre', 'x', '--ficheros', 'a.md,b.md']), 'ok');
    assert.equal(validarInvocacionCierre(['cierre', 'mal tema', '--ficheros', 'a']), 'tema-invalido');
});
