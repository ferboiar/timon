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
 *   botones `Cancelar`/`Guardar`, tabla `DataTable` y diálogo `Confirmar` con `No`/`Sí`.
 */
import { errors, expect } from '@playwright/test';

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
    // 20 s, como el resto del fichero: los 5 s por defecto son demasiado justos para el
    // primer pintado del formulario en un contexto nuevo bajo carga (fallo visto en
    // sesionCaducada: «element(s) not found», Timeout 5000ms).
    await expect(page.getByLabel('Usuario')).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('Usuario').fill(usuario);
    await page.getByPlaceholder('Contraseña').fill(password);

    const [respuesta] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST', { timeout: 30_000 }), page.getByRole('button', { name: 'Iniciar Sesión' }).click()]);

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
 * Revalida la sesión de la página y la rehace si el token ya no vale.
 *
 * `auth.spec.mjs` cierra sesión y el servidor incrementa `users.token_version` (S-04a, DC-62):
 * la pestaña compartida del worker sigue abierta, pero su token queda revocado y el guard la
 * manda al login. Se valida con `GET /api/auth/verify` desde Node, sin navegar si responde 200
 * (~5 ms), y solo se limpia el almacenamiento y se inicia sesión una vez cuando no hay token o
 * responde 401.
 */
export async function asegurarSesionViva(page, credencialesUsuario = credenciales()) {
    const token = await tokenDePagina(page);
    let valido = false;

    if (token) {
        try {
            const respuesta = await fetch(`${urlDeApi()}/api/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` },
                // Sin límite, una conexión colgada bloquearía el hook que pide `paginaSesion`.
                signal: AbortSignal.timeout(5_000)
            });
            valido = respuesta.ok;
        } catch (error) {
            // Un fallo de red no demuestra que el token esté revocado; el login de abajo lo resuelve o falla claro.
            valido = false;
        }
    }

    if (valido) return { loginHecho: false };

    await page
        .evaluate(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
        })
        .catch(() => {});

    const respuesta = await iniciarSesion(page, credencialesUsuario);

    if (respuesta.status() !== 200) {
        throw new Error(`Login fallido con estado ${respuesta.status()}`);
    }

    await expect(page.locator('.layout-footer')).toContainText('logged in as');

    return { loginHecho: true };
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
 * (`InputText id="nombre"` con `<label for="nombre">`) y botón `Guardar` del pie.
 */
export async function crearCategoria(page, nombre) {
    await page.getByRole('button', { name: 'Nueva' }).click();

    const dialogo = dialogoCategoria(page);
    await expect(dialogo).toBeVisible();

    await dialogo.getByLabel('Nombre').fill(nombre);

    const [respuesta] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/categorias') && r.request().method() === 'POST', { timeout: 30_000 }), dialogo.getByRole('button', { name: 'Guardar' }).click()]);

    return respuesta;
}

/**
 * Borra una categoría concreta desde la interfaz. Devuelve la respuesta del
 * `DELETE /api/categorias`, o `null` si esa categoría no está en la tabla.
 *
 * La papelera se localiza por su icono de PrimeIcons (`pi-trash`, clase propia de la
 * librería, no CSS generado) dentro de la fila del nombre exacto; la confirmación es el
 * diálogo `Confirmar` con botón `Sí`.
 */
export async function eliminarCategoria(page, nombre) {
    const fila = filaCategoria(page, nombre);

    if ((await fila.count()) === 0) return null;

    await fila.first().locator('button:has(.pi-trash)').click();

    const confirmacion = page.getByRole('dialog', { name: 'Confirmar' });
    await expect(confirmacion).toBeVisible();

    const [respuesta] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/categorias') && r.request().method() === 'DELETE', { timeout: 30_000 }), confirmacion.getByRole('button', { name: 'Sí' }).click()]);

    return respuesta;
}

/**
 * Ajustes (/settings) — F-48.
 * ===========================
 *
 * Deducciones:
 * - `src/router/index.js`: ruta `/settings`, componente `ProfileSettings.vue`.
 * - `ProfileSettings.vue`: `Tabs` con `Tab value="general|usuarios|Estilo|recibos|db"`; el texto
 *   visible es «General», «Usuarios», «Aspecto», «Administrar recibos» y «Base de Datos».
 * - Pestaña Base de Datos: `InputText id="db-host|db-port|db-user|db-database"`, `Password`
 *   `id="db-password"` y botones «Probar», «Guardar» y «Restaurar».
 * - Pestaña Usuarios: toolbar con «Nuevo», `DataTable` (columnas Usuario, Correo, Rol) y, en
 *   cada fila, botones `pi-pencil`, `pi-key` y `pi-trash`; el diálogo de alta es
 *   «Detalle del usuario» con `#username`, `#password`, `#email`, `#rol` y «Cancelar»/«Guardar».
 * - Los toasts de error usan `role="alert"` (PrimeVue Toast).
 *
 * Formato de los usuarios de prueba: `e2e_usuario_AAAAMMDD_HHMMSS` (26 caracteres;
 * `users.username` es `varchar(50)` y `users.email`, `varchar(100)`).
 */

