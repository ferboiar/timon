/**
 * Recibos: fallos de carga y capitalización del concepto (U-27, U-29; DC-31, DC-72).
 * ================================================================================
 *
 * Deducciones:
 * - `src/views/pages/ListBills.vue`: `onMounted` carga las cuatro periodicidades y los inactivos en
 *   un único `Promise.all`; desde U-27, si falla, deja las cinco listas vacías y muestra un toast
 *   con resumen «Error» y el mensaje del servidor (`getApiErrorMessage`, DC-72).
 * - `changeYear` y `resetYear` llaman a `reloadBills({ conservarExpansion: false })`; si esa recarga
 *   falla, U-27 vacía las cuatro listas de periodicidad para que no queden las filas del año
 *   anterior bajo la etiqueta del año nuevo. La recarga que conserva la expansión (después de
 *   guardar o de generar fechas) no vacía nada.
 * - DC-31: la base guarda los textos identificativos en minúsculas y la pantalla capitaliza la
 *   inicial con `capitalizar()`, en la columna «Concepto» de Anuales, Trimestrales, Bimestrales,
 *   Mensuales e Inactivos y en la etiqueta del desplegable de cuentas del formulario (el mismo
 *   criterio que la tabla de Cuentas). Es solo presentación: el filtro, la exportación y la
 *   comparación de DC-30 siguen usando el valor guardado.
 * - Las tarjetas de periodicidad paginan de 8 en 8 y ordenan por fecha, así que se filtran por su
 *   buscador antes de localizar la fila. La tarjeta «Inactivos» no tiene buscador y también pagina:
 *   se recorre con su paginador.
 *
 * Datos: `e2e_u27_rec_AAAAMMDD_HHMMSS` (26 caracteres; `recibos.concepto` es `varchar(30)`) y una
 * cuenta `e2e_u27_cta_AAAAMMDD_HHMMSS` (26; `cuentas.nombre` es `varchar(50)` y el servidor la
 * guarda en minúsculas). Se crean y se borran por API; `afterEach` comprueba que no quedan restos.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { filtrarPorBuscador, urlDe } from './helpers/timon.mjs';

/** Prefijos de los datos del caso: con `_AAAAMMDD_HHMMSS` quedan en 26 caracteres. */
const PREFIJO_CONCEPTO = 'e2e_u27_rec';
const PREFIJO_CUENTA = 'e2e_u27_cta';

/** `recibos.concepto` es `varchar(30)` (migración 0001_baseline.sql). */
const LONGITUD_MAXIMA_CONCEPTO = 30;

const conceptosUsados = new Set();

/** Estado del test en curso, para la limpieza segura de `afterEach`. */
let estado = {};

const dosDigitos = (numero) => String(numero).padStart(2, '0');

/** Capitalización que fija DC-31 (la misma que aplican Cuentas y ListBills). */
const capitalizado = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

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

/** Tarjeta cuyo título exacto es `titulo` (Anuales, Trimestrales, Bimestrales, Mensuales e Inactivos). */
function tarjeta(page, titulo) {
    return page.locator('.card').filter({ has: page.getByText(titulo, { exact: true }) });
}

/** Filas de datos de una tarjeta (las únicas que tienen papelera). */
function filasConBorrado(contenedor) {
    return contenedor.locator('table tbody tr:has(button .pi-trash)');
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

/** URL del listado de recibos de una periodicidad en un año. */
function urlRecibos(api, anio, periodicidad = 'anual') {
    const url = new URL(`${api}/api/recibos`);
    url.searchParams.set('periodicidad', periodicidad);
    url.searchParams.set('año', String(anio));

    return url.toString();
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

/** Ids de los recibos anuales de un concepto en el año del caso (el listado trae una fila por fecha de cargo). */
async function idsDeLosRecibos(page, { api, anio, concepto }) {
    return [...new Set((await listado(page, urlRecibos(api, anio))).filter((fila) => fila.concepto === concepto).map((fila) => fila.id))];
}

/**
 * Crea un recibo anual de prueba por API. Con `activo` en 0 el único cargo nace desactivado, así que
 * el recibo sale en la tarjeta «Inactivos» (`GET /api/recibos?activo=0`).
 */
async function crearRecibo(page, { api, anio, concepto, activo = 1 }) {
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

    if (activo === 0) {
        cuerpo.modoFechas = 'manual';
        cuerpo.cargo = [{ fecha: `${anio}-12-31`, estado: 'pendiente', comentario: '', activo: 0 }];
    }

    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/recibos`, cuerpo });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/recibos respondió ${respuesta.status}: ${respuesta.texto}`);
    }
}

