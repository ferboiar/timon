/**
 * F-47: mecanismo único para distinguir un error de negocio de un error técnico.
 *
 * - Un error de negocio lleva un mensaje breve pensado para el usuario y un
 *   código HTTP (`status`). La ruta lo devuelve tal cual.
 * - Cualquier otro error es técnico: la ruta responde con un texto genérico y el
 *   detalle completo queda en el log del servidor.
 *
 * `esErrorDeNegocio` no considera de negocio cualquier error que tenga `status`:
 * solo reconoce `ErrorDeNegocio` (y sus subclases), un error con la marca
 * explícita y las clases heredadas del proyecto que ya lo eran (`ErrorDeRecibo`,
 * `ErrorDeAjuste`), identificadas por nombre y `status` entero.
 */

/** Marca explícita de error de negocio, para errores que no son instancias. */
export const MARCA_ERROR_DE_NEGOCIO = Symbol.for('timon.errorDeNegocio');

/** Error con mensaje para el usuario y código HTTP asociado. */
export class ErrorDeNegocio extends Error {
    /**
     * @param {string} mensaje Texto breve para el usuario.
     * @param {number} status Código HTTP (400 por defecto).
     * @param {string|null} codigo Código de negocio opcional, por ejemplo `IBAN_DUPLICADO`.
     */
    constructor(mensaje, status = 400, codigo = null) {
        super(mensaje);
        this.name = 'ErrorDeNegocio';
        this.status = status;
        this.codigo = codigo;
        this[MARCA_ERROR_DE_NEGOCIO] = true;
    }
}

/** Clases heredadas que ya representaban un error de negocio antes de F-47. */
const NOMBRES_DE_NEGOCIO = ['ErrorDeRecibo', 'ErrorDeAjuste'];

export function esErrorDeNegocio(error) {
    if (!error) return false;
    if (error instanceof ErrorDeNegocio) return true;
    if (error[MARCA_ERROR_DE_NEGOCIO] === true) return true;
    return NOMBRES_DE_NEGOCIO.includes(error.name) && Number.isInteger(error.status);
}

/**
 * Respuesta que corresponde a un error. Función pura, sin tocar `res`, para
 * poder probarla sin servidor.
 *
 * @returns {{ status: number, cuerpo: { error: string, codigo?: string }, tecnico: boolean }}
 */
export function respuestaDeError(error, mensajeGenerico) {
    if (!esErrorDeNegocio(error)) {
        return { status: 500, cuerpo: { error: mensajeGenerico }, tecnico: true };
    }

    const cuerpo = { error: error.message };
    if (error.codigo) cuerpo.codigo = error.codigo;

    return { status: Number.isInteger(error.status) ? error.status : 400, cuerpo, tecnico: false };
}

/**
 * Responde al cliente y, si el error es técnico, deja el detalle en el log.
 *
 * @param {object} res Respuesta de Express.
 * @param {Error} error Error capturado.
 * @param {string} mensajeGenerico Texto seguro para un fallo técnico.
 * @param {{ clave?: string, contexto?: string }} [opciones] Campo de la respuesta
 *   (`error` por defecto; `message` en las rutas que ya usaban esa clave) y
 *   prefijo del registro en el log.
 */
export function responderError(res, error, mensajeGenerico, opciones = {}) {
    const { clave = 'error', contexto = '' } = opciones;
    const { status, cuerpo, tecnico } = respuestaDeError(error, mensajeGenerico);

    if (tecnico) {
        console.error(`${contexto ? contexto + ' - ' : ''}Error técnico (${status}):`, error);
    }

    const respuesta = { [clave]: cuerpo.error };
    if (cuerpo.codigo) respuesta.codigo = cuerpo.codigo;

    return res.status(status).json(respuesta);
}
