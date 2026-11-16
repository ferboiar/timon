/**
 * API para la autenticación de usuarios
 *
 * S-04a (DC-62): el JWT lleva la versión de token del usuario. El cierre de sesión y
 * el cambio de contraseña incrementan esa versión y revocan los tokens anteriores.
 * S-04b (DC-63): /login limita los intentos fallidos por IP y usuario.
 *
 * @module routes/auth
 */

import { config } from '#backend/config/env.mjs';
import rateLimit from 'express-rate-limit';
import { revocarSesiones, verifyCredentials } from '#backend/db/db_utilsUsers.mjs';
import { responderError, sanearParaLog } from '#backend/utils/errorDeNegocio.mjs';
import { MENSAJE_LIMITE_IP, opcionesLimitadorIp } from '#backend/middleware/limitadorIp.mjs';
import { claveDeIntento, crearLimitador } from '#backend/utils/limitadorIntentos.mjs';
import { autenticarSesion, ErrorDeSesion, firmarToken } from '#backend/utils/sesion.mjs';
import { Router } from 'express';

const router = Router();
const MENSAJE_LIMITE = MENSAJE_LIMITE_IP;
const limitadorLogin = crearLimitador({
    maxIntentos: config.login.maxIntentos,
    ventanaMs: config.login.ventanaMs
});
const limitadorIp = rateLimit(opcionesLimitadorIp(config.login));

/** Identidad pública del usuario, sin contraseña ni versión de token. */
function identidad(usuario) {
    return {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        rol: usuario.rol
    };
}

// Endpoint para iniciar sesión
router.post('/login', limitadorIp, async (req, res) => {
    try {
        const { username, password } = req.body ?? {};

        if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere nombre de usuario y contraseña'
            });
        }

        const nombre = username.trim();
        const clave = claveDeIntento(req.ip, nombre);
        const estado = limitadorLogin.comprobar(clave);

        if (estado.bloqueado) {
            console.log(`auth - login limitado: usuario ${sanearParaLog(nombre).slice(0, 50)} desde ${req.ip}`);
            res.set('Retry-After', String(estado.segundosRestantes));
            return res.status(429).json({ success: false, message: MENSAJE_LIMITE });
        }

        const user = await verifyCredentials(nombre, password);

        if (!user) {
            limitadorLogin.registrarFallo(clave);
            console.log(`auth - login fallido: usuario ${sanearParaLog(nombre).slice(0, 50)} desde ${req.ip}`);
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        limitadorLogin.registrarExito(clave);
        const token = firmarToken(user);

        console.log(`auth - login correcto: usuario ${user.id}`);

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: identidad(user)
        });
    } catch (error) {
        console.error(`auth - login: error técnico - ${sanearParaLog(error?.message ?? 'error desconocido')}`);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor durante autenticación'
        });
    }
});

// Cerrar la sesión: invalida todos los tokens del usuario (S-04a)
router.post('/logout', async (req, res) => {
    try {
        const usuario = await autenticarSesion(req);
        const version = await revocarSesiones(usuario.id);

        console.log(`auth - cierre de sesión: usuario ${usuario.id}, versión ${version}`);
        res.json({ success: true, message: 'Sesión cerrada correctamente' });
    } catch (error) {
        if (error instanceof ErrorDeSesion) {
            return res.status(401).json({ success: false, message: error.message });
        }

        responderError(res, error, 'No se ha podido cerrar la sesión.', {
            clave: 'message',
            contexto: 'auth - cierre de sesión'
        });
    }
});

// Endpoint para verificar el estado de autenticación (incluye revocación y rol vigente)
router.get('/verify', async (req, res) => {
    try {
        const usuario = await autenticarSesion(req);
        res.json({ success: true, user: identidad(usuario) });
    } catch (error) {
        if (error instanceof ErrorDeSesion) {
            return res.status(401).json({ success: false, message: error.message });
        }

        responderError(res, error, 'No se ha podido verificar la sesión.', {
            clave: 'message',
            contexto: 'auth - verificación de sesión'
        });
    }
});

export default router;
