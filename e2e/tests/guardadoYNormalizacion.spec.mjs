/**
 * Guardar sin cambios y normalización a minúsculas (U-21, F-45, F-44, DC-30, DC-31).
 * =================================================================================
 *
 * Deducciones:
 * - `ListBills.vue`: `guardarRecibo` compara `bill.value` con `billOriginal` y, desde F-45, solo da
 *   el guardado por «sin cambios» si `modoFechas` sigue en manual; `editBill` abre siempre en manual
 *   (F-04). El diálogo es `header="Detalle del recibo"`, con `#concepto` y los radios `#modo-manual`
 *   y `#modo-auto` («Generar fechas automáticamente»).
 * - `Savings.vue`: `saveSaving` compara `snapshotSaving(saving)` con `savingOriginal` y, sin cambios,
 *   avisa con «No se ha cambiado nada.» sin llamar al servicio (DC-30). El diálogo es
 *   `header="Detalle del ahorro"`, con `#concepto` y `#ahorrado`.
 * - `backend/src/db/db_utils.mjs` y `db_utilsSav.mjs`: `pushRecibo` y `pushSaving` guardan concepto
 *   con `trim().toLowerCase()` (F-44, DC-31). En Ahorros la pantalla capitaliza la inicial al mostrar
 *   (DC-31); Recibos la pinta tal cual llega.
 *
 * El spec crea sus datos `e2e_`: un recibo por API para F-45 y F-44 (se edita su concepto a
 * mayúsculas desde la pantalla) y un ahorro por la interfaz para DC-30 y F-44. La API debe devolver
 * el texto en minúsculas; la comparación con la pantalla no distingue mayúsculas, para no fijar el
 * comportamiento de capitalización que revisa U-29. Limpieza por API en `afterEach`.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { filtrarPorBuscador, urlDe } from './helpers/timon.mjs';

/** `recibos.concepto` y `ahorros.concepto` son `varchar(30)`. */
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

/** Fila de una tabla por su texto, sin distinguir mayúsculas (DC-31: la pantalla capitaliza). */
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

/** Ids de un recibo por concepto y periodicidad (el listado trae una fila por fecha de cargo). */
async function idsDelRecibo(page, { api, anio, concepto, periodicidad }) {
    const url = new URL(`${api}/api/recibos`);
    url.searchParams.set('periodicidad', periodicidad);
    url.searchParams.set('año', String(anio));

    const filas = await listado(page, url.toString());

    return [...new Set(filas.filter((fila) => fila.concepto === concepto).map((fila) => fila.id))];
}

/** Ids de un ahorro por concepto. */
async function idsDelAhorro(page, { api, concepto }) {
    const filas = await listado(page, `${api}/api/ahorros`);

    return filas.filter((fila) => fila.concepto === concepto).map((fila) => fila.id);
}

/** Crea un recibo de prueba en modo automático (un solo cargo el 31 de diciembre). */
async function crearRecibo(page, { api, anio, concepto }) {
    const categorias = await listado(page, `${api}/api/categorias`);
    const cuentas = await listado(page, `${api}/api/cuentas`);

    if (categorias.length === 0) throw new Error('La base no tiene categorías con las que crear el recibo de prueba.');
    if (cuentas.length === 0) throw new Error('La base no tiene cuentas con las que crear el recibo de prueba.');

    const cuerpo = {
        concepto,
        periodicidad: 'anual',
        importe: 10,
        categoria: categorias[0].nombre,
        cuenta_id: cuentas[0].id,
        fecha_inicial: `${anio}-12-31`,
        modoFechas: 'auto',
        cargo: []
    };

    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/recibos`, cuerpo });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/recibos respondió ${respuesta.status}: ${respuesta.texto}`);
    }
}

/** Abre Recibos y devuelve el origen de la API y el año que pinta la pantalla. */
async function abrirRecibos(page) {
    const respuestas = [];
    const manejador = (respuesta) => {
        if (respuesta.request().method() === 'GET' && respuesta.url().includes('/api/recibos') && new URL(respuesta.url()).searchParams.has('año')) respuestas.push(respuesta);
    };

    page.on('response', manejador);

    try {
        await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);

        const url = new URL(respuestas[0].url());

        return { api: url.origin, anio: url.searchParams.get('año') };
    } finally {
        page.off('response', manejador);
    }
}

