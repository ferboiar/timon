#!/usr/bin/env node
/**
 * Comprueba el entorno de la suite del backend antes de ejecutarla (DC-46).
 * ========================================================================
 *
 * Lee `backend/test/.env.test` (versionado y cifrado con git-crypt, DC-45) y verifica:
 * - que el fichero existe y tiene permisos 600;
 * - que están las cinco variables `TEST_DB_*` con valor;
 * - que el usuario de pruebas **solo** tiene permisos sobre bases cuyo nombre acaba en `_test`.
 *
 * No imprime el contenido del fichero ni la contraseña. Código de salida 0 si el entorno
 * es seguro y 1 si algo falta o es peligroso.
 *
 * Uso: `node scripts/comprobar-entorno-pruebas.mjs [ruta-del-fichero]`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';

/** Raíz del repositorio, derivada de la ubicación de este script (`scripts/…`). */
export const RAIZ_REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Ruta por defecto del fichero de entorno de pruebas. */
export const FICHERO_POR_DEFECTO = 'backend/test/.env.test';

/** Variables que debe declarar el fichero. */
export const VARIABLES_OBLIGATORIAS = ['TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_USER', 'TEST_DB_PASSWORD', 'TEST_DB_NAME'];

/**
 * Lee un fichero de entorno con el formato que admite `node --env-file`:
 * `CLAVE=valor`, sin comillas ni interpolación. Ignora líneas vacías y comentarios.
 *
 * @param {string} texto Contenido del fichero.
 * @returns {Map<string, string>}
 */
export function parsearEnv(texto) {
    const variables = new Map();

    for (const linea of String(texto).split(/\r?\n/)) {
        const limpia = linea.trim();
        if (!limpia || limpia.startsWith('#')) continue;

        const corte = limpia.indexOf('=');
        if (corte <= 0) continue;

        variables.set(limpia.slice(0, corte).trim(), limpia.slice(corte + 1).trim());
    }

    return variables;
}

/**
 * Nombres de base sobre los que el usuario tiene algún permiso.
 *
 * @param {string[]} filas Salida de `SHOW GRANTS FOR CURRENT_USER()`.
 * @returns {string[]} Bases concedidas; `*` (global) se devuelve como `*`.
 */
export function basesConcedidas(filas) {
    const bases = new Set();

    for (const fila of filas || []) {
        const coincidencia = String(fila).match(/^GRANT\s+(.+?)\s+ON\s+`?([^`.\s]+|\*)`?\s*\.\s*\*/i);
        if (!coincidencia) continue;

        // `USAGE` significa «ningún privilegio»: es el permiso global por defecto
        if (coincidencia[1].trim().toUpperCase() === 'USAGE') continue;

        bases.add(coincidencia[2]);
    }

    return [...bases].sort();
}

/**
 * Bases concedidas que no son de pruebas. `*` cuenta como peligrosa: el usuario podría
 * escribir en cualquier base del servidor.
 *
 * @param {string[]} bases
 * @returns {string[]}
 */
export function basesPeligrosas(bases) {
    return (bases || []).filter((base) => base === '*' || !base.endsWith('_test'));
}

/**
 * Restablece los permisos 600 del fichero de entorno. Git no conserva el modo, así que un
 * checkout nuevo lo deja legible por todos. Devuelve `true` si ha tenido que cambiarlo.
 *
 * @param {string} rutaFichero
 * @returns {boolean}
 */
export function asegurarPermisos(rutaFichero) {
    const modo = fs.statSync(rutaFichero).mode & 0o777;
    if (modo === 0o600) return false;

    fs.chmodSync(rutaFichero, 0o600);
    return true;
}

/**
 * Revisa el fichero de entorno. Devuelve la lista de problemas; vacía si todo está bien.
 *
 * @param {string} rutaFichero Ruta absoluta o relativa a la raíz del repositorio.
 * @param {{ statSync?: typeof fs.statSync, readFileSync?: typeof fs.readFileSync }} [fsSimulado]
 * @returns {{ problemas: string[], variables: Map<string, string> }}
 */
export function revisarFichero(rutaFichero, fsSimulado = {}) {
    const leerStat = fsSimulado.statSync || fs.statSync;
    const leer = fsSimulado.readFileSync || fs.readFileSync;
    const problemas = [];

    if (!fs.existsSync(rutaFichero)) {
        return { problemas: [`No existe ${rutaFichero}. Créalo siguiendo doc/pruebas/entorno-pruebas.md.`], variables: new Map() };
    }

    const variables = parsearEnv(leer(rutaFichero, 'utf8'));

    for (const nombre of VARIABLES_OBLIGATORIAS) {
        if (!variables.get(nombre)) problemas.push(`Falta ${nombre} en ${rutaFichero}.`);
    }

    const base = variables.get('TEST_DB_NAME');
    if (base && !base.endsWith('_test')) problemas.push(`TEST_DB_NAME debe acabar en _test (recibido: ${base}).`);

    return { problemas, variables };
}

async function main() {
    const ruta = path.resolve(RAIZ_REPO, process.argv[2] || FICHERO_POR_DEFECTO);
    const { problemas, variables } = revisarFichero(ruta);

    if (problemas.length === 0 && asegurarPermisos(ruta)) {
        console.log(`${FICHERO_POR_DEFECTO}: permisos ajustados a 600 (git no conserva el modo).`);
    }

    if (problemas.length > 0) {
        console.error('Entorno de pruebas no válido:');
        for (const problema of problemas) console.error('  - ' + problema);
        process.exit(1);
    }

    let conexion;

    try {
        conexion = await mysql.createConnection({
            host: variables.get('TEST_DB_HOST'),
            port: Number(variables.get('TEST_DB_PORT')),
            user: variables.get('TEST_DB_USER'),
            password: variables.get('TEST_DB_PASSWORD')
        });
    } catch (error) {
        console.error('No se pudo conectar con la base de pruebas: ' + (error.code || error.name));
        process.exit(1);
    }

    try {
        const [filas] = await conexion.query('SHOW GRANTS FOR CURRENT_USER()');
        const bases = basesConcedidas(filas.map((fila) => Object.values(fila)[0]));
        const peligrosas = basesPeligrosas(bases);

        if (peligrosas.length > 0) {
            console.error('El usuario de pruebas tiene permisos fuera de las bases *_test: ' + peligrosas.join(', ') + '.');
            console.error(' Reduce sus permisos a `conta_hogar_test`.* antes de ejecutar la suite.');
            process.exit(1);
        }

        console.log(`Entorno de pruebas correcto: ${variables.get('TEST_DB_USER')} en ${variables.get('TEST_DB_HOST')}, base ${variables.get('TEST_DB_NAME')}, solo permisos *_test.`);
    } finally {
        await conexion.end().catch(() => {});
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
