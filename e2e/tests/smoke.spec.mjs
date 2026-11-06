/**
 * Humo: Timón carga en el Edge del portátil.
 * =========================================
 *
 * Usa la sesión compartida (`paginaSesion`): comprueba que la aplicación responde, que el
 * guard deja entrar con la sesión creada por `asegurarSesion` y que el layout autenticado
 * se pinta. Deducción: `src/router/index.js` (`/dashboard` protegido), `src/layout/AppLayout.vue`
 * (`<Toast />` y estructura `.layout-wrapper`) y `src/layout/AppFooter.vue` (`logged in as`).
 */
import { test, expect } from './fixtures.mjs';
import { urlDe } from '../scripts/entorno.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';

test.afterEach(async ({ paginaSesion: page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
        await adjuntarDiagnostico(testInfo, page, 'fallo en el smoke');
    }
});

test('Timón carga en Edge del portátil', async ({ paginaSesion: page }) => {
    const respuesta = await page.goto(urlDe('/dashboard'), { waitUntil: 'domcontentloaded', timeout: 45_000 });

    expect(respuesta).not.toBeNull();
    expect(respuesta.status()).toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.layout-wrapper')).toBeVisible();
    await expect(page.locator('.layout-footer')).toContainText('logged in as');
    await expect(page).toHaveURL(/\/dashboard$/);
});
