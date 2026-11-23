/**
 * Interfaz de privacidad (`es_privado`) y su regla de propiedad (F-49, DC-75).
 * ======================================================================
 *
 * Deducciones (código de la rama):
 * - `src/composables/usePrivacidad.js`: el control se renderiza para un administrador siempre y,
 *   para `user`/`limited_user`, solo en los registros de los que son propietarios; en el alta, el
 *   creador es el propietario. Un `reader` no lo ve nunca.
 * - `src/components/PrivacidadToggle.vue`: `ToggleSwitch` con `inputId` (`es_privado` en el diálogo
 *   anual de Recibos, `es_privado_tb` en el de trimestrales/bimestrales/mensuales) y etiqueta en
 *   palabras. Cuando no se renderiza, no hay ningún elemento con ese id en el DOM.
 * - `src/views/pages/ListBills.vue`, `Advances.vue` y `Savings.vue`: la fila de privacidad va al final
 *   de los campos propios; el indicador es `i.pi.pi-lock` delante del concepto.
 * - El servidor es la autoridad (DC-75): un valor distinto sin ser propietario ni admin responde 403
 *   con `codigo = PRIVACIDAD_NO_PERMITIDA`; el valor igual se tolera pero no se escribe.
 *
 * Datos: usuarios `e2e_priv_*`, recibos `e2e_priv_rec_*`, anticipos `e2e_priv_ant_*` y ahorros
 * `e2e_priv_aho_*`. Se borran en `afterEach` (por API) y en `afterAll` (usuarios).
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { filtrarPorBuscador, iniciarSesion, urlDe } from './helpers/timon.mjs';
import { baseUrl } from '../scripts/entorno.mjs';

const dos = (n) => String(n).padStart(2, '0');

function marcaDeTiempo() {
    const ahora = new Date();

    return `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}_${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`;
}

const SUFIJO = marcaDeTiempo();
const FIN = SUFIJO.slice(-6);
const ANIO = String(new Date().getFullYear());

const ROLES = {
    propietario: { username: `e2e_priv_prop_${SUFIJO}`, password: `E2e_${FIN}!aB3`, rol: 'user' },
    otro: { username: `e2e_priv_otro_${SUFIJO}`, password: `E2e_${FIN}!aB3`, rol: 'user' },
    reader: { username: `e2e_priv_reader_${SUFIJO}`, password: `E2e_${FIN}!aB3`, rol: 'reader' }
};

const estado = { api: null, idsUsuarios: [], idsRecibos: [], idsAnticipos: [], idsAhorros: [] };

const concepto = (base) => `e2e_priv_${base}_${FIN}`;

async function peticion(page, { metodo, ruta, cuerpo = null }) {
    return page.evaluate(
        async ({ api, metodo, ruta, cuerpo }) => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const cabeceras = { Authorization: `Bearer ${token}` };

            if (cuerpo !== null) cabeceras['Content-Type'] = 'application/json';

            const respuesta = await fetch(`${api}${ruta}`, {
                method: metodo,
                headers: cabeceras,
                body: cuerpo === null ? undefined : JSON.stringify(cuerpo)
            });

            const texto = await respuesta.text();
            let datos = null;

            try {
                datos = texto ? JSON.parse(texto) : null;
            } catch {
                datos = null;
            }

            return { status: respuesta.status, datos, texto };
        },
        { api: estado.api, metodo, ruta, cuerpo }
    );
}

async function conRol(conexion, usuario, funcion, opciones = {}) {
    const contexto = await conexion.newContext({ viewport: null, baseURL: baseUrl(), ...opciones });
    const page = await contexto.newPage();

    try {
        const respuesta = await iniciarSesion(page, { usuario: usuario.username, password: usuario.password });
        expect(respuesta.status(), `login de ${usuario.rol}`).toBe(200);

        return await funcion(page);
    } finally {
        await contexto.close().catch(() => {});
    }
}

async function crearUsuario(pageAdmin, usuario) {
    const respuesta = await peticion(pageAdmin, {
        metodo: 'POST',
        ruta: '/api/users',
        cuerpo: { username: usuario.username, email: `${usuario.username}@e2e.invalid`, password: usuario.password, rol: usuario.rol }
    });

    expect(respuesta.status, `alta de ${usuario.rol}: ${respuesta.texto}`).toBe(201);

    const id = respuesta.datos?.id ?? (await peticion(pageAdmin, { metodo: 'GET', ruta: '/api/users' })).datos?.find((u) => u.username === usuario.username)?.id;
    expect(id, `id de ${usuario.username}`).toBeTruthy();
    estado.idsUsuarios.push(id);

    return id;
}

/** Primer dato de la lista que necesita un alta. */
async function datosDeAlta(page) {
    const categorias = await peticion(page, { metodo: 'GET', ruta: '/api/categorias' });
    const cuentas = await peticion(page, { metodo: 'GET', ruta: '/api/cuentas' });

    expect(categorias.status).toBe(200);
    expect(cuentas.status).toBe(200);
    expect(Array.isArray(categorias.datos) && categorias.datos.length > 0, 'la base necesita categorías').toBe(true);
    expect(Array.isArray(cuentas.datos) && cuentas.datos.length > 0, 'la base necesita cuentas').toBe(true);

    return { categoria: categorias.datos[0].nombre, cuenta_id: cuentas.datos[0].id };
}

