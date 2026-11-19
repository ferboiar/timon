/**
 * Autenticación.
 * ==============
 *
 * Flujo deducido de:
 * - `src/views/pages/auth/Login.vue`: `InputText id="username"` con `<label for="username">`,
 *   `<Password placeholder="Contraseña">`, error en `<div class="text-red-500">`, botón
 *   `Iniciar Sesión`, `POST /api/auth/login` y `router.push('/dashboard')`.
 * - `backend/src/routes/auth.mjs`: 401 `{ message: 'Credenciales incorrectas' }`.
 * - `src/utils/apiError.js`: muestra `data.message`.
 * - `src/router/index.js`: guard de sesión.
 * - `src/layout/AppTopbar.vue`: menú de perfil con `Salir` (`command: logout`).
 * - `src/layout/AppFooter.vue`: `logged in as <usuario>`.
 * - `src/composables/useAuth.js`: `logout()` limpia la sesión y va a `/auth/login`.
 *
 * Este spec usa `paginaAuth`: un contexto propio por test, aislado del perfil del usuario y
 * de la sesión compartida del resto de la suite.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { credenciales, iniciarSesion, urlDe } from './helpers/timon.mjs';

test.describe('Autenticación', () => {
    test.afterEach(async ({ paginaAuth: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el flujo de autenticación');
        }
    });

    test('rechaza un login con contraseña incorrecta', async ({ paginaAuth: page }) => {
        const { usuario } = credenciales();

        await page.goto(urlDe('/auth/login'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.getByLabel('Usuario').fill(usuario);
        await page.getByPlaceholder('Contraseña').fill('contrasena-incorrecta-e2e');

        const [respuesta] = await Promise.all([
            page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST', { timeout: 30_000 }),
            page.getByRole('button', { name: 'Iniciar Sesión' }).click()
        ]);

        // `routes/auth.mjs`: credenciales incorrectas => 401.
        expect(respuesta.status()).toBe(401);

        // `Login.vue` pinta el mensaje del servidor en el bloque de error.
        await expect(page.getByText('Credenciales incorrectas')).toBeVisible();

        // No ha accedido: sigue en el login, con formulario y sin token.
        await expect(page).toHaveURL(/\/auth\/login$/);
        await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();

        const almacen = await page.evaluate(() => ({
            local: localStorage.getItem('token'),
            sesion: sessionStorage.getItem('token')
        }));

        expect(almacen.local).toBeNull();
        expect(almacen.sesion).toBeNull();
    });

    test('inicia sesión con credenciales válidas', async ({ paginaAuth: page }) => {
        const { usuario, password } = credenciales();

        const respuesta = await iniciarSesion(page, { usuario, password });

        // `routes/auth.mjs`: login correcto => 200.
        expect(respuesta.status()).toBe(200);

        await expect(page).toHaveURL(/\/dashboard$/);

        // Estado autenticado visible y atribuido al usuario E2E (`AppFooter.vue`).
        const pie = page.locator('.layout-footer');
        await expect(pie).toContainText('logged in as');
        await expect(pie).toContainText(usuario);

        // Sin marcar «Recordarme», el token va a `sessionStorage` (`Login.vue`).
        const tokenSesion = await page.evaluate(() => sessionStorage.getItem('token'));
        expect(tokenSesion).toBeTruthy();
    });

    test('cierra sesión desde el menú de perfil', async ({ paginaAuth: page }) => {
        const { usuario, password } = credenciales();

        await iniciarSesion(page, { usuario, password });
        await expect(page.locator('.layout-topbar')).toBeVisible();

        // `AppTopbar.vue`: el disparador del menú de perfil está en
        // `.layout-topbar-menu-content` y su `<span>Perfil</span>` se oculta por encima de
        // 991 px (`src/assets/layout/_topbar.scss`), así que no se usa un rol con nombre.
        // Si la ventana es estrecha, ese bloque está oculto y lo muestra el botón de tres
        // puntos (`.layout-topbar-menu-button`).
        const disparadorPerfil = page.locator('.layout-topbar-menu-content button.layout-topbar-action').first();
        const perfilVisibleSinAyuda = await disparadorPerfil.isVisible();

        console.log(`[PERFIL] botón de perfil visible directamente: ${perfilVisibleSinAyuda}`);

        if (!perfilVisibleSinAyuda) {
            await page.locator('.layout-topbar-menu-button').click();
        }

        await expect(disparadorPerfil).toBeVisible();
        await disparadorPerfil.click();

        const tokenAnterior = await page.evaluate(() => sessionStorage.getItem('token') || localStorage.getItem('token'));
        expect(tokenAnterior).toBeTruthy();

        // `AppTopbar.vue`: ítem «Salir» del menú de perfil.
        const [respuestaLogout] = await Promise.all([
            page.waitForResponse((r) => r.url().includes('/api/auth/logout') && r.request().method() === 'POST', { timeout: 30_000 }),
            page.getByText('Salir', { exact: true }).click()
        ]);

        // S-04a: el servidor revoca la versión y el token anterior deja de valer.
        expect(respuestaLogout.status()).toBe(200);
        const baseApi = new URL(process.env.E2E_BASE_URL || 'http://localhost:5173');
        const api = `${baseApi.protocol}//${baseApi.hostname}:3000`;
        const revocada = await fetch(`${api}/api/users`, { headers: { Authorization: `Bearer ${tokenAnterior}` } });
        expect(revocada.status).toBe(401);

        // `useAuth.js`: logout limpia la sesión y hace `router.push('/auth/login')`.
        await expect(page).toHaveURL(/\/auth\/login$/);
        await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();

        const almacen = await page.evaluate(() => ({
            local: localStorage.getItem('token'),
            sesion: sessionStorage.getItem('token')
        }));

        expect(almacen.local).toBeNull();
        expect(almacen.sesion).toBeNull();
    });

    test('una sola instancia de useAuth comparte estado e intervalo (F-54)', async ({ paginaAuth: page }) => {
        const { usuario, password } = credenciales();

        // Instrumenta los temporizadores antes de que cargue la aplicación: se cuentan los
        // intervalos de verificación de sesión, que `useAuth.js` fija en 5 minutos.
        await page.addInitScript(() => {
            window.__timonIntervalos = [];
            const crear = window.setInterval;
            const parar = window.clearInterval;

            window.setInterval = (fn, ms, ...resto) => {
                const id = crear(fn, ms, ...resto);
                window.__timonIntervalos.push({ id, ms, activo: true });
                return id;
            };

            window.clearInterval = (id) => {
                const entrada = window.__timonIntervalos.find((intervalo) => intervalo.id === id);
                if (entrada) entrada.activo = false;
                return parar(id);
            };
        });

        await iniciarSesion(page, { usuario, password });
        await expect(page).toHaveURL(/\/dashboard$/);

        const estado = await page.evaluate(async () => {
            const { useAuth } = await import('/src/composables/useAuth.js');
            const uno = useAuth();
            const otro = useAuth();

            return {
                verificaciones: window.__timonIntervalos.filter((intervalo) => intervalo.ms === 5 * 60 * 1000),
                mismoUsuario: uno.currentUser === otro.currentUser,
                mismaAutenticacion: uno.isAuthenticated === otro.isAuthenticated,
                usuarioCargado: uno.currentUser.value?.username ?? null
            };
        });

        // Un único intervalo de verificación, aunque el layout invoque useAuth varias veces.
        expect(estado.verificaciones).toHaveLength(1);
        expect(estado.verificaciones.filter((intervalo) => intervalo.activo)).toHaveLength(1);

        // Un único estado: las dos invocaciones devuelven el mismo `ref` y la misma sesión.
        expect(estado.mismoUsuario).toBe(true);
        expect(estado.mismaAutenticacion).toBe(true);
        expect(estado.usuarioCargado).toBe(usuario);

        // El logout cierra el intervalo y deja los almacenes vacíos.
        await page.evaluate(async () => {
            const { useAuth } = await import('/src/composables/useAuth.js');
            await useAuth().logout();
        });

        await expect(page).toHaveURL(/\/auth\/login$/);

        const cierre = await page.evaluate(() => ({
            activos: window.__timonIntervalos.filter((intervalo) => intervalo.ms === 5 * 60 * 1000 && intervalo.activo).length,
            local: localStorage.getItem('token'),
            sesion: sessionStorage.getItem('token')
        }));

        expect(cierre.activos).toBe(0);
        expect(cierre.local).toBeNull();
        expect(cierre.sesion).toBeNull();
    });
});
