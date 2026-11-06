/**
 * Utilidades de la suite E2E de Timón.
 * ====================================
 *
 * Todas las funciones reciben una `page` ya abierta por un fixture de
 * `tests/fixtures.mjs`: la suite no crea contextos aquí, solo navega e interactúa.
 *
 * Deducciones de la interfaz (ver comentarios de cada función):
 * - `src/views/pages/auth/Login.vue`: `InputText id="username"` con `<label for="username">`
 *   y `<Password placeholder="Contraseña">`. El `id="password1"` del componente Password
 *   acaba en el `<div>` envolvente (PrimeVue 4, `inheritAttrs: false` + `ptmi('root')`), no
 *   en el `<input>`, así que la contraseña se localiza por su `placeholder`.
 * - `src/router/index.js`: `/auth/login`, `/dashboard` y `/pages/categories`; el guard
 *   exige `token` en `localStorage` o `sessionStorage`.
 * - `src/layout/AppFooter.vue`: muestra `logged in as <usuario>` con sesión iniciada.
 * - `src/views/pages/Categories.vue`: toolbar `Nueva`, diálogo `Detalle de la categoría`,
 *   botones `Cancel`/`Save`, tabla `DataTable` y diálogo `Confirm` con `No`/`Yes`.
 */
import { expect } from '@playwright/test';

import { credenciales, urlDe } from '../../scripts/entorno.mjs';

export { expect, credenciales, urlDe };

/** Formato exacto de los nombres que crea esta suite. */
export const PATRON_CATEGORIA_E2E = /^e2e_categoria_\d{8}_\d{6}$/;

/** `categorias.nombre` es `varchar(30)` (migración 0001_baseline.sql). */
const LONGITUD_MAXIMA_NOMBRE_CATEGORIA = 30;

/** Nombres ya entregados en esta ejecución, para no repetirlos. */
const nombresUsados = new Set();

/**
 * Nombre único con el formato exacto `e2e_categoria_AAAAMMDD_HHMMSS` (29 caracteres).
 * Si el segundo actual ya se usó, espera al siguiente para no colisionar.
 */
export async function nombreCategoriaUnico() {
    for (;;) {
        const ahora = new Date();
        const dos = (numero) => String(numero).padStart(2, '0');
        const fecha = `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}`;
        const hora = `${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`;
        const nombre = `e2e_categoria_${fecha}_${hora}`;

        if (nombre.length > LONGITUD_MAXIMA_NOMBRE_CATEGORIA) {
            throw new Error(`El nombre E2E «${nombre}» supera ${LONGITUD_MAXIMA_NOMBRE_CATEGORIA} caracteres`);
        }

        if (!nombresUsados.has(nombre)) {
            nombresUsados.add(nombre);
            return nombre;
        }

        await new Promise((resolver) => setTimeout(resolver, 1000));
    }
}

/** ¿Hay sesión iniciada en esta página? (pie con `logged in as` y URL de la app). */
export async function haySesion(page) {
    if (page.url().includes('/auth/login')) return false;

    return await page
        .locator('.layout-footer')
        .filter({ hasText: 'logged in as' })
        .isVisible()
        .catch(() => false);
}

/**
 * Inicia sesión desde el formulario y espera al dashboard.
 *
 * La espera de la respuesta del `POST /api/auth/login` usa un timeout explícito amplio
 * (la primera navegación de un contexto nuevo puede tardar) y después se comprueba la URL
 * y el pie de página, no solo la ausencia de error.
 */
export async function iniciarSesion(page, { usuario, password } = credenciales()) {
    await page.goto(urlDe('/auth/login'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.getByLabel('Usuario')).toBeVisible();

    await page.getByLabel('Usuario').fill(usuario);
    await page.getByPlaceholder('Contraseña').fill(password);

    const [respuesta] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST', { timeout: 30_000 }),
        page.getByRole('button', { name: 'Iniciar Sesión' }).click()
    ]);

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });

    return respuesta;
}

/**
 * Garantiza que la página tiene sesión, sin repetir el login si ya la tiene.
 *
 * Navega una sola vez a `/dashboard`: si el guard redirige a `/auth/login`, hace login;
 * si el pie muestra la sesión, no hace nada.
 */
