import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

async function getRecibos() {
    try {
        // 1. Construir la ruta al archivo de contraseñas de forma segura
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const passwordsPath = path.join(__dirname, '.db_password'); // Asegúrate de que db_password esté en el mismo directorio que db_utils.js

        // 2. Leer la contraseña del archivo de forma asíncrona y segura
        let password;
        try {
            const passwordBuffer = await fs.readFile(passwordsPath);
            password = passwordBuffer.toString().trim();
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                console.error('Error: Archivo de contraseñas no encontrado en:', passwordsPath);
            } else {
                console.error('Error al leer el archivo de contraseñas:', readError);
            }
            throw new Error('No se pudo leer la contraseña de la base de datos.'); // Lanza un error para detener la ejecución
        }

        // 3. Crear la conexión a la base de datos
        const connection = await mysql.createConnection({
            host: 'mysql-fer-particular.b.aivencloud.com',
            port: 10613,
            user: 'avnadmin',
            password, // Usar la contraseña leída del archivo
            database: 'conta_hogar',
            ssl: {
                rejectUnauthorized: false
            }
        });

        // 4. Ejecutar la consulta
        const [rows] = await connection.execute('SELECT * FROM recibos');

        // 5. Cerrar la conexión
        await connection.close();

        return rows;
    } catch (error) {
        console.error('Error al obtener los recibos:', error);
        throw error; // Re-lanza el error para que se maneje en un nivel superior
    }
}

export { getRecibos };
