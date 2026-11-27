/**
 * Anticipos: fecha propuesta de un pago manual según la periodicidad (F-40).
 * ========================================================================
 *
 * Deducciones:
 * - `src/views/pages/Advances.vue`: `openNewPago` propone la fecha con
 *   `sumarMesAnclado(última fecha, día de fecha_inicio, mesesDePeriodicidad(periodicidad))`;
 *   `addNewPayment` (diálogo «Eliminar Pago» → «Añadirlo en un nuevo») usa la misma
 *   cadencia con la periodicidad del anticipo al que pertenece el pago.
 * - `src/utils/fechasAnticipos.js`: `mesesDePeriodicidad` traduce la periodicidad a meses
 *   (mensual 1, bimestral 2, trimestral 3, anual 12) y mantiene 1 sin periodicidad.
 * - `backend/src/routes/anticipos.mjs` y `backend/src/db/db_utilsAdv.mjs`: el anticipo se
 *   crea por API con `periodicidad: 'trimestral'` y `pago_sugerido: 0`, así que el servidor
 *   no genera el plan; el único pago se añade por API con fecha 2027-03-31.
 *
 * Caso: `fecha_inicio` 2027-01-31 (anclaje en el día 31) y dos pagos, 2026-12-31 y
 * 2027-03-31. La propuesta es 2027-06-30 (junio no tiene 31), no un mes fijo: la alta manual
 * parte del último pago y la sustitución, que descarta el pago que se borra, del último
 * restante (2027-03-31). No depende de la fecha de hoy.
 *
 * Datos: un anticipo `e2e_f40_ant_AAAAMMDD_HHMMSS` (`anticipos.concepto` es `varchar(30)`);
 * se borra por API en `afterEach`, que avisa si quedan restos. No se toca ningún otro dato.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { urlDe } from './helpers/timon.mjs';

/** Prefijo de los datos del caso: con `_AAAAMMDD_HHMMSS` queda en 27 caracteres. */
const PREFIJO = 'e2e_f40_ant';

/** `anticipos.concepto` es `varchar(30)`. */
const LONGITUD_MAXIMA_CONCEPTO = 30;

const FECHA_INICIO = '2027-01-31';
const FECHA_PAGO_ANTERIOR = '2026-12-31';
const FECHA_PAGO = '2027-03-31';

/** Fecha que debe proponer la pantalla, en el formato `dd/mm/yy` del DatePicker. */
const FECHA_PROPUESTA = '30/06/2027';

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

/** Fila de la tabla que contiene el texto (Playwright compara sin distinguir mayúsculas). */
function filaPorTexto(page, texto) {
    return page.locator('table tbody tr').filter({ hasText: texto }).first();
}

/** Fila de expansión del anticipo (la tabla de pagos vive dentro). */
function expansionDelAnticipo(page, concepto) {
    return page.locator('tr.p-datatable-row-expansion').filter({ hasText: concepto }).first();
}

/** Anticipos del listado cuyo concepto coincide exactamente. */
async function anticiposPorConcepto(page, { api, concepto }) {
    return (await listado(page, `${api}/api/anticipos`)).filter((anticipo) => anticipo.concepto === concepto);
}

/** IDs del anticipo por concepto. */
async function idsDeConcepto(page, { api, concepto }) {
    return (await anticiposPorConcepto(page, { api, concepto })).map((anticipo) => anticipo.id);
}

/**
 * Crea un anticipo trimestral por API con dos pagos conocidos (2026-12-31 y 2027-03-31).
 * `pago_sugerido: 0` evita que el servidor genere el plan automático.
 */
async function crearAnticipoTrimestralConPago(page, { api, concepto, cuentaId }) {
    const cuerpo = {
        concepto,
        importe_original: 100,
        pago_sugerido: 0,
        fecha_inicio: FECHA_INICIO,
        fecha_fin_prevista: '2027-12-31',
        descripcion: '',
        estado: 'activo',
        cuenta_origen_id: cuentaId,
        periodicidad: 'trimestral'
    };

    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/anticipos`, cuerpo });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/anticipos respondió ${respuesta.status}: ${respuesta.texto}`);
    }

    const [anticipo] = await anticiposPorConcepto(page, { api, concepto });

    if (!anticipo) {
        throw new Error(`El anticipo ${concepto} no aparece en el listado tras crearlo`);
    }

    for (const fecha of [FECHA_PAGO_ANTERIOR, FECHA_PAGO]) {
        const pago = {
            anticipo_id: anticipo.id,
            importe: 10,
            fecha,
            tipo: 'regular',
            descripcion: '',
            estado: 'pendiente',
            cuenta_destino_id: cuentaId
        };
        const creado = await peticionApi(page, { metodo: 'POST', url: `${api}/api/anticipos/pagos`, cuerpo: pago });

        if (creado.status !== 201) {
            throw new Error(`POST /api/anticipos/pagos respondió ${creado.status}: ${creado.texto}`);
        }
    }

    const pagos = await listado(page, `${api}/api/anticipos/${anticipo.id}/pagos`);
    const fechas = pagos.map((p) => String(p.fecha).slice(0, 10)).join(',');

    if (fechas !== `${FECHA_PAGO_ANTERIOR},${FECHA_PAGO}`) {
        throw new Error(`El anticipo ${concepto} debería tener los pagos ${FECHA_PAGO_ANTERIOR} y ${FECHA_PAGO} y tiene ${fechas}`);
    }

    return anticipo.id;
}

