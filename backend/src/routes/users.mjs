/**
 * API para la gestión de usuarios
 *
 * Este módulo proporciona endpoints para administrar usuarios en la aplicación.
 * Permite obtener la lista de usuarios, crear nuevos usuarios, actualizar usuarios existentes,
 * cambiar contraseñas, eliminar usuarios y gestionar preferencias de estilo. Todas las rutas requieren autenticación
 * como administrador para garantizar la seguridad de las operaciones.
 *
 * @module routes/users
 */

import * as dbUsers from '#backend/db/db_utilsUsers.mjs';
import { verifyToken } from '#backend/middleware/auth.mjs';
import bcrypt from 'bcrypt';
import express from 'express';

const router = express.Router();

/**
 * Obtener la lista de todos los usuarios
 * @route GET /api/users
 * @access Privado - Requiere autenticación
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const users = await dbUsers.getUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * Crear un nuevo usuario
 * @route POST /api/users
 * @access Privado - Requiere autenticación
 */
router.post('/', verifyToken, async (req, res) => {
    try {
        const { username, email, password, rol } = req.body;

        // Validar que se proporcionan todos los campos requeridos
        if (!username || !email || !password || !rol) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        // Generar hash de la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Crear el nuevo usuario
        const result = await dbUsers.createUser({
            username,
            email,
            password: hashedPassword,
            rol
        });

        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * Actualizar un usuario existente
 * @route PUT /api/users
 * @access Privado - Requiere autenticación
 */
router.put('/', verifyToken, async (req, res) => {
    try {
        const { id, username, email, rol } = req.body;

        // Validar que se proporcionan todos los campos requeridos
        if (!id || !username || !email || !rol) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        // Actualizar el usuario
        const result = await dbUsers.updateUser(id, { username, email, rol });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * Cambiar la contraseña de un usuario
 * @route PUT /api/users/password
 * @access Privado - Requiere autenticación
 */
router.put('/password', verifyToken, async (req, res) => {
    try {
        const { id, password } = req.body;

        // Validar que se proporcionan todos los campos requeridos
        if (!id || !password) {
            return res.status(400).json({ message: 'ID y contraseña son obligatorios' });
        }

        // Generar hash de la nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Cambiar la contraseña
        await dbUsers.changePassword(id, hashedPassword);

        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * Eliminar usuarios
 * @route DELETE /api/users
 * @access Privado - Requiere autenticación
 */
router.delete('/', verifyToken, async (req, res) => {
    try {
        const { userIds } = req.body;

        // Validar que se proporciona al menos un ID
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'Se requiere al menos un ID de usuario' });
        }

        // Eliminar usuarios
        await dbUsers.deleteUsers(userIds);

        res.json({ message: 'Usuarios eliminados correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * Guardar preferencias de estilo del usuario
 * @route PUT /api/users/style-preferences
 * @access Privado - Requiere autenticación
 */
router.put('/style-preferences', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // ID del usuario autenticado
        const stylePrefs = req.body; // Objeto con preferencias de estilo

        // Validar que hay preferencias de estilo
        if (!stylePrefs || Object.keys(stylePrefs).length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron preferencias de estilo' });
        }

        // Guardar las preferencias
        await dbUsers.saveStylePreferences(userId, stylePrefs);

        res.json({ message: 'Preferencias de estilo guardadas correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * Obtener preferencias de estilo del usuario
 * @route GET /api/users/style-preferences
 * @access Privado - Requiere autenticación
 */
router.get('/style-preferences', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // ID del usuario autenticado

        // Obtener las preferencias de estilo
        const stylePrefs = await dbUsers.getStylePreferences(userId);

        if (!stylePrefs) {
            return res.json({}); // Si no hay preferencias, devolver un objeto vacío
        }

        res.json(stylePrefs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
