/**
 * Usuarios: mensajes de error (F-48).
 * ==================================
 *
 * Deducciones:
 * - `src/router/index.js`: ruta `/settings`; `ProfileSettings.vue`: pestaña «Usuarios» con
 *   toolbar «Nuevo», `DataTable` (Usuario, E-Mail, Rol) y botones por fila (`pi-pencil`,
 *   `pi-key`, `pi-trash`).
 * - `ProfileSettings.vue`: diálogo «Detalle del usuario» con `#username`, `#password`, `#email`
 *   y `#rol`; el toast de error es `Error al guardar usuario: ${getApiErrorMessage(error)}`.
 * - `backend/src/routes/users.mjs` + `db_utilsUsers.mjs`: 201 al crear y 409 con
 *   `USUARIO_DUPLICADO` y el mensaje «No se ha podido crear el usuario porque ya existe uno con
 *   el nombre «…».» al repetir el nombre.
 *
 * Datos de prueba: `e2e_usuario_AAAAMMDD_HHMMSS` con correo `@e2e.invalid` (26 y 38 caracteres,
 * dentro de `users.username` varchar(50) y `users.email` varchar(100)). Solo se crea y se borra
 * ese usuario; los demás no se tocan.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import {
    abrirAjustes,
    cerrarDialogoUsuario,
    contrasenaDeUsuario,
    crearUsuario,
    dialogoUsuario,
    eliminarUsuario,
    emailDeUsuario,
    filaUsuario,
    nombreUsuarioUnico,
    PATRON_USUARIO_E2E
} from './helpers/timon.mjs';

test.describe.configure({ mode: 'serial' });

test.describe('Usuarios: mensajes de error (F-48)', () => {
    /** Usuario creado por esta ejecución (para la limpieza). */
    let nombre = null;
    let email = null;
    let contrasena = null;

    /** Huérfanos con el formato exacto de la suite de ejecuciones anteriores. */
    const huerfanos = [];

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el flujo de usuarios');
        }
    });

    test.afterAll(async ({ paginaSesion: page }) => {
        if (nombre) {
            try {
                await abrirAjustes(page, 'Usuarios');

                const respuesta = await eliminarUsuario(page, nombre);

                if (respuesta === null) {
                    console.log(`[LIMPIEZA] ${nombre}: ya no estaba en la tabla.`);
                } else if (respuesta.status() !== 200) {
                    console.warn(`[LIMPIEZA] Queda sin eliminar: ${nombre} (HTTP ${respuesta.status()})`);
                } else {
                    await expect(filaUsuario(page, nombre)).toHaveCount(0);
                    console.log(`[LIMPIEZA] Eliminado: ${nombre}`);
                }
            } catch (error) {
                console.warn(`[LIMPIEZA] Queda sin eliminar: ${nombre} (${error.message.split('\n')[0]})`);
            }
        }

        if (huerfanos.length > 0) {
            console.warn(`[HUÉRFANOS] Usuarios e2e_ de ejecuciones anteriores: ${huerfanos.join(', ')}`);
        }
    });

    test('lista los usuarios y detecta huérfanos de ejecuciones anteriores', async ({ paginaSesion: page }) => {
        await abrirAjustes(page, 'Usuarios');

        await expect(page.getByRole('columnheader', { name: 'Usuario' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'E-Mail' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();

        const nombres = (await page.locator('table tbody tr td:first-child').allInnerTexts())
            .map((texto) => texto.trim())
            .filter(Boolean);

        for (const nombreTabla of nombres) {
            if (PATRON_USUARIO_E2E.test(nombreTabla) && nombreTabla !== nombre) huerfanos.push(nombreTabla);
        }

        console.log(`[HUÉRFANOS] ${huerfanos.length} usuario(s) e2e_ de ejecuciones anteriores`);
    });

    test('crea un usuario de prueba con el formato exacto de la suite', async ({ paginaSesion: page }) => {
        nombre = await nombreUsuarioUnico();
        email = emailDeUsuario(nombre);
        contrasena = contrasenaDeUsuario(nombre);

        await abrirAjustes(page, 'Usuarios');

        const respuesta = await crearUsuario(page, { username: nombre, email, password: contrasena });

        // Si el alta falla, el cuerpo real del servidor queda en el mensaje del fallo
        if (respuesta.status() !== 201) {
            throw new Error(`El alta devolvió ${respuesta.status()}: ${await respuesta.text()}`);
        }

        expect(respuesta.status()).toBe(201);
        console.log(`[CREADO] ${nombre}`);

        await expect(page.getByRole('alert').filter({ hasText: 'Usuario guardado correctamente' })).toBeVisible();
        await expect(dialogoUsuario(page)).toBeHidden();
        await expect(filaUsuario(page, nombre)).toHaveCount(1);
    });

    test('rechaza el nombre duplicado con el mensaje completo y sin datos internos', async ({ paginaSesion: page }) => {
        test.skip(!nombre, 'No hay usuario creado por esta ejecución');

        const mensaje = `No se ha podido crear el usuario porque ya existe uno con el nombre «${nombre}».`;

        await abrirAjustes(page, 'Usuarios');

        // Solo colisiona el nombre: el correo es distinto, así que el motor debe
        // informar de la clave del nombre de usuario.
        const respuesta = await crearUsuario(page, {
            username: nombre,
            email: emailDeUsuario(`${nombre}-b`),
            password: contrasena
        });

        // 409 con código de negocio: es un dato duplicado, no un fallo del servidor
        expect(respuesta.status()).toBe(409);

        const cuerpo = await respuesta.json();

        expect(cuerpo.message).toBe(mensaje);
        expect(cuerpo.codigo).toBe('USUARIO_DUPLICADO');
        expect(JSON.stringify(cuerpo).includes('ER_DUP_ENTRY')).toBe(false);

        // El toast muestra el prefijo de la pantalla y el mensaje completo del servidor
        await expect(page.getByRole('alert').filter({ hasText: `Error al guardar usuario: ${mensaje}` })).toBeVisible();

        // El diálogo sigue abierto porque el guardado ha fallado
        await expect(dialogoUsuario(page)).toBeVisible();
        await cerrarDialogoUsuario(page);

        // No se ha duplicado nada
        await expect(filaUsuario(page, nombre)).toHaveCount(1);
    });

    test('rechaza el correo duplicado con su propio mensaje', async ({ paginaSesion: page }) => {
        test.skip(!nombre, 'No hay usuario creado por esta ejecución');

        const mensaje = `No se ha podido guardar el usuario porque el correo «${email}» ya está asociado a otra cuenta.`;

        await abrirAjustes(page, 'Usuarios');

        // Solo colisiona el correo: el nombre de usuario es nuevo.
        const respuesta = await crearUsuario(page, {
            username: `${nombre}-c`,
            email,
            password: contrasena
        });

        expect(respuesta.status()).toBe(409);

        const cuerpo = await respuesta.json();

        expect(cuerpo.message).toBe(mensaje);
        expect(cuerpo.codigo).toBe('CORREO_DUPLICADO');
        expect(JSON.stringify(cuerpo).includes('ER_DUP_ENTRY')).toBe(false);

        await expect(page.getByRole('alert').filter({ hasText: `Error al guardar usuario: ${mensaje}` })).toBeVisible();

        await expect(dialogoUsuario(page)).toBeVisible();
        await cerrarDialogoUsuario(page);

        // Tampoco se ha creado el usuario del segundo intento
        await expect(filaUsuario(page, `${nombre}-c`)).toHaveCount(0);
    });
});
