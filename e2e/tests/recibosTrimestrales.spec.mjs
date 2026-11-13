/**
 * Recibos: selección de trimestrales y diálogo de borrado (U-15, F-30 y F-31).
 * ======================================================================
 *
 * Deducciones (código de `main` en `bd343a3`):
 * - `src/router/index.js`: `/pages/bills` carga `src/views/pages/ListBills.vue`.
 * - `ListBills.vue`: cuatro tarjetas (Anuales, Trimestrales, Bimestrales, Mensuales). El botón
 *   `pi-ellipsis-v` de cada tarjeta abre el menú con «Multiselección» (`toggleCardMenu` +
 *   `showSelector`); la columna de selección solo se pinta cuando `showSelectionColumn[...]`
 *   es true y ese estado no se conserva al recargar.
 * - La tabla de trimestrales enlaza `v-model:selection="selectedQuarterlyBills"` y la de
 *   bimestrales `v-model:selection="selectedBimonthlyBills"` (F-30). Marcar filas en las dos a
 *   la vez es lo que distingue la corrección del estado compartido anterior.
 * - El diálogo de borrado de una fila es `header="Confirm"` con «¿Seguro que quieres borrar el
 *   recibo <b>{{ bill.concepto }}</b>?» y botones «No» y «Yes» (F-31).
 * - `src/service/BillService.js`: `deleteBill(id, fecha, periodicidad)` llama a
 *   `DELETE /api/recibos/:id`; la fila agrupada de trimestrales no lleva `fecha`, así que se
 *   borra el recibo completo.
 * - `backend/src/routes/recibos.mjs` y `db/db_utils.mjs`: el POST exige cuenta, categoría,
 *   importe, periodicidad y, en modo automático, `fecha_inicial`; el concepto admite 30
 *   caracteres y se guarda en minúsculas (DC-31).
 *
 * Datos: el spec crea un recibo `e2e_trimestral_AAAAMMDD_HHMMSS` (30 caracteres) y, solo si el
 * año no tiene ningún recibo bimestral con el que contrastar la selección, un
 * `e2e_bimestral_AAAAMMDD_HHMMSS` (29 caracteres). Los dos se crean desde la propia página con
 * el token de la sesión y la red del navegador (la misma que usa la aplicación), se borran por
 * la interfaz en el flujo normal y, como red de seguridad, por API en `afterEach`. No se toca
 * ningún otro dato.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { urlDe } from './helpers/timon.mjs';

/** Formatos exactos de los datos que crea este spec. */
const PATRON_TRIMESTRAL = /^e2e_trimestral_\d{8}_\d{6}$/;
const PATRON_BIMESTRAL = /^e2e_bimestral_\d{8}_\d{6}$/;

/** `recibos.concepto` es `varchar(30)`. */
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

/** Filas de datos de una tarjeta (las únicas que tienen papelera). */
function filasConBorrado(contenedor) {
    return contenedor.locator('table tbody tr:has(button .pi-trash)');
}

/** Activa la columna de selección desde el menú de la tarjeta. */
async function activarMultiseleccion(page, titulo) {
    await tarjeta(page, titulo).locator('button:has(.pi-ellipsis-v)').first().click();

    const opcion = page.getByRole('menuitem', { name: 'Multiselección' });
    await expect(opcion).toBeVisible();
    await opcion.click();
}

/**
 * Colector de respuestas de recibos, registrado antes de navegar.
 *
 * Igual que en `sesionCaducada.spec.mjs`: no se ata la espera a una respuesta concreta, se
 * recogen las que llegan y se comprueba el contenido con `expect.poll`.
 */
function observarRecibos(page) {
    const respuestas = [];
    const manejador = (respuesta) => {
        if (respuesta.request().method() === 'GET' && respuesta.url().includes('/api/recibos')) respuestas.push(respuesta);
    };

    page.on('response', manejador);

    return { respuestas, detener: () => page.off('response', manejador) };
}

/** ¿Es el listado de trimestrales del año que pinta la pantalla? */
function esListadoTrimestralDelAnio(respuesta) {
    const url = new URL(respuesta.url());

    return url.searchParams.get('periodicidad') === 'trimestral' && url.searchParams.has('año');
}

/** Espera al listado y devuelve la primera respuesta válida (origen y año de la API). */
async function esperarListadoTrimestral(observador) {
    await expect.poll(() => observador.respuestas.filter(esListadoTrimestralDelAnio).length, { timeout: 20_000 }).toBeGreaterThan(0);

    return observador.respuestas.filter(esListadoTrimestralDelAnio)[0];
}

/** Abre la pantalla con el colector activo antes de navegar. */
async function abrirRecibos(page) {
    const observador = observarRecibos(page);

    try {
        await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();

        return await esperarListadoTrimestral(observador);
    } finally {
        observador.detener();
    }
}

