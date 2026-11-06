/**
 * Entorno compartido de la suite E2E de Timón.
 * ============================================
 *
 * Responsabilidades:
 * - Derivar la raíz del repositorio desde la ubicación de `e2e/` (sin rutas
 *   absolutas), para que la suite funcione igual en el contenedor y en el portátil.
 * - Cargar `e2e/.env` con una ruta relativa a este fichero (no al cwd).
 * - Resolver el directorio de ejecución (`/tmp/timon-e2e` por defecto) y sus
 *   subcarpetas: artifacts, logs, estado, diagnostico, tmp y cache.
 *
 * Nota sobre dotenv: `dotenv.config()` NO sobrescribe variables ya definidas en el
 * entorno (dotenv 18), así que las variables exportadas en el portátil tienen
 * prioridad sobre el fichero. Es lo deseado para E2E_CDP_URL y E2E_BASE_URL.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

/** Directorio `e2e/`. */
export const DIR_E2E = fileURLToPath(new URL('..', import.meta.url));

/** Raíz del repositorio de Timón (padre de `e2e/`). */
export const RAIZ_REPO = path.resolve(DIR_E2E, '..');

/** Ruta absoluta de `e2e/.env`. */
export const RUTA_ENV = path.join(DIR_E2E, '.env');

/** Carga `e2e/.env` sin sobrescribir el entorno y sin ruido en la salida. */
export function cargarEnv() {
    const resultado = dotenv.config({ path: RUTA_ENV, quiet: true });

    if (resultado.error) {
        const motivo = resultado.error.code === 'ENOENT' ? 'no existe' : resultado.error.message;
        throw new Error(`No se pudo cargar ${RUTA_ENV}: ${motivo}. Copia .env.example a .env y rellénalo.`);
    }
}

/** Directorio de ejecución (desechable). Configurable con E2E_RUNTIME_DIR. */
export function dirRuntime() {
    return process.env.E2E_RUNTIME_DIR || '/tmp/timon-e2e';
}

/** Subcarpetas del directorio de ejecución. */
export const SUBDIRECTORIOS = ['artifacts', 'logs', 'estado', 'diagnostico', 'tmp', 'cache'];

/** Ruta dentro del directorio de ejecución. */
export function rutaRuntime(...partes) {
    return path.join(dirRuntime(), ...partes);
}

/**
 * URL de la aplicación vista desde el navegador que conduce la suite.
 *
 * Es obligatoria: no hay valor por defecto para no dejar una dirección de red
 * concreta en el repositorio. Se define en `e2e/.env` o se exporta en el entorno.
 */
export function baseUrl() {
    const valor = process.env.E2E_BASE_URL;

    if (!valor) {
        throw new Error(
            'Falta E2E_BASE_URL: define la URL de la aplicación (por ejemplo http://localhost:5173) ' +
                'en e2e/.env o expórtala antes de ejecutar. Consulta e2e/.env.example.'
        );
    }

    return valor;
}

/** URL absoluta de una ruta de la aplicación. */
export function urlDe(ruta) {
    const raiz = baseUrl();
    return new URL(ruta, raiz.endsWith('/') ? raiz : `${raiz}/`).toString();
}

/** Credenciales del usuario E2E (nunca se registran). */
export function credenciales() {
    const usuario = process.env.E2E_USER;
    const password = process.env.E2E_PASSWORD;

    if (!usuario) throw new Error('Falta E2E_USER en e2e/.env');
    if (!password) throw new Error('Falta E2E_PASSWORD en e2e/.env');

    return { usuario, password };
}

/** Bases de datos sobre las que se permite ejecutar la suite. */
export function basesPermitidas() {
    const lista = process.env.E2E_BASES_PERMITIDAS || 'conta_hogar';
    return lista.split(',').map((base) => base.trim()).filter(Boolean);
}

/** ¿Debe la suite arrancar front y back si no están vivos? */
export function debeArrancarServidores() {
    return (process.env.E2E_ARRANCAR_SERVIDORES ?? '1') !== '0';
}

/** ¿Debe maximizarse la ventana de Edge usada por la suite? */
export function debeMaximizarVentana() {
    return (process.env.E2E_MAXIMIZAR_VENTANA ?? '1') !== '0';
}

/**
 * ¿Debe borrarse una categoría huérfana de una ejecución anterior?
 *
 * Por defecto **sí**, porque solo se consideran huérfanas las que tienen el formato exacto
 * de esta suite (`e2e_categoria_AAAAMMDD_HHMMSS`) y no pertenecen a la ejecución en curso.
 * Con `E2E_LIMPIAR_HUERFANAS=0` solo se informa.
 */
export function debeLimpiarHuerfanas() {
    return (process.env.E2E_LIMPIAR_HUERFANAS ?? '1') !== '0';
}
