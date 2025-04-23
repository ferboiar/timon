/**
 * Utilidades para la gestión de usuarios en la base de datos
 *
 * Este módulo proporciona funciones para interactuar con la tabla 'users' de la base de datos.
 * Incluye operaciones como obtener usuarios por nombre o email, verificar credenciales,
 * crear nuevos usuarios, y otras operaciones relacionadas con la autenticación y
 * gestión de cuentas de usuario.
 *
 * @module db_utilsUsers
 */

import bcrypt from 'bcrypt';
import { getConnection } from './db_connection.mjs';

/**
 * Obtener todos los usuarios
 * @returns {Promise<Array>} - Lista de usuarios
 */
export const getUsers = async () => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query('SELECT id, username, email, rol, created_at, updated_at FROM users');
        return rows;
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        throw new Error('Error al obtener la lista de usuarios');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Obtener un usuario por su ID
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} - Datos del usuario
 */
export const getUserById = async (userId) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query('SELECT id, username, email, rol, created_at, updated_at FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }
        return rows[0];
    } catch (error) {
        console.error(`Error al obtener usuario con ID ${userId}:`, error);
        throw new Error('Error al obtener datos del usuario');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Crear un nuevo usuario
 * @param {Object} userData - Datos del nuevo usuario
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const createUser = async (userData) => {
    let connection;
    try {
        connection = await getConnection();
        const { username, email, password, rol } = userData;
        const [result] = await connection.query('INSERT INTO users (username, email, password, rol) VALUES (?, ?, ?, ?)', [username, email, password, rol]);
        return { id: result.insertId, username, email, rol };
    } catch (error) {
        console.error('Error al crear usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('username_UNIQUE')) {
                throw new Error('El nombre de usuario ya está en uso');
            }
            if (error.message.includes('email')) {
                throw new Error('El correo electrónico ya está registrado');
            }
        }
        throw new Error('Error al crear el usuario');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Actualizar datos de un usuario
 * @param {number} userId - ID del usuario a actualizar
 * @param {Object} userData - Nuevos datos del usuario
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const updateUser = async (userId, userData) => {
    let connection;
    try {
        connection = await getConnection();
        const { username, email, rol } = userData;
        await connection.query('UPDATE users SET username = ?, email = ?, rol = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [username, email, rol, userId]);
        return { id: userId, username, email, rol };
    } catch (error) {
        console.error(`Error al actualizar usuario con ID ${userId}:`, error);
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('username_UNIQUE')) {
                throw new Error('El nombre de usuario ya está en uso');
            }
            if (error.message.includes('email')) {
                throw new Error('El correo electrónico ya está registrado');
            }
        }
        throw new Error('Error al actualizar el usuario');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cambiar la contraseña de un usuario
 * @param {number} userId - ID del usuario
 * @param {string} password - Nueva contraseña (ya hash)
 * @returns {Promise<boolean>} - Resultado de la operación
 */
export const changePassword = async (userId, password) => {
    let connection;
    try {
        connection = await getConnection();
        await connection.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [password, userId]);
        return true;
    } catch (error) {
        console.error(`Error al cambiar contraseña del usuario con ID ${userId}:`, error);
        throw new Error('Error al cambiar la contraseña');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Eliminar usuarios
 * @param {Array<number>} userIds - IDs de los usuarios a eliminar
 * @returns {Promise<boolean>} - Resultado de la operación
 */
export const deleteUsers = async (userIds) => {
    let connection;
    try {
        connection = await getConnection();
        await connection.query('DELETE FROM users WHERE id IN (?)', [userIds]);
        return true;
    } catch (error) {
        console.error('Error al eliminar usuarios:', error);
        throw new Error('Error al eliminar usuarios');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Guardar preferencias de estilo del usuario
 * @param {number} userId - ID del usuario
 * @param {Object} stylePrefs - Preferencias de estilo a guardar
 * @returns {Promise<boolean>} - Resultado de la operación
 */
export const saveStylePreferences = async (userId, stylePrefs) => {
    let connection;
    try {
        connection = await getConnection();
        // Comprobar si existe una entrada en users_style_preferences
        const [rows] = await connection.query('SELECT user_id FROM users_style_preferences WHERE user_id = ?', [userId]);

        // Convertir objeto de preferencias a formato JSON
        const prefsJSON = JSON.stringify(stylePrefs);

        if (rows.length > 0) {
            // Actualizar preferencias existentes
            await connection.query('UPDATE users_style_preferences SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [prefsJSON, userId]);
        } else {
            // Crear nuevas preferencias
            await connection.query('INSERT INTO users_style_preferences (user_id, preferences) VALUES (?, ?)', [userId, prefsJSON]);
        }

        return true;
    } catch (error) {
        console.error(`Error al guardar preferencias de estilo para usuario con ID ${userId}:`, error);
        throw new Error('Error al guardar preferencias de estilo');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Obtener preferencias de estilo del usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object|null>} - Preferencias de estilo o null si no existen
 */
export const getStylePreferences = async (userId) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.query('SELECT preferences FROM users_style_preferences WHERE user_id = ?', [userId]);

        if (rows.length > 0) {
            // Comprobar si las preferencias ya son un objeto o necesitan ser parseadas
            const preferences = rows[0].preferences;

            if (preferences === null) {
                return null;
            }

            // Si ya es un objeto (MySQL devuelve JSON como objeto si la columna es de tipo JSON)
            if (typeof preferences === 'object') {
                return preferences;
            }

            // Si es una cadena, intentar parsearla
            try {
                return JSON.parse(preferences);
            } catch (parseError) {
                console.error('Error al parsear preferencias JSON:', parseError);
                return null;
            }
        }

        return null;
    } catch (error) {
        console.error(`Error al obtener preferencias de estilo para usuario con ID ${userId}:`, error);
        throw new Error('Error al obtener preferencias de estilo');
    } finally {
        if (connection) connection.release();
    }
};

// Función para obtener un usuario por su nombre de usuario
async function getUserByUsername(username) {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error al buscar usuario por nombre de usuario:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

// Función para obtener un usuario por su email (para compatibilidad)
async function getUserByEmail(email) {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error al buscar usuario por email:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

// Función para verificar las credenciales del usuario
async function verifyCredentials(username, password) {
    try {
        const user = await getUserByUsername(username);

        if (!user) {
            return null; // Usuario no encontrado
        }

        // Verificar la contraseña
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return null; // Contraseña incorrecta
        }

        // No devolvemos la contraseña en la respuesta
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        return userWithoutPassword;
    } catch (error) {
        console.error('Error al verificar credenciales:', error);
        throw error;
    }
}

export { getUserByEmail, getUserByUsername, verifyCredentials };