/** Formato exacto de los usuarios que crea esta suite. */
export const PATRON_USUARIO_E2E = /^e2e_usuario_\d{8}_\d{6}$/;

/** `users.username` es `varchar(50)` (migración 0001_baseline.sql). */
const LONGITUD_MAXIMA_USUARIO = 50;

/** Nombres de usuario ya entregados en esta ejecución. */
const usuariosUsados = new Set();

/**
 * Nombre de usuario único con el formato exacto `e2e_usuario_AAAAMMDD_HHMMSS` (26 caracteres).
 */
export async function nombreUsuarioUnico(prefijo = 'e2e_usuario') {
    for (;;) {
        const ahora = new Date();
        const dos = (numero) => String(numero).padStart(2, '0');
        const fecha = `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}`;
        const hora = `${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`;
        const nombre = `${prefijo}_${fecha}_${hora}`;

        if (nombre.length > LONGITUD_MAXIMA_USUARIO) {
            throw new Error(`El usuario E2E «${nombre}» supera ${LONGITUD_MAXIMA_USUARIO} caracteres`);
        }

        if (!usuariosUsados.has(nombre)) {
            usuariosUsados.add(nombre);
            return nombre;
        }

        await new Promise((resolver) => setTimeout(resolver, 1000));
    }
}

/** Correo del usuario de prueba, con el dominio reservado `.invalid` (39 caracteres). */
export function emailDeUsuario(nombre) {
    return `${nombre}@e2e.invalid`;
}

/** Contraseña de un solo uso para el usuario de prueba. */
export function contrasenaDeUsuario(nombre) {
    return `E2e_${nombre.slice(-6)}!aB3`;
}

/** URL de la API vista desde el proceso que ejecuta Playwright (no desde el Edge remoto). */
export function urlDeApi() {
    return process.env.E2E_API_URL || 'http://localhost:3000';
}

/** Token guardado por la sesión actual, en cualquiera de los dos almacenes. */
export async function tokenDePagina(page) {
    return page.evaluate(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
}

/** Crea un usuario por API con la sesión de administrador de la página indicada. */
export async function crearUsuarioApi(page, datos) {
    const token = await tokenDePagina(page);

    if (!token) throw new Error('No hay token de administrador para crear el usuario');

    return page.request.post(`${urlDeApi()}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
        data: datos
    });
}

/** Borra un usuario por API con la sesión de administrador de la página indicada. */
export async function eliminarUsuarioApi(page, id) {
    const token = await tokenDePagina(page);

    if (!token) throw new Error('No hay token de administrador para borrar el usuario');

    return page.request.delete(`${urlDeApi()}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { userIds: [id] }
    });
}

/** Abre el diálogo de cambio de contraseña de la fila indicada. */
export async function abrirDialogoPasswordPropia(page, nombre) {
    const fila = filaUsuario(page, nombre);
    await expect(fila).toHaveCount(1);
    await fila.first().locator('button:has(.pi-key)').click();

    const dialogo = page.getByRole('dialog', { name: `Cambiar contraseña (${nombre})` });
    await expect(dialogo).toBeVisible();

    return dialogo;
}

/** Cambia la contraseña desde el diálogo propio y devuelve la respuesta del PUT. */
export async function cambiarPasswordPropia(page, nombre, password) {
    const dialogo = await abrirDialogoPasswordPropia(page, nombre);
    const campos = dialogo.locator('input[type="password"]');

    await expect(campos).toHaveCount(2);
    await campos.nth(0).fill(password);
    await campos.nth(1).fill(password);

    const guardar = dialogo.getByRole('button', { name: 'Guardar' });
    await expect(guardar).toBeEnabled();

    const [respuesta] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/users/password') && r.request().method() === 'PUT', { timeout: 30_000 }), guardar.click()]);

    return { respuesta, dialogo };
}

