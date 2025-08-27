import { backupDb, restoreDb } from '#backend/db/db_maintenance.mjs';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import os from 'os';

const router = Router();

// Configuración de Multer para guardar el fichero subido en un directorio temporal
const upload = multer({ dest: os.tmpdir() });

// Obtener el directorio raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../'); // Ajusta según la estructura de tu proyecto

/**
 * @swagger
 * /api/db/backup:
 *   get:
 *     summary: Realiza una copia de seguridad de la base de datos
 *     description: Genera un dump SQL completo de la base de datos y lo devuelve como un archivo para descargar.
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archivo de copia de seguridad SQL.
 *         content:
 *           application/sql:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Error al generar la copia de seguridad.
 */
router.get('/backup', async (req, res) => {
    const backupFilePath = path.join(projectRoot, 'backup.sql');
    try {
        await backupDb(backupFilePath);
        res.download(backupFilePath, 'backup.sql', (err) => {
            if (err) {
                console.error('Error al enviar el archivo de backup:', err);
                res.status(500).json({ error: 'Error al enviar el archivo de backup' });
            }
            // Eliminar el archivo de backup después de enviarlo
            fs.unlink(backupFilePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error al eliminar el archivo de backup temporal:', unlinkErr);
                }
            });
        });
    } catch (error) {
        console.error('API. Error en el endpoint de backup:', error);
        res.status(500).json({ error: 'Error al generar la copia de seguridad' });
    }
});

/**
 * @swagger
 * /api/db/restore:
 *   post:
 *     summary: Restaura la base de datos desde un fichero de volcado SQL.
 *     description: Sube un fichero .sql, lo valida y lo usa para restaurar la base de datos, sobrescribiendo los datos actuales.
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               backupFile:
 *                 type: string
 *                 format: binary
 *                 description: El fichero .sql para restaurar.
 *     responses:
 *       200:
 *         description: Base de datos restaurada con éxito.
 *       400:
 *         description: Fichero no proporcionado o fichero de volcado no válido.
 *       500:
 *         description: Error durante el proceso de restauración.
 */
router.post('/restore', upload.single('backupFile'), async (req, res) => {
    const dumpFile = req.file;

    if (!dumpFile) {
        return res.status(400).json({ message: 'No se ha proporcionado ningún fichero.' });
    }

    const dumpFilePath = dumpFile.path;

    try {
        await restoreDb(dumpFilePath);
        res.status(200).json({ message: 'Base de datos restaurada con éxito.' });
    } catch (error) {
        // Capturar errores específicos de validación o restauración
        res.status(error.message.includes('fichero no parece ser un volcado') ? 400 : 500).json({ message: error.message });
    } finally {
        // Asegurarse de eliminar el fichero temporal después de la operación
        fs.unlink(dumpFilePath, (err) => {
            if (err) {
                console.error('Error al eliminar el fichero temporal de restauración:', err);
            }
        });
    }
});

export default router;
