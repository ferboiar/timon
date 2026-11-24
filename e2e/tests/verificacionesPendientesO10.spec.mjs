/**
 * O-10: verificaciones pendientes en pantalla (F-16, U-13 y borrado con cargos pagados).
 * ======================================================================================
 *
 * Deducciones:
 * - `Savings.vue` y `Advances.vue`: desde F-16 `saveSaving` y `saveAdvance` preparan un payload
 *   nuevo con `fechaIsoDeCalendario` sin mutar el formulario, de modo que un rechazo del servidor
 *   deja el diálogo con sus fechas y el reintento vuelve a enviar el mismo valor.
 * - `ListBills.vue` y `backend/src/db/db_utils.mjs`: borrar un recibo con cargos pagados responde
 *   409 con «No se puede borrar un recibo con cargos pagados.» (DC-18, DC-21); la opción de sesión
 *   `permitirPagados` solo la acepta el servidor de un administrador.
 * - `ProfileSettings.vue` (Ajustes › Administrar recibos): «Vista previa de hoy» habilita «Generar
 *   ahora», que pide confirmación y ejecuta `POST /api/ajustes/recibos/generar-anio` con
 *   `simular: false` (U-13, DC-36).
 *
 * El caso de U-13 escribe recibos del año siguiente en la base del servidor: solo se ejecuta si
 * `E2E_DB_CONFIG` apunta a la réplica `conta_hogar_test` (DC-59); sin esa variable se omite con el
 * motivo a la vista. El resto no modifica datos ajenos y limpia sus datos `e2e_` en `afterEach`.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { filtrarPorBuscador, urlDe } from './helpers/timon.mjs';

/** `recibos.concepto`, `ahorros.concepto` y `anticipos.concepto` son `varchar(30)`. */
const LONGITUD_MAXIMA_CONCEPTO = 30;

const conceptosUsados = new Set();

/** Estado del test en curso, para la limpieza segura de `afterEach`. */
let estado = {};

const dosDigitos = (numero) => String(numero).padStart(2, '0');

/** Concepto único `<prefijo>_AAAAMMDD_HHMMSS`, sin repetir el segundo. */
async function conceptoUnico(prefijo) {
    for (;;) {
        const ahora = new Date();
        const fecha = `${ahora.getFullYear()}${dosDigitos(ahora.getMonth() + 1)}${dosDigitos(ahora.getDate())}`;
        const hora = `${dosDigitos(ahora.getHours())}${dosDigitos(ahora.getMinutes())}${dosDigitos(ahora.getSeconds())}`;
        const concepto = `${prefijo}_${fecha}_${hora}`;

        if (concepto.length > LONGITUD_MAXIMA_CONCEPTO) {
            throw new Error(`El concepto E2E «${concepto}» supera ${LONGITUD_MAXIMA_CONCEPTO} caracteres`);
        }

        if (!conceptosUsados.has(concepto)) {
            conceptosUsados.add(concepto);
            return concepto;
        }

        await new Promise((resolver) => setTimeout(resolver, 1000));
    }
}

/** Tarjeta de periodicidad cuyo título exacto es `titulo`. */
function tarjeta(page, titulo) {
    return page.locator('.card').filter({ has: page.getByText(titulo, { exact: true }) });
}

/** Filas de datos de una tarjeta de Recibos (las únicas que tienen papelera). */
function filasConBorrado(contenedor) {
    return contenedor.locator('table tbody tr:has(button .pi-trash)');
}

