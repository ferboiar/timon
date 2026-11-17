/**
 * Documentación: diagramas del visor (U-24, DC-56).
 * =================================================
 *
 * Deducciones:
 * - `src/router/index.js`: ruta `/tech-docs` (componente `Tech-documentation.vue`). El guard
 *   solo exige sesión (S-06: ninguna ruta define `requiresAdmin`), así que vale la sesión
 *   compartida de la suite.
 * - `Tech-documentation.vue`: `loadDocument(path)` compone `/doc/${path}.md` y lo busca en
 *   `import.meta.glob` sobre la carpeta `doc`; `navigateToDoc` guarda la ruta en `?doc=`. El HTML de
 *   `marked` se inyecta con `v-html` en `div.documentation-content`.
 *
 * Comprueba que el diagrama nomnoml de `doc/db/schema/presupuestos.md` se dibuja y se vuelve a
 * pintar al cambiar de tema. **No crea ni borra datos** y no necesita el diálogo de ninguna pantalla
 * de negocio.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { urlDe } from './helpers/timon.mjs';

const DIAGRAMA = 'db/schema/presupuestos';

/** Abre el visor en un documento concreto y espera a que `marked` haya pintado. */
async function abrirDocumento(page, ruta) {
    await page.goto(urlDe(`/tech-docs?doc=${ruta}`), { waitUntil: 'domcontentloaded', timeout: 45_000 });

    const contenido = page.locator('.documentation-content');

    // `v-if="!isLoading"`: el contenedor solo existe cuando el documento ya se ha cargado
    await expect(contenido).toBeVisible({ timeout: 30_000 });

    return contenido;
}

test.describe('Documentación: diagramas del visor (U-24, DC-56)', () => {
    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo al pintar los diagramas del visor');
        }
    });

    test('el diagrama nomnoml se dibuja en el visor', async ({ paginaSesion: page }) => {
        const contenido = await abrirDocumento(page, DIAGRAMA);

        await expect(contenido).toContainText('Diagrama de Relaciones', { timeout: 20_000 });

        const svg = contenido.locator('.nomnoml-diagram svg');
        await expect(svg).toBeVisible({ timeout: 30_000 });
        await expect(contenido.locator('.diagram-loader')).toHaveCount(0);
        expect(await svg.locator('rect').count()).toBeGreaterThan(0);
    });

    test('el diagrama se vuelve a pintar al cambiar de tema, sin recargar', async ({ paginaSesion: page }) => {
        const contenido = await abrirDocumento(page, DIAGRAMA);
        const svg = contenido.locator('.nomnoml-diagram svg');
        await expect(svg).toBeVisible({ timeout: 30_000 });

        // El grupo de un nodo lleva fill y data-name en los dos temas (render claro y oscuro)
        expect(await contenido.locator('.nomnoml-diagram svg g[data-name][fill]').count()).toBeGreaterThan(0);

        const botonTema = page.locator('.layout-topbar-action', { has: page.locator('i.pi-moon, i.pi-sun') });
        // Agnóstico del tema y de los colores: se compara el marcado del SVG antes y después
        const marcado = () => contenido.locator('.nomnoml-diagram svg').evaluate((el) => el.outerHTML);

        const antes = await marcado();

        await botonTema.click();
        try {
            await expect.poll(marcado, { timeout: 15_000 }).not.toBe(antes);
            await expect(contenido.locator('.diagram-error')).toHaveCount(0);
            await expect(svg).toBeVisible();
        } finally {
            // La sesión E2E es compartida: se devuelve el tema aunque falle la aserción
            try {
                await botonTema.click({ timeout: 5_000 });
            } catch (error) {
                console.warn('No se pudo restaurar el tema de la sesión:', error.message);
            }
        }
    });
});
