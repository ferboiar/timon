/**
 * Lanzador de la suite E2E de Timón (`npm run e2e`).
 * ==================================================
 *
 * Multiplataforma (solo Node, sin sintaxis de shell):
 * 1. Crea el directorio de ejecución y sus subcarpetas.
 * 2. Redirige los temporales del sistema a `<runtime>/tmp` (TMPDIR/TMP/TEMP) y la caché
 *    de transformación de Playwright a `<runtime>/cache`
 *    (`PLAYWRIGHT_TRANSFORM_CACHE_DIR`, soportado en Playwright 1.65).
 * 3. Ejecuta Playwright y propaga su código de salida.
 * 4. Al terminar siempre: para los servidores arrancados por la suite, borra el estado y
 *    los diagnósticos de esta ejecución, vacía `tmp/`, rota `logs/` y guarda el último
 *    verde si todo pasó.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { DIR_E2E, dirRuntime, rutaRuntime, SUBDIRECTORIOS } from './scripts/entorno.mjs';
import { pararServidores } from './scripts/servidores.mjs';
import { guardarUltimoVerde, resumenDrift } from './scripts/ultimo-verde.mjs';

/** Marca de la ejecución, para nombrar log y carpeta de diagnóstico. */
const MARCA = new Date().toISOString().replace(/[:.]/g, '-');

/** Máximo de logs de servidor que se conservan. */
const LOGS_A_CONSERVAR = 5;

/** Prepara el directorio de ejecución y devuelve el entorno del hijo. */
function prepararRuntime() {
    for (const subdirectorio of SUBDIRECTORIOS) {
        fs.mkdirSync(rutaRuntime(subdirectorio), { recursive: true });
    }

    const directorioTemporal = rutaRuntime('tmp');

    fs.mkdirSync(rutaRuntime('diagnostico', `ejecucion-${MARCA}`), { recursive: true });

    return {
        ...process.env,
        TMPDIR: directorioTemporal,
        TMP: directorioTemporal,
        TEMP: directorioTemporal,
        PLAYWRIGHT_TRANSFORM_CACHE_DIR: rutaRuntime('cache'),
        E2E_MARCA_EJECUCION: MARCA
    };
}

/** Vacía el contenido de un directorio sin borrar el directorio. */
function vaciar(directorio) {
    if (!fs.existsSync(directorio)) return;

    for (const entrada of fs.readdirSync(directorio)) {
        fs.rmSync(path.join(directorio, entrada), { recursive: true, force: true });
    }
}

/**
 * Borra ÚNICAMENTE la carpeta de diagnóstico de la marca indicada.
 *
 * No toca otras carpetas `ejecucion-*` (son evidencia de ejecuciones anteriores) ni
 * ficheros sueltos de `diagnostico/`. Se exporta para poder verificarla en aislamiento.
 *
 * @param {string} marca Sufijo de la carpeta `ejecucion-<marca>`.
 * @param {string} [base] Directorio del runtime; por defecto, el de la suite.
 * @returns {boolean} `true` si existía la carpeta de esa marca y se borró.
 */
export function limpiarDiagnosticoDeEstaEjecucion(marca, base = dirRuntime()) {
    const ruta = path.join(base, 'diagnostico', `ejecucion-${marca}`);

    if (!fs.existsSync(ruta) || !fs.statSync(ruta).isDirectory()) return false;

    fs.rmSync(ruta, { recursive: true, force: true });

    return true;
}

