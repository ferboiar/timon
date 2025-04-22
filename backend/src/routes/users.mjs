import bcrypt from 'bcrypt';
import express from 'express';
import { getConnection } from '../db/db_connection.mjs';
import { verifyAdmin } from '../middleware/auth.mjs';

const router = express.Router();

// Middleware para verificar que el usuario sea administrador
router.use(verifyAdmin);

// Obtener todos los usuarios
router.get('/', async (req, res) => {
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute('SELECT id, username, email, rol, created_at, updated_at FROM users');
        connection.release();

        res.json(rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
});

// Crear un nuevo usuario
router.post('/', async (req, res) => {
    try {
        const { username, email, password, rol } = req.body;

        // Validar datos requeridos
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren username, email y password'
            });
        }

        const connection = await getConnection();

        // Verificar si el usuario ya existe
        const [existingUsers] = await connection.execute('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);

        if (existingUsers.length > 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario o email ya está en uso'
            });
        }

        // Generar hash de la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insertar nuevo usuario
        const [result] = await connection.execute('INSERT INTO users (username, email, password, rol) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, rol || 'user']);

        connection.release();

        res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente',
            userId: result.insertId,
            username,
            email,
            rol: rol || 'user'
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear usuario',
            error: error.message
        });
    }
});

// Actualizar un usuario existente
router.put('/', async (req, res) => {
    try {
        const { id, username, email, rol } = req.body;

        // Validar datos requeridos
        if (!id || !username || !email || !rol) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren id, username, email y rol'
            });
        }

        const connection = await getConnection();

        // Verificar si el usuario existe
        const [existingUser] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);

        if (existingUser.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar si otro usuario ya tiene el mismo username o email
        const [duplicates] = await connection.execute('SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?', [username, email, id]);

        if (duplicates.length > 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario o email ya está en uso por otro usuario'
            });
        }

        // Actualizar usuario
        await connection.execute('UPDATE users SET username = ?, email = ?, rol = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [username, email, rol, id]);

        connection.release();

        res.json({
            success: true,
            message: 'Usuario actualizado correctamente',
            id,
            username,
            email,
            rol
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar usuario',
            error: error.message
        });
    }
});

// Cambiar contraseña de usuario
router.put('/password', async (req, res) => {
    try {
        const { id, password } = req.body;

        // Validar datos requeridos
        if (!id || !password) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren id y password'
            });
        }

        const connection = await getConnection();

        // Verificar si el usuario existe
        const [existingUser] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);

        if (existingUser.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Generar hash de la nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Actualizar contraseña
        await connection.execute('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, id]);

        connection.release();

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente',
            id
        });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar contraseña',
            error: error.message
        });
    }
});

// Eliminar usuarios
router.delete('/', async (req, res) => {
    try {
        const { userIds } = req.body;

        // Validar datos requeridos
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un array de IDs de usuarios'
            });
        }

        const connection = await getConnection();

        // Verificar que no se está intentando eliminar el usuario que hace la petición
        if (userIds.includes(req.user.id)) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propio usuario'
            });
        }

        // Eliminar usuarios
        const [result] = await connection.execute(`DELETE FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`, [...userIds]);

        connection.release();

        res.json({
            success: true,
            message: `Se han eliminado ${result.affectedRows} usuarios`,
            deletedCount: result.affectedRows
        });
    } catch (error) {
        console.error('Error al eliminar usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar usuarios',
            error: error.message
        });
    }
});

export default router;
