/**
 * Script para crear un usuario administrador de prueba
 * ====================================================
 *
 * Este script crea un usuario de prueba con rol de administrador en la base de datos.
 * Es útil para:
 * - Primera configuración del sistema
 * - Entornos de prueba
 * - Recuperar acceso cuando no hay usuarios disponibles
 *
 * El usuario creado tendrá las siguientes características:
 * - Usuario: admin
 * - Contraseña: password123
 * - Rol: admin
 * - Email: usuario@test.com
 *
 * IMPORTANTE: Este script debe ejecutarse únicamente en entornos de desarrollo o
 * pruebas, nunca en producción con los valores predeterminados.
 *
 * Uso desde línea de comandos:
 * ----------------------------
 * Desde la raíz del proyecto:
 * $ node backend/src/scripts/createTestUser.mjs
 */

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
