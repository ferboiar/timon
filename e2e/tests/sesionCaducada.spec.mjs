/**
 * Autenticación: sesión caducada (S-17).
 * =====================================
 *
 * Deducciones:
 * - `src/router/index.js` (guard `beforeEach`, hacia la línea 235): lee el token de
 *   `localStorage` o `sessionStorage`; si la ruta no es pública y `/api/auth/verify` no
 *   responde `ok`, limpia `token` y `user` de los dos almacenes y lleva a
 *   `/auth/login?motivo=caducada` (`rutaLoginPorCaducidad`).
 * - `backend/src/routes/auth.mjs`: `GET /api/auth/verify` responde 401 con
 *   `{ message: 'Token inválido o expirado' }` cuando `jwt.verify` falla (S-16).
 * - `src/config/api.js`: su interceptor de respuesta cierra la sesión ante un 401 con ese
 *   mensaje; desde S-07 los nueve servicios usan `apiClient`, así que el interceptor también
 *   actúa (tercer caso).
 * - `src/views/pages/auth/Login.vue`: muestra «Tu sesión ha caducado. Vuelve a iniciar sesión.»
 *   leyendo `motivo=caducada` o la marca de `sessionStorage`, que se consume una sola vez
 *   (U-16, U-19).
 *
 * El token se construye en el navegador con `exp` en el pasado: el servidor lo rechaza por
 * firma y por caducidad. No se crea ni se borra ningún dato de la aplicación.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { iniciarSesion, urlDe } from './helpers/timon.mjs';

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
    // Se siembra desde una ruta pública sin el componente Login: montarlo con el token ya
    // escrito haría que su verificación lo borrase antes de navegar a la ruta protegida.
    await page.goto(urlDe('/pages/notfound'), { waitUntil: 'domcontentloaded', timeout: 45_000 });

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
async function comprobarCaducidad(page, { exigirAviso = true } = {}) {
    await expect(page).toHaveURL(/\/auth\/login(\?|$)/, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();

    if (exigirAviso) {
        // U-16: el aviso puede aparecer tras el primer render; si no, una recarga lo repinta
        // (la marca de caducidad vive en sessionStorage y sobrevive a la recarga).
        const aviso = page.getByText('Tu sesión ha caducado. Vuelve a iniciar sesión.');

        try {
            await expect(aviso).toBeVisible({ timeout: 10_000 });
        } catch {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
            await expect(aviso).toBeVisible({ timeout: 10_000 });
        }
    }

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

        await page.goto(urlDe(RUTA_PROTEGIDA), { waitUntil: 'domcontentloaded', timeout: 45_000 });

        // Este caso comprueba la redirección y la limpieza de los dos almacenes. El 401 del
        // guard y el aviso visual se verifican en el caso de localStorage y en el del interceptor.
        await comprobarCaducidad(page, { exigirAviso: false });
    });

    test('el interceptor de apiClient avisa de la caducidad al recibir un 401 (S-07, U-16)', async ({ paginaAuth: page }) => {
        await iniciarSesion(page);
        await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Actualizar' })).toBeVisible();

        const respuestas401 = [];
        page.on('response', (respuesta) => {
            if (new URL(respuesta.url()).pathname.startsWith('/api/') && respuesta.status() === 401) respuestas401.push(respuesta);
        });

        // Se sustituye el token y se hace una petición real del servicio, que pasa por apiClient
        await page
            .evaluate(async (token) => {
                if (localStorage.getItem('token')) localStorage.setItem('token', token);
                if (sessionStorage.getItem('token')) sessionStorage.setItem('token', token);
                const { BillService } = await import('/src/service/BillService.js');
                await BillService.getBills().catch(() => {});
            }, tokenCaducado())
            .catch(() => {});

        // El interceptor limpia la sesión y lleva al login con el aviso
        await expect(page).toHaveURL(/\/auth\/login(\?|$)/, { timeout: 30_000 });
        await expect(page.getByText('Tu sesión ha caducado. Vuelve a iniciar sesión.')).toBeVisible({ timeout: 20_000 });
        await expect.poll(() => respuestas401.length, { timeout: 15_000 }).toBeGreaterThan(0);
    });

    test('el aviso de caducidad se consume una sola vez (U-16, U-19)', async ({ paginaAuth: page }) => {
        await sembrarSesion(page, 'local');
        await page.goto(urlDe(RUTA_PROTEGIDA), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await comprobarCaducidad(page);

        const aviso = page.getByText('Tu sesión ha caducado. Vuelve a iniciar sesión.');
        await expect(aviso).toBeVisible();

        // Volver al login sin el motivo ni la marca: ya se consumió en el primer montaje
        await page.goto(urlDe('/auth/login'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();
        await expect(aviso).toBeHidden();
    });
});
