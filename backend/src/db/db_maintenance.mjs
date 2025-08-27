import { exec } from 'child_process';
import fs from 'fs';
import readline from 'readline';
import { promisify } from 'util';
import { getDbConfig, getDbPassword } from './db_utilsConn.mjs';

const execAsync = promisify(exec);

/**
 * Realiza un backup de la base de datos usando mysqldump.
 * @param {string} backupFilePath - La ruta donde se guardará el archivo de backup.
 */
export const backupDb = async (backupFilePath) => {
    try {
        const { config } = await getDbConfig();
        const DB_PASSWORD = await getDbPassword();

        const { DB_USER, DB_DATABASE, DB_HOST, DB_PORT } = config;

        //console.log('Parámetros de la base de datos para el backup:', { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE });

        if (!DB_USER || !DB_PASSWORD || !DB_DATABASE || !DB_HOST || !DB_PORT) {
            throw new Error('La configuración de la base de datos está incompleta.');
        }

        const command = `mysqldump --host=${DB_HOST} --port=${DB_PORT} --user=${DB_USER} --password=${DB_PASSWORD} ${DB_DATABASE} > ${backupFilePath}`;

        await execAsync(command);
        console.log(`Backup de la base de datos creado en: ${backupFilePath}`);
    } catch (error) {
        console.error('Error al crear el backup de la base de datos:', error);
        throw new Error('No se pudo completar el backup de la base de datos.');
    }
};

/**
 * Valida si un fichero parece ser un volcado SQL válido de mysqldump.
 * Comprueba las primeras líneas en busca de cabeceras típicas.
 * @param {string} filePath - La ruta al archivo .sql.
 * @returns {Promise<boolean>} - True si el fichero es válido, de lo contrario lanza un error.
 */
const validateSqlDump = async (filePath) => {
    const fileStream = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity
    });

    let lineCount = 0;
    let foundDumpHeader = false;
    let foundDropTable = false;
    let foundCreateTable = false;

    for await (const line of fileStream) {
        lineCount++;
        // 1. Aceptar tanto MySQL como MariaDB
        if (line.includes('MySQL dump') || line.includes('MariaDB dump')) {
            foundDumpHeader = true;
        }
        // 2. Comprobar que existen sentencias DROP y CREATE
        if (line.includes('DROP TABLE IF EXISTS')) {
            foundDropTable = true;
        }
        if (line.includes('CREATE TABLE')) {
            foundCreateTable = true;
        }

        if (lineCount >= 50) {
            // Revisar solo las primeras 50 líneas es suficiente
            break;
        }
    }

    // 3. Devolver errores más específicos
    if (!foundDumpHeader) {
        throw new Error('El fichero no parece ser un volcado válido. Falta la cabecera "MySQL dump" o "MariaDB dump".');
    }
    if (!foundDropTable || !foundCreateTable) {
        throw new Error('El fichero de volcado parece incompleto. Faltan las sentencias "DROP TABLE" o "CREATE TABLE".');
    }

    return true;
};

/**
 * Restaura la base de datos desde un archivo de volcado SQL.
 * @param {string} dumpFilePath - La ruta al archivo .sql que se va a restaurar.
 */
export const restoreDb = async (dumpFilePath) => {
    try {
        // 1. Validar el fichero antes de hacer nada
        await validateSqlDump(dumpFilePath);

        // 2. Obtener configuración de la BD
        const { config } = await getDbConfig();
        const DB_PASSWORD = await getDbPassword();
        const { DB_USER, DB_DATABASE, DB_HOST, DB_PORT } = config;

        if (!DB_USER || !DB_PASSWORD || !DB_DATABASE || !DB_HOST || !DB_PORT) {
            throw new Error('La configuración de la base de datos está incompleta.');
        }

        // 3. Ejecutar el comando de restauración
        const command = `mysql --host=${DB_HOST} --port=${DB_PORT} --user=${DB_USER} --password=${DB_PASSWORD} ${DB_DATABASE} < ${dumpFilePath}`;

        await execAsync(command);
        console.log(`Base de datos restaurada correctamente desde: ${dumpFilePath}`);
    } catch (error) {
        console.error('Error al restaurar la base de datos:', error);
        // Re-lanzar el error para que el controlador de la ruta lo capture
        throw error;
    }
};
