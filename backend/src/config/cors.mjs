/**
 * S-05: política de CORS restringida.
 *
 * Configura CORS a partir de dos variables de entorno, ambas listas separadas por comas:
 * - `CORS_ALLOWED_ORIGINS`: nombres de host permitidos (dominios o `localhost`), sin esquema
 *   ni puerto. No admite IPs: para las IPs está `CORS_ALLOWED_NETWORKS`.
 * - `CORS_ALLOWED_NETWORKS`: redes CIDR de IPs permitidas (por ejemplo `192.168.0.0/24`).
 *   Solo se aplica cuando el host del `Origin` es una IP literal; un nombre de host que
 *   resuelva a una IP de la red no se valida contra la red (va en `CORS_ALLOWED_ORIGINS`).
 *
 * Reglas: sin ninguna de las dos variables, CORS queda cerrado; nunca se aceptan `*` ni
 * `true`; la configuración se valida al arrancar y una entrada inválida aborta con un
 * mensaje claro.
 *
 * @module cors
 */

import net from 'node:net';
import cors from 'cors';

/** Listas vacías: sin configuración, ningún origen está permitido. */
function vacio() {
    return { permitidos: new Set(), redes: new net.BlockList() };
}

/** Convierte el valor de una variable de entorno en su lista de entradas recortadas, sin vacíos. */
function entradasDe(valor) {
    if (valor === undefined || valor === null || valor === '') return [];
    return String(valor)
        .split(',')
        .map((entrada) => entrada.trim())
        .filter((entrada) => entrada.length > 0);
}

/** Rechaza `*` y `true`, tanto como valor global como de cada entrada. */
function rechazarComodines(valor, entradas, nombre) {
    const global = String(valor ?? '').trim().toLowerCase();
    if (global === '*' || global === 'true') {
        throw new Error(`CORS: ${nombre} no admite "${global}" como valor global.`);
    }
    for (const entrada of entradas) {
        if (entrada.toLowerCase() === '*' || entrada.toLowerCase() === 'true') {
            throw new Error(`CORS: ${nombre} no admite la entrada "${entrada}".`);
        }
    }
}

const ETIQUETA_HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

/** Valida un nombre de host y lo devuelve en minúsculas; rechaza IPs, esquemas, puertos y rutas. */
function validarHost(entrada, nombre) {
    const texto = String(entrada).trim();
    if (!ETIQUETA_HOST.test(texto) || net.isIP(texto) !== 0) {
        throw new Error(`CORS: ${nombre} no admite "${entrada}": debe ser un nombre de host (dominio o "localhost"), sin esquema, puerto ni IP. Las IPs van en CORS_ALLOWED_NETWORKS.`);
    }
    return texto.toLowerCase();
}

/** Valida un CIDR y lo devuelve como { ip, prefijo, familia }. */
function validarRed(entrada, nombre) {
    const texto = String(entrada).trim();
    const coincidencia = /^(.+)\/(\d{1,3})$/.exec(texto);
    if (!coincidencia) {
        throw new Error(`CORS: ${nombre} no admite "${entrada}": debe ser una red CIDR (por ejemplo 192.168.0.0/24).`);
    }
    const [, ip, prefijoTexto] = coincidencia;
    const familia = net.isIP(ip);
    if (familia === 0) {
        throw new Error(`CORS: ${nombre} no admite "${entrada}": "${ip}" no es una IP literal. Los nombres van en CORS_ALLOWED_ORIGINS.`);
    }
    const prefijo = Number(prefijoTexto);
    const maximo = familia === 4 ? 32 : 128;
    if (!Number.isInteger(prefijo) || prefijo < 0 || prefijo > maximo) {
        throw new Error(`CORS: ${nombre} no admite "${entrada}": el prefijo debe estar entre 0 y ${maximo}.`);
    }
    return { ip, prefijo, familia: familia === 4 ? 'ipv4' : 'ipv6' };
}

/**
 * Lee y valida la configuración CORS desde las variables de entorno.
 * @param {object} [env] Entorno del que leer (process.env por defecto).
 * @returns {{ permitidos: Set<string>, redes: import('node:net').BlockList }}
 */
export function leerConfigCors(env = process.env) {
    const valorOrigenes = env.CORS_ALLOWED_ORIGINS;
    const valorRedes = env.CORS_ALLOWED_NETWORKS;

    const origenes = entradasDe(valorOrigenes);
    const redes = entradasDe(valorRedes);

    rechazarComodines(valorOrigenes, origenes, 'CORS_ALLOWED_ORIGINS');
    rechazarComodines(valorRedes, redes, 'CORS_ALLOWED_NETWORKS');

    if (origenes.length === 0 && redes.length === 0) return vacio();

    const permitidos = new Set(origenes.map((entrada) => validarHost(entrada, 'CORS_ALLOWED_ORIGINS')));
    const blockList = new net.BlockList();
    for (const entrada of redes) {
        const red = validarRed(entrada, 'CORS_ALLOWED_NETWORKS');
        blockList.addSubnet(red.ip, red.prefijo, red.familia);
    }

    return { permitidos, redes: blockList };
}

/** Devuelve el hostname del `Origin`, en minúsculas y sin corchetes de IPv6; null si no se puede interpretar. */
function hostnameDe(origin) {
    try {
        return new URL(origin).hostname.replace(/^\[|\]$/g, '').toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Decide si un `Origin` está permitido. Función pura.
 *
 * - Sin `Origin` (petición que no proviene de un navegador): permitida; la restricción
 *   CORS la aplica el navegador, no el tráfico entre servidores.
 * - El host se compara por nombre contra `permitidos`, sin esquema ni puerto.
 * - Las IPs literales se comprueban contra `redes`; los nombres no se resuelven por DNS.
 */
export function permiteOrigen(origin, config) {
    if (!origin) return true;
    const hostname = hostnameDe(origin);
    if (!hostname) return false;
    if (config.permitidos.has(hostname)) return true;
    if (net.isIP(hostname) !== 0 && config.redes.check(hostname)) return true;
    return false;
}

/**
 * Middleware `cors` configurado con la política anterior.
 * @param {{ permitidos: Set<string>, redes: import('node:net').BlockList }} config
 */
export function crearMiddlewareCors(config) {
    return cors({
        origin(origin, callback) {
            callback(null, permiteOrigen(origin, config));
        }
    });
}
