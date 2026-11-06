/**
 * Categorías (flujo serial con una sola sesión).
 * ==============================================
 *
 * Deducciones:
 * - `src/router/index.js`: ruta `/pages/categories`.
 * - `src/views/pages/Categories.vue`: toolbar `Nueva`, diálogo `Detalle de la categoría`
 *   (`InputText id="nombre"`, `Textarea id="descripcion"`, botones `Cancel`/`Save`), toast
 *   `Categoría guardada!`, tabla `DataTable`, diálogo `Confirm` con `No`/`Yes` y toast
 *   `Categoría eliminada`.
 * - `backend/src/routes/categorias.mjs` + `db_utilsCats.mjs`: 201 al crear, 400 con
 *   `Ya existe otra categoría con el nombre «...»` al duplicar.
 *
 * Los tests comparten la sesión y la pestaña del fixture `paginaSesion` y navegan a
 * `/pages/categories` una sola vez por test (no por paso). `mode: 'serial'` hace que, si un
 * paso falla, los dependientes se salten con un mensaje claro; `afterAll` limpia igual.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { debeLimpiarHuerfanas } from '../scripts/entorno.mjs';
import {
    abrirCategorias,
    categoriasE2EEnTabla,
    crearCategoria,
    dialogoCategoria,
    eliminarCategoria,
    filaCategoria,
    nombreCategoriaUnico
} from './helpers/timon.mjs';

test.describe.configure({ mode: 'serial' });

test.describe('Categorías', () => {
    /** Nombres creados por esta ejecución (para la limpieza). */
    const creadas = [];

    /** Nombre de trabajo del flujo serial. */
    let nombre = null;

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el flujo de categorías');
        }
    });

    test.afterAll(async ({ paginaSesion: page }) => {
        const pendientes = [...creadas];

        for (const pendiente of pendientes) {
            try {
                await abrirCategorias(page);

                const respuesta = await eliminarCategoria(page, pendiente);

                if (respuesta === null) {
                    console.log(`[LIMPIEZA] ${pendiente}: ya no estaba en la tabla.`);
                    continue;
                }

                if (respuesta.status() !== 200) {
                    console.warn(`[LIMPIEZA] Queda sin eliminar: ${pendiente} (HTTP ${respuesta.status()})`);
                    continue;
                }

                await expect(filaCategoria(page, pendiente)).toHaveCount(0);
                console.log(`[LIMPIEZA] Eliminada: ${pendiente}`);
            } catch (error) {
                console.warn(`[LIMPIEZA] Queda sin eliminar: ${pendiente} (${error.message.split('\n')[0]})`);
            }
        }

        creadas.length = 0;
    });

    test('lista las categorías y detecta huérfanas de ejecuciones anteriores', async ({ paginaSesion: page }, testInfo) => {
        await abrirCategorias(page);

        // Columnas propias de la tabla (`Categories.vue`).
        await expect(page.getByRole('columnheader', { name: 'Nombre' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Descripción' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Nueva' })).toBeVisible();

        // Huérfanas: solo nombres con el formato exacto del generador de esta suite.
        const huerfanas = (await categoriasE2EEnTabla(page)).filter((nombreTabla) => !creadas.includes(nombreTabla));

        console.log(`[HUERFANAS] ${huerfanas.length} categorías e2e_categoria_AAAAMMDD_HHMMSS de ejecuciones anteriores`);

        for (const huerfana of huerfanas) {
            const esHuerfanaConfirmada = !creadas.includes(huerfana);

            if (!esHuerfanaConfirmada) continue;

            if (debeLimpiarHuerfanas()) {
                const respuesta = await eliminarCategoria(page, huerfana);

                if (respuesta && respuesta.status() === 200) {
                    console.log(`[HUERFANAS] Eliminada: ${huerfana}`);
                } else {
                    console.warn(`[HUERFANAS] No se pudo eliminar ${huerfana} (HTTP ${respuesta ? respuesta.status() : 'sin respuesta'})`);
                }
            } else {
                console.warn(`[HUERFANAS] Queda sin eliminar ${huerfana} (E2E_LIMPIAR_HUERFANAS=0)`);
            }
        }

        await testInfo.attach('categorias_e2e_previas', {
            body: JSON.stringify(huerfanas, null, 2),
            contentType: 'application/json'
        });
    });

    test('crea una categoría E2E', async ({ paginaSesion: page }) => {
        nombre = await nombreCategoriaUnico();

        const respuesta = await crearCategoria(page, nombre);

        expect(respuesta.status()).toBe(201);
        creadas.push(nombre);
        console.log(`[CREADA] ${nombre}`);

        // `Categories.vue`: toast de éxito (PrimeVue Toast usa `role="alert"`).
        await expect(page.getByRole('alert').filter({ hasText: 'Categoría guardada!' })).toBeVisible();
        await expect(dialogoCategoria(page)).toBeHidden();

        await expect(filaCategoria(page, nombre)).toHaveCount(1);
    });

    test('la categoría creada aparece en la tabla tras recargar', async ({ paginaSesion: page }) => {
        test.skip(!nombre, 'No hay categoría creada por esta ejecución');

        await abrirCategorias(page);

        await expect(filaCategoria(page, nombre).first()).toBeVisible();
        await expect(page.getByRole('cell', { name: new RegExp(nombre, 'i') })).toHaveCount(1);
    });

    test('rechaza una categoría duplicada', async ({ paginaSesion: page }) => {
        test.skip(!nombre, 'No hay categoría creada por esta ejecución');

        await abrirCategorias(page);

        const respuesta = await crearCategoria(page, nombre);

        // `db_utilsCats.mjs` lanza `ErrorDeNegocio` (400) y la ruta la devuelve tal cual.
        expect(respuesta.status()).toBe(400);

        await expect(page.getByRole('alert').filter({ hasText: 'Ya existe otra categoría con el nombre' })).toBeVisible();

        // El diálogo sigue abierto porque el guardado falló; se cierra sin guardar.
        const dialogo = dialogoCategoria(page);
        await expect(dialogo).toBeVisible();
        await dialogo.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialogo).toBeHidden();

        await expect(filaCategoria(page, nombre)).toHaveCount(1);
    });

    test('edita la descripción de la categoría creada', async ({ paginaSesion: page }) => {
        test.skip(!nombre, 'No hay categoría creada por esta ejecución');

        await abrirCategorias(page);

        const descripcion = `descripcion e2e ${nombre.slice(-6)}`;

        await filaCategoria(page, nombre).first().locator('button:has(.pi-pencil)').click();

        const dialogo = dialogoCategoria(page);
        await expect(dialogo).toBeVisible();
        await dialogo.getByLabel('Descripción').fill(descripcion);

        const [respuesta] = await Promise.all([
            page.waitForResponse((r) => r.url().includes('/api/categorias') && r.request().method() === 'POST', { timeout: 30_000 }),
            dialogo.getByRole('button', { name: 'Save' }).click()
        ]);

        expect(respuesta.status()).toBe(201);
        await expect(page.getByRole('alert').filter({ hasText: 'Categoría guardada!' })).toBeVisible();
        await expect(filaCategoria(page, nombre).first()).toContainText(descripcion);
    });

    test('borra la categoría creada y desaparece de la tabla', async ({ paginaSesion: page }) => {
        test.skip(!nombre, 'No hay categoría creada por esta ejecución');

        await abrirCategorias(page);

        const respuesta = await eliminarCategoria(page, nombre);

        expect(respuesta).not.toBeNull();
        expect(respuesta.status()).toBe(200);

        await expect(page.getByRole('alert').filter({ hasText: 'Categoría eliminada' })).toBeVisible();
        await expect(filaCategoria(page, nombre)).toHaveCount(0);

        const indice = creadas.indexOf(nombre);

        if (indice >= 0) creadas.splice(indice, 1);

        console.log(`[BORRADA] ${nombre}`);
    });
});
