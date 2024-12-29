import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const passwordsPath = path.join(__dirname, '.db_password');

let pool;

async function initPool() {
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
        throw new Error('No se pudo leer la contraseña de la base de datos.');
    }

    pool = mysql.createPool({
        host: 'mysql-fer-particular.b.aivencloud.com',
        port: 10613,
        user: 'avnadmin',
        password,
        database: 'conta_hogar',
        ssl: {
            rejectUnauthorized: false
        },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

async function getConnection() {
    if (!pool) {
        await initPool();
    }
    return pool.getConnection();
}

export { getConnection };
