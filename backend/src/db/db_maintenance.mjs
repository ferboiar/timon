/**
 * Utilidades para la gestión de la base de datos.
 *
 * Incluye funciones para realizar copias de seguridad y restauraciones.
 *
 * @module db/db_maintenance
 */

import { exec } from 'child_process';
import fs from 'fs';
import readline from 'readline';
import { promisify } from 'util';
import { getDbConfig, getDbPassword } from './db_utilsConn.mjs';
import { detalleParaLog, ErrorDeNegocio, esErrorDeNegocio } from '../utils/errorDeNegocio.mjs';

const execAsync = promisify(exec);

/**
 * F-48: una configuración incompleta es un estado que el administrador puede corregir
 * (409), no un fallo del servidor. Se indica qué dato falta.
 */
function exigirConfiguracionCompleta(config, password) {
    const faltan = [];

    if (!config.DB_HOST) faltan.push('host');
    if (!config.DB_PORT) faltan.push('puerto');
    if (!config.DB_USER) faltan.push('usuario');
    if (!password) faltan.push('contraseña');
    if (!config.DB_DATABASE) faltan.push('base de datos');

    if (faltan.length > 0) {
        throw new ErrorDeNegocio(
            'La configuración de la base de datos está incompleta: falta «' + faltan.join('», «') + '». Revísala en la pestaña Base de Datos.',
            409,
            'CONFIGURACION_INCOMPLETA'
        );
    }
}

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

        exigirConfiguracionCompleta(config, DB_PASSWORD);

        const command = `mysqldump --host=${DB_HOST} --port=${DB_PORT} --user=${DB_USER} --password=${DB_PASSWORD} ${DB_DATABASE} > ${backupFilePath}`;

        await execAsync(command);
        console.log(`Backup de la base de datos creado en: ${backupFilePath}`);
    } catch (error) {
        // F-48: el detalle va al log; la ruta compone el mensaje con el catálogo de causas
        if (!esErrorDeNegocio(error)) console.error('db_maintenance - copia de seguridad: ' + detalleParaLog(error));
        throw error;
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
        throw new ErrorDeNegocio('El archivo no es una copia de seguridad de Timón: no contiene una cabecera de volcado de MySQL o MariaDB.', 400, 'VOLCADO_NO_VALIDO');
    }
    if (!foundDropTable || !foundCreateTable) {
        throw new ErrorDeNegocio('La copia de seguridad está incompleta: faltan las sentencias que crean las tablas.', 400, 'VOLCADO_INCOMPLETO');
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

        exigirConfiguracionCompleta(config, DB_PASSWORD);

        // 3. Ejecutar el comando de restauración
        const command = `mysql --host=${DB_HOST} --port=${DB_PORT} --user=${DB_USER} --password=${DB_PASSWORD} ${DB_DATABASE} < ${dumpFilePath}`;

        await execAsync(command);
        console.log(`Base de datos restaurada correctamente desde: ${dumpFilePath}`);
    } catch (error) {
        // Re-lanzar el error para que el controlador de la ruta lo capture
        if (!esErrorDeNegocio(error)) console.error('db_maintenance - restauración: ' + detalleParaLog(error));
        throw error;
    }
};
