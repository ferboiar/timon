/**
 * Recibos: diálogo de borrado (F-31) y selección y borrado múltiple (U-22).
 * ======================================================================
 *
 * Deducciones:
 * - `src/router/index.js`: ruta `/pages/bills` (componente `ListBills.vue`).
 * - `ListBills.vue`: toolbar con «Nuevo» y, en cada fila (`table tbody tr`), un botón con
 *   `pi-trash` que llama a `confirmDeleteBill`; el diálogo es `header="Confirmar"` con
 *   «No» y «Sí» y el texto «¿Seguro que quieres borrar el recibo <b>concepto</b>?».
 * - `ListBills.vue` (U-22): cada tarjeta enlaza su propia selección (`selectedAnualBills`,
 *   `selectedMonthlyBills`, …) y el botón «Borrar» de la barra reúne las cuatro y abre
 *   `deleteSelectedBillsDialog` («¿Seguro que quieres borrar los recibos seleccionados?»).
 *   La columna de selección solo se pinta tras activar «Multiselección» en el menú de la tarjeta.
 * - `src/service/BillService.js`: `deleteBill(id, fecha, periodicidad)` llama a
 *   `DELETE /api/recibos/:id`; la fila agrupada de mensuales no lleva `fecha`, así que se borra
 *   el recibo completo.
 *
 * El primer caso (F-31) **no crea ni borra nada**: abre el diálogo del primer recibo visible y
 * pulsa «No». Antes de F-31 el diálogo usaba `bill.name`, un campo inexistente, así que el nombre
 * salía vacío. Si no hay filas en el año en curso, el test se omite con un motivo explícito.
 *
 * El segundo caso (U-22) crea un `e2e_anual_AAAAMMDD_HHMMSS` y un `e2e_mensual_AAAAMMDD_HHMMSS`,
 * comprueba que las dos tarjetas mantienen selecciones independientes, que cancelar el borrado
 * múltiple no envía ninguna petición y que confirmarlo borra los dos recibos; limpieza por API en
 * `afterEach`. No se toca ningún otro dato.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { filtrarPorBuscador, urlDe } from './helpers/timon.mjs';

test.describe('Recibos: diálogo de borrado (F-31)', () => {
    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el diálogo de borrado de recibos');
        }
    });

    test('el diálogo muestra el concepto del recibo y no un nombre vacío', async ({ paginaSesion: page }) => {
        // Los recibos llegan por API después de pintar la pantalla: se espera la respuesta
        const recibos = page.waitForResponse((r) => r.url().includes('/api/recibos') && r.request().method() === 'GET', { timeout: 30_000 });

        await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect(page.getByRole('button', { name: 'Nuevo' })).toBeVisible();
        await recibos.catch(() => {});

        const filas = page.locator('table tbody tr').filter({ has: page.locator('button:has(.pi-trash)') });

        // Se espera a la primera fila; si no aparece, se omite con el motivo a la vista
        await expect(filas.first())
            .toBeVisible({ timeout: 20_000 })
            .catch(() => {});
        test.skip((await filas.count()) === 0, 'No hay recibos visibles en el año en curso');

        const fila = filas.first();

        const primeraCelda = (await fila.locator('td').first().innerText()).trim();

        await fila.locator('button:has(.pi-trash)').first().click();

        const dialogo = page.getByRole('dialog', { name: 'Confirmar' });
        await expect(dialogo).toBeVisible();

        const texto = (await dialogo.innerText()).replace(/\s+/g, ' ').trim();

        // F-31: hay un nombre detrás de «el recibo» y no es un campo ausente
        expect(texto).toMatch(/borrar el recibo \S{2,}/i);
        expect(texto.toLowerCase()).not.toContain('undefined');
        expect(texto.toLowerCase()).not.toContain('null');

        // Y coincide con el concepto de la fila, sin depender de mayúsculas
        if (primeraCelda && !/\d/.test(primeraCelda)) {
            expect(texto.toLowerCase()).toContain(primeraCelda.toLowerCase());
        }

        await dialogo.getByRole('button', { name: 'No' }).click();
        await expect(dialogo).toBeHidden();
    });
});

/** Formatos exactos de los datos que crea el caso U-22. */
const PATRON_ANUAL = /^e2e_anual_\d{8}_\d{6}$/;
const PATRON_MENSUAL = /^e2e_mensual_\d{8}_\d{6}$/;

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
 * Abre Recibos y devuelve la primera respuesta del listado, para tomar de ella el origen de la
 * API y el año que pinta la pantalla. El colector se registra antes de navegar.
 */
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

        return respuestas[0];
    } finally {
        page.off('response', manejador);
    }
}

/** Recarga la pantalla y espera a que vuelva a pedir el listado. */
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
}

/**
 * Borra por API los recibos de prueba que sigan existiendo y devuelve el total de restos.
 * Solo actúa sobre los conceptos que este test ha creado.
 */
