/**
 * API de ajustes del sistema
 *
 * Zona horaria de la aplicación (cualquier usuario autenticado puede leerla; solo el administrador la cambia),
 * interruptor de la creación automática de recibos y ejecución manual del procedimiento anual.
 *
 * @module routes/ajustes
 */

import { getCrearRecibosAutomaticamente, getZonaHoraria, setCrearRecibosAutomaticamente, setZonaHoraria } from '#backend/db/db_ajustes.mjs';
import { generarRecibosAnio } from '#backend/db/db_utils.mjs';
import { verifyAdmin, verifyToken } from '#backend/middleware/auth.mjs';
import { Router } from 'express';

const router = Router();

function responderError(res, error, mensaje) {
    if (error.status) {
        return res.status(error.status).json({ error: error.message });
    }
    console.error(`API ajustes. ${mensaje}:`, error);
    return res.status(500).json({ error: mensaje });
}

router.get('/general', verifyToken, async (req, res) => {
    try {
        res.json({ zona_horaria: await getZonaHoraria(), ahora_utc: new Date().toISOString() });
    } catch (error) {
        responderError(res, error, 'Error al obtener los ajustes generales');
    }
});

router.put('/general', verifyAdmin, async (req, res) => {
    try {
        await setZonaHoraria(req.body?.zona_horaria);
        res.json({ zona_horaria: await getZonaHoraria() });
    } catch (error) {
        responderError(res, error, 'Error al guardar la zona horaria');
    }
});

router.get('/recibos', verifyAdmin, async (req, res) => {
    try {
        res.json({ crear_recibos_automaticamente: await getCrearRecibosAutomaticamente() });
    } catch (error) {
        responderError(res, error, 'Error al obtener los ajustes de recibos');
    }
});

router.put('/recibos', verifyAdmin, async (req, res) => {
    try {
        if (typeof req.body?.crear_recibos_automaticamente !== 'boolean') {
            return res.status(400).json({ error: 'crear_recibos_automaticamente debe ser verdadero o falso.' });
        }
        await setCrearRecibosAutomaticamente(req.body.crear_recibos_automaticamente);
        res.json({ crear_recibos_automaticamente: await getCrearRecibosAutomaticamente() });
    } catch (error) {
        responderError(res, error, 'Error al guardar los ajustes de recibos');
    }
});

// Vista previa (simular = true, por defecto) o ejecución manual del procedimiento que crea los recibos del año
router.post('/recibos/generar-anio', verifyAdmin, async (req, res) => {
    try {
        const simular = req.body?.simular !== false;
        const filas = await generarRecibosAnio(simular);
        res.json({ simulacion: simular, filas });
    } catch (error) {
        responderError(res, error, 'Error al generar los recibos del año');
    }
});

export default router;