/** Fila de una tabla por su texto, sin distinguir mayúsculas (la pantalla capitaliza). */
function filaPorTexto(page, texto) {
    return page
        .locator('table tbody tr')
        .filter({ hasText: new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
        .first();
}

/** Petición a la API desde el navegador; nunca desde el contenedor. */
async function peticionApi(page, { metodo, url, cuerpo = null }) {
    return page.evaluate(
        async ({ metodo, url, cuerpo }) => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const cabeceras = { Authorization: `Bearer ${token}` };

            if (cuerpo !== null) cabeceras['Content-Type'] = 'application/json';

            const respuesta = await fetch(url, {
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
        { metodo, url, cuerpo }
    );
}

/** GET de un listado y comprobación de que responde 200 con un array. */
async function listado(page, url) {
    const { status, datos, texto } = await peticionApi(page, { metodo: 'GET', url });

    if (status !== 200 || !Array.isArray(datos)) {
        throw new Error(`GET ${url} respondió ${status}: ${texto}`);
    }

    return datos;
}

/** Abre una pantalla y devuelve el origen de la API a partir de la primera respuesta indicada. */
async function origenDesde(page, { ruta, patron, boton = 'Nuevo' }) {
    const respuestas = [];
    const manejador = (respuesta) => {
        if (respuesta.request().method() === 'GET' && patron.test(respuesta.url())) respuestas.push(respuesta);
    };

    page.on('response', manejador);

    try {
        await page.goto(urlDe(ruta), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: boton })).toBeVisible();
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);

        return respuestas[0];
    } finally {
        page.off('response', manejador);
    }
}

/** Captura el origen de la API y el año desde el primer listado de Recibos. */
async function abrirRecibos(page) {
    const respuesta = await origenDesde(page, { ruta: '/pages/bills', patron: /\/api\/recibos\?.*a%C3%B1o=|.*año=/ });
    const url = new URL(respuesta.url());

    return { api: url.origin, anio: url.searchParams.get('año') ?? String(new Date().getFullYear()) };
}

/** Captura el origen de la API desde el listado de Ahorros. */
async function abrirAhorros(page) {
    const respuesta = await origenDesde(page, { ruta: '/pages/savings', patron: /\/api\/ahorros$/ });

    return new URL(respuesta.url()).origin;
}

/** Captura el origen de la API desde el listado de Anticipos. */
async function abrirAnticipos(page) {
    const respuesta = await origenDesde(page, { ruta: '/pages/advances', patron: /\/api\/anticipos$/ });

    return new URL(respuesta.url()).origin;
}

/** Datos mínimos para crear un recibo: primera categoría y primera cuenta. */
async function catalogos(page, api) {
    const categorias = await listado(page, `${api}/api/categorias`);
    const cuentas = await listado(page, `${api}/api/cuentas`);

    if (categorias.length === 0) throw new Error('La base no tiene categorías con las que crear el recibo de prueba.');
    if (cuentas.length === 0) throw new Error('La base no tiene cuentas con las que crear el recibo de prueba.');

    return { categoria: categorias[0].nombre, cuenta_id: cuentas[0].id };
}

/** Ids de un recibo por concepto y año. */
async function idsDelRecibo(page, { api, anio, concepto, periodicidad = 'anual' }) {
    const url = new URL(`${api}/api/recibos`);
    url.searchParams.set('periodicidad', periodicidad);
    url.searchParams.set('año', String(anio));

    const filas = await listado(page, url.toString());

    return [...new Set(filas.filter((fila) => fila.concepto === concepto).map((fila) => fila.id))];
}

/** Crea un recibo mensual con un cargo pagado de enero y otro pendiente de febrero. */
async function crearReciboMensualConPagado(page, { api, anio, concepto }) {
    const { categoria, cuenta_id } = await catalogos(page, api);
    const cuerpo = {
        concepto,
        periodicidad: 'mensual',
        importe: 10,
        categoria,
        cuenta_id,
        fecha_inicial: `${anio}-01-15`,
        modoFechas: 'manual',
        cargo: [
            { fecha: `${anio}-01-15`, estado: 'cargado', comentario: '', activo: 1, importe: 10 },
            { fecha: `${anio}-02-15`, estado: 'pendiente', comentario: '', activo: 1 }
        ]
    };

    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/recibos`, cuerpo });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/recibos (mensual) respondió ${respuesta.status}: ${respuesta.texto}`);
    }
}

/** Crea un recibo anual con un cargo en el estado indicado (manual). */
async function crearReciboAnual(page, { api, anio, concepto, estadoCargo = 'pendiente', fechaInicial = null }) {
    const { categoria, cuenta_id } = await catalogos(page, api);
    const fecha = fechaInicial ?? `${anio}-12-31`;
    const cuerpo = {
        concepto,
        periodicidad: 'anual',
        importe: 10,
        categoria,
        cuenta_id,
        fecha_inicial: fecha,
        modoFechas: 'manual',
        cargo: [{ fecha, estado: estadoCargo, comentario: '', activo: 1, importe: 10 }]
    };

    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/recibos`, cuerpo });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/recibos respondió ${respuesta.status}: ${respuesta.texto}`);
    }
}