/** Crea un recibo (anual por defecto) del usuario que hace la petición. */
async function crearRecibo(page, etiqueta, esPrivado = false, periodicidad = 'anual') {
    const nombre = concepto(`rec_${etiqueta}`);
    const { categoria, cuenta_id } = await datosDeAlta(page);

    const respuesta = await peticion(page, {
        metodo: 'POST',
        ruta: '/api/recibos',
        cuerpo: { concepto: nombre, periodicidad, importe: 10, categoria, cuenta_id, fecha_inicial: `${ANIO}-12-31`, modoFechas: 'auto', cargo: [], es_privado: esPrivado ? 1 : 0 }
    });

    expect(respuesta.status, `alta de ${nombre}: ${respuesta.texto}`).toBe(201);

    const filas = await filasDeRecibo(page, nombre, periodicidad);
    expect(filas.length, `el recibo ${nombre} debe existir`).toBeGreaterThan(0);
    estado.idsRecibos.push({ id: filas[0].id, periodicidad });

    return nombre;
}

/**
 * Crea un recibo con su único cargo inactivo: la pantalla lo muestra en la tarjeta «Inactivos»,
 * que no tiene buscador, así que el concepto debe ser único (lo es).
 */
async function crearReciboInactivo(page, etiqueta) {
    const nombre = concepto(`ina_${etiqueta}`);
    const { categoria, cuenta_id } = await datosDeAlta(page);

    const respuesta = await peticion(page, {
        metodo: 'POST',
        ruta: '/api/recibos',
        cuerpo: {
            concepto: nombre,
            periodicidad: 'anual',
            importe: 10,
            categoria,
            cuenta_id,
            modoFechas: 'manual',
            cargo: [{ fecha: `${ANIO}-12-31`, estado: 'pendiente', comentario: '', activo: 0 }],
            es_privado: 1
        }
    });

    expect(respuesta.status, `alta de ${nombre}: ${respuesta.texto}`).toBe(201);

    const filas = await filasDeRecibo(page, nombre, 'anual');
    expect(filas.length, `el recibo ${nombre} debe existir`).toBeGreaterThan(0);
    estado.idsRecibos.push({ id: filas[0].id, periodicidad: 'anual' });

    return nombre;
}

async function filasDeRecibo(page, nombre, periodicidad = 'anual') {
    const respuesta = await peticion(page, { metodo: 'GET', ruta: `/api/recibos?periodicidad=${periodicidad}&a%C3%B1o=${ANIO}` });
    expect(respuesta.status).toBe(200);

    return (respuesta.datos ?? []).filter((fila) => fila.concepto === nombre);
}

