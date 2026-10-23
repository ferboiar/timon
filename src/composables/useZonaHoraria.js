/**
 * Zona horaria de la aplicación (DC-25)
 *
 * Las horas se guardan en UTC. El "hoy", el mes y el año en curso se calculan en la zona horaria
 * de los ajustes (por defecto Europe/Madrid), con el cambio de hora de verano incluido.
 * El estado es único para toda la aplicación.
 */
import { AjustesService } from '@/service/AjustesService';
import { ref } from 'vue';

const ZONA_POR_DEFECTO = 'Europe/Madrid';

export const zonaHoraria = ref(ZONA_POR_DEFECTO);
let carga = null;

function zonaUsable() {
    try {
        new Intl.DateTimeFormat('es-ES', { timeZone: zonaHoraria.value });
        return zonaHoraria.value;
    } catch {
        return ZONA_POR_DEFECTO;
    }
}

/**
 * Carga la zona horaria desde el servidor (una sola vez, salvo que se fuerce). Si falla, se mantiene la actual.
 * @param {boolean} [forzar] - Vuelve a pedirla al servidor
 * @returns {Promise<string>}
 */
export function cargarZonaHoraria(forzar = false) {
    if (!carga || forzar) {
        carga = AjustesService.getGeneral()
            .then((ajustes) => {
                zonaHoraria.value = ajustes.zona_horaria || ZONA_POR_DEFECTO;
                return zonaHoraria.value;
            })
            .catch((error) => {
                console.error('useZonaHoraria. No se pudo cargar la zona horaria:', error);
                carga = null;
                return zonaHoraria.value;
            });
    }
    return carga;
}

/** Actualiza la zona en memoria tras guardarla en los ajustes */
export function establecerZonaHoraria(zona) {
    zonaHoraria.value = zona;
    carga = Promise.resolve(zona);
}

/**
 * Fecha de hoy en la zona de la aplicación, como Date construido con los campos locales de esa zona
 * @param {Date} [ahora] - Instante de referencia
 * @returns {Date}
 */
export function hoyEnZona(ahora = new Date()) {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zonaUsable(), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora).map((p) => [p.type, p.value]));
    return new Date(Number(partes.year), Number(partes.month) - 1, Number(partes.day));
}

/** Año en curso en la zona de la aplicación */
export function anioEnCurso(ahora = new Date()) {
    return hoyEnZona(ahora).getFullYear();
}

/**
 * Formatea un instante (ISO 8601 en UTC) en la zona de la aplicación
 * @param {string|Date} valor
 * @returns {string} - Por ejemplo, 23/10/26, 0:06:43
 */
export function formatearFechaHora(valor) {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', { timeZone: zonaUsable(), dateStyle: 'short', timeStyle: 'medium' }).format(fecha);
}

/**
 * Convierte el valor de una columna DATE (ISO 8601 o YYYY-MM-DD) en un Date a medianoche local de ese mismo día.
 * Las columnas DATE no llevan hora ni zona: así el día no se desplaza según la zona horaria del navegador.
 * @param {string|Date|null} valor
 * @returns {Date|null}
 */
export function fechaDeCalendario(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return new Date(valor.getTime());
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor));
    if (partes) return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function useZonaHoraria() {
    return { zonaHoraria, cargarZonaHoraria, establecerZonaHoraria, hoyEnZona, anioEnCurso, formatearFechaHora, fechaDeCalendario };
}
