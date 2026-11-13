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
import { recrearPool } from '#backend/db/db_connection.mjs';
import * as dbConnUtils from '#backend/db/db_utilsConn.mjs';
import { verifyAdmin } from '#backend/middleware/auth.mjs';
import { AUDIENCIA_ADMIN } from '#backend/utils/catalogoErrores.mjs';
import { detalleParaLog, ErrorDeNegocio, responderError } from '#backend/utils/errorDeNegocio.mjs';
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
 * S-02/DC-06: datos para probar la conexión de la aplicación.
 *
 * Comprueba los campos obligatorios y usa la contraseña guardada cuando el campo llega
 * vacío.
 *
 * @param {Object} body Datos recibidos.
 * @returns {Promise<Object>} Configuración para la prueba.
 */
async function configuracionParaProbar(body) {
    // S-03: se valida antes de probar la conexión, para no dar un error de red cuando el
    // problema es una clave desconocida o un campo obligatorio vacío
    dbConnUtils.validarClaves(body);
    dbConnUtils.validarCamposObligatorios(body);

    const configuracion = { ...(body || {}) };

    if (!configuracion.DB_PASSWORD) configuracion.DB_PASSWORD = await dbConnUtils.getDbPassword();

    return configuracion;
}

/**
 * Probar una nueva configuración de conexión a la base de datos.
 * @route POST /api/db-config/test
 * @access Privado - Administrador
 */
router.post('/test', verifyAdmin, async (req, res) => {
    try {
        const configuracion = await configuracionParaProbar(req.body);

        await dbConnUtils.testDbConnection(configuracion);
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
        const configuracion = await configuracionParaProbar(req.body);
        const final = await dbConnUtils.calcularConfiguracionFinal(req.body);

        // Primero la prueba de conexión, con la contraseña que se va a guardar de verdad
        await dbConnUtils.testDbConnection(configuracion);

        // S-02: si se están definiendo las credenciales de mantenimiento, se prueban también
        const cuerpo = req.body || {};
        const enviaMantenimiento =
            Object.prototype.hasOwnProperty.call(cuerpo, 'DB_MAINT_USER') || Object.prototype.hasOwnProperty.call(cuerpo, 'DB_MAINT_PASSWORD');

        if (enviaMantenimiento && final.DB_MAINT_USER && final.DB_MAINT_PASSWORD) {
            try {
                await dbConnUtils.testDbConnection({
                    ...final,
                    DB_USER: final.DB_MAINT_USER,
                    DB_PASSWORD: final.DB_MAINT_PASSWORD
                });
            } catch (error) {
                console.error('conexionDB - credenciales de mantenimiento: ' + detalleParaLog(error));
                throw new ErrorDeNegocio(
                    'Las credenciales de mantenimiento no permiten conectar con la base de datos. Revisa el usuario y la contraseña de mantenimiento.',
                    400,
                    'MANTENIMIENTO_NO_CONECTA'
                );
            }
        }

        await dbConnUtils.saveDbConfig(req.body);

        // DC-09: sin contraseña ni usuario
        const { DB_HOST, DB_PORT, DB_DATABASE } = final;
        console.log('conexionDB - configuración guardada: ' + DB_DATABASE + ' en ' + DB_HOST + ':' + DB_PORT);

        try {
            const resultado = await recrearPool();
            console.log('conexionDB - pool: ' + (resultado.recreado ? 'recreado con la configuración guardada' : 'sin cambios (' + resultado.motivo + ')'));
        } catch (error) {
            console.error('conexionDB - pool: no se ha podido recrear la conexión; ' + detalleParaLog(error));
        }

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