async function limpiarPorApi(page) {
    if (!estado.api || !estado.anio) return 0;

    const pendientes = [];

    if (estado.anual) pendientes.push({ concepto: estado.anual, periodicidad: 'anual' });
    if (estado.mensual) pendientes.push({ concepto: estado.mensual, periodicidad: 'mensual' });

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

test.describe('Recibos: selección de anuales y mensuales y borrado múltiple (U-22)', () => {
    test.beforeEach(async ({ paginaSesion: page }) => {
        estado = {
            api: null,
            anio: null,
            anual: await conceptoUnico('e2e_anual'),
            mensual: await conceptoUnico('e2e_mensual')
        };

        expect(estado.anual).toMatch(PATRON_ANUAL);
        expect(estado.mensual).toMatch(PATRON_MENSUAL);

        // El año y el origen de la API salen del propio listado de la pantalla.
        const listado = await abrirRecibos(page);
        const url = new URL(listado.url());

        estado.api = url.origin;
        estado.anio = url.searchParams.get('año');
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la selección y el borrado múltiple (U-22)');
        }

        try {
            const restos = await limpiarPorApi(page);

            if (restos > 0) {
                throw new Error(`Quedan ${restos} recibos de prueba tras la limpieza`);
            }
        } catch (error) {
            console.warn(`[limpieza] ${estado.anual}, ${estado.mensual}: ${error.message}`);

            testInfo.annotations.push({ type: 'limpieza', description: `Revisar los recibos de prueba: ${error.message}` });
        }
    });

    test('las tablas de anuales y mensuales conservan su selección y la barra borra las dos', async ({ paginaSesion: page }) => {
        await crearRecibo(page, { ...estado, concepto: estado.anual, periodicidad: 'anual' });
        await crearRecibo(page, { ...estado, concepto: estado.mensual, periodicidad: 'mensual' });
        await recargarRecibos(page);

        const borrarBarra = page.getByRole('button', { name: 'Borrar', exact: true });

        await expect(borrarBarra).toBeDisabled();

        // Anuales: la columna de selección se activa desde el menú y la fila se marca
        const tablaAnual = tarjeta(page, 'Anuales');

        await filtrarPorBuscador(tablaAnual, estado.anual);
        await activarMultiseleccion(page, 'Anuales');

        const filaAnual = filasConBorrado(tablaAnual).filter({ hasText: estado.anual }).first();

        await expect(filaAnual).toBeVisible({ timeout: 20_000 });
        await filaAnual.locator('td').first().click();
        await expect(filaAnual).toHaveAttribute('data-p-selected', 'true');
        await expect(borrarBarra).toBeEnabled();

        // Mensuales: su propia selección no altera la de anuales
        const tablaMensual = tarjeta(page, 'Mensuales');

        await filtrarPorBuscador(tablaMensual, estado.mensual);
        await activarMultiseleccion(page, 'Mensuales');

        const filaMensual = filasConBorrado(tablaMensual).filter({ hasText: estado.mensual }).first();

        await expect(filaMensual).toBeVisible({ timeout: 20_000 });
        await filaMensual.locator('td').first().click();
        await expect(filaMensual).toHaveAttribute('data-p-selected', 'true');
        await expect(filaAnual).toHaveAttribute('data-p-selected', 'true');

        // Desmarcar la mensual tampoco toca la anual
        await filaMensual.locator('td').first().click();
        await expect(filaMensual).not.toHaveAttribute('data-p-selected', 'true');
        await expect(filaAnual).toHaveAttribute('data-p-selected', 'true');

        // Se vuelve a marcar para borrar las dos desde la barra
        await filaMensual.locator('td').first().click();
        await expect(filaMensual).toHaveAttribute('data-p-selected', 'true');

        // Cancelar no envía ninguna petición y conserva la selección
        let borrados = 0;
        const contarBorrados = (peticion) => {
            if (peticion.method() === 'DELETE' && peticion.url().includes('/api/recibos/')) borrados += 1;
        };

        page.on('request', contarBorrados);

        await borrarBarra.click();

        const dialogo = page.getByRole('dialog', { name: 'Confirmar' }).filter({ hasText: 'recibos seleccionados' });

        await expect(dialogo).toBeVisible();
        await dialogo.getByRole('button', { name: 'No' }).click();
        await expect(dialogo).toBeHidden();

        page.off('request', contarBorrados);
        expect(borrados, 'cancelar el borrado múltiple no debe enviar ninguna petición').toBe(0);
        await expect(filaAnual).toHaveAttribute('data-p-selected', 'true');
        await expect(filaMensual).toHaveAttribute('data-p-selected', 'true');

        // Confirmar borra los dos recibos seleccionados
        const estadosBorrado = [];
        const recoger = (respuesta) => {
            if (respuesta.request().method() === 'DELETE' && respuesta.url().includes('/api/recibos/')) estadosBorrado.push(respuesta.status());
        };

        page.on('response', recoger);

        await borrarBarra.click();

        const dialogoFinal = page.getByRole('dialog', { name: 'Confirmar' }).filter({ hasText: 'recibos seleccionados' });

        await expect(dialogoFinal).toBeVisible();
        await dialogoFinal.getByRole('button', { name: 'Sí' }).click();

        await expect.poll(() => estadosBorrado.length, { timeout: 30_000 }).toBe(2);
        page.off('response', recoger);
        expect(estadosBorrado.every((codigo) => codigo === 200)).toBe(true);

        await expect(page.getByText('Recibos eliminados')).toBeVisible({ timeout: 20_000 });
        await expect(filaAnual).toHaveCount(0, { timeout: 20_000 });
        await expect(filaMensual).toHaveCount(0, { timeout: 20_000 });
        await expect.poll(() => idsDelConcepto(page, { ...estado, concepto: estado.anual, periodicidad: 'anual' }), { timeout: 20_000 }).toEqual([]);
        await expect.poll(() => idsDelConcepto(page, { ...estado, concepto: estado.mensual, periodicidad: 'mensual' }), { timeout: 20_000 }).toEqual([]);
    });
});