/** Crea una cuenta cuyo nombre es (y se guarda) en minúsculas y devuelve su id. */
async function crearCuenta(page, { api, nombre }) {
    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/cuentas`, cuerpo: { nombre, tipo: 'corriente', iban: null, saldo_actual: 0, descripcion: '', activa: 1 } });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/cuentas respondió ${respuesta.status}: ${respuesta.texto}`);
    }

    const cuenta = (await listado(page, `${api}/api/cuentas`)).find((fila) => fila.nombre === nombre);

    if (!cuenta) throw new Error(`La cuenta ${nombre} no aparece en el listado tras crearla`);

    return cuenta.id;
}

/** Borra por API los datos de prueba que sigan existiendo y devuelve el total de restos. */
async function limpiarPorApi(page) {
    if (!estado.api) return 0;

    for (const concepto of estado.conceptos) {
        for (const id of await idsDeLosRecibos(page, { ...estado, concepto })) {
            await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/recibos/${id}?periodicidad=anual` });
        }
    }

    let restos = 0;

    for (const concepto of estado.conceptos) {
        restos += (await idsDeLosRecibos(page, { ...estado, concepto })).length;
    }

    if (estado.cuenta) {
        const sobrantes = (await listado(page, `${estado.api}/api/cuentas`)).filter((cuenta) => cuenta.nombre === estado.cuenta).map((cuenta) => cuenta.id);

        if (sobrantes.length > 0) {
            await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/cuentas`, cuerpo: { accounts: sobrantes } });
        }

        restos += (await listado(page, `${estado.api}/api/cuentas`)).filter((cuenta) => cuenta.nombre === estado.cuenta).length;
    }

    return restos;
}

/**
 * Fila del concepto en la tarjeta «Inactivos», que no tiene buscador y pagina de 8 en 8 (U-29).
 * Recorre las páginas hasta encontrarla y se apoya en el informe del paginador para no leer dos
 * veces la misma página.
 */
async function filaInactivaPorConcepto(page, concepto) {
    const tabla = tarjeta(page, 'Inactivos');

    await expect.poll(() => filasConBorrado(tabla).count(), { timeout: 20_000 }).toBeGreaterThan(0);

    const siguiente = tabla.locator('.p-paginator-next');
    const informe = tabla.locator('.p-paginator-current');

    for (;;) {
        const fila = filasConBorrado(tabla).filter({ hasText: new RegExp(concepto, 'i') }).first();

        if (await fila.count()) return fila;
        if ((await siguiente.count()) === 0 || (await siguiente.isDisabled())) return fila;

        const antes = await informe.innerText();

        await siguiente.click();
        await expect.poll(() => informe.innerText(), { timeout: 20_000 }).not.toBe(antes);
    }
}