/** Crea un ahorro con fecha objetivo, para probar el reintento sin mutar el formulario. */
async function crearAhorro(page, { api, concepto }) {
    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/ahorros`, cuerpo: { concepto, descripcion: '', ahorrado: 10, fecha_objetivo: '2027-01-31', activo: 1 } });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/ahorros respondió ${respuesta.status}: ${respuesta.texto}`);
    }
}

/** Crea un anticipo con fechas, sin plan de pagos, para probar el reintento sin mutar el formulario. */
async function crearAnticipo(page, { api, concepto }) {
    const cuentas = await listado(page, `${api}/api/cuentas`);

    if (cuentas.length === 0) throw new Error('La base no tiene cuentas con las que crear el anticipo de prueba.');

    const cuerpo = {
        concepto,
        importe_original: 100,
        pago_sugerido: 0,
        fecha_inicio: '2027-01-31',
        fecha_fin_prevista: '2027-12-31',
        descripcion: '',
        estado: 'activo',
        cuenta_origen_id: cuentas[0].id,
        periodicidad: null
    };

    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/anticipos`, cuerpo });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/anticipos respondió ${respuesta.status}: ${respuesta.texto}`);
    }
}

/** Borra por API los datos de prueba que sigan existiendo y devuelve el total de restos. */
async function limpiarPorApi(page) {
    if (!estado.api) return 0;

    let restos = 0;

    if (estado.recibo) {
        const anio = Number(estado.anio ?? new Date().getFullYear());
        const periodicidad = estado.periodicidad ?? 'anual';

        // El caso de U-13 crea sucesores en años posteriores: se borran del más nuevo al más antiguo
        // (un recibo con sucesor responde 409 hasta que se borra el sucesor)
        for (let ejercicio = anio + 2; ejercicio >= anio - 2; ejercicio--) {
            for (const id of await idsDelRecibo(page, { ...estado, anio: ejercicio, concepto: estado.recibo })) {
                await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/recibos/${id}?periodicidad=${periodicidad}&permitirPagados=1` });
            }

            restos += (await idsDelRecibo(page, { ...estado, anio: ejercicio, concepto: estado.recibo })).length;
        }
    }

    if (estado.ahorro) {
        const ahorros = await listado(page, `${estado.api}/api/ahorros`);
        const ids = ahorros.filter((ahorro) => ahorro.concepto === estado.ahorro).map((ahorro) => ahorro.id);

        if (ids.length > 0) {
            await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/ahorros`, cuerpo: { savings: ids } });
        }

        restos += (await listado(page, `${estado.api}/api/ahorros`)).filter((ahorro) => ahorro.concepto === estado.ahorro).length;
    }

    if (estado.anticipo) {
        const anticipos = await listado(page, `${estado.api}/api/anticipos`);
        const ids = anticipos.filter((anticipo) => anticipo.concepto === estado.anticipo).map((anticipo) => anticipo.id);

        if (ids.length > 0) {
            await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/anticipos`, cuerpo: { advances: ids } });
        }

        restos += (await listado(page, `${estado.api}/api/anticipos`)).filter((anticipo) => anticipo.concepto === estado.anticipo).length;
    }

    return restos;
}

test.describe('O-10 / F-16: el reintento tras un rechazo conserva el formulario', () => {
    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el reintento tras un rechazo del servidor (O-10)');
        }

        try {
            const restos = await limpiarPorApi(page);

            if (restos > 0) {
                throw new Error(`Quedan ${restos} datos de prueba tras la limpieza`);
            }
        } catch (error) {
            console.warn(`[limpieza] ${estado.ahorro ?? estado.anticipo}: ${error.message}`);

            testInfo.annotations.push({ type: 'limpieza', description: `Revisar los datos de prueba: ${error.message}` });
        }
    });

    test('Ahorros: el 500 no muta la fecha objetivo y el segundo guardado la envía igual', async ({ paginaSesion: page }) => {
        estado = { api: null, anio: null, recibo: null, ahorro: null, anticipo: null };
        estado.api = await abrirAhorros(page);
        estado.ahorro = await conceptoUnico('e2e_f16_aho');

        await crearAhorro(page, { api: estado.api, concepto: estado.ahorro });

        await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();

        const fila = filaPorTexto(page, estado.ahorro);

        await expect(fila).toBeVisible({ timeout: 20_000 });
        await fila.locator('button:has(.pi-pencil)').first().click();

        const dialogo = page.getByRole('dialog', { name: 'Detalle del ahorro' });

        await expect(dialogo).toBeVisible();
        await dialogo.locator('#descripcion').fill('reintento O-10');

        let intentos = 0;
        const cuerpos = [];
        const observarGuardado = async (ruta) => {
            const peticion = ruta.request();

            if (peticion.method() !== 'POST') return ruta.continue();

            intentos += 1;
            cuerpos.push(peticion.postDataJSON());

            if (intentos === 1) {
                return ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fallo simulado del servidor' }) });
            }

            return ruta.continue();
        };

        await page.route(/\/api\/ahorros$/, observarGuardado);

        try {
            const rechazo = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/ahorros$/.test(r.url()), { timeout: 30_000 });

            await dialogo.getByRole('button', { name: 'Guardar' }).click();

            expect((await rechazo).status()).toBe(500);
            await expect(page.getByText(/Fallo simulado del servidor/)).toBeVisible({ timeout: 10_000 });
            await expect(dialogo).toBeVisible();

            // F-16: el formulario no se mutó; la fecha sigue en el control
            await expect(dialogo.locator('#fecha_objetivo input')).toHaveValue('31/01/2027');

            const exito = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/ahorros$/.test(r.url()), { timeout: 30_000 });

            await dialogo.getByRole('button', { name: 'Guardar' }).click();

            expect((await exito).status()).toBe(201);
            await expect(dialogo).toBeHidden({ timeout: 20_000 });

            expect(cuerpos).toHaveLength(2);
            expect(cuerpos[1].fecha_objetivo).toBe('2027-01-31');
            expect(cuerpos[1].descripcion).toBe('reintento O-10');
        } finally {
            await page.unroute(/\/api\/ahorros$/, observarGuardado);
        }
    });

    test('Anticipos: el 500 no muta la fecha de inicio y el segundo guardado la envía igual', async ({ paginaSesion: page }) => {
        estado = { api: null, anio: null, recibo: null, ahorro: null, anticipo: null };
        estado.api = await abrirAnticipos(page);
        estado.anticipo = await conceptoUnico('e2e_f16_ant');

        await crearAnticipo(page, { api: estado.api, concepto: estado.anticipo });

        await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();

        const fila = filaPorTexto(page, estado.anticipo);

        await expect(fila).toBeVisible({ timeout: 20_000 });
        await fila.locator('button:has(.pi-pencil)').first().click();

        const dialogo = page.getByRole('dialog', { name: 'Detalle del anticipo' });

        await expect(dialogo).toBeVisible();
        await dialogo.locator('#descripcion').fill('reintento O-10');

        let intentos = 0;
        const cuerpos = [];
        const observarGuardado = async (ruta) => {
            const peticion = ruta.request();

            if (peticion.method() !== 'POST') return ruta.continue();

            intentos += 1;
            cuerpos.push(peticion.postDataJSON());

            if (intentos === 1) {
                return ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fallo simulado del servidor' }) });
            }

            return ruta.continue();
        };

        await page.route(/\/api\/anticipos$/, observarGuardado);

        try {
            const rechazo = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/anticipos$/.test(r.url()), { timeout: 30_000 });

            await dialogo.getByRole('button', { name: 'Guardar' }).click();

            expect((await rechazo).status()).toBe(500);
            await expect(page.getByText(/Fallo simulado del servidor/)).toBeVisible({ timeout: 10_000 });
            await expect(dialogo).toBeVisible();

            // F-16: el formulario no se mutó; las fechas siguen en sus controles
            await expect(dialogo.locator('#fecha_inicio input')).toHaveValue('31/01/2027');

            const exito = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/anticipos$/.test(r.url()), { timeout: 30_000 });

            await dialogo.getByRole('button', { name: 'Guardar' }).click();

            expect((await exito).status()).toBe(201);
            await expect(dialogo).toBeHidden({ timeout: 20_000 });

            expect(cuerpos).toHaveLength(2);
            expect(cuerpos[1].fecha_inicio).toBe('2027-01-31');
            expect(cuerpos[1].descripcion).toBe('reintento O-10');
        } finally {
            await page.unroute(/\/api\/anticipos$/, observarGuardado);
        }
    });
});

test.describe('O-10: borrado de un recibo con cargos pagados en pantalla', () => {
    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el borrado de un recibo con cargos pagados (O-10)');
        }

        try {
            const restos = await limpiarPorApi(page);

            if (restos > 0) {
                throw new Error(`Quedan ${restos} datos de prueba tras la limpieza`);
            }
        } catch (error) {
            console.warn(`[limpieza] ${estado.recibo}: ${error.message}`);

            testInfo.annotations.push({ type: 'limpieza', description: `Revisar los datos de prueba: ${error.message}` });
        }
    });

    test('el 409 del servidor se muestra y el recibo no se borra', async ({ paginaSesion: page }) => {
        const ubicacion = await abrirRecibos(page);

        estado = { api: ubicacion.api, anio: ubicacion.anio, recibo: await conceptoUnico('e2e_pag_rec'), ahorro: null, anticipo: null, periodicidad: 'mensual' };

        // Recibo mensual agrupado: su fila no lleva fecha, así que el borrado comprueba el recibo completo
        await crearReciboMensualConPagado(page, { ...estado, concepto: estado.recibo });

        await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();

        const tarjetaMensual = tarjeta(page, 'Mensuales');

        await filtrarPorBuscador(tarjetaMensual, estado.recibo);

        const fila = filasConBorrado(tarjetaMensual).filter({ hasText: estado.recibo }).first();

        await expect(fila).toBeVisible({ timeout: 20_000 });
        await fila.locator('button:has(.pi-trash)').first().click();

        const dialogo = page.getByRole('dialog', { name: 'Confirmar' }).filter({ hasText: estado.recibo });

        await expect(dialogo).toBeVisible();

        const borrado = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/api/recibos/'), { timeout: 30_000 });

        await dialogo.getByRole('button', { name: 'Sí' }).click();

        expect((await borrado).status()).toBe(409);
        await expect(page.getByText(/Error al eliminar el recibo: No se puede borrar un recibo con cargos pagados\./)).toBeVisible({ timeout: 10_000 });
        // Ante el error la pantalla no cierra el diálogo: se comprueba y se cancela
        await expect(dialogo).toBeVisible();
        await dialogo.getByRole('button', { name: 'No' }).click();
        await expect(dialogo).toBeHidden();
        await expect(fila).toBeVisible();

        expect(await idsDelRecibo(page, { ...estado, concepto: estado.recibo })).toHaveLength(1);
    });
});

test.describe('O-10 / U-13: ejecución real desde Ajustes', () => {
    test('la vista previa de hoy habilita Generar ahora y la ejecución responde 200', async ({ paginaSesion: page }) => {
        test.skip(!process.env.E2E_DB_CONFIG, 'requiere E2E_DB_CONFIG sobre la réplica conta_hogar_test (DC-59)');

        const ubicacion = await abrirRecibos(page);

        estado = { api: ubicacion.api, anio: ubicacion.anio, recibo: await conceptoUnico('e2e_gen_rec'), ahorro: null, anticipo: null };

        // Un recibo de hace dos años garantiza un candidato para la vista previa de hoy
        await crearReciboAnual(page, { ...estado, concepto: estado.recibo, fechaInicial: `${Number(estado.anio) - 2}-01-15` });

        try {
            await page.goto(urlDe('/settings'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await page.getByRole('tab', { name: 'Administrar recibos' }).click();
            await page.getByRole('button', { name: 'Vista previa de hoy' }).click();

            const generar = page.getByRole('button', { name: 'Generar ahora' });

            await expect(generar).toBeEnabled({ timeout: 30_000 });
            await generar.click();

            const dialogo = page.getByRole('dialog', { name: 'Confirmar' }).filter({ hasText: 'vista previa' });

            await expect(dialogo).toBeVisible();

            const ejecucion = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/ajustes\/recibos\/generar-anio$/.test(r.url()), { timeout: 60_000 });

            await dialogo.getByRole('button', { name: 'Sí' }).click();

            expect((await ejecucion).status()).toBe(200);
            await expect(page.getByText(/Recibos generados|Sin altas/)).toBeVisible({ timeout: 30_000 });
        } finally {
            const restos = await limpiarPorApi(page);

            expect(restos, 'la limpieza debe dejar la réplica como estaba').toBe(0);
        }
    });
});
