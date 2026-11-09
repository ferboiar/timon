/**
 * Utilidades para la gestión del archivo de conexión de la base de datos.
 *
 * @module db_utilsConn
 */
import dotenv from 'dotenv';
import { mensajeDeCausa } from '../utils/catalogoErrores.mjs';
import { detalleParaLog, ErrorDeNegocio } from '../utils/errorDeNegocio.mjs';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbConfigPath = path.join(__dirname, '.db_connection');
const dbBackupPath = path.join(__dirname, '.db_connection.backup');

/**
 * Lee la configuración de la base de datos desde el archivo .db_connection
 * @returns {Promise<Object>} - Objeto con la configuración (sin contraseña) y si existe backup.
 */
export const getDbConfig = async () => {
    try {
        const backupExists = await fs
            .access(dbBackupPath)
            .then(() => true)
            .catch(() => false);

        if (
            !(await fs
                .access(dbConfigPath)
                .then(() => true)
                .catch(() => false))
        ) {
            return { config: {}, backupExists };
        }

        const fileContent = await fs.readFile(dbConfigPath, 'utf-8');
        const config = dotenv.parse(fileContent);

        // No devolver la contraseña
        delete config.DB_PASSWORD;

        return { config, backupExists };
    } catch (error) {
        console.error('db_utilsConn - lectura de la configuración: ' + detalleParaLog(error));
        throw new ErrorDeNegocio('No se ha podido leer el archivo de configuración de la base de datos. Comprueba que existe y que el servidor tiene permiso de lectura.', 500);
    }
};

/**
 * Lee y devuelve únicamente la contraseña de la base de datos.
 * @returns {Promise<string>} - La contraseña de la base de datos.
 */
export const getDbPassword = async () => {
    try {
        if (
            !(await fs
                .access(dbConfigPath)
                .then(() => true)
                .catch(() => false))
        ) {
            return ''; // Si no hay fichero, no hay contraseña
        }
        const fileContent = await fs.readFile(dbConfigPath, 'utf-8');
        const config = dotenv.parse(fileContent);
        return config.DB_PASSWORD || '';
    } catch (error) {
        console.error('db_utilsConn - lectura de la contraseña: ' + detalleParaLog(error));
        throw new ErrorDeNegocio('No se ha podido leer la contraseña guardada en la configuración. Comprueba el archivo de configuración.', 500);
    }
};

/**
 * Prueba una nueva configuración de conexión a la base de datos.
 * @param {Object} config - Datos de conexión a probar.
 * @returns {Promise<boolean>} - True si la conexión es exitosa.
 */
export const testDbConnection = async (config) => {
    let connection;
    try {
        const connectionConfig = {
            host: config.DB_HOST,
            port: parseInt(config.DB_PORT, 10),
            user: config.DB_USER,
            password: config.DB_PASSWORD,
            database: config.DB_DATABASE,
            ssl: {
                rejectUnauthorized: false
            }
        };
        connection = await mysql.createConnection(connectionConfig);
        await connection.connect();
        return true;
    } catch (error) {
        // F-48: la causa se traduce a lenguaje de usuario; el detalle del motor va solo al log
        console.error('db_utilsConn - prueba de conexión: ' + detalleParaLog(error));
        const causa = mensajeDeCausa(error);
        throw new ErrorDeNegocio(
            causa || 'No se ha podido conectar con esos datos. La causa no se ha podido identificar; consulta el registro del servidor.',
            400
        );
    } finally {
        if (connection) await connection.end();
    }
};

/**
 * Guarda la nueva configuración de la base de datos en el archivo .db_connection.
 * Crea una copia de seguridad del archivo anterior.
 * @param {Object} config - Nueva configuración a guardar.
 * @returns {Promise<void>}
 */
export const saveDbConfig = async (config) => {
    try {
        // Crear backup si el fichero existe
        if (
            await fs
                .access(dbConfigPath)
                .then(() => true)
                .catch(() => false)
        ) {
            await fs.copyFile(dbConfigPath, dbBackupPath);
        }

        const configString = Object.entries(config)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        await fs.writeFile(dbConfigPath, configString, 'utf-8');
    } catch (error) {
        console.error('db_utilsConn - guardado de la configuración: ' + detalleParaLog(error));
        throw new ErrorDeNegocio('No se ha podido guardar la configuración. Comprueba el permiso de escritura y el espacio en disco del servidor.', 500);
    }
};

/**
 * Restaura la configuración de la base de datos desde el archivo de backup.
 * @returns {Promise<void>}
 */
export const restoreDbConfig = async () => {
    // F-48: que no haya copia es un estado esperado, no un fallo del servidor
    if (
        !(await fs
            .access(dbBackupPath)
            .then(() => true)
            .catch(() => false))
    ) {
        throw new ErrorDeNegocio('No hay ninguna copia de la configuración guardada que se pueda restaurar.', 409, 'SIN_COPIA');
    }

    try {
        await fs.copyFile(dbBackupPath, dbConfigPath);
        await fs.unlink(dbBackupPath); // Eliminar el backup después de restaurar
    } catch (error) {
        console.error('db_utilsConn - restauración de la configuración: ' + detalleParaLog(error));
        throw new ErrorDeNegocio('No se ha podido restaurar la copia de la configuración. Comprueba los permisos del archivo.', 500);
    }
};
