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
import { abrirCategorias, categoriasE2EEnTabla, crearCategoria, dialogoCategoria, eliminarCategoria, filaCategoria, nombreCategoriaUnico, tokenDePagina, urlDeApi } from './helpers/timon.mjs';

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

    test('rechaza un nombre de más de 30 caracteres en la pantalla y en el servidor (F-55)', async ({ paginaSesion: page }) => {
        await abrirCategorias(page);

        const nombreLargo = 'x'.repeat(31);

        await page.getByRole('button', { name: 'Nueva' }).click();

        const dialogo = dialogoCategoria(page);
        await expect(dialogo).toBeVisible();

        // `maxlength` recorta lo que se teclea; se fija el valor para reproducir el caso del
        // límite (un nombre heredado de 31 caracteres) sin depender del comportamiento del control.
        await dialogo.getByLabel('Nombre').evaluate((el, valor) => {
            el.value = valor;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }, nombreLargo);

        // `Categories.vue`: contador, aviso y Guardar deshabilitado antes de enviar.
        await expect(dialogo.getByText('31/30')).toBeVisible();
        await expect(dialogo.getByText('El nombre no puede superar los 30 caracteres.')).toBeVisible();
        await expect(dialogo.getByRole('button', { name: 'Save' })).toBeDisabled();

        await dialogo.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialogo).toBeHidden();

        // El servidor responde 400 de negocio (antes era un 500 técnico).
        const token = await tokenDePagina(page);
        const respuesta = await page.request.post(`${urlDeApi()}/api/categorias`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { nombre: nombreLargo, descripcion: null }
        });

        expect(respuesta.status()).toBe(400);
        expect((await respuesta.json()).error).toBe('El nombre de la categoría no puede superar los 30 caracteres.');

        // No se ha creado ninguna categoría con ese nombre.
        await abrirCategorias(page);
        await expect(page.locator('table tbody tr').filter({ hasText: nombreLargo })).toHaveCount(0);
    });

    test('edita la descripción de la categoría creada', async ({ paginaSesion: page }) => {
        test.skip(!nombre, 'No hay categoría creada por esta ejecución');

        await abrirCategorias(page);

        const descripcion = `descripcion e2e ${nombre.slice(-6)}`;

        await filaCategoria(page, nombre).first().locator('button:has(.pi-pencil)').click();

        const dialogo = dialogoCategoria(page);
        await expect(dialogo).toBeVisible();
        await dialogo.getByLabel('Descripción').fill(descripcion);

        const [respuesta] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/categorias') && r.request().method() === 'POST', { timeout: 30_000 }), dialogo.getByRole('button', { name: 'Save' }).click()]);

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
