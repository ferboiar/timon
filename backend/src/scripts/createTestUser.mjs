import bcrypt from 'bcrypt';
import '../config/env.mjs'; // Importar configuración sin asignar a una variable
import { getConnection } from '../db/db_connection.mjs';

// Función para crear un usuario de prueba
async function createTestUser() {
    let connection;
    try {
        connection = await getConnection();

        // Datos del usuario de prueba
        const username = 'admin'; // Nombre de usuario para iniciar sesión
        const email = 'usuario@test.com';
        const password = 'password123';
        const rol = 'admin';

        // Verificar si la tabla users tiene la columna username
        try {
            await connection.execute('SELECT username FROM users LIMIT 1');
            console.log('La columna username ya existe en la tabla users');
        } catch (error) {
            if (error.message.includes('Unknown column')) {
                console.log('La columna username no existe. Aplicando modificaciones a la tabla...');
                // Ejecutar las modificaciones a la tabla users
                await connection.execute('ALTER TABLE `users` CHANGE COLUMN `user_id` `id` INT NOT NULL AUTO_INCREMENT');
                await connection.execute('ALTER TABLE `users` ADD COLUMN `username` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL AFTER `id`');
                await connection.execute('ALTER TABLE `users` ADD UNIQUE INDEX `username_UNIQUE` (`username`)');
                console.log('Estructura de tabla modificada correctamente');
            } else {
                throw error;
            }
        }

        // Generar hash de la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Verificar si el usuario ya existe
        const [existingUsers] = await connection.execute('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);

        if (existingUsers.length > 0) {
            console.log('El usuario de prueba ya existe:');
            console.log(`- Usuario: ${username}`);
            console.log(`- Email: ${email}`);
            return;
        }

        // Insertar el usuario de prueba
        const [result] = await connection.execute('INSERT INTO users (username, email, password, rol) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, rol]);

        console.log('Usuario de prueba creado exitosamente:');
        console.log(`- Usuario: ${username}`);
        console.log(`- Email: ${email}`);
        console.log(`- Contraseña: ${password}`);
        console.log(`- Rol: ${rol}`);
        console.log(`- ID: ${result.insertId}`);
    } catch (error) {
        console.error('Error al crear usuario de prueba:', error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
    process.exit(0);
}

// Ejecutar la función
createTestUser();
