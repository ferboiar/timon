import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.mjs';
import { verifyCredentials } from '../db/db_utilsUsers.mjs';

const router = express.Router();

// Endpoint para iniciar sesión
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Verificar que se proporcionaron username y password
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere nombre de usuario y contraseña'
            });
        }

        console.log(`Intento de inicio de sesión para el usuario: ${username}`);

        // Verificar credenciales en la base de datos
        const user = await verifyCredentials(username, password);

        if (!user) {
            console.log(`Credenciales incorrectas para usuario: ${username}`);
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        console.log(`Usuario autenticado correctamente: ${username}`);

        // Generar token JWT utilizando la configuración centralizada
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                rol: user.rol
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiration }
        );

        console.log(`Token JWT generado para: ${username}`);

        // Enviar respuesta con token y datos de usuario
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error en autenticación:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor durante autenticación'
        });
    }
});

// Endpoint para verificar el estado de autenticación
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No se proporcionó token de autenticación'
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        res.json({
            success: true,
            user: {
                id: decoded.id,
                username: decoded.username,
                email: decoded.email,
                rol: decoded.rol
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
});

export default router;
