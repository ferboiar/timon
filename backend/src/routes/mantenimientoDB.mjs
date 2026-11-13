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

import { backupDb, MAX_BYTES_VOLCADO, MENSAJE_VOLCADO_DEMASIADO_GRANDE, restoreDb } from '#backend/db/db_maintenance.mjs';
import { verifyAdmin } from '#backend/middleware/auth.mjs';
import { AUDIENCIA_ADMIN } from '#backend/utils/catalogoErrores.mjs';
import { detalleParaLog, ErrorDeNegocio, responderError } from '#backend/utils/errorDeNegocio.mjs';
import crypto from 'crypto';
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import os from 'os';
import path from 'path';

const router = Router();

// Ficheros de trabajo en el directorio temporal del sistema. El límite de tamaño es el
// mismo que comprueba db_maintenance al validar el volcado: una sola constante (S-02).
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: MAX_BYTES_VOLCADO } });

/** Nombre de fichero saneado para el log (DC-09): sin caracteres de control y acotado. */
function nombreParaLog(nombre) {
    let limpio = '';

    for (const caracter of String(nombre || 'sin nombre')) {
        limpio += caracter.charCodeAt(0) < 32 ? ' ' : caracter;
    }

    return limpio.slice(0, 120);
}

/**
 * S-02: recibe el volcado y convierte el exceso de tamaño en un 413 JSON.
 *
 * Sin este envoltorio, Express no tiene manejador de errores y respondería su página de
 * error en HTML. Cuando se supera el límite, multer descarta el fichero parcial: probado
 * con 4 KB y un límite de 1 KB (req.file queda indefinido y el destino, vacío).
 */
function subirVolcado(req, res, next) {
    upload.single('backupFile')(req, res, (error) => {
        if (!error) return next();

        if (error.code === 'LIMIT_FILE_SIZE') {
            if (req.file && req.file.path) fs.unlink(req.file.path, () => {});

            return responderError(
                res,
                new ErrorDeNegocio(MENSAJE_VOLCADO_DEMASIADO_GRANDE, 413, 'VOLCADO_DEMASIADO_GRANDE'),
                'La restauración ha fallado.',
                { clave: 'message', contexto: 'mantenimientoDB - subida del volcado', audiencia: AUDIENCIA_ADMIN }
            );
        }

        console.error('mantenimientoDB - subida del volcado: ' + detalleParaLog(error));

        return responderError(res, error, 'No se ha podido recibir el archivo de copia de seguridad.', {
            clave: 'message',
            contexto: 'mantenimientoDB - subida del volcado',
            audiencia: AUDIENCIA_ADMIN
        });
    });
}

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
    // S-02: nombre único en el directorio temporal (dos administradores no se pisan)
    const backupFilePath = path.join(os.tmpdir(), 'timon-backup-' + crypto.randomUUID() + '.sql');
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
router.post('/restore', verifyAdmin, subirVolcado, async (req, res) => {
    const dumpFile = req.file;

    if (!dumpFile) {
        return res.status(400).json({ message: 'Selecciona el archivo de copia de seguridad (.sql) que quieres restaurar.' });
    }

    const dumpFilePath = dumpFile.path;

    try {
        // DC-09: nombre saneado y tamaño; nunca el contenido del fichero
        console.log('mantenimientoDB - restore: fichero ' + nombreParaLog(dumpFile.originalname) + ' (' + dumpFile.size + ' bytes)');

        await restoreDb(dumpFilePath);

        console.log('mantenimientoDB - restore: completada');
        res.status(200).json({ message: 'Base de datos restaurada con éxito.' });
    } catch (error) {
        console.error('mantenimientoDB - restore: fallida');

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
