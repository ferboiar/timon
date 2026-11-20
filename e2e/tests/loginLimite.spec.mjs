/**
 * S-04b (DC-63): límite de intentos en /api/auth/login.
 *
 * Usa `paginaAuth` (contexto aislado) y un usuario inexistente y único por ejecución:
 * así no bloquea la cuenta E2E real y la clave IP+usuario no afecta a otros specs.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { credenciales, iniciarSesion, urlDe } from './helpers/timon.mjs';

const MENSAJE_LIMITE = 'Demasiados intentos de inicio de sesión';

test.describe('Límite de intentos de login', () => {
    test.afterEach(async ({ paginaAuth: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el límite de intentos');
        }
    });

    test('responde 429 tras cinco fallos y no bloquea a otro usuario', async ({ paginaAuth: page }) => {
        const usuarioInexistente = `e2e_limite_${Date.now()}`;

        await page.goto(urlDe('/auth/login'), { waitUntil: 'domcontentloaded', timeout: 45_000 });

        const intentar = async (password) => {
            await page.getByLabel('Usuario').fill(usuarioInexistente);
            await page.getByPlaceholder('Contraseña').fill(password);

            const [respuesta] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST', { timeout: 30_000 }), page.getByRole('button', { name: 'Iniciar Sesión' }).click()]);

            return respuesta;
        };

        for (let intento = 1; intento <= 5; intento += 1) {
            const respuesta = await intentar('contrasena-incorrecta-e2e');
            expect(respuesta.status(), `intento ${intento}`).toBe(401);
        }

        const bloqueada = await intentar('contrasena-incorrecta-e2e');
        expect(bloqueada.status()).toBe(429);
        await expect(page.getByText(MENSAJE_LIMITE)).toBeVisible();

        // La clave es IP+usuario: el usuario legítimo de la suite sigue pudiendo entrar.
        await iniciarSesion(page, credenciales());
        await expect(page).toHaveURL(/\/dashboard$/);
    });
});
