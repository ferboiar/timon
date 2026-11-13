/**
 * Base de Datos: configuración de la conexión y mantenimiento (S-02, S-03, DC-06).
 * =================================================================================
 *
 * Deducciones de la implementación:
 * - `src/views/pages/ProfileSettings.vue`: pestaña «Base de Datos» con las dos columnas
 *   (`grid-cols-1` y dos columnas a partir de `md`), campos `#db-host`, `#db-port`, `#db-user`,
 *   `#db-password`, `#db-database`, `#db-ca`, `#db-maint-user` y `#db-maint-password`;
 *   botones «Probar», «Guardar», «Restaurar» y «Respaldar».
 * - `src/utils/configuracionBd.js`: los obligatorios vacíos y el puerto fuera de rango
 *   deshabilitan Probar y Guardar.
 * - `backend/src/routes/mantenimientoDB.mjs`: el 413 del límite de 100 MB llega como JSON
 *   con el texto de `MENSAJE_VOLCADO_DEMASIADO_GRANDE`.
 * - `backend/src/db/db_maintenance.mjs`: la restauración crea `timon-pre-restore-<ISO>.sql`
 *   y la borra al terminar; el volcado de descarga usa `timon-backup-<uuid>.sql`.
 *
 * Seguridad de los datos: la suite debe correr contra una base `*_test`. El caso de
 * restauración sobrescribe la base configurada.
 */
import fs from 'node:fs';
import os from 'node:os';
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { abrirAjustes } from './helpers/timon.mjs';

const MENSAJE_413 = 'El fichero supera el límite de 100 MB. Reduce el tamaño o divide el volcado.';
const TOOLTIP_MANTENIMIENTO =
    'Usuario opcional con permisos para copias de seguridad y restauración. Si lo dejas vacío, se usa el usuario de la aplicación.';

/** Credenciales de mantenimiento de la prueba, si el entorno las aporta. */
const MANT_USER = process.env.E2E_MANT_USER || '';
const MANT_PASSWORD = process.env.E2E_MANT_PASSWORD || '';

/** Origen de la API: el mismo que usa la aplicación (VITE_API_URL o el puerto del backend). */
function urlDeApi() {
    return process.env.E2E_API_URL || 'http://localhost:3000';
}

/** Temporales que deja la aplicación en el directorio temporal. */
function temporalesDeBase() {
    return fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('timon-pre-restore-') || f.startsWith('timon-backup-'));
}

test.describe.configure({ mode: 'serial' });

