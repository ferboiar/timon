/**
 * Módulo de conexión a la base de datos
 *
 * Este módulo proporciona funcionalidades para establecer y gestionar conexiones
 * a la base de datos MySQL. Implementa un pool de conexiones para optimizar
 * el rendimiento y la gestión de recursos. Lee los parámetros de conexión
 * desde un archivo externo por seguridad.
 *
 * @module db_connection
 */

import dotenv from 'dotenv';
import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbConfigPath = path.join(__dirname, '.db_connection');

let pool;

async function initPool() {
    try {
        // Verificar si el archivo de configuración existe
        if (!fs.existsSync(dbConfigPath)) {
            throw new Error(
                `El archivo de configuración no existe: ${dbConfigPath}\n` +
                    `Crea un fichero '.db_connection' en la ruta ${__dirname} con el siguiente contenido:\n` +
                    `DB_HOST=nombre de host FQDN o ip\n` +
                    `DB_PORT=puerto del servicio SQL\n` +
                    `DB_USER=usuario de acceso al SQL\n` +
                    `DB_PASSWORD=contraseña de acceso\n` +
                    `DB_DATABASE=nombre de la base de datos`
            );
        }

        // Cargar variables de entorno desde el archivo .db_connection
        const result = dotenv.config({ path: dbConfigPath });

        if (result.error) {
            throw new Error(`Error al procesar el archivo de configuración: ${result.error}`);
        }

        const config = {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            ssl: {
                rejectUnauthorized: false
            },
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };

        // Verificar que todos los parámetros necesarios estén definidos
        const requiredParams = ['host', 'port', 'user', 'password', 'database'];
        for (const param of requiredParams) {
            if (!config[param]) {
                throw new Error(`Parámetro de conexión faltante: ${param}`);
            }
        }

        pool = mysql.createPool(config);
        console.log('Conexión a la base de datos establecida correctamente');
    } catch (error) {
        console.error('Error al inicializar el pool de conexiones:', error);
        throw new Error('No se pudo configurar la conexión a la base de datos.');
    }
}

async function getConnection() {
    if (!pool) {
        await initPool();
    }
    return pool.getConnection();
}

export { getConnection };
