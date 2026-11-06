/**
 * Diagnóstico de fallos, sin secretos.
 * ===================================
 *
 * Recoge, por página: errores de consola, errores de JavaScript y respuestas HTTP no OK.
 * `adjuntarDiagnostico()` los adjunta al informe del test junto con la URL, el tamaño de
 * ventana, un `ariaSnapshot` recortado y la lista de botones visibles.
 *
 * Nunca incluye credenciales ni contenido de `.env` o `.db_connection`.
 */

/** Datos observados por página (se liberan solos al cerrar la pestaña). */
const observadores = new WeakMap();

/** Empieza a observar una página. Devuelve el objeto de datos. */
export function observarPagina(page) {
    const datos = { consola: [], erroresPagina: [], respuestasNoOk: [] };

    page.on('console', (mensaje) => {
        if (mensaje.type() === 'error' || mensaje.type() === 'warning') {
            datos.consola.push(`[${mensaje.type()}] ${mensaje.text()}`.slice(0, 500));
        }
    });

    page.on('pageerror', (error) => {
        datos.erroresPagina.push(String(error?.message ?? error).slice(0, 500));
    });

    page.on('response', (respuesta) => {
        if (respuesta.status() >= 400) {
            datos.respuestasNoOk.push(`${respuesta.status()} ${respuesta.request().method()} ${respuesta.url()}`.slice(0, 500));
        }
    });

    observadores.set(page, datos);

    return datos;
}

/** Datos observados de una página. */
export function datosPagina(page) {
    return observadores.get(page) ?? { consola: [], erroresPagina: [], respuestasNoOk: [] };
}

/**
 * Adjunta al test un diagnóstico en texto plano.
 *
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {import('@playwright/test').Page} page
 * @param {string} [nota]
 */
export async function adjuntarDiagnostico(testInfo, page, nota = '') {
    const partes = [];
    const datos = datosPagina(page);

    try {
        partes.push(`url: ${page.url()}`);
    } catch {
        partes.push('url: no disponible (pestaña cerrada)');
    }

    try {
        const viewport = page.viewportSize();
        partes.push(`viewport: ${viewport ? `${viewport.width}x${viewport.height}` : 'null (tamaño de ventana)'}`);
    } catch {
        partes.push('viewport: no disponible');
    }

    try {
        const ventana = await page.evaluate(() => `${window.innerWidth}x${window.innerHeight}`);
        partes.push(`ventana: ${ventana}`);
    } catch {
        partes.push('ventana: no disponible');
    }

    try {
        const aria = await page.locator('body').ariaSnapshot({ timeout: 5000 });
        partes.push(`aria (recortado):\n${aria.slice(0, 6000)}`);
    } catch {
        partes.push('aria: no disponible');
    }

    try {
        const botones = await page.getByRole('button').allInnerTexts();
        partes.push(`botones: ${JSON.stringify(botones.slice(0, 40).map((texto) => texto.trim()))}`);
    } catch {
        partes.push('botones: no disponible');
    }

    partes.push(`consola: ${JSON.stringify(datos.consola.slice(-20))}`);
    partes.push(`respuestas_no_ok: ${JSON.stringify(datos.respuestasNoOk.slice(-20))}`);
    partes.push(`errores_pagina: ${JSON.stringify(datos.erroresPagina.slice(-10))}`);

    if (nota) partes.push(`nota: ${nota}`);

    await testInfo.attach('diagnostico', { body: partes.join('\n\n'), contentType: 'text/plain' });
}