/** Borra por API el anticipo de prueba si sigue existiendo y devuelve el total de restos. */
async function limpiarPorApi(page) {
    if (!estado.api || !estado.concepto) return 0;

    const ids = await idsDeConcepto(page, { api: estado.api, concepto: estado.concepto });

    if (ids.length > 0) {
        await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/anticipos`, cuerpo: { advances: ids } });
    }

    return (await idsDeConcepto(page, { api: estado.api, concepto: estado.concepto })).length;
}

/** Recarga la pantalla, espera la fila del anticipo y la expande con sus pagos. */
async function expandirAnticipo(page, concepto) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible({ timeout: 20_000 });

    const fila = filaPorTexto(page, concepto);

    await expect(fila).toBeVisible({ timeout: 20_000 });
    await fila.locator('button[aria-expanded]').click();

    const expansion = expansionDelAnticipo(page, concepto);

    await expect(expansion).toBeVisible({ timeout: 20_000 });
    // `openNewPago` usa los pagos ya cargados: se espera a las filas de 2026-12-31 y 2027-03-31
    await expect(expansion.locator('table tbody tr')).toHaveCount(2, { timeout: 20_000 });
    await expect(expansion).toContainText('diciembre de 2026');
    await expect(expansion).toContainText('marzo de 2027');

    return { fila, expansion };
}

test.describe('Anticipos: fecha propuesta según la periodicidad (F-40)', () => {
    test.beforeEach(async ({ paginaSesion: page }) => {
        estado = { api: null, cuentaId: null, concepto: await conceptoUnico(PREFIJO) };
        estado.api = await abrirAnticipos(page);

        const cuentas = await listado(page, `${estado.api}/api/cuentas`);

        if (cuentas.length === 0) throw new Error('La base no tiene cuentas con las que crear el anticipo de prueba.');

        estado.cuentaId = cuentas[0].id;
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la fecha propuesta de un pago de anticipo (F-40)');
        }

        try {
            const restos = await limpiarPorApi(page);

            if (restos > 0) {
                throw new Error(`Quedan ${restos} anticipos de prueba tras la limpieza`);
            }
        } catch (error) {
            console.warn(`[limpieza] ${estado.concepto}: ${error.message}`);

            testInfo.annotations.push({ type: 'limpieza', description: `Revisar el anticipo de prueba: ${error.message}` });
        }
    });

    test('«Añadir un pago» y «Añadirlo en un nuevo» proponen la fecha trimestral anclada', async ({ paginaSesion: page }) => {
        await crearAnticipoTrimestralConPago(page, { api: estado.api, concepto: estado.concepto, cuentaId: estado.cuentaId });

        const { fila, expansion } = await expandirAnticipo(page, estado.concepto);
        // PrimeVue aplica el `id` al contenedor del DatePicker; el valor vive en su input
        const fecha = page.locator('#pago_fecha input');

        // Alta manual desde la fila del anticipo: la propuesta respeta la periodicidad
        await fila.locator('button:has(.pi-plus)').click();

        const dialogoPago = page.getByRole('dialog', { name: 'Detalle del pago' });

        await expect(dialogoPago).toBeVisible();
        await expect(fecha).toHaveValue(FECHA_PROPUESTA);
        await dialogoPago.getByRole('button', { name: 'Cancelar' }).click();
        await expect(dialogoPago).toBeHidden();

        // Sustitución desde el borrado del pago anterior: el último restante es el 2027-03-31
        await expansion.locator('table tbody tr').filter({ hasText: 'diciembre de 2026' }).locator('button:has(.pi-trash)').click();

        const dialogoBorrado = page.getByRole('dialog', { name: 'Eliminar Pago' });

        await expect(dialogoBorrado).toBeVisible();
        await dialogoBorrado.getByRole('button', { name: 'Añadirlo en un nuevo' }).click();

        await expect(dialogoBorrado).toBeHidden();
        await expect(dialogoPago).toBeVisible();
        await expect(fecha).toHaveValue(FECHA_PROPUESTA);

        // Se cierra el diálogo para no dejar un modal abierto en la sesión compartida
        await dialogoPago.getByRole('button', { name: 'Cancelar' }).click();
        await expect(dialogoPago).toBeHidden();
    });
});
