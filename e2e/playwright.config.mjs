/**
 * Configuración de Playwright de la suite E2E de Timón.
 * =====================================================
 *
 * - `dotenv` se carga con una ruta relativa al módulo `scripts/entorno.mjs`
 *   (no al directorio de trabajo).
 * - Los artefactos van al directorio de ejecución (`/tmp/timon-e2e/artifacts`,
 *   configurable con `E2E_RUNTIME_DIR`), nunca a la raíz de `/tmp` ni al repo.
 * - `screenshot: only-on-failure`, `video: off` y `trace: off` para no generar
 *   E/S innecesaria en la NAS.
 */
import fs from 'node:fs';

import { defineConfig } from '@playwright/test';

import { baseUrl, cargarEnv, rutaRuntime, SUBDIRECTORIOS } from './scripts/entorno.mjs';

cargarEnv();

// El directorio de ejecución lo crea el lanzador (`lanzador.mjs`); se asegura aquí
// para que un `npx playwright test` directo siga funcionando.
for (const subdirectorio of SUBDIRECTORIOS) {
    fs.mkdirSync(rutaRuntime(subdirectorio), { recursive: true });
}

export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
    retries: 0,
    workers: 1,
    outputDir: rutaRuntime('artifacts'),
    reporter: [['list']],
    globalSetup: './scripts/setup.mjs',
    globalTeardown: './scripts/teardown.mjs',
    use: {
        baseURL: baseUrl(),
        screenshot: 'only-on-failure',
        video: 'off',
        trace: 'off',
        actionTimeout: 30_000,
        navigationTimeout: 45_000
    }
});