test.describe('Recibos: carga y capitalización (U-27, U-29)', () => {
    test.beforeEach(async () => {
        estado = { api: null, anio: null, conceptos: [await conceptoUnico(PREFIJO_CONCEPTO), await conceptoUnico(PREFIJO_CONCEPTO)], cuenta: null };
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la carga o la capitalización de Recibos (U-27, U-29)');
        }

        try {
            const restos = await limpiarPorApi(page);

            if (restos > 0) {
                throw new Error(`Quedan ${restos} datos de prueba tras la limpieza`);
            }
        } catch (error) {
            console.warn(`[limpieza] ${estado.conceptos.join(', ')}: ${error.message}`);

            testInfo.annotations.push({ type: 'limpieza', description: `Revisar los datos de prueba: ${error.message}` });
        }
    });

    test('un fallo de la carga inicial avisa con Error y deja las tarjetas vacías (U-27)', async ({ paginaSesion: page }) => {
        const mensaje = 'Fallo simulado en la carga de recibos.';
        const fallar = async (ruta) => {
            if (ruta.request().method() !== 'GET') return ruta.fallback();

            await ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: mensaje }) });
        };

        await page.route(/\/api\/recibos/, fallar);

        try {
            await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();

            const aviso = page.locator('.p-toast-message').filter({ hasText: mensaje });

            await expect(aviso).toBeVisible({ timeout: 20_000 });
            await expect(aviso).toContainText('Error');

            // Ninguna tarjeta pinta filas: la pantalla no queda vacía sin explicación, avisa.
            for (const titulo of ['Anuales', 'Trimestrales', 'Bimestrales', 'Mensuales']) {
                await expect(filasConBorrado(tarjeta(page, titulo)), `la tarjeta ${titulo} no debería tener filas`).toHaveCount(0);
            }
        } finally {
            await page.unroute(/\/api\/recibos/, fallar);
        }
    });

    test('un fallo al cambiar de año no deja las filas del año anterior (U-27)', async ({ paginaSesion: page }) => {
        const concepto = estado.conceptos[0];

        Object.assign(estado, await abrirRecibos(page));

        await crearRecibo(page, { ...estado, concepto });
        await recargarRecibos(page);

        const tablaAnual = tarjeta(page, 'Anuales');

        await filtrarPorBuscador(tablaAnual, concepto);

        const fila = filasConBorrado(tablaAnual).filter({ hasText: new RegExp(concepto, 'i') }).first();

        await expect(fila).toBeVisible({ timeout: 20_000 });

        const anioAnterior = String(Number(estado.anio) - 1);
        const mensaje = 'Fallo simulado en la recarga del año anterior.';
        const fallar = async (ruta) => {
            const peticion = ruta.request();

            if (peticion.method() !== 'GET' || new URL(peticion.url()).searchParams.get('año') !== anioAnterior) return ruta.fallback();

            await ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: mensaje }) });
        };

        await page.route(/\/api\/recibos/, fallar);

        try {
            await page.locator('button:has(.pi-caret-left)').click();

            await expect(page.locator('.card').first().getByText(anioAnterior, { exact: true })).toBeVisible();

            const aviso = page.locator('.p-toast-message').filter({ hasText: mensaje });

            await expect(aviso).toBeVisible({ timeout: 20_000 });
            await expect(aviso).toContainText('Error');

            // La recarga del año nuevo ha fallado: no se queda la fila del año anterior bajo esa etiqueta.
            await expect(fila).toHaveCount(0, { timeout: 20_000 });
        } finally {
            await page.unroute(/\/api\/recibos/, fallar);
        }
    });

    test('el concepto se capitaliza en la tarjeta, en inactivos y en el desplegable de cuentas (U-29)', async ({ paginaSesion: page }) => {
        const [activo, inactivo] = estado.conceptos;

        estado.cuenta = await conceptoUnico(PREFIJO_CUENTA);

        Object.assign(estado, await abrirRecibos(page));

        await crearRecibo(page, { ...estado, concepto: activo });
        await crearRecibo(page, { ...estado, concepto: inactivo, activo: 0 });

        const cuentaId = await crearCuenta(page, { api: estado.api, nombre: estado.cuenta });

        await recargarRecibos(page);

        // La tarjeta Anuales muestra la inicial en mayúscula (DC-31)
        const tablaAnual = tarjeta(page, 'Anuales');

        await filtrarPorBuscador(tablaAnual, activo);

        const filaActiva = filasConBorrado(tablaAnual).filter({ hasText: new RegExp(activo, 'i') }).first();

        await expect(filaActiva).toBeVisible({ timeout: 20_000 });
        expect((await filaActiva.locator('td').first().innerText()).trim(), 'la tarjeta no capitaliza el concepto').toBe(capitalizado(activo));

        // La tabla de inactivos, igual
        const filaInactiva = await filaInactivaPorConcepto(page, inactivo);

        await expect(filaInactiva).toBeVisible({ timeout: 20_000 });
        expect((await filaInactiva.locator('td').first().innerText()).trim(), 'la tabla de inactivos no capitaliza el concepto').toBe(capitalizado(inactivo));

        // Es solo presentación: la API sigue devolviendo el concepto guardado en minúsculas
        const filasApi = await listado(page, urlRecibos(estado.api, estado.anio));

        expect(filasApi.filter((fila) => fila.concepto === activo).length, 'el concepto guardado debe seguir en minúsculas').toBeGreaterThan(0);

        // El desplegable de cuentas del formulario usa el mismo criterio que la tabla de Cuentas
        const cuentasApi = await listado(page, `${estado.api}/api/cuentas`);

        expect(cuentasApi.find((cuenta) => cuenta.id === cuentaId).nombre, 'el nombre guardado debe seguir en minúsculas').toBe(estado.cuenta);

        await page.getByRole('button', { name: 'Nuevo' }).click();

        const dialogo = page.getByRole('dialog', { name: 'Detalle del recibo' }).first();

        await expect(dialogo).toBeVisible();

        await dialogo.locator('#cuenta').click();

        await expect(page.getByRole('option', { name: capitalizado(estado.cuenta), exact: true }), 'el desplegable no capitaliza el nombre de la cuenta').toBeVisible({ timeout: 20_000 });

        await dialogo.getByRole('button', { name: 'Cancelar' }).click();
        await expect(dialogo).toBeHidden();
    });
});
