/**
 * Base de Datos: errores de conexión (F-48).
 * =========================================
 *
 * Deducciones:
 * - `src/views/pages/ProfileSettings.vue`: pestaña «Base de Datos» con `#db-host`, `#db-port`,
 *   `#db-user`, `#db-database` y el botón «Probar»; el toast de error de conexión usa
 *   `getApiErrorMessage`, así que muestra el mensaje del servidor tal cual.
 * - `backend/src/routes/conexionDB.mjs` (`POST /api/db-config/test`, solo administrador) y
 *   `db_utilsConn.testDbConnection`: traduce la causa a lenguaje de usuario; el código del
 *   sistema (`ECONNREFUSED`) no debe aparecer nunca en pantalla.
 *
 * Seguridad del test: la condición de fallo es local y determinista (`127.0.0.1` con un puerto
 * sin escuchar produce `ECONNREFUSED`). Solo se llama a «Probar», que abre una conexión y la
 * cierra: no escribe `.db_connection` ni crea `.db_connection.backup`. El test vigila que no
 * se emita ningún `PUT /api/db-config` ni `POST /api/db/restore`, y al final recarga para
 * comprobar que el formulario conserva los valores guardados.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { abrirAjustes, irAPestana } from './helpers/timon.mjs';

/** Texto exacto del catálogo para la causa «base no accesible» (backend/src/utils/catalogoErrores.mjs). */
const MENSAJE_BASE_NO_ACCESIBLE =
    'No se puede acceder a la base de datos. Comprueba que el servicio esté en marcha y que la dirección y el puerto sean correctos.';

/** Puerto local sin escuchar: el fallo es inmediato y no depende de la red. */
const PUERTO_CERRADO = '3399';

test.describe('Base de Datos: errores de conexión (F-48)', () => {
    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la prueba de conexión');
        }
    });

    test('una dirección inalcanzable explica qué comprobar y no guarda nada', async ({ paginaSesion: page }) => {
        // Guarda: ninguna petición que escriba la configuración ni que restaure la base
        const escrituras = [];

        page.on('request', (peticion) => {
            const url = peticion.url();
            const esGuardado = url.includes('/api/db-config') && peticion.method() === 'PUT';
            const esRestauracion = url.includes('/api/db/restore');

            if (esGuardado || esRestauracion) escrituras.push(`${peticion.method()} ${url}`);
        });

        await abrirAjustes(page, 'Base de Datos');

        const hostGuardado = await page.locator('#db-host').inputValue();
        const puertoGuardado = await page.locator('#db-port').inputValue();

        await page.locator('#db-host').fill('127.0.0.1');
        await page.locator('#db-port').fill(PUERTO_CERRADO);
        await page.locator('#db-user').fill('e2e_usuario_inexistente');
        await page.locator('#db-database').fill('e2e_base_inexistente');

        const [respuesta] = await Promise.all([
            page.waitForResponse((r) => r.url().includes('/api/db-config/test') && r.request().method() === 'POST', { timeout: 30_000 }),
            page.getByRole('button', { name: 'Probar' }).click()
        ]);

        expect(respuesta.status()).toBe(400);

        const cuerpo = await respuesta.json();

        // El servidor devuelve el mensaje del catálogo, sin código del sistema ni del motor
        expect(cuerpo.message).toBe(MENSAJE_BASE_NO_ACCESIBLE);
        expect(JSON.stringify(cuerpo).includes('ECONNREFUSED')).toBe(false);

        // La pantalla muestra el texto completo, no el texto técnico
        await expect(page.getByRole('alert').filter({ hasText: MENSAJE_BASE_NO_ACCESIBLE })).toBeVisible();
        await expect(page.getByRole('alert').filter({ hasText: 'ECONNREFUSED' })).toHaveCount(0);

        // Nunca se ha guardado ni restaurado nada
        expect(escrituras).toEqual([]);

        // Y el formulario, al recargar, vuelve a los valores guardados en el servidor
        await page.reload({ waitUntil: 'domcontentloaded' });
        await irAPestana(page, 'Base de Datos');

        expect(await page.locator('#db-host').inputValue()).toBe(hostGuardado);
        expect(await page.locator('#db-port').inputValue()).toBe(puertoGuardado);
    });
});
