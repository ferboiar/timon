/**
 * Autenticación: sesión caducada (S-17).
 * =====================================
 *
 * Deducciones:
 * - `src/router/index.js` (guard `beforeEach`, hacia la línea 235): lee el token de
 *   `localStorage` o `sessionStorage`; si la ruta no es pública y `/api/auth/verify` no
 *   responde `ok`, limpia `token` y `user` de los dos almacenes y hace `next('/auth/login')`.
 * - `backend/src/routes/auth.mjs`: `GET /api/auth/verify` responde 401 con
 *   `{ message: 'Token inválido o expirado' }` cuando `jwt.verify` falla (S-16).
 * - `src/config/api.js`: su interceptor de respuesta hace `logout()` ante un 401 con ese
 *   mensaje, pero ningún módulo importa `apiClient` (S-07), así que en la aplicación el
 *   cierre lo ejecuta el guard. Este spec documenta lo que ocurre de verdad.
 * - `src/views/pages/auth/Login.vue`: no hay aviso de caducidad; solo el subtítulo
 *   «Inicia sesión para continuar» (U-16).
 *
 * El token se construye en el navegador con `exp` en el pasado: el servidor lo rechaza por
 * firma y por caducidad. No se crea ni se borra ningún dato de la aplicación.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { urlDe } from './helpers/timon.mjs';

const RUTA_PROTEGIDA = '/pages/bills';

/** JWT con `exp` en el pasado y firma no válida: el servidor responde 401. */
function tokenCaducado() {
    const base64url = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
    const cabecera = base64url({ alg: 'HS256', typ: 'JWT' });
    const cuerpo = base64url({ id: 0, username: 'e2e_caducado', rol: 'user', iat: 1_600_000_000, exp: 1_600_000_060 });

    return `${cabecera}.${cuerpo}.firma-no-valida-e2e`;
}

/** Deja una sesión caducada en el almacén indicado. */
async function sembrarSesion(page, almacen) {
    await page.goto(urlDe('/auth/login'), { waitUntil: 'domcontentloaded', timeout: 45_000 });

    await page.evaluate(
        ({ almacen, token }) => {
            const destino = almacen === 'session' ? sessionStorage : localStorage;
            destino.setItem('token', token);
            destino.setItem('user', JSON.stringify({ id: 0, username: 'e2e_caducado', rol: 'user' }));
        },
        { almacen, token: tokenCaducado() }
    );
}

/** Estado de los dos almacenes del navegador. */
function almacenes(page) {
    return page.evaluate(() => ({
        localToken: localStorage.getItem('token'),
        localUser: localStorage.getItem('user'),
        sessionToken: sessionStorage.getItem('token'),
        sessionUser: sessionStorage.getItem('user')
    }));
}

/** Recoge las respuestas de `/api/auth/verify` que provoca el guard al entrar en la ruta. */
function observarVerificacion(page) {
    const respuestas = [];

    page.on('response', (respuesta) => {
        if (respuesta.url().includes('/api/auth/verify')) respuestas.push(respuesta);
    });

    return respuestas;
}

/** Comprueba el cierre de sesión completo tras caducar el token. */
async function comprobarCaducidad(page) {
    await expect(page).toHaveURL(/\/auth\/login$/, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();

    // La sesión queda limpia en los dos almacenes
    expect(await almacenes(page)).toEqual({ localToken: null, localUser: null, sessionToken: null, sessionUser: null });

    // El usuario ve la pantalla de login, sin el texto técnico del servidor
    const texto = await page.locator('body').innerText();

    expect(texto).toContain('Inicia sesión para continuar');
    expect(texto).not.toContain('Token inválido o expirado');
    expect(texto).not.toContain('undefined');
}

test.describe('Autenticación: sesión caducada (S-17)', () => {
    test.afterEach(async ({ paginaAuth: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo al caducar la sesión');
        }
    });

    test('un token caducado en localStorage lleva al login y limpia la sesión', async ({ paginaAuth: page }) => {
        await sembrarSesion(page, 'local');

        // El guard llama a /api/auth/verify al entrar en la ruta protegida
        const respuestas = observarVerificacion(page);

        await page.goto(urlDe(RUTA_PROTEGIDA), { waitUntil: 'domcontentloaded', timeout: 45_000 });

        await comprobarCaducidad(page);

        // S-16: token inválido o caducado => 401, no 403
        await expect.poll(() => respuestas.length, { timeout: 15_000 }).toBeGreaterThan(0);
        expect(respuestas[0].status()).toBe(401);
        expect((await respuestas[0].json()).message).toBe('Token inválido o expirado');
    });

    test('un token caducado en sessionStorage se comporta igual', async ({ paginaAuth: page }) => {
        await sembrarSesion(page, 'session');

        const respuestas = observarVerificacion(page);

        await page.goto(urlDe(RUTA_PROTEGIDA), { waitUntil: 'domcontentloaded', timeout: 45_000 });

        await comprobarCaducidad(page);

        await expect.poll(() => respuestas.length, { timeout: 15_000 }).toBeGreaterThan(0);
        expect(respuestas[0].status()).toBe(401);
    });
});