/** Abre `/settings` y, si se indica, activa una pestaña concreta. */
export async function abrirAjustes(page, pestana = null) {
    await page.goto(urlDe('/settings'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.getByRole('tab').first()).toBeVisible();

    if (pestana) await irAPestana(page, pestana);
}

/** Activa una pestaña de Ajustes por su texto visible y comprueba que queda seleccionada. */
export async function irAPestana(page, nombre) {
    const pestana = page.getByRole('tab', { name: nombre, exact: true });
    await pestana.click();
    await expect(pestana).toHaveAttribute('aria-selected', 'true');
}

/** Diálogo de alta y edición de usuario. */
export function dialogoUsuario(page) {
    return page.getByRole('dialog', { name: 'Detalle del usuario' });
}

/** Fila de la tabla de usuarios que contiene el nombre indicado. */
export function filaUsuario(page, nombre) {
    return page.locator('table tbody tr').filter({ hasText: nombre });
}

/**
 * Da de alta un usuario desde la interfaz y devuelve la respuesta del `POST /api/users`.
 * El rol lo pone la pantalla (`user`) al abrir el diálogo de alta.
 */
export async function crearUsuario(page, { username, email, password }) {
    await page.getByRole('button', { name: 'Nuevo' }).click();

    const dialogo = dialogoUsuario(page);
    await expect(dialogo).toBeVisible();

    await dialogo.locator('#username').fill(username);
    await dialogo.locator('input[type="password"]').first().fill(password);
    await dialogo.locator('#email').fill(email);

    const [respuesta] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/users') && r.request().method() === 'POST', { timeout: 30_000 }), dialogo.getByRole('button', { name: 'Guardar' }).click()]);

    return respuesta;
}

/** Cierra el diálogo de usuario sin guardar, si sigue abierto. */
export async function cerrarDialogoUsuario(page) {
    const dialogo = dialogoUsuario(page);

    if (await dialogo.isVisible()) {
        await dialogo.getByRole('button', { name: 'Cancelar' }).click();
        await expect(dialogo).toBeHidden();
    }
}

/**
 * Borra un usuario concreto desde la interfaz. Devuelve la respuesta del
 * `DELETE /api/users`, o `null` si ese usuario no está en la tabla.
 */
export async function eliminarUsuario(page, nombre) {
    const fila = filaUsuario(page, nombre);

    if ((await fila.count()) === 0) return null;

    await fila.first().locator('button:has(.pi-trash)').click();

    const confirmacion = page.getByRole('dialog', { name: 'Confirmar' });
    await expect(confirmacion).toBeVisible();

    const [respuesta] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/users') && r.request().method() === 'DELETE', { timeout: 30_000 }), confirmacion.getByRole('button', { name: 'Sí' }).click()]);

    return respuesta;
}

/**
 * Filtra por el concepto la tabla de una tarjeta de Recibos usando su buscador global.
 *
 * Las tarjetas de Recibos paginan de 8 en 8 y ordenan por fecha, así que un recibo con fecha de
 * diciembre puede caer en la segunda página y no estar en el DOM. El buscador de la tarjeta lo
 * deja en la primera. `contenedor` puede ser la página (primera tarjeta) o una tarjeta concreta.
 */
export async function filtrarPorBuscador(contenedor, concepto) {
    const buscador = contenedor.locator('input[placeholder="Buscar..."]').first();
    await expect(buscador).toBeVisible({ timeout: 20_000 });
    await buscador.fill(concepto);
}

/** Abre /pages/accounts y espera la tabla de cuentas. */
export async function abrirCuentas(page) {
    await page.goto(urlDe('/pages/accounts'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Nueva' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
}

/** Fila de la tabla de cuentas que contiene el nombre indicado. */
export function filaCuenta(page, nombre) {
    return page.locator('table tbody tr').filter({ hasText: new RegExp(nombre, 'i') });
}

/**
 * Borra una cuenta desde la interfaz. Devuelve la respuesta del DELETE /api/cuentas,
 * o null si la cuenta no está en la tabla.
 *
 * Antes de concluir que no está, se espera la fila concreta: la tabla se repinta al cargar
 * las cuentas y `count()` puede ejecutarse antes de ese repintado (F-57). El plazo es el
 * mismo que el resto de esperas del fichero para el primer pintado. Solo un timeout justifica
 * devolver null; cualquier otro fallo del `waitFor` se propaga.
 */
export async function eliminarCuenta(page, nombre) {
    const fila = filaCuenta(page, nombre);

    try {
        await fila.first().waitFor({ state: 'visible', timeout: 20_000 });
    } catch (error) {
        if (error instanceof errors.TimeoutError) return null;

        throw error;
    }

    await fila.first().locator('button:has(.pi-trash)').click();

    const confirmacion = page.getByRole('dialog', { name: 'Confirmar' });
    await expect(confirmacion).toBeVisible();

    const [respuesta] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/cuentas') && r.request().method() === 'DELETE', { timeout: 30_000 }), confirmacion.getByRole('button', { name: 'Sí' }).click()]);

    return respuesta;
}
