/**
 * Recibos: diálogo de borrado (F-31).
 * ==================================
 *
 * Deducciones:
 * - `src/router/index.js`: ruta `/pages/bills` (componente `ListBills.vue`).
 * - `ListBills.vue`: toolbar con «Nuevo» y, en cada fila (`table tbody tr`), un botón con
 *   `pi-trash` que llama a `confirmDeleteBill`; el diálogo es `header="Confirm"` con
 *   «No» y «Yes» y el texto «¿Seguro que quieres borrar el recibo <b>concepto</b>?».
 *
 * El test **no crea ni borra nada**: abre el diálogo del primer recibo visible y pulsa «No».
 * Antes de F-31 el diálogo usaba `bill.name`, un campo inexistente, así que el nombre salía
 * vacío. Si no hay filas en el año en curso, el test se omite con un motivo explícito.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { urlDe } from './helpers/timon.mjs';

test.describe('Recibos: diálogo de borrado (F-31)', () => {
    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el diálogo de borrado de recibos');
        }
    });

    test('el diálogo muestra el concepto del recibo y no un nombre vacío', async ({ paginaSesion: page }) => {
        // Los recibos llegan por API después de pintar la pantalla: se espera la respuesta
        const recibos = page.waitForResponse((r) => r.url().includes('/api/recibos') && r.request().method() === 'GET', { timeout: 30_000 });

        await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();
        await recibos.catch(() => {});

        const filas = page.locator('table tbody tr').filter({ has: page.locator('button:has(.pi-trash)') });

        // Se espera a la primera fila; si no aparece, se omite con el motivo a la vista
        await expect(filas.first()).toBeVisible({ timeout: 20_000 }).catch(() => {});
        test.skip((await filas.count()) === 0, 'No hay recibos visibles en el año en curso');

        const fila = filas.first();

        const primeraCelda = (await fila.locator('td').first().innerText()).trim();

        await fila.locator('button:has(.pi-trash)').first().click();

        const dialogo = page.getByRole('dialog', { name: 'Confirm' });
        await expect(dialogo).toBeVisible();

        const texto = (await dialogo.innerText()).replace(/\s+/g, ' ').trim();

        // F-31: hay un nombre detrás de «el recibo» y no es un campo ausente
        expect(texto).toMatch(/borrar el recibo \S{2,}/i);
        expect(texto.toLowerCase()).not.toContain('undefined');
        expect(texto.toLowerCase()).not.toContain('null');

        // Y coincide con el concepto de la fila, sin depender de mayúsculas
        if (primeraCelda && !/\d/.test(primeraCelda)) {
            expect(texto.toLowerCase()).toContain(primeraCelda.toLowerCase());
        }

        await dialogo.getByRole('button', { name: 'No' }).click();
        await expect(dialogo).toBeHidden();
    });
});
