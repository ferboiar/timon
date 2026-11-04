/**
 * Utilidades de fechas para Anticipos (F-46, DC-41).
 *
 * La secuencia de pagos está anclada en el día de la fecha de inicio del anticipo.
 * Si el día no existe en un mes (por ejemplo, el 31 en febrero), se usa el último día
 * de ese mes. Todo el cálculo se hace con texto YYYY-MM-DD y aritmética de enteros,
 * sin objetos Date ni dependencia de la zona horaria del proceso.
 *
 * @module fechasAnticipos
 */

const DOS_CIFRAS = (n) => String(n).padStart(2, '0');

/**
 * Normaliza una fecha a texto YYYY-MM-DD.
 * Acepta un texto que empiece por YYYY-MM-DD (como los DATE de mysql2) o un Date.
 * @param {string|Date} valor
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function fechaISO(valor) {
    const texto = valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        throw new Error('La fecha debe estar en formato YYYY-MM-DD: ' + valor);
    }
    return texto;
}

function diasDelMes(anio, mes) {
    return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Devuelve la fecha anclada que corresponde a k periodos desde la fecha de inicio.
 * @param {string} fechaInicioISO - Ancla de la secuencia, en YYYY-MM-DD
 * @param {number} k - Número de periodos transcurridos (0 es la propia fecha de inicio)
 * @param {number} meses - Meses por periodo (1 mensual, 2 bimestral, 3 trimestral, 12 anual)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function fechaAnclada(fechaInicioISO, k, meses) {
    if (!Number.isInteger(k) || k < 0) throw new Error('El número de periodos debe ser un entero mayor o igual que 0');
    if (!Number.isInteger(meses) || meses <= 0) throw new Error('Los meses por periodo deben ser un entero mayor que 0');
    const [anio, mes, dia] = fechaISO(fechaInicioISO).split('-').map(Number);
    const mesesDesdeEnero = mes - 1 + k * meses;
    const anioDestino = anio + Math.floor(mesesDesdeEnero / 12);
    const mesDestino = (mesesDesdeEnero % 12) + 1;
    const diaDestino = Math.min(dia, diasDelMes(anioDestino, mesDestino));
    return anioDestino + '-' + DOS_CIFRAS(mesDestino) + '-' + DOS_CIFRAS(diaDestino);
}

/**
 * Devuelve la primera fecha anclada estrictamente posterior a ultimaFechaISO.
 * Se usa para continuar el plan a partir del último pago existente sin arrastrar desvíos.
 * @param {string} ultimaFechaISO - Última fecha de pago existente, en YYYY-MM-DD
 * @param {string} fechaInicioISO - Ancla de la secuencia, en YYYY-MM-DD
 * @param {number} meses - Meses por periodo
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function siguienteFechaAnclada(ultimaFechaISO, fechaInicioISO, meses) {
    if (!Number.isInteger(meses) || meses <= 0) throw new Error('Los meses por periodo deben ser un entero mayor que 0');
    const ultima = fechaISO(ultimaFechaISO);
    const inicio = fechaISO(fechaInicioISO);
    const [anioUltima, mesUltima] = ultima.split('-').map(Number);
    const [anioInicio, mesInicio] = inicio.split('-').map(Number);
    const mesesEntre = (anioUltima - anioInicio) * 12 + (mesUltima - mesInicio);
    let k = Math.max(0, Math.ceil(mesesEntre / meses));
    while (fechaAnclada(inicio, k, meses) <= ultima) k++;
    return fechaAnclada(inicio, k, meses);
}

/**
 * Suma meses a una fecha anclada conservando el día de anclaje.
 * @param {string} fechaISOValor - Fecha de partida, en YYYY-MM-DD
 * @param {number} meses - Meses a sumar
 * @param {number} diaAncla - Día de la fecha de inicio del anticipo
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function sumarMesesAnclado(fechaISOValor, meses, diaAncla) {
    if (!Number.isInteger(meses) || meses <= 0) throw new Error('Los meses a sumar deben ser un entero mayor que 0');
    if (!Number.isInteger(diaAncla) || diaAncla < 1 || diaAncla > 31) throw new Error('El día de anclaje debe estar entre 1 y 31');
    const [anio, mes] = fechaISO(fechaISOValor).split('-').map(Number);
    const mesesDesdeEnero = mes - 1 + meses;
    const anioDestino = anio + Math.floor(mesesDesdeEnero / 12);
    const mesDestino = (mesesDesdeEnero % 12) + 1;
    const diaDestino = Math.min(diaAncla, diasDelMes(anioDestino, mesDestino));
    return anioDestino + '-' + DOS_CIFRAS(mesDestino) + '-' + DOS_CIFRAS(diaDestino);
}
