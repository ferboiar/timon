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

        await expect(contenido).toContainText('Publicación y fusiones (DC-47)', { timeout: 20_000 });

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
});