/** Fila de cualquiera de las tablas de Recibos que contiene el concepto. */
function filaRecibo(page, nombre) {
    return page.locator('table tbody tr').filter({ hasText: nombre }).first();
}

/** Abre el diálogo de edición del recibo anual desde su lápiz. */
async function abrirDialogoRecibo(page, nombre) {
    await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await filtrarPorBuscador(page, nombre);

    const fila = filaRecibo(page, nombre);
    await expect(fila).toBeVisible({ timeout: 20_000 });
    await fila.locator('button:has(.pi-pencil)').click();

    const dialogo = page.getByRole('dialog', { name: 'Detalle del recibo' });
    await expect(dialogo).toBeVisible({ timeout: 20_000 });

    return dialogo;
}

test.describe.serial('Privacidad y regla de propiedad (F-49, DC-75)', () => {
    // Cada caso abre contextos con login; el límite por defecto (60 s) no alcanza
    test.describe.configure({ timeout: 240_000 });

    test.beforeAll(async ({ paginaSesion: page }) => {
        const respuestas = [];
        page.on('response', (r) => {
            if (new URL(r.url()).pathname.startsWith('/api/')) respuestas.push(r);
        });

        await page.goto(urlDe('/dashboard'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);

        estado.api = new URL(respuestas[0].url()).origin;

        const usuarios = await peticion(page, { metodo: 'GET', ruta: '/api/users' });
        expect(usuarios.status, 'la sesión E2E debe ser administradora para crear usuarios').toBe(200);

        for (const usuario of Object.values(ROLES)) {
            await crearUsuario(page, usuario);
        }
    });

    test.afterAll(async ({ paginaSesion: page }) => {
        await borrarDatosDeLaEjecucion(page);

        if (estado.idsUsuarios.length > 0) {
            await peticion(page, { metodo: 'DELETE', ruta: '/api/users', cuerpo: { userIds: estado.idsUsuarios } }).catch(() => {});
        }
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        await borrarDatosDeLaEjecucion(page).catch(() => {});

        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la privacidad (F-49, DC-75)');
        }
    });

    test('el propietario marca su recibo desde el diálogo, se guarda y el candado queda en la tabla', async ({ conexion, paginaSesion: pageAdmin }) => {
        let nombre = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            nombre = await crearRecibo(page, 'marca');
        });

        await conRol(conexion, ROLES.propietario, async (page) => {
            const dialogo = await abrirDialogoRecibo(page, nombre);
            const control = dialogo.locator('#es_privado');

            await expect(control, 'el propietario ve el control').toHaveCount(1);
            await expect(control).not.toBeChecked();

            await control.click();
            await expect(control).toBeChecked();

            const [peticion] = await Promise.all([page.waitForRequest((r) => r.url().includes('/api/recibos') && r.method() === 'POST'), dialogo.getByRole('button', { name: 'Guardar' }).click()]);
            expect(peticion.postDataJSON().es_privado, 'el payload lleva la privacidad').toBe(1);

            await expect(dialogo).toBeHidden({ timeout: 20_000 });

            // Persistencia tras recargar y candado en la fila
            await page.reload({ waitUntil: 'domcontentloaded' });
            await filtrarPorBuscador(page, nombre);
            const fila = filaRecibo(page, nombre);
            await expect(fila).toBeVisible({ timeout: 20_000 });
            await expect(fila.locator('.pi-lock')).toHaveCount(1);
        });

        const filas = await filasDeRecibo(pageAdmin, nombre);
        expect(filas.length).toBeGreaterThan(0);
        expect(Number(filas[0].es_privado), 'el servidor guardó el valor').toBe(1);
    });

    test('otro user y un reader no ven el recibo privado, y el admin sí', async ({ conexion }) => {
        let nombre = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            nombre = await crearRecibo(page, 'oculto', true);
        });

        const noLoVe = async (usuario) =>
            conRol(conexion, usuario, async (page) => {
                await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
                await expect(page.getByRole('table').first()).toBeVisible({ timeout: 20_000 });
                await filtrarPorBuscador(page, nombre);
                await expect(filaRecibo(page, nombre)).toHaveCount(0);
            });

        await noLoVe(ROLES.otro);
        await noLoVe(ROLES.reader);

        await conRol(conexion, { username: process.env.E2E_USER, password: process.env.E2E_PASSWORD, rol: 'admin' }, async (page) => {
            const dialogo = await abrirDialogoRecibo(page, nombre);
            const control = dialogo.locator('#es_privado');

            await expect(control, 'el admin ve el control en un registro ajeno').toHaveCount(1);
            await expect(control).toBeChecked();
            await expect(dialogo.getByText('Privado: solo visible para admin y propietario')).toBeVisible();

            await control.click();
            const [peticion] = await Promise.all([page.waitForRequest((r) => r.url().includes('/api/recibos') && r.method() === 'POST'), dialogo.getByRole('button', { name: 'Guardar' }).click()]);
            expect(peticion.postDataJSON().es_privado).toBe(0);
        });

        // El otro user lo ve después de que el admin lo desmarque
        await conRol(conexion, ROLES.otro, async (page) => {
            await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await filtrarPorBuscador(page, nombre);
            await expect(filaRecibo(page, nombre)).toBeVisible({ timeout: 20_000 });
        });
    });

    test('el control no existe para el no propietario ni para el reader, y su edición no envía es_privado', async ({ conexion }) => {
        let nombre = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            nombre = await crearRecibo(page, 'ajeno');
        });

        await conRol(conexion, ROLES.otro, async (page) => {
            const dialogo = await abrirDialogoRecibo(page, nombre);

            await expect(dialogo.locator('#es_privado'), 'el no propietario no ve el control').toHaveCount(0);
            await expect(dialogo.getByText('Compartido con los usuarios con acceso')).toHaveCount(0);

            // Editar el concepto sigue funcionando y la privacidad no viaja
            await dialogo.locator('#concepto').fill(`${nombre} b`);
            const [peticion] = await Promise.all([page.waitForRequest((r) => r.url().includes('/api/recibos') && r.method() === 'POST'), dialogo.getByRole('button', { name: 'Guardar' }).click()]);
            expect('es_privado' in peticion.postDataJSON(), 'la privacidad no viaja sin control').toBe(false);
        });

        await conRol(conexion, ROLES.reader, async (page) => {
            const dialogo = await abrirDialogoRecibo(page, nombre);
            await expect(dialogo.locator('#es_privado'), 'el reader no ve el control').toHaveCount(0);
        });
    });

    test('la API responde 403 con código al cambio sin permiso y tolera el valor igual sin escribirlo', async ({ conexion, paginaSesion: pageAdmin }) => {
        let nombre = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            nombre = await crearRecibo(page, 'api');
        });

        await conRol(conexion, ROLES.otro, async (page) => {
            const { categoria, cuenta_id } = await datosDeAlta(page);
            const id = (await filasDeRecibo(pageAdmin, nombre))[0].id;
            const cuerpo = (esPrivado) => ({ id, concepto: nombre, periodicidad: 'anual', importe: 10, categoria, cuenta_id, fecha_inicial: `${ANIO}-12-31`, modoFechas: 'auto', cargo: [], es_privado: esPrivado });

            const denegado = await peticion(page, { metodo: 'POST', ruta: '/api/recibos', cuerpo: cuerpo(1) });
            expect(denegado.status, 'cambio sin permiso').toBe(403);
            expect(denegado.datos?.codigo).toBe('PRIVACIDAD_NO_PERMITIDA');

            const tolerado = await peticion(page, { metodo: 'POST', ruta: '/api/recibos', cuerpo: cuerpo(0) });
            expect(tolerado.status, 'valor igual tolerado').toBe(201);
        });

        expect(Number((await filasDeRecibo(pageAdmin, nombre))[0].es_privado), 'el valor no cambió').toBe(0);
    });

    test('DC-30: activar solo la privacidad guarda y no avisa de «Sin cambios»', async ({ conexion }) => {
        let nombre = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            nombre = await crearRecibo(page, 'dc30');
        });

        await conRol(conexion, ROLES.propietario, async (page) => {
            const dialogo = await abrirDialogoRecibo(page, nombre);
            await dialogo.locator('#es_privado').click();

            const [peticion] = await Promise.all([page.waitForRequest((r) => r.url().includes('/api/recibos') && r.method() === 'POST'), dialogo.getByRole('button', { name: 'Guardar' }).click()]);

            expect(peticion.postDataJSON().es_privado).toBe(1);
            await expect(page.locator('.p-toast-detail').filter({ hasText: 'No se ha cambiado nada.' })).toHaveCount(0);
        });
    });

    test('anticipos: el propietario marca y desmarca, y el no propietario no ve el control', async ({ conexion }) => {
        let nombre = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            nombre = await crearAnticipo(page, 'marca');
        });

        await conRol(conexion, ROLES.propietario, async (page) => {
            const dialogo = await abrirDialogoAnticipo(page, nombre);
            const control = dialogo.locator('#es_privado');

            await expect(control, 'el propietario ve el control').toHaveCount(1);
            await control.click();

            const [peticion] = await Promise.all([page.waitForRequest((r) => r.url().includes('/api/anticipos') && r.method() === 'POST'), dialogo.getByRole('button', { name: 'Guardar' }).click()]);
            expect(peticion.postDataJSON().es_privado).toBe(1);
            await expect(dialogo).toBeHidden({ timeout: 20_000 });

            await page.reload({ waitUntil: 'domcontentloaded' });
            await expect(page.locator('table tbody tr').filter({ hasText: nombre }).first().locator('.pi-lock')).toHaveCount(1);
        });

        await conRol(conexion, ROLES.otro, async (page) => {
            await page.goto(urlDe('/pages/advances'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await expect(page.getByRole('table').first()).toBeVisible({ timeout: 20_000 });
            await expect(page.locator('table tbody tr').filter({ hasText: nombre })).toHaveCount(0);
        });

        let publico = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            publico = await crearAnticipo(page, 'publico');
        });

        await conRol(conexion, ROLES.otro, async (page) => {
            const dialogo = await abrirDialogoAnticipo(page, publico);
            await expect(dialogo.locator('#es_privado'), 'el no propietario no ve el control').toHaveCount(0);
        });
    });

    test('ahorros: el propietario marca y desmarca, y el no propietario no ve el control', async ({ conexion }) => {
        let nombre = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            nombre = await crearAhorro(page, 'marca');
        });

        await conRol(conexion, ROLES.propietario, async (page) => {
            const dialogo = await abrirDialogoAhorro(page, nombre);
            const control = dialogo.locator('#es_privado');

            await expect(control, 'el propietario ve el control').toHaveCount(1);
            await control.click();

            const [peticion] = await Promise.all([page.waitForRequest((r) => r.url().includes('/api/ahorros') && r.method() === 'POST'), dialogo.getByRole('button', { name: 'Guardar' }).click()]);
            expect(peticion.postDataJSON().es_privado).toBe(1);
            await expect(dialogo).toBeHidden({ timeout: 20_000 });

            await page.reload({ waitUntil: 'domcontentloaded' });
            await expect(page.locator('table tbody tr').filter({ hasText: nombre }).first().locator('.pi-lock')).toHaveCount(1);
        });

        await conRol(conexion, ROLES.otro, async (page) => {
            await page.goto(urlDe('/pages/savings'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await expect(page.getByRole('table').first()).toBeVisible({ timeout: 20_000 });
            await expect(page.locator('table tbody tr').filter({ hasText: nombre })).toHaveCount(0);
        });

        let publico = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            publico = await crearAhorro(page, 'publico');
        });

        await conRol(conexion, ROLES.otro, async (page) => {
            const dialogo = await abrirDialogoAhorro(page, publico);
            await expect(dialogo.locator('#es_privado'), 'el no propietario no ve el control').toHaveCount(0);
        });
    });

    test('los dos interruptores de Recibos quedan apilados y Guardar se ve sin desplazarse (1366x768 y estrecho)', async ({ conexion }) => {
        const viewports = [
            { width: 1366, height: 768 },
            { width: 1024, height: 700 }
        ];
        let recibo = null;
        let anticipo = null;
        let ahorro = null;

        await conRol(conexion, ROLES.propietario, async (page) => (recibo = await crearRecibo(page, 'vw')), { viewport: viewports[0] });
        await conRol(conexion, ROLES.propietario, async (page) => (anticipo = await crearAnticipo(page, 'vw')), { viewport: viewports[0] });
        await conRol(conexion, ROLES.propietario, async (page) => (ahorro = await crearAhorro(page, 'vw')), { viewport: viewports[0] });

        for (const viewport of viewports) {
            await conRol(
                conexion,
                ROLES.propietario,
                async (page) => {
                    const tamano = `${viewport.width}x${viewport.height}`;
                    const comprobar = async (ruta, nombre, titulo, conActivo) => {
                        await page.goto(urlDe(ruta), { waitUntil: 'domcontentloaded', timeout: 45_000 });
                        if (ruta === '/pages/bills') await filtrarPorBuscador(page, nombre);

                        const fila = page.locator('table tbody tr').filter({ hasText: nombre }).first();
                        await expect(fila).toBeVisible({ timeout: 20_000 });
                        await fila.locator('button:has(.pi-pencil)').click();

                        const dialogo = page.getByRole('dialog', { name: titulo });
                        await expect(dialogo).toBeVisible({ timeout: 20_000 });
                        await expect(dialogo.locator('#es_privado'), `${titulo} (${tamano}): control de privacidad`).toBeVisible();

                        const guardar = dialogo.getByRole('button', { name: 'Guardar' });
                        await expect(guardar).toBeVisible();
                        await expect(guardar, `${titulo} (${tamano}): Guardar sin desplazarse`).toBeInViewport();

                        if (conActivo) {
                            // Los dos interruptores van apilados: activo encima y privacidad debajo.
                            const activo = dialogo.locator('#activo');
                            await expect(activo, `Recibos (${tamano}): interruptor de activo`).toBeVisible();
                            await expect(dialogo.getByText('Recibo activo')).toBeVisible();

                            const cajaActivo = await activo.boundingBox();
                            const cajaPrivacidad = await dialogo.locator('#es_privado').boundingBox();
                            expect(cajaActivo, `Recibos (${tamano}): caja de activo`).not.toBeNull();
                            expect(cajaPrivacidad, `Recibos (${tamano}): caja de privacidad`).not.toBeNull();
                            expect(cajaActivo.y, `Recibos (${tamano}): activo encima de privacidad`).toBeLessThan(cajaPrivacidad.y);
                            expect(cajaPrivacidad.y - (cajaActivo.y + cajaActivo.height), `Recibos (${tamano}): separación entre interruptores`).toBeGreaterThanOrEqual(0);
                        }

                        await dialogo.getByRole('button', { name: 'Cancelar' }).click();
                        await expect(dialogo).toBeHidden({ timeout: 20_000 });
                    };

                    await comprobar('/pages/bills', recibo, 'Detalle del recibo', true);
                    await comprobar('/pages/advances', anticipo, 'Detalle del anticipo', false);
                    await comprobar('/pages/savings', ahorro, 'Detalle del ahorro', false);
                },
                { viewport }
            );
        }
    });

    test('el candado aparece en las tarjetas agrupadas y en inactivos, y el diálogo agrupado usa es_privado_tb', async ({ conexion }) => {
        const nombres = {};

        await conRol(conexion, ROLES.propietario, async (page) => {
            nombres.trimestral = await crearRecibo(page, 'tri', true, 'trimestral');
            nombres.bimestral = await crearRecibo(page, 'bi', true, 'bimestral');
            nombres.mensual = await crearRecibo(page, 'men', true, 'mensual');
            nombres.inactivo = await crearReciboInactivo(page, 'ina');
        });

        await conRol(conexion, ROLES.propietario, async (page) => {
            await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });

            const conCandado = async (titulo, nombre, conBuscador = true) => {
                const tarjetaDeLaPeriodicidad = page.locator('.card').filter({ has: page.getByText(titulo, { exact: true }) });

                if (conBuscador) await filtrarPorBuscador(tarjetaDeLaPeriodicidad, nombre);

                const fila = tarjetaDeLaPeriodicidad.locator('table tbody tr').filter({ hasText: nombre }).first();
                await expect(fila, `${titulo}: fila del recibo`).toBeVisible({ timeout: 20_000 });
                await expect(fila.locator('.pi-lock'), `${titulo}: candado`).toHaveCount(1);
            };

            await conCandado('Trimestrales', nombres.trimestral);
            await conCandado('Bimestrales', nombres.bimestral);
            await conCandado('Mensuales', nombres.mensual);
            // La tarjeta «Inactivos» no tiene buscador: el concepto es único y la lista, corta.
            await conCandado('Inactivos', nombres.inactivo, false);

            const fila = page.locator('.card').filter({ has: page.getByText('Trimestrales', { exact: true }) }).locator('table tbody tr').filter({ hasText: nombres.trimestral }).first();
            await fila.locator('button:has(.pi-pencil)').click();

            const dialogo = page.getByRole('dialog', { name: 'Detalle del recibo' });
            await expect(dialogo).toBeVisible({ timeout: 20_000 });
            await expect(dialogo.locator('#es_privado_tb'), 'el diálogo agrupado usa es_privado_tb').toHaveCount(1);
            await expect(dialogo.locator('#es_privado_tb')).toBeChecked();
            await expect(dialogo.locator('#es_privado'), 'no usa el id del diálogo anual').toHaveCount(0);
        });
    });

    test('la ayuda se ve con ratón, teclado y clic, con un solo tooltip y el mismo texto en aria-label', async ({ conexion }) => {
        let nombre = null;
        await conRol(conexion, ROLES.propietario, async (page) => {
            nombre = await crearRecibo(page, 'ayuda');
        });

        await conRol(conexion, ROLES.propietario, async (page) => {
            const dialogo = await abrirDialogoRecibo(page, nombre);
            const TEXTO = 'Se aplica a todos los años de este recibo, también a los que se generen después.';
            const ayuda = dialogo.locator('[role="img"][aria-label]').first();
            const UNO = { timeout: 10_000 };

            await expect(ayuda).toHaveAttribute('aria-label', TEXTO);
            await expect(ayuda).toHaveAttribute('tabindex', '0');

            // Los tooltips de PrimeVue son nodos con role="tooltip" que se añaden a body.
            const tooltips = page.getByRole('tooltip').filter({ hasText: TEXTO });

            // 1) ratón: tooltip del icono
            await ayuda.locator('i').hover();
            await expect(tooltips, 'hover: un solo tooltip').toHaveCount(1, UNO);

            await page.mouse.move(5, 5);
            await expect(tooltips, 'hover: se retira').toHaveCount(0, UNO);

            // 2) teclado: tooltip del contenedor enfocable
            await ayuda.focus();
            await expect(tooltips, 'foco: un solo tooltip').toHaveCount(1, UNO);
            await expect(tooltips.first()).toBeVisible();

            // 3) clic: el icono retira el suyo y queda el del foco
            await ayuda.evaluate((elemento) => elemento.blur());
            await page.mouse.move(5, 5);
            await expect(tooltips).toHaveCount(0, UNO);

            await ayuda.click();
            await expect(tooltips, 'clic: un solo tooltip').toHaveCount(1, UNO);
            await expect(tooltips.first()).toBeVisible();
        });
    });
});