test.describe('Base de Datos: configuración de la conexión (S-02, S-03, DC-06)', () => {
    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la pestaña Base de Datos');
        }
    });

    test('a) carga los valores guardados y deja las contraseñas vacías', async ({ paginaSesion: page }) => {
        await abrirAjustes(page, 'Base de Datos');

        for (const campo of ['#db-host', '#db-port', '#db-user', '#db-database']) {
            await expect(page.locator(campo)).not.toHaveValue('', { timeout: 15_000 });
        }

        await expect(page.locator('#db-password input')).toHaveValue('');
        await expect(page.locator('#db-maint-password input')).toHaveValue('');
    });

    test('i) sin campos obligatorios, o con el puerto fuera de rango, no se puede guardar ni probar', async ({ paginaSesion: page }) => {
        await abrirAjustes(page, 'Base de Datos');

        const guardar = page.getByRole('button', { name: 'Guardar' });
        const probar = page.getByRole('button', { name: 'Probar' });

        await page.locator('#db-host').fill('');
        await expect(probar).toBeDisabled();
        await expect(guardar).toBeDisabled();
        await expect(page.getByText('Completa los campos obligatorios')).toBeVisible();

        await page.locator('#db-host').fill('servidor');
        await page.locator('#db-port').fill('70000');
        await expect(probar).toBeDisabled();
        await expect(page.getByText('El puerto debe ser un número entre 1 y 65535.')).toBeVisible();
    });

    test('j) el interrogante de «Usuario de mantenimiento» muestra el texto acordado', async ({ paginaSesion: page }) => {
        await abrirAjustes(page, 'Base de Datos');

        await page.locator('label[for="db-maint-user"] i.pi-question-circle').hover();
        await expect(page.locator('.p-tooltip')).toContainText(TOOLTIP_MANTENIMIENTO, { timeout: 10_000 });
    });

    test('k) dos columnas, cajas de 20rem y una sola columna en pantalla pequeña', async ({ paginaSesion: page, conexion }) => {
        await abrirAjustes(page, 'Base de Datos');

        const host = await page.locator('#db-host').boundingBox();
        const ca = await page.locator('#db-ca').boundingBox();

        // Dos columnas: la CA queda a la derecha del bloque de la izquierda
        expect(ca.x).toBeGreaterThan(host.x + host.width / 2);

        // Ancho máximo de todas las cajas: 20rem (320 px con la raíz a 16 px)
        for (const campo of ['#db-host', '#db-port', '#db-user', '#db-password input', '#db-database', '#db-ca', '#db-maint-user', '#db-maint-password input']) {
            const caja = await page.locator(campo).boundingBox();

            expect(caja.width, campo).toBeLessThanOrEqual(320);
        }

        // El texto de la etiqueta termina junto al borde izquierdo de su caja
        for (const [etiqueta, campo] of [
            ['db-maint-user', '#db-maint-user'],
            ['db-maint-password', '#db-maint-password input'],
            ['db-database', '#db-database']
        ]) {
            const derechaDelTexto = await page.locator('label[for="' + etiqueta + '"]').evaluate((el) => {
                const rango = document.createRange();
                rango.selectNodeContents(el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : el);
                return rango.getBoundingClientRect().right;
            });
            const caja = await page.locator(campo).boundingBox();

            expect(Math.abs(caja.x - derechaDelTexto)).toBeLessThan(20);
        }

        // En pantallas pequeñas se apilan: una columna y dos a partir de md
        const clases = await page.locator('#db-ca').evaluate((el) => el.closest('.grid').className);

        expect(clases).toContain('grid-cols-1');
        // La variante concreta puede cambiar (por ejemplo a max-content); lo que importa es
        // que haya dos columnas a partir de md, y eso ya se ha medido arriba
        expect(clases).toContain('md:grid-cols-');

        // Contexto estrecho reutilizando la sesión: una sola columna
        const almacen = await page.evaluate(() => ({ ...localStorage, ...sessionStorage }));
        const estrecho = await conexion.newContext({ viewport: { width: 420, height: 900 } });

        try {
            await estrecho.addInitScript((datos) => {
                for (const [clave, valor] of Object.entries(datos)) localStorage.setItem(clave, valor);
            }, almacen);

            const paginaEstrecha = await estrecho.newPage();

            // Si la primera navegación llega antes de que el guard vea la sesión, se
            // reintenta una vez: el almacenamiento ya está inyectado.
            await abrirAjustes(paginaEstrecha, 'Base de Datos').catch(async () => {
                await paginaEstrecha.reload({ waitUntil: 'domcontentloaded' });
                await abrirAjustes(paginaEstrecha, 'Base de Datos');
            });

            const hostEstrecho = await paginaEstrecha.locator('#db-host').boundingBox();
            const caEstrecha = await paginaEstrecha.locator('#db-ca').boundingBox();

            expect(Math.abs(caEstrecha.x - hostEstrecho.x)).toBeLessThan(5);
            expect(caEstrecha.y).toBeGreaterThan(hostEstrecho.y);
            expect(caEstrecha.width).toBeLessThanOrEqual(320);
        } finally {
            await estrecho.close();
        }
    });
});

/** Confirma el diálogo visible de la pestaña. */
async function confirmarDialogo(page) {
    await page.locator('.p-dialog:visible').getByRole('button', { name: 'Sí' }).click();
}

/** Guarda la configuración y espera la respuesta del servidor. */
async function guardarConfiguracion(page) {
    const respuesta = page.waitForResponse((r) => r.url().includes('/api/db-config') && r.request().method() === 'PUT', { timeout: 60_000 });

    await page.getByRole('button', { name: 'Guardar' }).click();
    await confirmarDialogo(page);

    return respuesta;
}

