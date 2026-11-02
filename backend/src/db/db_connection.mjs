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

// Configuración del pool a partir de las variables de entorno; se exporta para probarla sin base de datos (F-13, DC-05)
function construirConfiguracionPool(entorno = process.env) {
    return {
        host: entorno.DB_HOST,
        port: parseInt(entorno.DB_PORT, 10),
        user: entorno.DB_USER,
        password: entorno.DB_PASSWORD,
        database: entorno.DB_DATABASE,
        ssl: {
            rejectUnauthorized: false
        },
        timezone: 'Z', // Las fechas y horas viajan en UTC; la zona horaria de la aplicación se aplica al calcular "hoy" y al mostrarlas (DC-25)
        dateStrings: ['DATE'], // F-13, DC-05: las columnas DATE llegan como texto YYYY-MM-DD, sin hora ni zona; TIMESTAMP y DATETIME siguen siendo instantes (Date)
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
}

async function initPool() {
    try {
        // Verificar si el archivo de configuración existe
        if (!process.env.DB_HOST && !fs.existsSync(dbConfigPath)) {
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
        const result = fs.existsSync(dbConfigPath) ? dotenv.config({ path: dbConfigPath }) : {};

        if (result.error) {
            throw new Error(`Error al procesar el archivo de configuración: ${result.error}`);
        }

        const config = construirConfiguracionPool();

        // Verificar que todos los parámetros necesarios estén definidos
        const requiredParams = ['host', 'port', 'user', 'password', 'database'];
        for (const param of requiredParams) {
            if (!config[param]) {
                throw new Error(`Parámetro de conexión faltante: ${param}`);
            }
        }

        pool = mysql.createPool(config);
        // Cada conexión trabaja en UTC, sea cual sea la configuración del servidor de base de datos (DC-25)
        pool.pool.on('connection', (conexion) => {
            conexion.query("SET time_zone = '+00:00'");
        });
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

// Cierra el pool (las pruebas lo usan para terminar limpiamente)
async function closePool() {
    if (pool) {
        await pool.end();
        pool = undefined;
    }
}

export { closePool, construirConfiguracionPool, getConnection };
