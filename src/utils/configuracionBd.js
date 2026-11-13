/**
 * Utilidades de la pestaña Base de Datos (S-02, S-03).
 *
 * Vive fuera del componente para poder probarlas sin montar la pantalla.
 */

/** Campos no secretos que se comparan para saber si hay cambios pendientes. */
export const CAMPOS_BD = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_DATABASE', 'DB_SSL_CA', 'DB_MAINT_USER'];

/**
 * ¿Hay cambios pendientes respecto a lo guardado?
 *
 * Las contraseñas nunca se reciben del servidor: si el formulario tiene alguna escrita, hay
 * un cambio, aunque el resto coincida.
 *
 * @param {Object} actual Estado del formulario.
 * @param {Object} original Último estado guardado.
 * @returns {boolean}
 */
export function hayCambiosBd(actual, original) {
    const distinto = CAMPOS_BD.some((campo) => (actual?.[campo] ?? '') !== (original?.[campo] ?? ''));

    return distinto || Boolean(actual?.DB_PASSWORD || actual?.DB_MAINT_PASSWORD);
}

/**
 * S-02/DC-06: lo que se envía al servidor.
 *
 * Los secretos vacíos no se mandan (el servidor conserva los guardados). La CA y el usuario
 * de mantenimiento se envían siempre, tal cual: vacío significa «eliminar la clave».
 *
 * @param {Object} estado Estado del formulario.
 * @returns {Object} Cuerpo de la petición.
 */
export function configuracionParaEnviar(estado) {
    const configuracion = {
        DB_HOST: String(estado?.DB_HOST ?? '').trim(),
        DB_PORT: String(estado?.DB_PORT ?? '').trim(),
        DB_USER: String(estado?.DB_USER ?? '').trim(),
        DB_DATABASE: String(estado?.DB_DATABASE ?? '').trim(),
        DB_SSL_CA: String(estado?.DB_SSL_CA ?? '').trim(),
        DB_MAINT_USER: String(estado?.DB_MAINT_USER ?? '').trim()
    };

    if (estado?.DB_PASSWORD) configuracion.DB_PASSWORD = estado.DB_PASSWORD;
    if (estado?.DB_MAINT_PASSWORD) configuracion.DB_MAINT_PASSWORD = estado.DB_MAINT_PASSWORD;

    return configuracion;
}

/** Campos obligatorios vacíos (sin contar espacios). */
export function camposObligatoriosVacios(estado) {
    const obligatorios = [
        ['DB_HOST', 'host'],
        ['DB_PORT', 'puerto'],
        ['DB_USER', 'usuario'],
        ['DB_DATABASE', 'base de datos']
    ];

    return obligatorios.filter(([campo]) => String(estado?.[campo] ?? '').trim() === '').map(([, nombre]) => nombre);
}

/** El puerto tiene que ser un número entero entre 1 y 65535. */
export function errorPuertoBd(estado) {
    const puerto = String(estado?.DB_PORT ?? '').trim();

    if (puerto === '') return '';

    const numero = Number(puerto);

    return Number.isInteger(numero) && numero >= 1 && numero <= 65535 ? '' : 'El puerto debe ser un número entre 1 y 65535.';
}