test.describe('Base de Datos: guardado, copias y restauración', () => {
    let rutaVolcado = '';

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en el guardado o la restauración');
        }
    });

    test('b) guardar sin cambiar la contraseña la conserva y deja la conexión operativa', async ({ paginaSesion: page }) => {
        test.skip(!MANT_USER || !MANT_PASSWORD, 'faltan E2E_MANT_USER y E2E_MANT_PASSWORD');

        await abrirAjustes(page, 'Base de Datos');

        // El cambio que habilita «Guardar» es el usuario de mantenimiento; la contraseña de
        // la aplicación se deja en blanco a propósito.
        await page.locator('#db-maint-user').fill(MANT_USER);
        await page.locator('#db-maint-password input').fill(MANT_PASSWORD);

        const respuesta = await guardarConfiguracion(page);

        expect(respuesta.status()).toBe(200);
        await expect(page.getByRole('alert').filter({ hasText: 'Configuración de la conexión con base de datos guardada' })).toBeVisible();

        // La contraseña de la aplicación sigue guardada: probar con el campo vacío funciona
        await page.reload({ waitUntil: 'domcontentloaded' });
        await abrirAjustes(page, 'Base de Datos');
        await expect(page.locator('#db-password input')).toHaveValue('');

        const [prueba] = await Promise.all([
            page.waitForResponse((r) => r.url().includes('/api/db-config/test'), { timeout: 60_000 }),
            page.getByRole('button', { name: 'Probar' }).click()
        ]);

        expect(prueba.status()).toBe(200);
    });

    test('f) el respaldo descarga un volcado válido', async ({ paginaSesion: page }) => {
        await abrirAjustes(page, 'Base de Datos');

        // La descarga se dispara y el servidor entrega el volcado: se comprueba el cuerpo
        // de la respuesta (que es lo que se descarga) y el nombre sugerido.
        const [descarga, respuesta] = await Promise.all([
            page.waitForEvent('download', { timeout: 120_000 }),
            page.waitForResponse((r) => r.url().includes('/api/db/backup'), { timeout: 120_000 }),
            page.getByRole('button', { name: 'Respaldar' }).click()
        ]);

        expect(descarga.suggestedFilename()).toBe('backup.sql');

        const contenido = (await respuesta.body()).toString('utf8');

        expect(contenido.slice(0, 400)).toMatch(/MariaDB dump|MySQL dump/);
        expect(contenido).toContain('CREATE TABLE');

        rutaVolcado = '/tmp/e2e-backup-' + Date.now() + '.sql';
        fs.writeFileSync(rutaVolcado, contenido);

        // El volcado temporal del servidor se borra al terminar de enviarlo
        await expect.poll(() => temporalesDeBase(), { timeout: 15_000 }).toEqual([]);
    });

    test('d) un fichero de más de 100 MB responde 413 con el mensaje del servidor', async ({ paginaSesion: page }) => {
        await abrirAjustes(page, 'Base de Datos');

        // Límite del entorno: Playwright no transfiere a un navegador remoto ficheros de más
        // de 50 MB («Cannot transfer files larger than 50Mb to a browser not co-located with
        // the server»), así que la subida se hace con la API del contexto, contra el mismo
        // servidor y el mismo límite de multer. El toast está cubierto por la prueba de
        // `getApiErrorMessage` y por el spec de errores de conexión.
        const token = await page.evaluate(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
        const grande = Buffer.alloc(101 * 1024 * 1024, 65);

        const respuesta = await page.request.post(urlDeApi() + '/api/db/restore', {
            headers: { Authorization: 'Bearer ' + token },
            multipart: { backupFile: { name: 'grande.sql', mimeType: 'application/sql', buffer: grande } },
            timeout: 240_000
        });

        expect(respuesta.status()).toBe(413);

        const cuerpo = await respuesta.json();

        expect(cuerpo.message).toBe(MENSAJE_413);
        expect(cuerpo.codigo).toBe('VOLCADO_DEMASIADO_GRANDE');

        // El navegador remoto no admite subidas de más de 50 MB, así que el toast se
        // comprueba con el mismo 413 que emite el servidor, interceptando la petición.
        await page.route('**/api/db/restore', (ruta) =>
            ruta.fulfill({
                status: 413,
                contentType: 'application/json',
                body: JSON.stringify({ message: MENSAJE_413, codigo: 'VOLCADO_DEMASIADO_GRANDE' })
            })
        );

        try {
            await page.locator('input[type="file"]').setInputFiles({ name: 'pequeno.sql', mimeType: 'application/sql', buffer: Buffer.from('no es un volcado') });
            await confirmarDialogo(page);

            await expect(page.getByRole('alert').filter({ hasText: MENSAJE_413 })).toBeVisible({ timeout: 30_000 });
        } finally {
            await page.unroute('**/api/db/restore');
        }
    });

    test('e) restaurar un volcado válido usa copia previa y no deja temporales', async ({ paginaSesion: page }) => {
        test.skip(!rutaVolcado, 'no se ha descargado un volcado en el caso anterior');

        await abrirAjustes(page, 'Base de Datos');

        await page.locator('input[type="file"]').setInputFiles(rutaVolcado);
        await confirmarDialogo(page);

        await expect(page.getByRole('alert').filter({ hasText: 'Base de datos restaurada correctamente' })).toBeVisible({ timeout: 180_000 });
        expect(temporalesDeBase()).toEqual([]);
    });
});

