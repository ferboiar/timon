/**
 * Cambio de la propia contraseña desde Ajustes › Usuarios (S-04a).
 * =================================================================
 *
 * Cubre el flujo que no existía en la suite: un administrador desechable creado por API
 * inicia sesión, cambia su propia contraseña desde `ProfileSettings.vue`, recibe un token
 * nuevo (`replaceToken`), mantiene la sesión y el token anterior queda revocado.
 *
 * Deducciones:
 * - `src/views/pages/ProfileSettings.vue`: pestaña «Usuarios», botón `pi-key` por fila y
 *   diálogo «Cambiar contraseña (<usuario>)» con dos `Password` y «Guardar».
 * - `backend/src/routes/users.mjs`: `PUT /api/users/password` exige administrador y devuelve
 *   `token` cuando el cambio es de la propia cuenta.
 * - `src/composables/useAuth.js`: `replaceToken` sustituye el token guardado.
 * - `backend/src/utils/sesion.mjs`: el token anterior deja de valer por `token_version`.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { abrirAjustes, cambiarPasswordPropia, contrasenaDeUsuario, crearUsuarioApi, eliminarUsuarioApi, emailDeUsuario, iniciarSesion, nombreUsuarioUnico, tokenDePagina, urlDe, urlDeApi } from './helpers/timon.mjs';

test.describe('Cambio de la propia contraseña (S-04a)', () => {
    /** Usuario desechable de esta ejecución. */
    let usuario = null;
    let contrasena = null;
    let contrasenaNueva = null;

    test.afterEach(async ({ paginaAuth: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo al cambiar la propia contraseña');
        }
    });

    test.afterAll(async ({ paginaSesion: page }) => {
        if (!usuario) return;

        try {
            const respuesta = await eliminarUsuarioApi(page, usuario.id);

            if (respuesta.status() === 200) {
                console.log(`[LIMPIEZA] Eliminado: ${usuario.username}`);
            } else {
                console.warn(`[LIMPIEZA] Queda sin eliminar: ${usuario.username} (HTTP ${respuesta.status()})`);
            }
        } catch (error) {
            console.warn(`[LIMPIEZA] Queda sin eliminar: ${usuario.username} (${error.message.split('\n')[0]})`);
        }
    });

    test('cambia la propia contraseña, conserva la sesión y revoca el token anterior', async ({ paginaSesion: adminPage, paginaAuth: page }) => {
        const nombre = await nombreUsuarioUnico('e2e_usuario_pwd');
        const email = emailDeUsuario(nombre);
        contrasena = contrasenaDeUsuario(nombre);
        contrasenaNueva = `Nueva_${nombre.slice(-6)}!aB3`;

        const creada = await crearUsuarioApi(adminPage, { username: nombre, email, password: contrasena, rol: 'admin' });
        const cuerpoAlta = await creada.json().catch(() => null);

        if (creada.status() !== 201 || !cuerpoAlta?.id) {
            throw new Error(`No se pudo crear el usuario desechable: HTTP ${creada.status()} ${JSON.stringify(cuerpoAlta)}`);
        }

        usuario = { id: cuerpoAlta.id, username: nombre };
        console.log(`[CREADO] ${nombre}`);

        await iniciarSesion(page, { usuario: nombre, password: contrasena });
        const tokenAntiguo = await tokenDePagina(page);
        expect(tokenAntiguo).toBeTruthy();

        await abrirAjustes(page, 'Usuarios');
        const { respuesta } = await cambiarPasswordPropia(page, nombre, contrasenaNueva);

        expect(respuesta.status()).toBe(200);
        const cuerpoCambio = await respuesta.json().catch(() => null);
        expect(cuerpoCambio?.token).toBeTruthy();

        const tokenNuevo = await tokenDePagina(page);
        expect(tokenNuevo).toBeTruthy();
        expect(tokenNuevo).not.toBe(tokenAntiguo);
        expect(tokenNuevo).toBe(cuerpoCambio.token);

        const verificacion = await page.request.get(`${urlDeApi()}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${tokenNuevo}` }
        });
        expect(verificacion.status()).toBe(200);

        const revocado = await page.request.get(`${urlDeApi()}/api/users`, {
            headers: { Authorization: `Bearer ${tokenAntiguo}` }
        });
        expect(revocado.status()).toBe(401);

        // La sesión sigue activa con el token nuevo en la interfaz.
        await page.goto(urlDe('/dashboard'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.locator('.layout-topbar')).toBeVisible({ timeout: 20_000 });
    });
});
