/**
 * Middleware de autenticación y autorización
 *
 * Este archivo contiene los middlewares necesarios para la autenticación y autorización de usuarios:
 * - verifyToken: Valida que el token JWT sea válido y no haya expirado
 * - verifyAdmin: Verifica que el usuario tenga rol de administrador
 * - checkRole: Verifica que el usuario tenga alguno de los roles especificados
 *
 * Estos middlewares se utilizan en las rutas para proteger el acceso a recursos según
 * los permisos del usuario autenticado.
 */

import jwt from 'jsonwebtoken';
import { config } from '#backend/config/env.mjs';
import { getUserById } from '#backend/db/db_utilsUsers.mjs';
import { puedeAcceder } from '#backend/utils/autorizacion.mjs';
import { responderError } from '#backend/utils/errorDeNegocio.mjs';

// Middleware para verificar token JWT
export const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Se requiere token de autenticación'
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Error de autenticación:', error);
        // S-16: el token inválido o caducado es un problema de autenticación (401).
        // El 403 queda para la autorización: sin rol suficiente.
        return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};

// Middleware para verificar si el usuario es admin
export const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'admin') {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: 'Acceso restringido a administradores'
            });
        }
    });
};

// Middleware para verificar si el usuario tiene un rol específico
export const checkRole = (roles = []) => {
    return (req, res, next) => {
        verifyToken(req, res, () => {
            if (roles.includes(req.user.rol)) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para realizar esta acción'
                });
            }
        });
    };
};

/**
 * Autorización por módulo y acción (S-12, DC-48).
 *
 * Valida el token, carga el usuario vigente (rol y perm_* actuales, no los del JWT) y aplica
 * la matriz de `utils/autorizacion.mjs`. Deja el usuario en `req.usuario` para que la ruta
 * pueda comprobar la propiedad del registro.
 */
export const autorizar = (modulo, accion = 'lectura') => {
    return (req, res, next) => {
        verifyToken(req, res, async () => {
            try {
                const usuario = await getUserById(req.user.id);

                if (!puedeAcceder(usuario, modulo, accion)) {
                    console.log(`auth - autorización denegada: usuario ${req.user.id} (${usuario.rol}) sin ${accion} en ${modulo}`);
                    return res.status(403).json({
                        success: false,
                        message: 'No tienes permisos para realizar esta acción'
                    });
                }

                req.usuario = usuario;
                next();
            } catch (error) {
                console.error(`auth - error al autorizar ${modulo}/${accion}: ${error.message}`);
                responderError(res, error, 'No se pudo comprobar la autorización.', { contexto: `auth - ${modulo}` });
            }
        });
    };
};
