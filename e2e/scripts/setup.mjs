/**
 * `globalSetup` de Playwright: entorno listo antes de los tests.
 * =============================================================
 *
 * - Comprueba front y back; si ya están vivos, no los toca; si falta alguno, confirma la
 *   base configurada y los arranca en un grupo propio (ver `servidores.mjs`).
 * - Informa del drift respecto al último verde (`ultimo-verde.mjs`).
 */
import { asegurarServidores } from './servidores.mjs';
import { resumenDrift } from './ultimo-verde.mjs';

export default async function setup() {
    await asegurarServidores();

    console.log(`[triage] ${resumenDrift()}`);
}
