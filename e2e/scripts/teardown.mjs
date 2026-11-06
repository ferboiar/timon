/**
 * `globalTeardown` de Playwright: parada ordenada.
 * ================================================
 *
 * Para solo el grupo que arrancó esta ejecución y verifica que 5173 y 3000 ya no escuchan.
 * Si los servidores ya estaban vivos antes de la suite, no se tocan.
 */
import { pararServidores } from './servidores.mjs';

export default async function teardown() {
    await pararServidores();
}
