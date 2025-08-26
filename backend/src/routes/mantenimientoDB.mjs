import { backupDb } from '#backend/db/db_maintenance.mjs';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

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

export default router;
