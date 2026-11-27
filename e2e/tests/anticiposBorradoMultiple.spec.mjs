/**
 * Anticipos: borrado múltiple desde la barra (F-39).
 * =================================================
 *
 * Deducciones:
 * - `src/views/pages/Advances.vue`: el `DataTable` usa `selectionMode="multiple"` con
 *   `metaKeySelection` en falso (valor por defecto de PrimeVue), así que el clic en una celda de la
 *   fila acumula la selección y marca `data-p-selected="true"`; el botón «Borrar» de la barra
 *   depende de `selectedAdvances.length` y abre `deleteSelectedAdvancesDialog` (`header="Confirmar"`,
 *   «No»/«Sí»).
 * - `deleteSelectedAdvances` llama a `AdvService.deleteAdvances(ids)`, que envía
 *   `DELETE /api/anticipos` con `{ advances: ids }` (`backend/src/routes/anticipos.mjs`), limpia la
 *   selección, recarga anticipos y pagos, cierra el diálogo y avisa con el resumen «Éxito» (DC-72).
 *   Si el servidor falla, avisa con «Error» y `getApiErrorMessage`, conserva las filas y deja el
 *   diálogo abierto para reintentar.
 * - Uno de los dos anticipos lleva un pago: el borrado en lote se lleva también sus pagos.
 *
 * Datos: dos anticipos `e2e_f39_ant_AAAAMMDD_HHMMSS` (`anticipos.concepto` es `varchar(30)`); se
 * borran por API en `afterEach` y se exige que no queden restos. No se toca ningún otro dato.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { urlDe } from './helpers/timon.mjs';

/** Prefijo de los datos del caso: con `_AAAAMMDD_HHMMSS` queda en 27 caracteres. */
const PREFIJO = 'e2e_f39_ant';

/** `anticipos.concepto` es `varchar(30)`. */
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

