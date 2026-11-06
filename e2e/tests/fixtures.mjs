/**
 * Fixtures de la suite E2E de Timón.
 * ==================================
 *
 * Diseño (verificado en la iteración 2 con Playwright 1.65.0 sobre `connectOverCDP`):
 * - `conexion` (worker): una sola conexión CDP al Edge del portátil, con
 *   `artifactsDir` dentro del runtime para que Playwright no deje carpetas sueltas en la
 *   raíz de `/tmp`. Nunca se cierra: `browser.close()` cerraría Edge.
 * - `paginaAuth` (test): **contexto propio** (`browser.newContext`, incógnito) con
 *   `viewport: null`. Aísla los tests de autenticación del perfil del usuario y de la
 *   sesión compartida: el logout de `auth.spec.mjs` no afecta a nadie.
 * - `contextoSesion` (worker): **un** contexto y **una** pestaña para toda la ejecución,
 *   con la sesión asegurada una sola vez (`asegurarSesion`). Es lo que permite que los
 *   specs de categorías y el smoke no repitan el login.
 * - La ventana se maximiza por CDP al empezar (si `E2E_MAXIMIZAR_VENTANA` no es `0`) y se
 *   restaura al terminar con los límites originales.
 */
import { test as base, chromium, expect } from '@playwright/test';

import { baseUrl, debeMaximizarVentana, rutaRuntime } from '../scripts/entorno.mjs';
import { asegurarSesion } from './helpers/timon.mjs';
import { observarPagina } from './helpers/diagnostico.mjs';

/** Maximiza la ventana de la pestaña mediante el protocolo CDP. */
async function maximizarVentana(pagina) {
    const sesion = await pagina.context().newCDPSession(pagina);
    const { windowId, bounds } = await sesion.send('Browser.getWindowForTarget');

    await sesion.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'maximized' } });

    return { sesion, windowId, bounds };
}

/** Devuelve la ventana a su estado y tamaño originales. */
async function restaurarVentana(estado) {
    const { sesion, windowId, bounds } = estado;

    await sesion.send('Browser.setWindowBounds', {
        windowId,
        bounds: {
            windowState: 'normal',
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
            height: bounds.height
        }
    });
}

export const test = base.extend({
    /** Conexión CDP única por worker. */
    conexion: [
        // Playwright exige que el primer argumento del fixture sea un patrón de objeto;
        // aquí no se necesita ningún fixture, de ahí el objeto vacío.
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            const cdpUrl = process.env.E2E_CDP_URL;

            if (!cdpUrl) throw new Error('Falta E2E_CDP_URL en e2e/.env');

            const navegador = await chromium.connectOverCDP(cdpUrl, {
                artifactsDir: rutaRuntime('tmp', 'artifacts-browser')
            });

            await use(navegador);

            // No se llama a navegador.close(): con CDP cerraría Edge.
        },
        { scope: 'worker' }
    ],

    /** Página aislada para los tests de autenticación (contexto propio por test). */
    paginaAuth: async ({ conexion }, use) => {
        const contexto = await conexion.newContext({ viewport: null, baseURL: baseUrl() });
        const pagina = await contexto.newPage();

        observarPagina(pagina);

        try {
            await use(pagina);
        } finally {
            await contexto.close().catch(() => {});
        }
    },

    /** Contexto y pestaña de sesión compartida, con login único por ejecución. */
    contextoSesion: [
        async ({ conexion }, use) => {
            const contexto = await conexion.newContext({ viewport: null, baseURL: baseUrl() });
            const pagina = await contexto.newPage();

            observarPagina(pagina);

            let ventana = null;

            if (debeMaximizarVentana()) {
                ventana = await maximizarVentana(pagina).catch((error) => {
                    console.warn(`[ventana] no se pudo maximizar: ${error.message}`);
                    return null;
                });
            }

            const sesion = await asegurarSesion(pagina);

            console.log(`[sesion] ${sesion.loginHecho ? 'login realizado' : 'sesión existente reutilizada'}`);

            await use({ contexto, pagina, ventana });

            if (ventana) await restaurarVentana(ventana).catch(() => {});
            await contexto.close().catch(() => {});
        },
        { scope: 'worker' }
    ],

    /** Pestaña de la sesión compartida (misma para todos los tests del worker). */
    paginaSesion: [
        async ({ contextoSesion }, use) => {
            await use(contextoSesion.pagina);
        },
        { scope: 'worker' }
    ]
});

export { expect };
