/**
 * API para la gestión de usuarios
 *
 * Este módulo proporciona endpoints para administrar usuarios en la aplicación.
 * Permite obtener la lista de usuarios, crear nuevos usuarios, actualizar usuarios existentes,
 * cambiar contraseñas, eliminar usuarios y gestionar preferencias de estilo. Todas las rutas requieren autenticación
 * como administrador, salvo las de preferencias de estilo, que solo exigen sesión (son del propio usuario).
 *
 * Errores (F-48): las rutas de gestión son de administrador y sus mensajes pueden hablar de
 * configuración y del servicio de la base de datos; las preferencias de estilo se redactan para
 * cualquier usuario. Los errores técnicos se componen con el catálogo de causas y el detalle
 * completo queda en el log del servidor (DC-09).
 *
 * @module routes/users
 */

import * as dbUsers from '#backend/db/db_utilsUsers.mjs';
import { verifyAdmin, verifyToken } from '#backend/middleware/auth.mjs';
import { AUDIENCIA_ADMIN, AUDIENCIA_GENERAL } from '#backend/utils/catalogoErrores.mjs';
import { responderError } from '#backend/utils/errorDeNegocio.mjs';
import bcrypt from 'bcrypt';
import express from 'express';

const router = express.Router();

/**
 * Obtener la lista de todos los usuarios
 * @route GET /api/users
 * @access Privado - Requiere autenticación
 */
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const users = await dbUsers.getUsers();
        res.json(users);
    } catch (error) {
        responderError(res, error, 'No se han podido cargar los usuarios.', {
            clave: 'message',
            contexto: 'usuarios - listado',
            audiencia: AUDIENCIA_ADMIN
        });
    }
});

/**
 * Crear un nuevo usuario
 * @route POST /api/users
 * @access Privado - Requiere autenticación
 */
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { username, email, password, rol, perm_recibos, perm_presupuestos, perm_ahorros, perm_anticipos, perm_transacciones, perm_categorias, perm_cuentas } = req.body;

        // Validar que se proporcionan todos los campos requeridos
        if (!username || !email || !password || !rol) {
            return res.status(400).json({ message: 'Faltan datos obligatorios: nombre de usuario, correo, contraseña y rol.' });
        }

        // Generar hash de la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Crear el nuevo usuario
        const result = await dbUsers.createUser({
            username,
            email,
            password: hashedPassword,
            rol,
            perm_recibos,
            perm_presupuestos,
            perm_ahorros,
            perm_anticipos,
            perm_transacciones,
            perm_categorias,
            perm_cuentas
        });

        console.log(`usuarios - alta: usuario ${result.id} con rol ${rol}`);
        res.status(201).json(result);
    } catch (error) {
        responderError(res, error, 'No se ha podido crear el usuario.', {
            clave: 'message',
            contexto: 'usuarios - alta',
            audiencia: AUDIENCIA_ADMIN
        });
    }
});

/**
 * Actualizar un usuario existente
 * @route PUT /api/users
 * @access Privado - Requiere autenticación
 */
router.put('/', verifyAdmin, async (req, res) => {
    try {
        const { id, username, email, rol, perm_recibos, perm_presupuestos, perm_ahorros, perm_anticipos, perm_transacciones, perm_categorias, perm_cuentas } = req.body;

        // Validar que se proporcionan todos los campos requeridos
        if (!id || !username || !email || !rol) {
            return res.status(400).json({ message: 'Faltan datos obligatorios: usuario, correo y rol.' });
        }

        // Actualizar el usuario
        const result = await dbUsers.updateUser(id, {
            username,
            email,
            rol,
            perm_recibos,
            perm_presupuestos,
            perm_ahorros,
            perm_anticipos,
            perm_transacciones,
            perm_categorias,
            perm_cuentas
        });

        console.log(`usuarios - edición: usuario ${id}`);
        res.json(result);
    } catch (error) {
        responderError(res, error, 'No se han podido guardar los cambios del usuario.', {
            clave: 'message',
            contexto: 'usuarios - edición',
            audiencia: AUDIENCIA_ADMIN
        });
    }
});

/**
 * Cambiar la contraseña de un usuario
 * @route PUT /api/users/password
 * @access Privado - Requiere autenticación
 */
router.put('/password', verifyAdmin, async (req, res) => {
    try {
        const { id, password } = req.body;

        // Validar que se proporcionan todos los campos requeridos
        if (!id || !password) {
            return res.status(400).json({ message: 'Faltan el usuario y la contraseña nueva.' });
        }

        // Generar hash de la nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Cambiar la contraseña
        await dbUsers.changePassword(id, hashedPassword);

        console.log(`usuarios - cambio de contraseña: usuario ${id}`);
        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        responderError(res, error, 'No se ha podido cambiar la contraseña.', {
            clave: 'message',
            contexto: 'usuarios - cambio de contraseña',
            audiencia: AUDIENCIA_ADMIN
        });
    }
});

/**
 * Eliminar usuarios
 * @route DELETE /api/users
 * @access Privado - Requiere autenticación
 */
router.delete('/', verifyAdmin, async (req, res) => {
    try {
        const { userIds } = req.body;

        // Validar que se proporciona al menos un ID
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'Selecciona al menos un usuario para eliminar.' });
        }

        // Eliminar usuarios
        await dbUsers.deleteUsers(userIds);

        console.log(`usuarios - borrado: ${userIds.length} usuario(s)`);
        res.json({ message: 'Usuarios eliminados correctamente' });
    } catch (error) {
        responderError(res, error, 'No se han podido eliminar los usuarios.', {
            clave: 'message',
            contexto: 'usuarios - borrado',
            audiencia: AUDIENCIA_ADMIN
        });
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
            return res.status(400).json({ message: 'No hay preferencias que guardar.' });
        }

        if (stylePrefs.colorScheme !== undefined && !['system', 'light', 'dark'].includes(stylePrefs.colorScheme)) {
            return res.status(400).json({ message: 'La apariencia debe ser Sistema, Claro u Oscuro.' });
        }

        // Guardar las preferencias
        await dbUsers.saveStylePreferences(userId, stylePrefs);

        res.json({ message: 'Preferencias de estilo guardadas correctamente' });
    } catch (error) {
        // Ruta de uso general: el texto no supone conocimientos de administrador
        responderError(res, error, 'No se han podido guardar tus preferencias de estilo.', {
            clave: 'message',
            contexto: 'usuarios - preferencias de estilo',
            audiencia: AUDIENCIA_GENERAL
        });
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
        responderError(res, error, 'No se han podido cargar tus preferencias de estilo.', {
            clave: 'message',
            contexto: 'usuarios - preferencias de estilo',
            audiencia: AUDIENCIA_GENERAL
        });
    }
});

export default router;