/** Abre Ahorros y devuelve el origen de la API. */
async function abrirAhorros(page) {
    const respuestas = [];
    const manejador = (respuesta) => {
        if (respuesta.request().method() === 'GET' && /\/api\/ahorros$/.test(respuesta.url())) respuestas.push(respuesta);
    };

    page.on('response', manejador);

    try {
        await page.goto(urlDe('/pages/savings'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);

        return new URL(respuestas[0].url()).origin;
    } finally {
        page.off('response', manejador);
    }
}

/** Recarga Recibos y espera a que vuelva a pedir el listado. */
async function recargarRecibos(page) {
    const respuestas = [];
    const manejador = (respuesta) => {
        if (respuesta.request().method() === 'GET' && respuesta.url().includes('/api/recibos') && new URL(respuesta.url()).searchParams.has('año')) respuestas.push(respuesta);
    };

    page.on('response', manejador);

    try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);
    } finally {
        page.off('response', manejador);
    }
}

/** Recarga Ahorros y espera a que vuelva a pedir el listado. */
async function recargarAhorros(page) {
    const respuestas = [];
    const manejador = (respuesta) => {
        if (respuesta.request().method() === 'GET' && /\/api\/ahorros$/.test(respuesta.url())) respuestas.push(respuesta);
    };

    page.on('response', manejador);

    try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);
    } finally {
        page.off('response', manejador);
    }
}

/** Borra por API los datos de prueba que sigan existiendo y devuelve el total de restos. */
async function limpiarPorApi(page) {
    if (!estado.api) return 0;

    if (estado.recibo) {
        for (const id of await idsDelRecibo(page, { ...estado, concepto: estado.recibo, periodicidad: 'anual' })) {
            await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/recibos/${id}?periodicidad=anual` });
        }
    }

    if (estado.ahorro) {
        const ids = await idsDelAhorro(page, { ...estado, concepto: estado.ahorro });

        if (ids.length > 0) {
            await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/ahorros`, cuerpo: { savings: ids } });
        }
    }

    let restos = 0;

    if (estado.recibo) restos += (await idsDelRecibo(page, { ...estado, concepto: estado.recibo, periodicidad: 'anual' })).length;
    if (estado.ahorro) restos += (await idsDelAhorro(page, { ...estado, concepto: estado.ahorro })).length;

    return restos;
}

