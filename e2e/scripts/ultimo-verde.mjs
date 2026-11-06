/**
 * Último verde y detección de drift.
 * ==================================
 *
 * - `guardarUltimoVerde()` escribe `e2e/.last-green.json` (no versionado) con la rama,
 *   el HEAD, la fecha y el `sha256` de cada fichero mapeado en `mapa-fuentes.mjs`.
 * - `compararConUltimoVerde()` compara el estado actual con ese registro y deja el
 *   resultado en `<runtime>/estado/drift.json` para el diagnóstico.
 *
 * Esto no decide nada por sí solo: solo distingue «cambió el código de Timón desde el
 * último verde» de «fallo de entorno» antes de tocar un test.
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { DIR_E2E, RAIZ_REPO, rutaRuntime } from './entorno.mjs';
import { ficherosMapeados } from './mapa-fuentes.mjs';

/** Registro del último verde, dentro de `e2e/` y no versionado. */
export const RUTA_ULTIMO_VERDE = path.join(DIR_E2E, '.last-green.json');

/** Ejecuta un comando de git en la raíz del repo y devuelve la salida recortada. */
function git(...argumentos) {
    try {
        return execFileSync('git', argumentos, { cwd: RAIZ_REPO, encoding: 'utf8' }).trim();
    } catch {
        return null;
    }
}

/** `sha256` de un fichero del repo, o `null` si no existe. */
export function hashFichero(rutaRelativa) {
    try {
        const contenido = fs.readFileSync(path.join(RAIZ_REPO, rutaRelativa));
        return crypto.createHash('sha256').update(contenido).digest('hex');
    } catch {
        return null;
    }
}

/** Estado actual del repo y de los ficheros mapeados. */
export function estadoActual() {
    const ficheros = {};

    for (const rutaRelativa of ficherosMapeados()) {
        ficheros[rutaRelativa] = hashFichero(rutaRelativa);
    }

    return {
        fecha: new Date().toISOString(),
        rama: git('rev-parse', '--abbrev-ref', 'HEAD'),
        head: git('rev-parse', 'HEAD'),
        ficheros
    };
}

/** Guarda el estado de una ejecución verde. Devuelve el estado escrito. */
export function guardarUltimoVerde(extra = {}) {
    const estado = { ...estadoActual(), ...extra };

    fs.writeFileSync(RUTA_ULTIMO_VERDE, `${JSON.stringify(estado, null, 4)}\n`, 'utf8');

    return estado;
}

/**
 * Compara el estado actual con el último verde.
 * No lanza: si no hay registro, lo indica y sigue.
 */
export function compararConUltimoVerde() {
    if (!fs.existsSync(RUTA_ULTIMO_VERDE)) {
        return { existe: false, ficherosCambiados: [], headAnterior: null, headActual: git('rev-parse', 'HEAD') };
    }

    let anterior;

    try {
        anterior = JSON.parse(fs.readFileSync(RUTA_ULTIMO_VERDE, 'utf8'));
    } catch (error) {
        return { existe: false, error: `No se pudo leer .last-green.json: ${error.message}`, ficherosCambiados: [] };
    }

    const actual = estadoActual();
    const ficherosCambiados = [];

    for (const [rutaRelativa, hashAnterior] of Object.entries(anterior.ficheros ?? {})) {
        if (actual.ficheros[rutaRelativa] !== hashAnterior) ficherosCambiados.push(rutaRelativa);
    }

    const resultado = {
        existe: true,
        fechaAnterior: anterior.fecha ?? null,
        headAnterior: anterior.head ?? null,
        headActual: actual.head,
        ficherosCambiados
    };

    fs.mkdirSync(rutaRuntime('estado'), { recursive: true });
    fs.writeFileSync(rutaRuntime('estado', 'drift.json'), `${JSON.stringify(resultado, null, 4)}\n`, 'utf8');

    return resultado;
}

/** Resumen legible para la consola del lanzador. */
export function resumenDrift() {
    const resultado = compararConUltimoVerde();

    if (!resultado.existe) return 'Sin registro de último verde: esta ejecución será la referencia si pasa.';

    if (resultado.ficherosCambiados.length === 0) {
        return `Sin cambios en los ficheros mapeados desde el último verde (HEAD ${resultado.headAnterior}).`;
    }

    return `Cambios desde el último verde (HEAD ${resultado.headAnterior}): ${resultado.ficherosCambiados.join(', ')}`;
}
