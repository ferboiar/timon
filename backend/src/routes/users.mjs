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
import { leerEnteroPositivo, leerListaEnterosPositivos } from '#backend/utils/parametros.mjs';
import { validarAltaUsuario, validarCambioPassword, validarEdicionUsuario } from '#backend/utils/validacionUsuarios.mjs';
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
        const datos = validarAltaUsuario(req.body);
        const { permisos, ...resto } = datos;
        const hashedPassword = await bcrypt.hash(datos.password, 10);
        const result = await dbUsers.createUser({ ...resto, ...permisos, password: hashedPassword });

        console.log(`usuarios - alta: usuario ${result.id} con rol ${datos.rol}`);
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
        const datos = validarEdicionUsuario(req.body);
        const { id, username, email, rol, permisos } = datos;
        leerEnteroPositivo(id, 'id');

        // Actualizar el usuario. La contraseña, si llega, se valida en validarEdicionUsuario; no se cambia por esta ruta.
        const result = await dbUsers.updateUser(id, { username, email, rol, ...permisos });

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
        const datos = validarCambioPassword(req.body);
        const id = leerEnteroPositivo(datos.id, 'id');
        const hashedPassword = await bcrypt.hash(datos.password, 10);

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
        const ids = leerListaEnterosPositivos(userIds, 'userIds');

        await dbUsers.deleteUsers(ids);

        console.log(`usuarios - borrado: ${ids.length} usuario(s)`);
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