/** Recarga la pantalla con el mismo colector. */
async function recargarRecibos(page) {
    const observador = observarRecibos(page);

    try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();

        await esperarListadoTrimestral(observador);
    } finally {
        observador.detener();
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

/** Ids del recibo con ese concepto (el listado devuelve una fila por fecha de cargo). */
async function idsDelConcepto(page, { api, anio, concepto, periodicidad }) {
    const url = new URL(`${api}/api/recibos`);
    url.searchParams.set('periodicidad', periodicidad);
    url.searchParams.set('año', String(anio));

    const { status, datos, texto } = await peticionApi(page, { metodo: 'GET', url: url.toString() });

    if (status !== 200 || !Array.isArray(datos)) {
        throw new Error(`GET /api/recibos respondió ${status}: ${texto}`);
    }

    return [...new Set(datos.filter((fila) => fila.concepto === concepto).map((fila) => fila.id))];
}

/** Crea un recibo de prueba con la periodicidad indicada y los primeros datos reales. */
async function crearRecibo(page, { api, anio, concepto, periodicidad }) {
    const categorias = await peticionApi(page, { metodo: 'GET', url: `${api}/api/categorias` });
    const cuentas = await peticionApi(page, { metodo: 'GET', url: `${api}/api/cuentas` });

    if (!Array.isArray(categorias.datos) || categorias.datos.length === 0) {
        throw new Error('La base no tiene categorías con las que crear el recibo de prueba.');
    }

    if (!Array.isArray(cuentas.datos) || cuentas.datos.length === 0) {
        throw new Error('La base no tiene cuentas con las que crear el recibo de prueba.');
    }

    const cuerpo = {
        concepto,
        periodicidad,
        importe: 10,
        categoria: categorias.datos[0].nombre,
        cuenta_id: cuentas.datos[0].id,
        // Un solo cargo futuro dentro del año en curso: no crea pendientes en meses pasados.
        fecha_inicial: `${anio}-12-31`,
        modoFechas: 'auto',
        cargo: []
    };

    const respuesta = await peticionApi(page, { metodo: 'POST', url: `${api}/api/recibos`, cuerpo });

    if (respuesta.status !== 201) {
        throw new Error(`POST /api/recibos (${periodicidad}) respondió ${respuesta.status}: ${respuesta.texto}`);
    }

    const ids = await idsDelConcepto(page, { api, anio, concepto, periodicidad });

    if (ids.length === 0) {
        throw new Error(`El recibo «${concepto}» no aparece en el listado tras el alta`);
    }

    return ids[0];
}

/**
 * Borra por API los recibos de prueba que sigan existiendo y devuelve el total de restos.
 * Solo actúa sobre los conceptos que este test ha creado.
 */
async function limpiarPorApi(page) {
    if (!estado.api || !estado.anio) return 0;

    const pendientes = [];

    if (estado.trimestral) pendientes.push({ concepto: estado.trimestral, periodicidad: 'trimestral' });
    if (estado.bimestral) pendientes.push({ concepto: estado.bimestral, periodicidad: 'bimestral' });

    for (const { concepto, periodicidad } of pendientes) {
        const ids = await idsDelConcepto(page, { ...estado, concepto, periodicidad });

        for (const id of ids) {
            await peticionApi(page, { metodo: 'DELETE', url: `${estado.api}/api/recibos/${id}?periodicidad=${periodicidad}` });
        }
    }

    let restos = 0;

    for (const { concepto, periodicidad } of pendientes) {
        restos += (await idsDelConcepto(page, { ...estado, concepto, periodicidad })).length;
    }

    return restos;
}

test.describe('Recibos: selección de trimestrales y borrado (U-15)', () => {
    test.beforeEach(async ({ paginaSesion: page }) => {
        estado = {
            api: null,
            anio: null,
            trimestral: await conceptoUnico('e2e_trimestral'),
            bimestral: null
        };

        expect(estado.trimestral).toMatch(PATRON_TRIMESTRAL);

        // El año y el origen de la API salen del propio listado de la pantalla.
        const listado = await abrirRecibos(page);
        const url = new URL(listado.url());

        estado.api = url.origin;
        estado.anio = url.searchParams.get('año');
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la prueba de trimestrales (U-15)');
        }

        try {
            const restos = await limpiarPorApi(page);

            if (restos > 0) {
                throw new Error(`Quedan ${restos} recibos de prueba tras la limpieza`);
            }
        } catch (error) {
            console.warn(`[limpieza] ${estado.trimestral}: ${error.message}`);

            testInfo.annotations.push({ type: 'limpieza', description: `Revisar los recibos de prueba: ${error.message}` });
        }
    });

    test('la selección de trimestrales es propia y el diálogo muestra y borra el concepto', async ({ paginaSesion: page }) => {
        // Alta del recibo trimestral objeto de la prueba
        await crearRecibo(page, { ...estado, concepto: estado.trimestral, periodicidad: 'trimestral' });
        await recargarRecibos(page);

        const tablaTrimestral = tarjeta(page, 'Trimestrales');
        let filaTrimestral = filasConBorrado(tablaTrimestral).filter({ hasText: estado.trimestral }).first();

        await expect(filaTrimestral).toBeVisible({ timeout: 20_000 });

        // ¿Hay algún recibo bimestral con el que contrastar la selección?
        await activarMultiseleccion(page, 'Bimestrales');

        let filaBimestral = filasConBorrado(tarjeta(page, 'Bimestrales')).first();
        const hayBimestrales = (await filaBimestral.count()) > 0;

        if (!hayBimestrales) {
            // F-30: sin una fila bimestral no se puede demostrar la independencia. Se crea una
            // de apoyo con el patrón exacto y se borra también al terminar.
            estado.bimestral = await conceptoUnico('e2e_bimestral');
            expect(estado.bimestral).toMatch(PATRON_BIMESTRAL);

            await crearRecibo(page, { ...estado, concepto: estado.bimestral, periodicidad: 'bimestral' });
            await recargarRecibos(page);

            filaTrimestral = filasConBorrado(tarjeta(page, 'Trimestrales')).filter({ hasText: estado.trimestral }).first();
            await expect(filaTrimestral).toBeVisible({ timeout: 20_000 });

            await activarMultiseleccion(page, 'Bimestrales');
            filaBimestral = filasConBorrado(tarjeta(page, 'Bimestrales')).filter({ hasText: estado.bimestral }).first();
        }

        await expect(filaBimestral, 'F-30 no se puede demostrar sin una fila bimestral').toBeVisible({ timeout: 20_000 });

        // F-30: la columna de selección se activa desde el menú de la tarjeta
        await activarMultiseleccion(page, 'Trimestrales');

        // U-15: espera por condición en vez de los 5 s por defecto. Primero se confirma por API
        // que el recibo está en el listado; después, que la fila se ha pintado.
        await expect
            .poll(
                async () => (await idsDelConcepto(page, { ...estado, concepto: estado.trimestral, periodicidad: 'trimestral' })).length,
                { timeout: 20_000, message: 'el recibo trimestral no aparece en /api/recibos' }
            )
            .toBeGreaterThan(0);

        await expect(filaTrimestral.locator('td').first()).toBeVisible({ timeout: 20_000 });

        await filaTrimestral.locator('td').first().click();
        await expect(filaTrimestral).toHaveAttribute('data-p-selected', 'true');
        await expect(page.getByRole('button', { name: 'Borrar' })).toBeEnabled();

        // F-30: marcar en bimestrales no puede borrar la selección de trimestrales
        await filaBimestral.locator('td').first().click();
        await expect(filaBimestral).toHaveAttribute('data-p-selected', 'true');
        await expect(filaTrimestral).toHaveAttribute('data-p-selected', 'true');

        // Y desmarcarla tampoco puede afectar a la de trimestrales
        await filaBimestral.locator('td').first().click();
        await expect(filaBimestral).not.toHaveAttribute('data-p-selected', 'true');
        await expect(filaTrimestral).toHaveAttribute('data-p-selected', 'true');

        // F-31: el diálogo muestra el concepto real del recibo trimestral
        await filaTrimestral.locator('button:has(.pi-trash)').click();

        const dialogo = page.getByRole('dialog', { name: 'Confirm' }).filter({ hasText: estado.trimestral });
        await expect(dialogo).toBeVisible();

        const texto = (await dialogo.innerText()).replace(/\s+/g, ' ').trim();

        expect(texto).toMatch(/borrar el recibo/i);
        expect(texto).toContain(estado.trimestral);
        expect(texto.toLowerCase()).not.toContain('undefined');
        expect(texto.toLowerCase()).not.toContain('null');

        // Borrado por la interfaz: la fila agrupada no lleva fecha, así que se borra el recibo
        const borradoTrimestral = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/api/recibos/'), { timeout: 30_000 });

        await dialogo.getByRole('button', { name: 'Yes' }).click();

        expect((await borradoTrimestral).status()).toBe(200);

        await expect(filaTrimestral).toHaveCount(0, { timeout: 20_000 });
        await expect.poll(() => idsDelConcepto(page, { ...estado, concepto: estado.trimestral, periodicidad: 'trimestral' }), { timeout: 20_000 }).toEqual([]);

        // El recibo bimestral de apoyo se borra también en el flujo normal
        if (estado.bimestral) {
            const filaBimestralPropia = filasConBorrado(tarjeta(page, 'Bimestrales')).filter({ hasText: estado.bimestral }).first();

            await expect(filaBimestralPropia).toBeVisible({ timeout: 20_000 });
            await filaBimestralPropia.locator('button:has(.pi-trash)').click();

            const dialogoBimestral = page.getByRole('dialog', { name: 'Confirm' }).filter({ hasText: estado.bimestral });
            await expect(dialogoBimestral).toBeVisible();
            expect((await dialogoBimestral.innerText())).toContain(estado.bimestral);

            const borradoBimestral = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/api/recibos/'), { timeout: 30_000 });

            await dialogoBimestral.getByRole('button', { name: 'Yes' }).click();

            expect((await borradoBimestral).status()).toBe(200);
            await expect(filaBimestralPropia).toHaveCount(0, { timeout: 20_000 });
            await expect.poll(() => idsDelConcepto(page, { ...estado, concepto: estado.bimestral, periodicidad: 'bimestral' }), { timeout: 20_000 }).toEqual([]);
        }
    });
});
