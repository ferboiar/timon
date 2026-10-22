/**
 * Ajustes del sistema guardados en la base de datos (tabla 'ajustes_sistema', DC-24 y DC-25)
 *
 * Incluye la zona horaria de la aplicación y el interruptor de la creación automática de recibos.
 * La zona se guarda como nombre IANA (por defecto Europe/Madrid); las horas se almacenan siempre en UTC.
 *
 * @module db_ajustes
 */

import { esZonaValida, hoyEnZonaDe } from '../utils/tiempo.mjs';
import { getConnection } from './db_connection.mjs';

const ZONA_POR_DEFECTO = 'Europe/Madrid';
const TTL_CACHE_MS = 60000;
let cacheZona = { valor: null, caduca: 0 };

class ErrorDeAjuste extends Error {
    constructor(mensaje, status) {
        super(mensaje);
        this.name = 'ErrorDeAjuste';
        this.status = status;
    }
}

/** Vacía la memoria de la zona horaria (tras cambiarla o en las pruebas) */
function reiniciarCacheAjustes() {
    cacheZona = { valor: null, caduca: 0 };
}

async function getAjuste(clave) {
    let connection;
    try {
        connection = await getConnection();
        const [filas] = await connection.execute('SELECT `valor` FROM `ajustes_sistema` WHERE `clave` = ?', [clave]);
        return filas.length > 0 ? filas[0].valor : null;
    } finally {
        if (connection) connection.release();
    }
}

async function guardarAjuste(clave, valor) {
    let connection;
    try {
        connection = await getConnection();
        await connection.execute('INSERT INTO `ajustes_sistema` (`clave`, `valor`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `valor` = VALUES(`valor`)', [clave, String(valor)]);
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Zona horaria de la aplicación. Si el ajuste falta o no es válido, devuelve Europe/Madrid.
 * @returns {Promise<string>}
 */
async function getZonaHoraria() {
    if (cacheZona.valor && Date.now() < cacheZona.caduca) return cacheZona.valor;
    const guardada = await getAjuste('zona_horaria');
    const zona = esZonaValida(guardada) ? guardada : ZONA_POR_DEFECTO;
    cacheZona = { valor: zona, caduca: Date.now() + TTL_CACHE_MS };
    return zona;
}

/**
 * Cambia la zona horaria de la aplicación. Debe ser un nombre IANA que reconozcan JavaScript y MariaDB.
 * @param {string} zona - Por ejemplo, 'Europe/Madrid'
 * @throws {ErrorDeAjuste} - Con status 400 si la zona no es válida
 */
async function setZonaHoraria(zona) {
    if (!esZonaValida(zona)) {
        throw new ErrorDeAjuste('La zona horaria no es válida. Usa un nombre como Europe/Madrid.', 400);
    }
    let connection;
    try {
        connection = await getConnection();
        const [[fila]] = await connection.execute("SELECT CONVERT_TZ('2000-01-01 00:00:00', '+00:00', ?) AS convertida", [zona]);
        if (fila.convertida === null) {
            throw new ErrorDeAjuste('La base de datos no conoce esa zona horaria.', 400);
        }
    } finally {
        if (connection) connection.release();
    }
    await guardarAjuste('zona_horaria', zona);
    cacheZona = { valor: zona, caduca: Date.now() + TTL_CACHE_MS };
}

/**
 * Fecha de hoy en la zona horaria de los ajustes (Date con los campos locales de esa zona)
 * @param {Date} [ahora] - Instante de referencia (parámetro para poder probarlo)
 * @returns {Promise<Date>}
 */
async function hoyEnZona(ahora = new Date()) {
    return hoyEnZonaDe(await getZonaHoraria(), ahora);
}

/** @returns {Promise<boolean>} - true si el evento crea automáticamente los recibos del año (por defecto sí) */
async function getCrearRecibosAutomaticamente() {
    return ((await getAjuste('crear_recibos_automaticamente')) ?? '1') === '1';
}

/** @param {boolean} activo - Activa o desactiva la creación automática; persiste hasta que se vuelva a cambiar */
async function setCrearRecibosAutomaticamente(activo) {
    await guardarAjuste('crear_recibos_automaticamente', activo ? '1' : '0');
}

export { ErrorDeAjuste, getAjuste, getCrearRecibosAutomaticamente, getZonaHoraria, hoyEnZona, reiniciarCacheAjustes, setCrearRecibosAutomaticamente, setZonaHoraria };
