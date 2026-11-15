/**
 * Sesión de usuario (S-04a, DC-62).
 *
 * El JWT lleva la versión de token del usuario (`ver`). La versión vive en
 * `users.token_version`; al cerrar sesión o cambiar la contraseña se incrementa y
 * todos los tokens anteriores dejan de valer. La verificación carga el usuario
 * vigente, de modo que el rol aplicado es el de la base de datos y no el del token.
 *
 * Los tokens emitidos antes de esta decisión no llevan `ver` y se rechazan: el
 * despliegue fuerza un único re-login.
 *
 * @module utils/sesion
 */
import jwt from 'jsonwebtoken';

import { config } from '#backend/config/env.mjs';
import { getUserById } from '#backend/db/db_utilsUsers.mjs';

export const MENSAJE_SIN_TOKEN = 'Se requiere token de autenticación';
export const MENSAJE_TOKEN_INVALIDO = 'Token inválido o expirado';

/** Error de autenticación que las rutas y middlewares traducen a 401. */
export class ErrorDeSesion extends Error {
    constructor(mensaje = MENSAJE_TOKEN_INVALIDO) {
        super(mensaje);
        this.name = 'ErrorDeSesion';
        this.status = 401;
    }
}

/** Versión normalizada del usuario; 0 si la columna aún no trae valor. */
export function versionDeToken(usuario) {
    const version = Number(usuario?.token_version ?? 0);
    return Number.isInteger(version) && version >= 0 ? version : 0;
}

/** Firma el JWT con la identidad y la versión vigente del usuario. */
export function firmarToken(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            username: usuario.username,
            email: usuario.email,
            rol: usuario.rol,
            ver: versionDeToken(usuario)
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiration }
    );
}

/** Extrae el token Bearer de la petición, o null si no lo hay. */
export function extraerToken(req) {
    const cabecera = req?.headers?.authorization;
    if (typeof cabecera !== 'string') return null;

    const partes = cabecera.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer' || !partes[1]) return null;

    return partes[1];
}

/**
 * Valida el token y devuelve el usuario vigente.
 *
 * Lanza `ErrorDeSesion` (401) si falta el token, la firma o la caducidad no son
 * válidas, el token no lleva `ver`, el usuario ya no existe o la versión no coincide.
 * Los errores técnicos de la base de datos se propagan para que el middleware los
 * entregue a `next(err)` y los responda el manejador central.
 */
export async function autenticarSesion(req, { cargarUsuario = getUserById } = {}) {
    const token = extraerToken(req);
    if (!token) throw new ErrorDeSesion(MENSAJE_SIN_TOKEN);

    let decoded;
    try {
        decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
        throw new ErrorDeSesion();
    }

    if (!Number.isInteger(decoded?.ver)) throw new ErrorDeSesion();

    let usuario;
    try {
        usuario = await cargarUsuario(decoded.id);
    } catch (error) {
        // F-51: un token válido de un usuario eliminado ya no representa una sesión.
        if (error?.codigo === 'USUARIO_NO_ENCONTRADO') throw new ErrorDeSesion();
        throw error;
    }

    if (versionDeToken(usuario) !== decoded.ver) throw new ErrorDeSesion();

    return usuario;
}
