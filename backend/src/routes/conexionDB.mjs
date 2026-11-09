/**
 * API para la gestión de la conexión con la base de datos.
 *
 * Este módulo proporciona funciones para obtener y probar la configuración de conexión.
 *
 * Errores (F-48): son rutas de administrador, así que los mensajes pueden hablar del
 * archivo de configuración, del servicio de la base de datos y de los permisos del
 * servidor. La causa del motor se traduce con el catálogo compartido y el detalle
 * completo queda en el log (DC-09).
 *
 * @module routes/conexionDB
 */
import * as dbConnUtils from '#backend/db/db_utilsConn.mjs';
import { verifyAdmin } from '#backend/middleware/auth.mjs';
import { AUDIENCIA_ADMIN } from '#backend/utils/catalogoErrores.mjs';
import { responderError } from '#backend/utils/errorDeNegocio.mjs';
import express from 'express';

const router = express.Router();

/**
 * Obtener la configuración actual de la base de datos.
 * @route GET /api/db-config
 * @access Privado - Administrador
 */
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const config = await dbConnUtils.getDbConfig();
        res.json(config);
    } catch (error) {
        responderError(res, error, 'No se ha podido leer la configuración de la base de datos.', {
            clave: 'message',
            contexto: 'conexionDB - lectura de la configuración',
            audiencia: AUDIENCIA_ADMIN
        });
    }
});

/**
 * Obtener solo la contraseña de la base de datos.
 * @route GET /api/db-config/password
 * @access Privado - Administrador
 */
router.get('/password', verifyAdmin, async (req, res) => {
    try {
        const password = await dbConnUtils.getDbPassword();
        res.json({ password });
    } catch (error) {
        responderError(res, error, 'No se ha podido leer la contraseña guardada en la configuración.', {
            clave: 'message',
            contexto: 'conexionDB - lectura de la contraseña',
            audiencia: AUDIENCIA_ADMIN
        });
    }
});

/**
 * Probar una nueva configuración de conexión a la base de datos.
 * @route POST /api/db-config/test
 * @access Privado - Administrador
 */
router.post('/test', verifyAdmin, async (req, res) => {
    try {
        await dbConnUtils.testDbConnection(req.body);
        console.log('conexionDB - prueba de conexión: correcta');
        res.json({ message: 'La prueba de conexión fue exitosa.' });
    } catch (error) {
        responderError(res, error, 'No se ha podido conectar con esos datos.', {
            clave: 'message',
            contexto: 'conexionDB - prueba de conexión',
            audiencia: AUDIENCIA_ADMIN
        });
    }
});

/**
 * Guardar la nueva configuración de la base de datos.
 * @route PUT /api/db-config
 * @access Privado - Administrador
 */
router.put('/', verifyAdmin, async (req, res) => {
    try {
        // Primero, probar la conexión antes de guardar
        await dbConnUtils.testDbConnection(req.body);
        // Si la prueba es exitosa, guardar la configuración
        await dbConnUtils.saveDbConfig(req.body);

        // DC-09: traza sin contraseña ni usuario
        const { DB_HOST, DB_PORT, DB_DATABASE } = req.body || {};
        console.log(`conexionDB - configuración guardada: ${DB_DATABASE} en ${DB_HOST}:${DB_PORT}`);
        res.json({ message: 'Configuración de la base de datos guardada correctamente.' });
    } catch (error) {
        responderError(res, error, 'No se ha podido guardar la configuración de la base de datos.', {
            clave: 'message',
            contexto: 'conexionDB - guardado de la configuración',
            audiencia: AUDIENCIA_ADMIN
        });
    }
});

/**
 * Restaurar la configuración de la base de datos desde el backup.
 * @route POST /api/db-config/restore
 * @access Privado - Administrador
 */
router.post('/restore', verifyAdmin, async (req, res) => {
    try {
        await dbConnUtils.restoreDbConfig();
        console.log('conexionDB - configuración restaurada desde la copia de seguridad');
        res.json({ message: 'Configuración de la base de datos restaurada correctamente desde la copia de seguridad.' });
    } catch (error) {
        responderError(res, error, 'No se ha podido restaurar la copia de la configuración.', {
            clave: 'message',
            contexto: 'conexionDB - restauración de la configuración',
            audiencia: AUDIENCIA_ADMIN
        });
    }
});

export default router;
