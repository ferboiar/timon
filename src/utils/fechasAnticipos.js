/**
 * Utilidades de fechas para Anticipos en la pantalla (F-46, DC-41).
 *
 * La secuencia está anclada en el día de la fecha de inicio del anticipo: si el día
 * no existe en el mes destino, se usa el último día de ese mes. Trabaja con Date
 * locales, igual que el resto del formulario, y no usa toISOString.
 */

/**
 * Suma meses a una fecha conservando el día de anclaje.
 * @param {Date} fecha - Fecha de partida
 * @param {number} diaAncla - Día de la fecha de inicio del anticipo
 * @param {number} [meses=1] - Meses a sumar
 * @returns {Date} Nueva fecha
 */
export function sumarMesAnclado(fecha, diaAncla, meses = 1) {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
        throw new Error('La fecha de partida no es válida');
    }
    if (!Number.isInteger(diaAncla) || diaAncla < 1 || diaAncla > 31) {
        throw new Error('El día de anclaje debe estar entre 1 y 31');
    }
    if (!Number.isInteger(meses) || meses <= 0) {
        throw new Error('Los meses a sumar deben ser un entero mayor que 0');
    }
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + meses;
    const ultimoDia = new Date(anio, mes + 1, 0).getDate();
    const dia = Math.min(diaAncla, ultimoDia);
    return new Date(anio, mes, dia);
}