test.describe('Recibos: guardar sin cambios y normalización (U-21)', () => {
    test.beforeEach(async ({ paginaSesion: page }) => {
        estado = { api: null, anio: null, recibo: null, ahorro: null };

        const ubicacion = await abrirRecibos(page);

        estado.api = ubicacion.api;
        estado.anio = ubicacion.anio;
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el guardado sin cambios o la normalización de Recibos (U-21)');
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

    test('guardar sin tocar nada no envía la petición y pasar a automático sí lo hace (F-45)', async ({ paginaSesion: page }) => {
        estado.recibo = await conceptoUnico('e2e_f45_rec');
        expect(estado.recibo).toMatch(/^e2e_f45_rec_\d{8}_\d{6}$/);

        await crearRecibo(page, { ...estado, concepto: estado.recibo });
        await recargarRecibos(page);

        await filtrarPorBuscador(tarjeta(page, 'Anuales'), estado.recibo);

        const fila = filasConBorrado(tarjeta(page, 'Anuales')).filter({ hasText: estado.recibo }).first();

        await expect(fila).toBeVisible({ timeout: 20_000 });

        const peticiones = [];
        const observarGuardado = async (ruta) => {
            const peticion = ruta.request();

            if (peticion.method() === 'POST') peticiones.push(peticion.postDataJSON());

            await ruta.continue();
        };

        await page.route(/\/api\/recibos$/, observarGuardado);

        try {
            // DC-30: abrir y guardar sin tocar nada no envía nada
            await fila.locator('button:has(.pi-pencil)').first().click();

            const dialogo = page.getByRole('dialog', { name: 'Detalle del recibo' }).first();

            await expect(dialogo).toBeVisible();
            await dialogo.getByRole('button', { name: 'Guardar' }).click();
            await expect(page.getByText('No se ha cambiado nada.')).toBeVisible({ timeout: 10_000 });
            await expect(dialogo).toBeHidden();

            expect(peticiones, 'guardar sin cambios no debe enviar la petición').toHaveLength(0);

            // F-45: pasar solo el modo de fechas a automático cuenta como cambio y sí se envía
            await fila.locator('button:has(.pi-pencil)').first().click();

            const dialogoAuto = page.getByRole('dialog', { name: 'Detalle del recibo' }).first();

            await expect(dialogoAuto).toBeVisible();
            await dialogoAuto.getByLabel('Generar fechas automáticamente').click();

            const guardado = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/recibos$/.test(r.url()), { timeout: 30_000 });

            await dialogoAuto.getByRole('button', { name: 'Guardar' }).click();

            expect((await guardado).status()).toBe(201);
            expect(peticiones, 'pasar a automático debe enviar una petición').toHaveLength(1);
            expect(peticiones[0].modoFechas).toBe('auto');
        } finally {
            await page.unroute(/\/api\/recibos$/, observarGuardado);
        }
    });

    test('un concepto en mayúsculas se guarda en minúsculas (F-44)', async ({ paginaSesion: page }) => {
        estado.recibo = await conceptoUnico('e2e_f44_rec');
        expect(estado.recibo).toMatch(/^e2e_f44_rec_\d{8}_\d{6}$/);

        await crearRecibo(page, { ...estado, concepto: estado.recibo });
        await recargarRecibos(page);

        const tarjetaAnual = tarjeta(page, 'Anuales');

        await filtrarPorBuscador(tarjetaAnual, estado.recibo);

        const fila = filasConBorrado(tarjetaAnual).filter({ hasText: estado.recibo }).first();

        await expect(fila).toBeVisible({ timeout: 20_000 });

        // Se edita el concepto en mayúsculas desde la pantalla
        await fila.locator('button:has(.pi-pencil)').first().click();

        const dialogo = page.getByRole('dialog', { name: 'Detalle del recibo' }).first();

        await expect(dialogo).toBeVisible();

        const conceptoEnMayusculas = estado.recibo.toUpperCase();

        await dialogo.locator('#concepto').fill(conceptoEnMayusculas);

        const guardado = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/recibos$/.test(r.url()), { timeout: 30_000 });

        await dialogo.getByRole('button', { name: 'Guardar' }).click();

        expect((await guardado).status()).toBe(201);
        await expect(dialogo).toBeHidden({ timeout: 20_000 });

        // La API devuelve el texto exactamente en minúsculas
        const url = new URL(`${estado.api}/api/recibos`);
        url.searchParams.set('periodicidad', 'anual');
        url.searchParams.set('año', String(estado.anio));

        const filasApi = await listado(page, url.toString());
        const guardada = filasApi.find((filaApi) => String(filaApi.concepto).toLowerCase() === estado.recibo);

        expect(guardada, 'el recibo normalizado debe aparecer en la API').toBeTruthy();
        expect(guardada.concepto).toBe(estado.recibo);

        // La pantalla puede capitalizar (U-29 pendiente): se compara sin distinguir mayúsculas
        await recargarRecibos(page);
        await filtrarPorBuscador(tarjeta(page, 'Anuales'), estado.recibo);

        const filaGuardada = filasConBorrado(tarjeta(page, 'Anuales'))
            .filter({ hasText: new RegExp(estado.recibo, 'i') })
            .first();

        await expect(filaGuardada).toBeVisible({ timeout: 20_000 });

        const textoPantalla = (await filaGuardada.locator('td').first().innerText()).trim().toLowerCase();

        expect(textoPantalla).toContain(estado.recibo);
    });
});

