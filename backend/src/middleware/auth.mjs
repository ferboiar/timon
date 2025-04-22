import jwt from 'jsonwebtoken';
import { config } from '../config/env.mjs';

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
        return res.status(403).json({
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
