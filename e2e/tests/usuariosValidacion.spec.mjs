/**
 * Validación de usuarios (F-42, DC-51).
 * ======================================
 *
 * Comprueba que la pantalla deshabilita Guardar con correo o contraseña inválidos y que
 * la API responde 400 antes de crear nada. En la edición, la contraseña es opcional;
 * si llega, se valida igual.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import {
    abrirAjustes,
    cerrarDialogoUsuario,
    contrasenaDeUsuario,
    dialogoUsuario,
    emailDeUsuario,
    nombreUsuarioUnico
} from './helpers/timon.mjs';
import { origenApi, peticionApi } from './helpers/api.mjs';

const estado = { api: null, nombre: null };

test.describe.configure({ timeout: 180_000, mode: 'serial' });

test.describe('Validación de usuarios (F-42, DC-51)', () => {
    test.beforeAll(async ({ paginaSesion: page }) => {
        estado.api = await origenApi(page);
        estado.nombre = await nombreUsuarioUnico();
    });

    test.afterAll(async ({ paginaSesion: page }) => {
        if (!estado.nombre) return;

        const usuarios = await peticionApi(page, estado.api, { metodo: 'GET', ruta: '/api/users' }).catch(() => null);
        const creado = usuarios?.datos?.find((usuario) => usuario.username === estado.nombre);

        if (creado) {
            await peticionApi(page, estado.api, {
                metodo: 'DELETE',
                ruta: '/api/users',
                cuerpo: { userIds: [creado.id] }
            }).catch(() => {});
        }
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la validación de usuarios');
        }
    });

    test('la pantalla deshabilita Guardar y muestra los errores', async ({ paginaSesion: page }) => {
        await abrirAjustes(page, 'Usuarios');
        await page.getByRole('button', { name: 'Nuevo' }).click();

        const dialogo = dialogoUsuario(page);
        await expect(dialogo).toBeVisible();

        await dialogo.locator('#username').fill(estado.nombre);
        await dialogo.locator('input[type="password"]').first().fill('corta');
        await dialogo.locator('#email').fill('sin-arroba');

        await expect(dialogo.getByRole('button', { name: 'Guardar' })).toBeDisabled();
        await expect(dialogo).toContainText('La contraseña debe tener entre 8 y 72 caracteres.');
        await expect(dialogo).toContainText('El correo no tiene un formato válido.');

        await cerrarDialogoUsuario(page);
    });

    test('la API rechaza correo, contraseña y rol inválidos con 400', async ({ paginaSesion: page }) => {
        const casos = [
            { email: 'sin-arroba', password: contrasenaDeUsuario(estado.nombre), rol: 'user', mensaje: 'El correo no tiene un formato válido.' },
            { email: emailDeUsuario(estado.nombre), password: 'corta', rol: 'user', mensaje: 'La contraseña debe tener entre 8 y 72 caracteres.' },
            { email: emailDeUsuario(estado.nombre), password: contrasenaDeUsuario(estado.nombre), rol: 'superadmin', mensaje: 'El rol debe ser admin, user, limited_user o reader.' }
        ];

        for (const caso of casos) {
            const respuesta = await peticionApi(page, estado.api, {
                metodo: 'POST',
                ruta: '/api/users',
                cuerpo: {
                    username: estado.nombre,
                    email: caso.email,
                    password: caso.password,
                    rol: caso.rol
                }
            });

            expect(respuesta.status, JSON.stringify(caso)).toBe(400);
            expect(respuesta.datos?.message).toBe(caso.mensaje);
        }

        const usuarios = await peticionApi(page, estado.api, { metodo: 'GET', ruta: '/api/users' });
        expect((usuarios.datos ?? []).some((usuario) => usuario.username === estado.nombre)).toBe(false);
    });

    test('la edición acepta contraseña omitida y valida la que llegue', async ({ paginaSesion: page }) => {
        const contrasena = contrasenaDeUsuario(estado.nombre);
        const alta = await peticionApi(page, estado.api, {
            metodo: 'POST',
            ruta: '/api/users',
            cuerpo: {
                username: estado.nombre,
                email: emailDeUsuario(estado.nombre),
                password: contrasena,
                rol: 'user'
            }
        });

        expect(alta.status, `alta válida: ${alta.texto}`).toBe(201);
        expect(alta.datos?.id).toBeTruthy();

        const base = {
            id: alta.datos.id,
            username: estado.nombre,
            email: emailDeUsuario(estado.nombre),
            rol: 'user'
        };

        const sinPassword = await peticionApi(page, estado.api, { metodo: 'PUT', ruta: '/api/users', cuerpo: base });
        expect(sinPassword.status, `edición sin contraseña: ${sinPassword.texto}`).toBe(200);

        const passwordCorta = await peticionApi(page, estado.api, {
            metodo: 'PUT',
            ruta: '/api/users',
            cuerpo: { ...base, password: 'corta' }
        });
        expect(passwordCorta.status).toBe(400);
        expect(passwordCorta.datos?.message).toBe('La contraseña debe tener entre 8 y 72 caracteres.');

        const passwordValida = await peticionApi(page, estado.api, {
            metodo: 'PUT',
            ruta: '/api/users',
            cuerpo: { ...base, password: contrasena }
        });
        expect(passwordValida.status, `edición con contraseña válida: ${passwordValida.texto}`).toBe(200);
    });
});
