/**
 * API para la gestión de la base de datos
 *
 * Este módulo proporciona endpoints para realizar copias de seguridad y restauraciones de la base de datos.
 *
 * Errores (F-48): son rutas de administrador. El mensaje visible explica la causa
 * (herramienta ausente, disco lleno, base no accesible) o remite al registro del
 * servidor, y el detalle completo se registra con el formato «módulo - acción: datos»
 * (DC-09). La validación del volcado es un error de negocio con su propio estado: ya
 * no se clasifica por el texto del mensaje.
 *
 * @module routes/mantenimientoDB
 */

import { backupDb, restoreDb } from '#backend/db/db_maintenance.mjs';
import { verifyAdmin } from '#backend/middleware/auth.mjs';
import { AUDIENCIA_ADMIN } from '#backend/utils/catalogoErrores.mjs';
import { detalleParaLog, responderError } from '#backend/utils/errorDeNegocio.mjs';
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

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
router.get('/backup', verifyAdmin, async (req, res) => {
    const backupFilePath = path.join(projectRoot, 'backup.sql');
    try {
        await backupDb(backupFilePath);
        console.log('mantenimientoDB - copia de seguridad: volcado generado');
        res.download(backupFilePath, 'backup.sql', (err) => {
            if (err) {
                console.error('mantenimientoDB - envío de la copia: ' + detalleParaLog(err));
                // Si la descarga ya había empezado no se puede cambiar la respuesta
                if (!res.headersSent) {
                    res.status(500).json({ error: 'La copia se ha generado, pero no se ha podido enviar el archivo. Comprueba la conexión e inténtalo de nuevo.' });
                }
            }
            // Eliminar el archivo de backup después de enviarlo
            fs.unlink(backupFilePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('mantenimientoDB - borrado del volcado temporal: ' + detalleParaLog(unlinkErr));
                }
            });
        });
    } catch (error) {
        responderError(res, error, 'No se ha podido generar la copia de seguridad.', {
            clave: 'error',
            contexto: 'mantenimientoDB - copia de seguridad',
            audiencia: AUDIENCIA_ADMIN
        });
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
router.post('/restore', verifyAdmin, upload.single('backupFile'), async (req, res) => {
    const dumpFile = req.file;

    if (!dumpFile) {
        return res.status(400).json({ message: 'Selecciona el archivo de copia de seguridad (.sql) que quieres restaurar.' });
    }

    const dumpFilePath = dumpFile.path;

    try {
        await restoreDb(dumpFilePath);
        console.log('mantenimientoDB - restauración: completada');
        res.status(200).json({ message: 'Base de datos restaurada con éxito.' });
    } catch (error) {
        // Los errores de validación del volcado son de negocio (400) y conservan su mensaje;
        // los fallos de mysql o del sistema se componen con el catálogo de causas.
        responderError(res, error, 'La restauración ha fallado.', {
            clave: 'message',
            contexto: 'mantenimientoDB - restauración',
            audiencia: AUDIENCIA_ADMIN,
            aviso: 'Comprueba el estado de la base de datos antes de reintentar; si el problema sigue, consulta el registro del servidor.'
        });
    } finally {
        // Asegurarse de eliminar el fichero temporal después de la operación
        fs.unlink(dumpFilePath, (err) => {
            if (err) {
                console.error('mantenimientoDB - borrado del fichero temporal: ' + detalleParaLog(err));
            }
        });
    }
});

export default router;
