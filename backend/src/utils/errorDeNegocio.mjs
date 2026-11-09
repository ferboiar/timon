/**
 * F-47 y F-48: mecanismo único para distinguir un error de negocio de un error técnico.
 *
 * - Un error de negocio lleva un mensaje breve y accionable pensado para la persona
 *   que usa la pantalla, y un código HTTP (`status`). La ruta lo devuelve tal cual.
 * - Cualquier otro error es técnico: el mensaje visible se compone con el texto propio
 *   de la operación y la causa del catálogo (o el aviso por audiencia); el detalle
 *   completo, saneado, queda en el log del servidor (DC-09).
 *
 * `esErrorDeNegocio` no considera de negocio cualquier error que tenga `status`:
 * solo reconoce `ErrorDeNegocio` (y sus subclases), un error con la marca explícita y
 * las clases heredadas del proyecto que ya lo eran (`ErrorDeRecibo`, `ErrorDeAjuste`),
 * identificadas por nombre y `status` entero.
 */

import { AUDIENCIA_GENERAL, mensajeTecnico } from './catalogoErrores.mjs';

/** Marca explícita de error de negocio, para errores que no son instancias. */
export const MARCA_ERROR_DE_NEGOCIO = Symbol.for('timon.errorDeNegocio');

/** Error con mensaje para el usuario y código HTTP asociado. */
export class ErrorDeNegocio extends Error {
    /**
     * @param {string} mensaje Texto breve y accionable para el usuario.
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

/** Quita contraseñas y credenciales de una cadena antes de registrarla. */
export function sanearParaLog(valor) {
    return String(valor)
        .replace(/((?:password|contraseña|pwd|pass)\s*[=:]\s*)\S+/gi, '$1<oculto>')
        .replace(/\/\/([^/\s:@]+):[^@\s]+@/g, '//$1:<oculto>@');
}

/**
 * Detalle del error para el log: código y mensaje, sin secretos. Nunca se envía al
 * cliente.
 *
 * @param {unknown} error Error capturado.
 * @returns {string}
 */
export function detalleParaLog(error) {
    if (error === null || error === undefined) return 'sin detalle';

    const codigo = error?.code ?? error?.errno;
    const mensaje = error instanceof Error ? error.message : String(error);
    const partes = [];

    if (codigo !== undefined && codigo !== null) partes.push('código ' + sanearParaLog(codigo));
    partes.push(sanearParaLog(mensaje) || 'sin mensaje');

    return partes.join(' - ');
}

/**
 * Respuesta que corresponde a un error. Función pura, sin tocar `res`, para poder
 * probarla sin servidor.
 *
 * @param {unknown} error Error capturado.
 * @param {string} mensajePropio Texto propio de la operación (qué se intentaba hacer).
 * @param {{ audiencia?: string, aviso?: string|null }} [opciones] Audiencia de la ruta
 *   y aviso literal para cuando la causa no se identifique.
 * @returns {{ status: number, cuerpo: { error: string, codigo?: string }, tecnico: boolean }}
 */
export function respuestaDeError(error, mensajePropio, opciones = {}) {
    const { audiencia = AUDIENCIA_GENERAL, aviso = null } = opciones;

    if (!esErrorDeNegocio(error)) {
        return { status: 500, cuerpo: { error: mensajeTecnico(mensajePropio, error, { audiencia, aviso }) }, tecnico: true };
    }

    const cuerpo = { error: error.message };
    if (error.codigo) cuerpo.codigo = error.codigo;

    return { status: Number.isInteger(error.status) ? error.status : 400, cuerpo, tecnico: false };
}

/**
 * Responde al cliente y, si el error es técnico, deja el detalle en el log.
 *
 * @param {object} res Respuesta de Express.
 * @param {unknown} error Error capturado.
 * @param {string} mensajePropio Texto propio de la operación.
 * @param {{ clave?: string, contexto?: string, audiencia?: string, aviso?: string|null }} [opciones]
 *   Campo de la respuesta (`error` por defecto; `message` en las rutas que ya usaban
 *   esa clave), prefijo del registro en el log, audiencia de la ruta y aviso literal.
 */
export function responderError(res, error, mensajePropio, opciones = {}) {
    const { clave = 'error', contexto = '', audiencia = AUDIENCIA_GENERAL, aviso = null } = opciones;
    const { status, cuerpo, tecnico } = respuestaDeError(error, mensajePropio, { audiencia, aviso });

    if (tecnico) {
        console.error(`${contexto ? contexto + ': ' : ''}error técnico (${status}) - ${detalleParaLog(error)}`);
    }

    const respuesta = { [clave]: cuerpo.error };
    if (cuerpo.codigo) respuesta.codigo = cuerpo.codigo;

    return res.status(status).json(respuesta);
}
