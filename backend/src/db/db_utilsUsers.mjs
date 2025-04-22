import bcrypt from 'bcrypt';
import { getConnection } from './db_connection.mjs';

// Función para obtener un usuario por su nombre de usuario
async function getUserByUsername(username) {
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        connection.release();

        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error al buscar usuario por nombre de usuario:', error);
        throw error;
    }
}

// Función para obtener un usuario por su email (para compatibilidad)
async function getUserByEmail(email) {
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        connection.release();

        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error al buscar usuario por email:', error);
        throw error;
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
        const { password: userPassword, ...userWithoutPassword } = user;
        return userWithoutPassword;
    } catch (error) {
        console.error('Error al verificar credenciales:', error);
        throw error;
    }
}

// Función para registrar un nuevo usuario
async function createUser(username, email, password, rol = 'user') {
    try {
        const connection = await getConnection();

        // Verificar si el usuario ya existe
        const [existingUsernames] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (existingUsernames.length > 0) {
            connection.release();
            throw new Error('El nombre de usuario ya existe');
        }

        // Verificar si el email ya existe
        const [existingEmails] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (existingEmails.length > 0) {
            connection.release();
            throw new Error('El email ya está registrado');
        }

        // Generar hash de la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insertar el nuevo usuario
        const [result] = await connection.execute('INSERT INTO users (username, email, password, rol) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, rol]);

        connection.release();

        return {
            id: result.insertId,
            username,
            email,
            rol
        };
    } catch (error) {
        console.error('Error al crear usuario:', error);
        throw error;
    }
}

export { createUser, getUserByEmail, getUserByUsername, verifyCredentials };
