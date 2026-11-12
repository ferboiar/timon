/**
 * Documentación: reglas con centinelas (DC-47).
 * =============================================
 *
 * Deducciones:
 * - `src/router/index.js`: ruta `/tech-docs` (componente `Tech-documentation.vue`). El guard
 *   solo exige sesión (S-06: ninguna ruta define `requiresAdmin`), así que vale la sesión
 *   compartida de la suite.
 * - `Tech-documentation.vue`: `loadDocument(path)` compone `/doc/${path}.md` y lo busca en
 *   `import.meta.glob` sobre la carpeta `doc`; `navigateToDoc` guarda la ruta en `?doc=`. El HTML de
 *   `marked` se inyecta con `v-html` en `div.documentation-content`.
 *
 * Comprueba que los comentarios HTML de los centinelas no llegan al texto visible y que los
 * dos bloques se pintan como título en negrita y lista. **No crea ni borra datos** y no
 * necesita el diálogo de ninguna pantalla de negocio.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { urlDe } from './helpers/timon.mjs';

const EDICION = 'mantenimiento/instruccion-persistente_3de4';
const PUBLICACION = 'mantenimiento/instruccion-persistente_2de4';
const DIAGRAMA = 'db/schema/presupuestos';

/** Abre el visor en un documento concreto y espera a que `marked` haya pintado. */
async function abrirDocumento(page, ruta) {
    await page.goto(urlDe(`/tech-docs?doc=${ruta}`), { waitUntil: 'domcontentloaded', timeout: 45_000 });

    const contenido = page.locator('.documentation-content');

    // `v-if="!isLoading"`: el contenedor solo existe cuando el documento ya se ha cargado
    await expect(contenido).toBeVisible({ timeout: 30_000 });

    return contenido;
}

test.describe('Documentación: reglas con centinelas (DC-47)', () => {
    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo al pintar las reglas con centinelas');
        }
    });

    test('la regla de edición se pinta y sus centinelas no se ven', async ({ paginaSesion: page }) => {
        const contenido = await abrirDocumento(page, EDICION);

        await expect(contenido).toContainText('Edición de ficheros (DC-47)', { timeout: 20_000 });

        // El contenido llega completo: la frase acordada (C-2) y las viñetas del bloque
        await expect(contenido).toContainText('Todo cambio en un fichero existente del repositorio se hace con');
        await expect(contenido.locator('li', { hasText: 'grep -c' })).toHaveCount(1);
        await expect(contenido.locator('li', { hasText: 'No se usan Python ni scripts ad hoc' })).toHaveCount(1);

        const texto = await contenido.innerText();

        // Los comentarios HTML de los centinelas no deben verse
        expect(texto).not.toContain('<!--');
        expect(texto).not.toContain('-->');
        expect(texto).not.toContain('regla:edicion-ficheros');

        // …ni romper el render: el título de la parte sigue presente
        expect(texto).toContain('Instrucción persistente de funcionamiento: parte 3 de 4');
    });

    test('la regla de publicación se pinta y sus centinelas no se ven', async ({ paginaSesion: page }) => {
        const contenido = await abrirDocumento(page, PUBLICACION);

        await expect(contenido).toContainText('Publicación y fusiones (DC-47', { timeout: 20_000 });

        // Las ocho operaciones están en el párrafo de la regla, no en una viñeta
        await expect(contenido).toContainText('gh pr merge');
        await expect(contenido.locator('li', { hasText: 'no publica nada' })).toHaveCount(1);

        const texto = await contenido.innerText();

        expect(texto).not.toContain('<!--');
        expect(texto).not.toContain('-->');
        expect(texto).not.toContain('regla:publicacion-fusiones');
        expect(texto).not.toContain('No abras, fusiones ni borres ramas remotas');

        expect(texto).toContain('Instrucción persistente de funcionamiento: parte 2 de 4');
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