/** Deja los últimos `LOGS_A_CONSERVAR` ficheros de log y borra el resto. */
function rotarLogs() {
    const directorio = rutaRuntime('logs');

    if (!fs.existsSync(directorio)) return;

    const ordenados = fs
        .readdirSync(directorio)
        .filter((nombre) => nombre.endsWith('.log'))
        .map((nombre) => ({ nombre, mtime: fs.statSync(path.join(directorio, nombre)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);

    for (const { nombre } of ordenados.slice(LOGS_A_CONSERVAR)) {
        fs.rmSync(path.join(directorio, nombre), { force: true });
    }
}

/** Resuelve el CLI de Playwright instalado en `e2e/`. */
function rutaCliPlaywright() {
    const candidatos = [
        path.join(DIR_E2E, 'node_modules', '@playwright', 'test', 'cli.js'),
        path.join(DIR_E2E, 'node_modules', 'playwright', 'cli.js')
    ];

    const encontrado = candidatos.find((ruta) => fs.existsSync(ruta));

    if (!encontrado) {
        throw new Error('No se encontró el CLI de Playwright. Ejecuta `npm ci` dentro de e2e/.');
    }

    return encontrado;
}

/** Ejecuta Playwright con el entorno preparado. */
function ejecutarPlaywright(entorno) {
    return new Promise((resolver, rechazar) => {
        const argumentos = [rutaCliPlaywright(), 'test', ...process.argv.slice(2)];
        const hijo = spawn(process.execPath, argumentos, { cwd: DIR_E2E, stdio: 'inherit', env: entorno });

        hijo.on('error', rechazar);
        hijo.on('exit', (codigo, senal) => {
            if (senal) {
                rechazar(new Error(`Playwright terminó por la señal ${senal}`));
                return;
            }

            resolver(codigo ?? 1);
        });
    });
}

/** Limpieza final: siempre, también con fallos. */
async function limpiar({ codigo, inicio, entorno }) {
    try {
        await pararServidores({ silencioso: codigo === 0 });
    } catch (error) {
        console.warn(`[lanzador] no se pudo parar los servidores: ${error.message}`);
    }

    if (codigo === 0) {
        try {
            guardarUltimoVerde({ duracionMs: Date.now() - inicio, marca: entorno.E2E_MARCA_EJECUCION });
            console.log('[lanzador] guardado e2e/.last-green.json');
        } catch (error) {
            console.warn(`[lanzador] no se pudo guardar el último verde: ${error.message}`);
        }

        // Si todo pasó, el log del servidor de esta ejecución no aporta: se borra.
        for (const nombre of fs.readdirSync(rutaRuntime('logs'))) {
            if (nombre.startsWith('servidor-') && nombre.includes(entorno.E2E_MARCA_EJECUCION)) {
                fs.rmSync(path.join(rutaRuntime('logs'), nombre), { force: true });
            }
        }
    } else {
        console.warn(`[lanzador] ejecución con fallos: se conservan logs y diagnósticos de ${entorno.E2E_MARCA_EJECUCION}`);
        console.warn(`[lanzador] revisa ${rutaRuntime('logs')} y ${rutaRuntime('artifacts')}`);
    }

    vaciar(rutaRuntime('tmp'));

    // Solo se retira la carpeta de diagnóstico de ESTA ejecución (vacía si todo fue bien).
    // Las de ejecuciones anteriores se conservan como evidencia (fase 0 y banco de git-crypt).
    if (codigo === 0) {
        limpiarDiagnosticoDeEstaEjecucion(entorno.E2E_MARCA_EJECUCION);
    }

    fs.rmSync(rutaRuntime('estado'), { recursive: true, force: true });
    rotarLogs();

    console.log(`[lanzador] runtime: ${dirRuntime()}`);
}

/** Ejecuta la suite completa y devuelve el código de salida. */
async function principal() {
    const inicio = Date.now();
    const entorno = prepararRuntime();
    let codigo = 1;

    console.log(`[lanzador] ejecución ${MARCA}`);
    console.log(`[lanzador] ${resumenDrift()}`);

    try {
        codigo = await ejecutarPlaywright(entorno);
    } catch (error) {
        console.error(`[lanzador] ${error.message}`);
        codigo = 1;
    } finally {
        await limpiar({ codigo, inicio, entorno });
    }

    return codigo;
}

/**
 * El módulo se ejecuta solo cuando se invoca directamente (`node lanzador.mjs`).
 * Al importarlo (por ejemplo, para probar `limpiarDiagnosticoDeEstaEjecucion`) no
 * lanza la suite.
 */
const seEjecutaDirectamente = Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (seEjecutaDirectamente) {
    process.exit(await principal());
}
