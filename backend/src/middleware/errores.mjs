/**
 * Manejador central de errores de Express (S-04a).
 *
 * Express 4 no captura las promesas rechazadas de un middleware asíncrono. Los
 * middlewares de sesión capturan sus errores y los entregan con `next(err)`; este
 * manejador los responde en JSON y deja el detalle saneado en el log (DC-09).
 *
 * @module middleware/errores
 */
import { responderError } from '#backend/utils/errorDeNegocio.mjs';

/** Responde un error no controlado sin romper la respuesta si ya se envió. */
export function manejarErrores(error, req, res, next) {
    if (res.headersSent) return next(error);

    return responderError(res, error, 'No se ha podido completar la operación.', {
        contexto: error?.contexto || 'servidor'
    });
}
