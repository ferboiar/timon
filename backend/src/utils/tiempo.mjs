/**
 * Utilidades de fecha y hora con zona horaria (DC-25)
 *
 * Las horas se guardan en UTC. El "hoy", el mes y el año en curso se calculan en la zona horaria
 * de los ajustes de la aplicación (por defecto Europe/Madrid), con el cambio de hora incluido.
 *
 * @module tiempo
 */

/**
 * Indica si es un nombre de zona horaria IANA que el motor de JavaScript reconoce
 * @param {string} zona - Por ejemplo, 'Europe/Madrid'
 * @returns {boolean}
 */
export function esZonaValida(zona) {
    if (typeof zona !== 'string' || zona.trim() === '') return false;
    try {
        new Intl.DateTimeFormat('en-CA', { timeZone: zona });
        return true;
    } catch {
        return false;
    }
}

/**
 * Fecha de hoy en la zona indicada, como Date construido con los campos locales (año, mes y día de esa zona)
 * @param {string} zona - Nombre de la zona horaria
 * @param {Date} [ahora] - Instante de referencia (parámetro para poder probarlo)
 * @returns {Date}
 */
export function hoyEnZonaDe(zona, ahora = new Date()) {
    const partes = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' })
            .formatToParts(ahora)
            .map((p) => [p.type, p.value])
    );
    return new Date(Number(partes.year), Number(partes.month) - 1, Number(partes.day));
}

/**
 * Fecha de hoy en la zona indicada, en formato YYYY-MM-DD
 * @param {string} zona - Nombre de la zona horaria
 * @param {Date} [ahora] - Instante de referencia
 * @returns {string}
 */
export function hoyIsoEnZonaDe(zona, ahora = new Date()) {
    const hoy = hoyEnZonaDe(zona, ahora);
    return hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
}
