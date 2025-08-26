import { exec } from 'child_process';
import { promisify } from 'util';
import { getDbConfig, getDbPassword } from './db_utilsConn.mjs';

const execAsync = promisify(exec);

/**
 * Realiza un backup de la base de datos usando mysqldump.
 * @param {string} backupFilePath - La ruta donde se guardará el archivo de backup.
 */
export const backupDb = async (backupFilePath) => {
    try {
        const config = await getDbConfig();
        const { password: dbPassword } = await getDbPassword();

        const { DB_USER, DB_DATABASE, DB_HOST, DB_PORT } = config;

        if (!DB_USER || !dbPassword || !DB_DATABASE || !DB_HOST || !DB_PORT) {
            throw new Error('La configuración de la base de datos está incompleta.');
        }

        const command = `mysqldump --host=${DB_HOST} --port=${DB_PORT} --user=${DB_USER} --password=${dbPassword} ${DB_DATABASE} > ${backupFilePath}`;

        await execAsync(command);
        console.log(`Backup de la base de datos creado en: ${backupFilePath}`);
    } catch (error) {
        console.error('Error al crear el backup de la base de datos:', error);
        throw new Error('No se pudo completar el backup de la base de datos.');
    }
};
