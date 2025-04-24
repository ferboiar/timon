/**
 * Resolvedor de rutas para ESM
 *
 * Este módulo proporciona funciones para resolver rutas de alias en un entorno
 * de módulos ES (ESM). Permite utilizar rutas personalizadas como '@backend/'
 * en lugar de rutas relativas.
 *
 * @module utils/path-resolver
 */

import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Obtener información del módulo actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear un require para importar el package.json
const require = createRequire(import.meta.url);
const packageJson = require('../../../package.json');

// Función para resolver rutas según los alias configurados en package.json
export function resolveAlias(path) {
    // Obtener los alias definidos en package.json
    const aliases = packageJson._moduleAliases || {};

    // Comprobar si la ruta empieza por alguno de los alias
    for (const [alias, target] of Object.entries(aliases)) {
        if (path.startsWith(alias)) {
            // Reemplazar el alias por la ruta real
            const replacedPath = path.replace(alias, target);
            // Resolver la ruta completa desde la raíz del proyecto
            return resolve(process.cwd(), replacedPath);
        }
    }

    // Si no es un alias, devolver la ruta sin cambios
    return path;
}

/**
 * Importa un módulo utilizando un alias
 * @param {string} path - Ruta con alias (ej: '@backend/config/env.mjs')
 * @returns {Promise<any>} - El módulo importado
 */
export async function importWithAlias(path) {
    const resolvedPath = resolveAlias(path);
    return import(resolvedPath);
}

// Exportar la ruta raíz del proyecto como constante
export const PROJECT_ROOT = resolve(__dirname, '../../..');
