/**
 * `globalSetup` de Playwright: entorno listo antes de los tests.
 * =============================================================
 *
 * - Comprueba front y back; si ya están vivos, no los toca; si falta alguno, confirma la
 *   base configurada y los arranca en un grupo propio (ver `servidores.mjs`).
 * - Calienta el arranque en frío (O-14): carga el login y Ajustes en un contexto desechable
 *   y espera elementos que solo existen con Vue montado, para que la primera prueba no pague
 *   la compilación de Vite y `retries` pueda seguir en 0.
 * - Informa del drift respecto al último verde (`ultimo-verde.mjs`).
 */
import { chromium } from '@playwright/test';

import { baseUrl, credenciales, rutaRuntime } from './entorno.mjs';
import { asegurarServidores } from './servidores.mjs';
import { iniciarSesion } from '../tests/helpers/timon.mjs';
import { resumenDrift } from './ultimo-verde.mjs';

/**
 * Rutas que la primera prueba de cada spec necesita ya compiladas, con el elemento que
 * demuestra que el componente de Vue está montado.
 */
const CALENTAMIENTO = [
    { ruta: '/auth/login', selector: '#username' },
    { ruta: '/settings', selector: '[role="tab"]' }
];

/** Plazo del calentamiento: el primer `goto` de un contexto nuevo compila la ruta entera. */
const PLAZO_CALENTAMIENTO = 90_000;

/**
 * Intentos del calentamiento. Los servidores se acaban de arrancar y el primer `goto` puede
 * llegar antes de que Vite atienda en la dirección que ve el Edge (O-14, observado el 2026-11-20).
 */
const INTENTOS_CALENTAMIENTO = 3;

/** Espera entre intentos del calentamiento. */
const ESPERA_CALENTAMIENTO = 5_000;

/** Carga una ruta del calentamiento y espera un elemento montado por Vue. */
async function calentarPagina(pagina, { ruta, selector }) {
    await pagina.goto(ruta, { waitUntil: 'domcontentloaded', timeout: PLAZO_CALENTAMIENTO });
    await pagina.locator(selector).first().waitFor({ state: 'visible', timeout: PLAZO_CALENTAMIENTO });
}

/**
 * Compila y monta las rutas del calentamiento antes de la primera prueba.
 *
 * Se conecta al mismo Edge por CDP que usa la suite y abre un contexto desechable por intento,
 * que se cierra al terminar; nunca se llama a `navegador.close()` (cerraría el Edge del usuario).
 * Un fallo aquí solo avisa: la suite continúa y sus propias esperas dicen qué falta (O-14).
 */
async function calentar() {
    const cdpUrl = process.env.E2E_CDP_URL;

    if (!cdpUrl) {
        console.warn('[calentamiento] sin E2E_CDP_URL: no se calienta nada.');
        return;
    }

    let navegador;

    try {
        navegador = await chromium.connectOverCDP(cdpUrl, { artifactsDir: rutaRuntime('tmp', 'artifacts-browser') });
    } catch (error) {
        console.warn(`[calentamiento] no se pudo conectar al Edge: ${error.message}`);
        return;
    }

    for (let intento = 1; intento <= INTENTOS_CALENTAMIENTO; intento += 1) {
        let contexto = null;

        try {
            contexto = await navegador.newContext({ viewport: null, baseURL: baseUrl() });
            const pagina = await contexto.newPage();
            const [primera, ...resto] = CALENTAMIENTO;

            await calentarPagina(pagina, primera);

            // Ajustes exige sesión: es la pantalla con pestañas que usa `usuariosValidacion`.
            await iniciarSesion(pagina, credenciales());

            for (const entrada of resto) await calentarPagina(pagina, entrada);

            console.log(`[calentamiento] ${CALENTAMIENTO.length} rutas compiladas y montadas.`);

            return;
        } catch (error) {
            if (intento === INTENTOS_CALENTAMIENTO) {
                console.warn(`[calentamiento] no se completó tras ${INTENTOS_CALENTAMIENTO} intentos: ${error.message}`);
                return;
            }

            console.warn(`[calentamiento] intento ${intento} fallido (${error.message}); reintento en ${ESPERA_CALENTAMIENTO / 1000} s.`);
            await new Promise((resolver) => setTimeout(resolver, ESPERA_CALENTAMIENTO));
        } finally {
            await contexto?.close().catch(() => {});
        }
    }

    // No se cierra `navegador`: con CDP cerraría el Edge del usuario.
}

export default async function setup() {
    await asegurarServidores();
    await calentar();

    console.log(`[triage] ${resumenDrift()}`);
}