/** Abre Anticipos y devuelve el origen de la API a partir del primer listado. */
async function abrirAnticipos(page) {
    const respuestas = [];
    const manejador = (respuesta) => {
        if (respuesta.request().method() === 'GET' && /\/api\/anticipos$/.test(respuesta.url())) respuestas.push(respuesta);
    };

    page.on('response', manejador);

    try {
        await page.goto(urlDe('/pages/advances'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);

        return new URL(respuestas[0].url()).origin;
    } finally {
        page.off('response', manejador);
    }
}

/** Fila de la tabla por su texto, sin distinguir mayúsculas (la pantalla capitaliza). */
function filaPorTexto(page, texto) {
    return page
        .locator('table tbody tr')
        .filter({ hasText: new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
        .first();
}

/** Anticipos del listado cuyo concepto coincide exactamente. */
async function anticiposPorConcepto(page, { api, concepto }) {
    return (await listado(page, `${api}/api/anticipos`)).filter((anticipo) => anticipo.concepto === concepto);
}

/** IDs del anticipo por concepto. */
async function idsDeConcepto(page, { api, concepto }) {
    return (await anticiposPorConcepto(page, { api, concepto })).map((anticipo) => anticipo.id);
}

/** Crea un anticipo activo por API; con `conPago`, le añade un pago pendiente. */
async function crearAnticipo(page, { api, concepto, cuentaId, conPago = false }) {
    const cuerpo = {
        concepto,
        importe_original: 100,
        pago_sugerido: 0,
        fecha_inicio: '2027-01-31',
        fecha_fin_prevista: '2027-12-31',
        descripcion: '',
        estado: 'activo',
        cuenta_origen_id: cuentaId,
        periodicidad: null
    };

    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/anticipos`, cuerpo });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/anticipos respondió ${respuesta.status}: ${respuesta.texto}`);
    }

    const [anticipo] = await anticiposPorConcepto(page, { api, concepto });

    if (!anticipo) {
        throw new Error(`El anticipo ${concepto} no aparece en el listado tras crearlo`);
    }

    if (conPago) {
        const pago = {
            anticipo_id: anticipo.id,
            importe: 10,
            fecha: '2027-02-28',
            tipo: 'regular',
            descripcion: '',
            estado: 'pendiente',
            cuenta_destino_id: cuentaId
        };
        const creado = await peticionApi(page, { metodo: 'POST', url: `${api}/api/anticipos/pagos`, cuerpo: pago });

        if (creado.status !== 201) {
            throw new Error(`POST /api/anticipos/pagos respondió ${creado.status}: ${creado.texto}`);
        }

        const pagos = await listado(page, `${api}/api/anticipos/${anticipo.id}/pagos`);

        if (pagos.length !== 1) {
            throw new Error(`El anticipo ${concepto} debería tener un pago y tiene ${pagos.length}`);
        }
    }

    return anticipo.id;
}

/** Borra por API los anticipos de prueba que sigan existiendo y devuelve el total de restos. */
async function limpiarPorApi(page) {
    if (!estado.api) return 0;

    let restos = 0;

    for (const concepto of estado.conceptos ?? []) {
        const ids = await idsDeConcepto(page, { api: estado.api, concepto });

        if (ids.length > 0) {
            await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/anticipos`, cuerpo: { advances: ids } });
        }

        restos += (await idsDeConcepto(page, { api: estado.api, concepto })).length;
    }

    return restos;
}

/** Diálogo de confirmación del borrado múltiple. */
function dialogoBorradoMultiple(page) {
    return page.getByRole('dialog', { name: 'Confirmar' }).filter({ hasText: 'anticipos seleccionados' });
}

/** Recarga la pantalla y espera a la barra y a las dos filas de prueba. */
async function recargarYEsperarFilas(page, conceptos) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible({ timeout: 20_000 });

    const filas = conceptos.map((concepto) => filaPorTexto(page, concepto));

    for (const fila of filas) {
        await expect(fila).toBeVisible({ timeout: 20_000 });
    }

    return filas;
}

test.describe('Anticipos: borrado múltiple desde la barra (F-39)', () => {
    test.beforeEach(async ({ paginaSesion: page }) => {
        estado = { api: null, cuentaId: null, conceptos: [await conceptoUnico(PREFIJO), await conceptoUnico(PREFIJO)] };
        estado.api = await abrirAnticipos(page);

        const cuentas = await listado(page, `${estado.api}/api/cuentas`);

        if (cuentas.length === 0) throw new Error('La base no tiene cuentas con las que crear los anticipos de prueba.');

        estado.cuentaId = cuentas[0].id;
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el borrado múltiple de anticipos (F-39)');
        }

        try {
            const restos = await limpiarPorApi(page);

            if (restos > 0) {
                throw new Error(`Quedan ${restos} anticipos de prueba tras la limpieza`);
            }
        } catch (error) {
            console.warn(`[limpieza] ${estado.conceptos?.join(', ')}: ${error.message}`);

            testInfo.annotations.push({ type: 'limpieza', description: `Revisar los anticipos de prueba: ${error.message}` });
        }
    });

    test('cancelar conserva las filas y confirmar borra los dos anticipos', async ({ paginaSesion: page }) => {
        const [conPago, sinPago] = estado.conceptos;

        await crearAnticipo(page, { api: estado.api, concepto: conPago, cuentaId: estado.cuentaId, conPago: true });
        await crearAnticipo(page, { api: estado.api, concepto: sinPago, cuentaId: estado.cuentaId });

        const [filaConPago, filaSinPago] = await recargarYEsperarFilas(page, estado.conceptos);
        const borrar = page.getByRole('button', { name: 'Borrar', exact: true });

        await expect(borrar).toBeDisabled();

        // La selección es acumulativa con clic simple (metaKeySelection en falso)
        await filaConPago.locator('td').nth(1).click();
        await expect(filaConPago).toHaveAttribute('data-p-selected', 'true');
        await filaSinPago.locator('td').nth(1).click();
        await expect(filaSinPago).toHaveAttribute('data-p-selected', 'true');
        await expect(borrar).toBeEnabled();

        // «No» cierra el diálogo, no envía ninguna petición y conserva la selección
        let borrados = 0;
        const contarBorrados = (peticion) => {
            if (peticion.method() === 'DELETE' && /\/api\/anticipos$/.test(peticion.url())) borrados += 1;
        };

        page.on('request', contarBorrados);

        await borrar.click();

        const dialogo = dialogoBorradoMultiple(page);

        await expect(dialogo).toBeVisible();
        await dialogo.getByRole('button', { name: 'No' }).click();
        await expect(dialogo).toBeHidden();

        page.off('request', contarBorrados);
        expect(borrados, 'cancelar el borrado múltiple no debe enviar ninguna petición').toBe(0);
        await expect(filaConPago).toBeVisible();
        await expect(filaSinPago).toBeVisible();
        await expect(filaConPago).toHaveAttribute('data-p-selected', 'true');
        await expect(filaSinPago).toHaveAttribute('data-p-selected', 'true');

        // «Sí» envía un único DELETE con los dos IDs y recarga la lista
        const respuestas = [];
        const recoger = (respuesta) => {
            if (respuesta.request().method() === 'DELETE' && /\/api\/anticipos$/.test(respuesta.url())) respuestas.push(respuesta.status());
        };

        page.on('response', recoger);

        await borrar.click();
        await expect(dialogo).toBeVisible();
        await dialogo.getByRole('button', { name: 'Sí' }).click();

        await expect.poll(() => respuestas.length, { timeout: 30_000 }).toBe(1);
        page.off('response', recoger);
        expect(respuestas).toEqual([200]);

        const aviso = page.locator('.p-toast-message').filter({ hasText: 'Anticipos eliminados' });

        await expect(aviso).toBeVisible({ timeout: 20_000 });
        await expect(aviso).toContainText('Éxito');

        await expect(filaConPago).toHaveCount(0, { timeout: 20_000 });
        await expect(filaSinPago).toHaveCount(0, { timeout: 20_000 });
        await expect(borrar).toBeDisabled();

        expect(await idsDeConcepto(page, { api: estado.api, concepto: conPago })).toEqual([]);
        expect(await idsDeConcepto(page, { api: estado.api, concepto: sinPago })).toEqual([]);
    });

    test('un 500 del servidor muestra Error y conserva las filas y el diálogo', async ({ paginaSesion: page }) => {
        for (const concepto of estado.conceptos) {
            await crearAnticipo(page, { api: estado.api, concepto, cuentaId: estado.cuentaId });
        }

        const [filaA, filaB] = await recargarYEsperarFilas(page, estado.conceptos);
        const borrar = page.getByRole('button', { name: 'Borrar', exact: true });

        await filaA.locator('td').nth(1).click();
        await filaB.locator('td').nth(1).click();
        await expect(borrar).toBeEnabled();

        const mensaje = 'Fallo simulado en el borrado de anticipos.';
        let interceptado = false;
        const fallar = async (route) => {
            // Solo el primer DELETE del flujo: la limpieza de afterEach pasa de largo
            if (route.request().method() !== 'DELETE' || interceptado) return route.fallback();

            interceptado = true;
            await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: mensaje }) });
        };

        await page.route(/\/api\/anticipos$/, fallar);

        try {
            await borrar.click();

            const dialogo = dialogoBorradoMultiple(page);

            await expect(dialogo).toBeVisible();
            await dialogo.getByRole('button', { name: 'Sí' }).click();

            const aviso = page.locator('.p-toast-message').filter({ hasText: mensaje });

            await expect(aviso).toBeVisible({ timeout: 20_000 });
            await expect(aviso).toContainText('Error');

            // El diálogo sigue abierto para reintentar y las dos filas se conservan
            await expect(dialogo).toBeVisible();
            await expect(filaA).toBeVisible();
            await expect(filaB).toBeVisible();
            expect(await idsDeConcepto(page, { api: estado.api, concepto: estado.conceptos[0] })).toHaveLength(1);
            expect(await idsDeConcepto(page, { api: estado.api, concepto: estado.conceptos[1] })).toHaveLength(1);
        } finally {
            await page.unroute(/\/api\/anticipos$/, fallar);
        }
    });
});