export async function asegurarSesion(page, credencialesUsuario = credenciales()) {
    await page.goto(urlDe('/dashboard'), { waitUntil: 'domcontentloaded', timeout: 45_000 });

    if (await haySesion(page)) {
        return { loginHecho: false };
    }

    const respuesta = await iniciarSesion(page, credencialesUsuario);

    if (respuesta.status() !== 200) {
        throw new Error(`Login fallido con estado ${respuesta.status()}`);
    }

    await expect(page.locator('.layout-footer')).toContainText('logged in as');

    return { loginHecho: true, usuario: credencialesUsuario.usuario };
}

/**
 * Abre la gestión de categorías y espera a que la tabla esté disponible.
 *
 * No se espera la respuesta `GET /api/categorias`: en un contexto recién creado la
 * primera navegación puede tardar más que el `actionTimeout` de la acción, y atar la
 * espera a la respuesta de red produjo fallos prematuros. Se espera el DOM, que es lo que
 * usa la aserción.
 */
export async function abrirCategorias(page) {
    await page.goto(urlDe('/pages/categories'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Nueva' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
}

/** Diálogo de alta y edición (`src/views/pages/Categories.vue`). */
export function dialogoCategoria(page) {
    return page.getByRole('dialog', { name: 'Detalle de la categoría' });
}

/**
 * Fila de la tabla que contiene el nombre indicado.
 *
 * La tabla es un `DataTable` de PrimeVue (`table` nativo con `tbody tr`). Se compara sin
 * distinguir mayúsculas porque el servidor guarda el nombre en minúsculas (DC-31) y
 * `fetchCategories()` muestra la primera letra en mayúscula.
 */
export function filaCategoria(page, nombre) {
    return page.locator('table tbody tr').filter({ hasText: new RegExp(nombre, 'i') });
}

/** Nombres de la primera columna de la tabla, normalizados a minúsculas. */
export async function nombresEnTabla(page) {
    await expect(page.getByRole('table')).toBeVisible();

    const textos = await page.locator('table tbody tr td:first-child').allInnerTexts();

    return textos.map((texto) => texto.trim().toLowerCase()).filter(Boolean);
}

/** Nombres de la tabla que siguen el formato exacto de la suite. */
export async function categoriasE2EEnTabla(page) {
    const nombres = await nombresEnTabla(page);

    return nombres.filter((nombre) => PATRON_CATEGORIA_E2E.test(nombre));
}

/**
 * Crea una categoría desde la interfaz y devuelve la respuesta del `POST /api/categorias`.
 *
 * Selectores (`Categories.vue`): botón `Nueva` de la toolbar, campo `Nombre` del diálogo
 * (`InputText id="nombre"` con `<label for="nombre">`) y botón `Save` del pie.
 */
export async function crearCategoria(page, nombre) {
    await page.getByRole('button', { name: 'Nueva' }).click();

    const dialogo = dialogoCategoria(page);
    await expect(dialogo).toBeVisible();

    await dialogo.getByLabel('Nombre').fill(nombre);

    const [respuesta] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/categorias') && r.request().method() === 'POST', { timeout: 30_000 }),
        dialogo.getByRole('button', { name: 'Save' }).click()
    ]);

    return respuesta;
}

/**
 * Borra una categoría concreta desde la interfaz. Devuelve la respuesta del
 * `DELETE /api/categorias`, o `null` si esa categoría no está en la tabla.
 *
 * La papelera se localiza por su icono de PrimeIcons (`pi-trash`, clase propia de la
 * librería, no CSS generado) dentro de la fila del nombre exacto; la confirmación es el
 * diálogo `Confirm` con botón `Yes`.
 */
export async function eliminarCategoria(page, nombre) {
    const fila = filaCategoria(page, nombre);

    if ((await fila.count()) === 0) return null;

    await fila.first().locator('button:has(.pi-trash)').click();

    const confirmacion = page.getByRole('dialog', { name: 'Confirm' });
    await expect(confirmacion).toBeVisible();

    const [respuesta] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/categorias') && r.request().method() === 'DELETE', { timeout: 30_000 }),
        confirmacion.getByRole('button', { name: 'Yes' }).click()
    ]);

    return respuesta;
}