test.describe('Ahorros: guardar sin cambios y normalización (U-21)', () => {
    test.beforeEach(async ({ paginaSesion: page }) => {
        estado = { api: null, anio: null, recibo: null, ahorro: null };
        estado.api = await abrirAhorros(page);
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el guardado sin cambios o la normalización de Ahorros (U-21)');
        }

        try {
            const restos = await limpiarPorApi(page);

            if (restos > 0) {
                throw new Error(`Quedan ${restos} datos de prueba tras la limpieza`);
            }
        } catch (error) {
            console.warn(`[limpieza] ${estado.ahorro}: ${error.message}`);

            testInfo.annotations.push({ type: 'limpieza', description: `Revisar los datos de prueba: ${error.message}` });
        }
    });

    test('guardar sin tocar nada no envía la petición (DC-30)', async ({ paginaSesion: page }) => {
        estado.ahorro = await conceptoUnico('e2e_dc30_aho');
        expect(estado.ahorro).toMatch(/^e2e_dc30_aho_\d{8}_\d{6}$/);

        const alta = await peticionApi(page, { metodo: 'POST', url: `${estado.api}/api/ahorros`, cuerpo: { concepto: estado.ahorro, descripcion: '', ahorrado: 10, activo: 1 } });

        expect(alta.status).toBe(201);

        await recargarAhorros(page);

        const fila = filaPorTexto(page, estado.ahorro);

        await expect(fila).toBeVisible({ timeout: 20_000 });

        const peticiones = [];
        const observarGuardado = async (ruta) => {
            const peticion = ruta.request();

            if (peticion.method() === 'POST') peticiones.push(peticion.postDataJSON());

            await ruta.continue();
        };

        await page.route(/\/api\/ahorros$/, observarGuardado);

        try {
            await fila.locator('button:has(.pi-pencil)').first().click();

            const dialogo = page.getByRole('dialog', { name: 'Detalle del ahorro' });

            await expect(dialogo).toBeVisible();
            await dialogo.getByRole('button', { name: 'Guardar' }).click();
            await expect(page.getByText('No se ha cambiado nada.')).toBeVisible({ timeout: 10_000 });
            await expect(dialogo).toBeHidden();

            expect(peticiones, 'guardar sin cambios no debe enviar la petición').toHaveLength(0);
        } finally {
            await page.unroute(/\/api\/ahorros$/, observarGuardado);
        }
    });

    test('un concepto en mayúsculas se guarda en minúsculas (F-44)', async ({ paginaSesion: page }) => {
        estado.ahorro = await conceptoUnico('e2e_f44_aho');
        expect(estado.ahorro).toMatch(/^e2e_f44_aho_\d{8}_\d{6}$/);

        await page.getByRole('button', { name: 'Nuevo' }).click();

        const dialogo = page.getByRole('dialog', { name: 'Detalle del ahorro' });

        await expect(dialogo).toBeVisible();

        const conceptoEnMayusculas = estado.ahorro.toUpperCase();

        await dialogo.locator('#concepto').fill(conceptoEnMayusculas);

        const guardado = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/ahorros$/.test(r.url()), { timeout: 30_000 });

        await dialogo.getByRole('button', { name: 'Guardar' }).click();

        expect((await guardado).status()).toBe(201);
        await expect(dialogo).toBeHidden({ timeout: 20_000 });

        // La API devuelve el concepto exactamente en minúsculas
        const ahorros = await listado(page, `${estado.api}/api/ahorros`);
        const guardadoApi = ahorros.find((ahorro) => String(ahorro.concepto).toLowerCase() === estado.ahorro);

        expect(guardadoApi, 'el ahorro normalizado debe aparecer en la API').toBeTruthy();
        expect(guardadoApi.concepto).toBe(estado.ahorro);

        // La pantalla capitaliza la inicial (DC-31, U-29): se compara sin distinguir mayúsculas
        await recargarAhorros(page);

        const fila = filaPorTexto(page, estado.ahorro);

        await expect(fila).toBeVisible({ timeout: 20_000 });

        const textoPantalla = (await fila.locator('td').first().innerText()).trim().toLowerCase();

        expect(textoPantalla).toContain(estado.ahorro);
    });
});