test.describe('Base de Datos: CA TLS y usuario de mantenimiento', () => {
    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en CA o mantenimiento');
        }
    });

    test('g1) una CA que el servidor no valida impide guardar y no se persiste', async ({ paginaSesion: page }) => {
        await abrirAjustes(page, 'Base de Datos');

        const caOriginal = await page.locator('#db-ca').inputValue();

        await page.locator('#db-ca').fill('-----BEGIN CERTIFICATE-----MIIB-----END CERTIFICATE-----');

        const respuesta = await guardarConfiguracion(page);

        expect(respuesta.status()).toBe(400);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await abrirAjustes(page, 'Base de Datos');
        await expect(page.locator('#db-ca')).toHaveValue(caOriginal);
    });

    test('g2) sin CA la conexión vuelve a no verificar el certificado y el aviso queda en el log', async ({ paginaSesion: page }) => {
        await abrirAjustes(page, 'Base de Datos');

        const [prueba] = await Promise.all([
            page.waitForResponse((r) => r.url().includes('/api/db-config/test'), { timeout: 60_000 }),
            page.getByRole('button', { name: 'Probar' }).click()
        ]);

        expect(prueba.status()).toBe(200);

        const log = process.env.E2E_LOG_SERVIDOR || '';

        test.skip(!log, 'sin E2E_LOG_SERVIDOR no se puede comprobar el log del servidor');
        expect(fs.readFileSync(log, 'utf8')).toContain('TLS sin verificación de CA');
    });

    test('g3) una CA guardada se precarga y se puede borrar desde la pantalla', async ({ paginaSesion: page }) => {
        const ruta = process.env.E2E_DB_CONFIG || '';

        test.skip(!ruta, 'falta E2E_DB_CONFIG: la prueba escribe en el fichero de configuración de las E2E');

        // Se siembra una CA ficticia en el fichero de configuración de la prueba (nunca en el real)
        const contenido = fs.readFileSync(ruta, 'utf8').trimEnd();

        fs.writeFileSync(ruta, contenido + String.fromCharCode(10) + 'DB_SSL_CA="-----BEGIN CERTIFICATE-----MIIB-----END CERTIFICATE-----"' + String.fromCharCode(10));

        await page.reload({ waitUntil: 'domcontentloaded' });
        await abrirAjustes(page, 'Base de Datos');

        await expect(page.locator('#db-ca')).toHaveValue(/BEGIN CERTIFICATE/);

        await page.locator('#db-ca').fill('');

        expect((await guardarConfiguracion(page)).status()).toBe(200);

        expect(fs.readFileSync(ruta, 'utf8')).not.toContain('DB_SSL_CA');
    });

    test('h1) el usuario de mantenimiento se guarda y se recupera al recargar', async ({ paginaSesion: page }) => {
        test.skip(!MANT_USER, 'falta E2E_MANT_USER');

        await abrirAjustes(page, 'Base de Datos');
        await expect(page.locator('#db-maint-user')).toHaveValue(MANT_USER);
    });

    test('h2) cambiar el usuario de mantenimiento sin contraseña nueva da 400', async ({ paginaSesion: page }) => {
        test.skip(!MANT_USER, 'falta E2E_MANT_USER');

        await abrirAjustes(page, 'Base de Datos');
        await page.locator('#db-maint-user').fill(MANT_USER + '_otro');

        const respuesta = await guardarConfiguracion(page);

        expect(respuesta.status()).toBe(400);
        expect((await respuesta.json()).message).toContain('El usuario de mantenimiento ha cambiado');
    });

    test('h3) quitar el usuario de mantenimiento borra también su contraseña', async ({ paginaSesion: page }) => {
        test.skip(!MANT_USER, 'falta E2E_MANT_USER');

        await abrirAjustes(page, 'Base de Datos');
        await page.locator('#db-maint-user').fill('');

        expect((await guardarConfiguracion(page)).status()).toBe(200);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await abrirAjustes(page, 'Base de Datos');
        await expect(page.locator('#db-maint-user')).toHaveValue('');

        // Si la contraseña se hubiera conservado, esto se guardaría sin pedir nada
        await page.locator('#db-maint-user').fill(MANT_USER);

        const segunda = await guardarConfiguracion(page);

        expect(segunda.status()).toBe(400);
        expect((await segunda.json()).codigo).toBe('MANTENIMIENTO_SIN_CONTRASENA');
    });
});
