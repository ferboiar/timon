/**
 * Middleware de autenticación y autorización
 *
 * Este archivo contiene los middlewares necesarios para la autenticación y autorización de usuarios:
 * - verifyToken: Valida el JWT, comprueba la versión de sesión y carga el usuario vigente
 * - verifyAdmin: Verifica que el usuario tenga rol de administrador
 * - checkRole: Verifica que el usuario tenga alguno de los roles especificados
 *
 * S-04a (DC-62): el rol y los permisos se leen de la base de datos en cada petición,
 * no del token. Los errores técnicos se entregan con `next(err)`; Express 4 no captura
 * las promesas rechazadas de un middleware asíncrono.
 */

import { puedeAcceder } from '#backend/utils/autorizacion.mjs';
import { autenticarSesion, ErrorDeSesion, MENSAJE_TOKEN_INVALIDO } from '#backend/utils/sesion.mjs';

/** Respuesta 401 común para una sesión no válida. */
function responderSesion(res, error) {
    return res.status(401).json({
        success: false,
        message: error?.message || MENSAJE_TOKEN_INVALIDO
    });
}

/** Crea el middleware de token; la fábrica permite inyectar el autenticador en pruebas. */
export function crearVerifyToken({ autenticar = autenticarSesion } = {}) {
    return async (req, res, next) => {
        try {
            req.user = await autenticar(req);
            next();
        } catch (error) {
            if (error instanceof ErrorDeSesion) return responderSesion(res, error);
            next(error);
        }
    };
}

export const verifyToken = crearVerifyToken();

/** Crea el middleware de administrador con el autenticador indicado. */
export function crearVerifyAdmin({ autenticar = autenticarSesion } = {}) {
    return async (req, res, next) => {
        try {
            req.user = await autenticar(req);
            if (req.user.rol === 'admin') return next();

            return res.status(403).json({
                success: false,
                message: 'Acceso restringido a administradores'
            });
        } catch (error) {
            if (error instanceof ErrorDeSesion) return responderSesion(res, error);
            next(error);
        }
    };
}

export const verifyAdmin = crearVerifyAdmin();

/** Crea el middleware de roles con el autenticador indicado. */
export function crearCheckRole(roles = [], { autenticar = autenticarSesion } = {}) {
    return async (req, res, next) => {
        try {
            req.user = await autenticar(req);
            if (roles.includes(req.user.rol)) return next();

            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta acción'
            });
        } catch (error) {
            if (error instanceof ErrorDeSesion) return responderSesion(res, error);
            next(error);
        }
    };
}

export const checkRole = (roles = []) => crearCheckRole(roles);

/**
 * Autorización por módulo y acción (S-12, DC-48).
 *
 * Valida la sesión una sola vez, aplica la matriz de `utils/autorizacion.mjs` y deja
 * el usuario vigente en `req.usuario` para que la ruta compruebe la propiedad.
 */
export const autorizar = (modulo, accion = 'lectura') => {
    return async (req, res, next) => {
        try {
            const usuario = await autenticarSesion(req);
            req.user = usuario;

            if (!puedeAcceder(usuario, modulo, accion)) {
                console.log(`auth - autorización denegada: usuario ${usuario.id} (${usuario?.rol ?? 'desconocido'}) sin ${accion} en ${modulo}`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para realizar esta acción'
                });
            }

            req.usuario = usuario;
            next();
        } catch (error) {
            if (error instanceof ErrorDeSesion) return responderSesion(res, error);
            error.contexto = `auth - ${modulo}`;
            next(error);
        }
    };
};
