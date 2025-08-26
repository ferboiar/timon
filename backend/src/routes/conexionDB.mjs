/**
 * API para la gestión de la conexión de la base de datos.
 *
 * @module routes/conexionDB
 */
import * as dbConnUtils from '#backend/db/db_utilsConn.mjs';
import { verifyAdmin } from '#backend/middleware/auth.mjs';
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
        res.status(500).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
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
        res.json({ message: 'La prueba de conexión fue exitosa.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
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
        res.json({ message: 'Configuración de la base de datos guardada correctamente.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
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
        res.json({ message: 'Configuración de la base de datos restaurada correctamente desde la copia de seguridad.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