/** Abre el diálogo de un anticipo desde su lápiz. */
async function abrirDialogoAnticipo(page, nombre) {
    await page.goto(urlDe('/pages/advances'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const fila = page.locator('table tbody tr').filter({ hasText: nombre }).first();
    await expect(fila).toBeVisible({ timeout: 20_000 });
    await fila.locator('button:has(.pi-pencil)').click();

    const dialogo = page.getByRole('dialog', { name: 'Detalle del anticipo' });
    await expect(dialogo).toBeVisible({ timeout: 20_000 });

    return dialogo;
}

/** Abre el diálogo de un ahorro desde su lápiz. */
async function abrirDialogoAhorro(page, nombre) {
    await page.goto(urlDe('/pages/savings'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const fila = page.locator('table tbody tr').filter({ hasText: nombre }).first();
    await expect(fila).toBeVisible({ timeout: 20_000 });
    await fila.locator('button:has(.pi-pencil)').click();

    const dialogo = page.getByRole('dialog', { name: 'Detalle del ahorro' });
    await expect(dialogo).toBeVisible({ timeout: 20_000 });

    return dialogo;
}

/** Crea un anticipo sin plan de pagos (la API devuelve solo un mensaje: el id se busca en el listado). */
async function crearAnticipo(page, etiqueta, esPrivado = false) {
    const nombre = concepto(`ant_${etiqueta}`);
    const { cuenta_id } = await datosDeAlta(page);

    const respuesta = await peticion(page, {
        metodo: 'POST',
        ruta: '/api/anticipos',
        cuerpo: {
            concepto: nombre,
            importe_original: 100,
            pago_sugerido: 0,
            fecha_inicio: `${ANIO}-01-01`,
            descripcion: '',
            estado: 'activo',
            cuenta_origen_id: cuenta_id,
            periodicidad: null,
            es_privado: esPrivado ? 1 : 0
        }
    });

    expect(respuesta.status, `alta de ${nombre}: ${respuesta.texto}`).toBe(201);

    const lista = await peticion(page, { metodo: 'GET', ruta: '/api/anticipos' });
    const fila = (lista.datos ?? []).find((anticipo) => anticipo.concepto === nombre);
    expect(fila, `el anticipo ${nombre} debe existir`).toBeTruthy();
    estado.idsAnticipos.push(fila.id);

    return nombre;
}

/** Crea un ahorro (la API devuelve solo un mensaje: el id se busca en el listado). */
async function crearAhorro(page, etiqueta, esPrivado = false) {
    const nombre = concepto(`aho_${etiqueta}`);

    const respuesta = await peticion(page, {
        metodo: 'POST',
        ruta: '/api/ahorros',
        cuerpo: { concepto: nombre, descripcion: '', ahorrado: 0, fecha_objetivo: null, periodicidad: null, importe_periodico: null, activo: 1, es_privado: esPrivado ? 1 : 0 }
    });

    expect(respuesta.status, `alta de ${nombre}: ${respuesta.texto}`).toBe(201);

    const lista = await peticion(page, { metodo: 'GET', ruta: '/api/ahorros' });
    const fila = (lista.datos ?? []).find((ahorro) => ahorro.concepto === nombre);
    expect(fila, `el ahorro ${nombre} debe existir`).toBeTruthy();
    estado.idsAhorros.push(fila.id);

    return nombre;
}

/** Borra todo lo creado por la ejecución, por id (el concepto puede haber cambiado en un test). */
async function borrarDatosDeLaEjecucion(page) {
    const vistos = new Set();

    for (const { id, periodicidad } of estado.idsRecibos) {
        if (vistos.has(id)) continue;
        vistos.add(id);
        await peticion(page, { metodo: 'DELETE', ruta: `/api/recibos/${id}?periodicidad=${periodicidad}` }).catch(() => {});
    }

    if (estado.idsAnticipos.length > 0) {
        await peticion(page, { metodo: 'DELETE', ruta: '/api/anticipos', cuerpo: { advances: [...new Set(estado.idsAnticipos)] } }).catch(() => {});
    }

    if (estado.idsAhorros.length > 0) {
        await peticion(page, { metodo: 'DELETE', ruta: '/api/ahorros', cuerpo: { savings: [...new Set(estado.idsAhorros)] } }).catch(() => {});
    }

    estado.idsRecibos = [];
    estado.idsAnticipos = [];
    estado.idsAhorros = [];
}
