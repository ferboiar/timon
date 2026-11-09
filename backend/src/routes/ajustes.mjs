/**
 * API de ajustes del sistema
 *
 * Zona horaria de la aplicación (cualquier usuario autenticado puede leerla; solo el administrador la cambia),
 * interruptor de la creación automática de recibos y ejecución manual del procedimiento anual.
 *
 * Errores (F-48): los mensajes se redactan para cualquier usuario (audiencia general),
 * porque la pestaña la usa también quien no administra. Se usa la utilidad compartida y el
 * detalle técnico queda en el log con el formato «módulo - acción: datos» (DC-09).
 *
 * @module routes/ajustes
 */

import { getCrearRecibosAutomaticamente, getZonaHoraria, setCrearRecibosAutomaticamente, setZonaHoraria } from '#backend/db/db_ajustes.mjs';
import { generarRecibosAnio } from '#backend/db/db_utils.mjs';
import { verifyAdmin, verifyToken } from '#backend/middleware/auth.mjs';
import { Router } from 'express';
import { responderError } from '#backend/utils/errorDeNegocio.mjs';
import { opcionesGeneracion, separarResultado } from '#backend/utils/generacionAnual.mjs';
import { hoyIsoEnZonaDe } from '#backend/utils/tiempo.mjs';

const router = Router();

router.get('/general', verifyToken, async (req, res) => {
    try {
        res.json({ zona_horaria: await getZonaHoraria(), ahora_utc: new Date().toISOString() });
    } catch (error) {
        responderError(res, error, 'No se han podido cargar tus ajustes.', {
            contexto: 'ajustes - lectura de los ajustes generales'
        });
    }
});

router.put('/general', verifyAdmin, async (req, res) => {
    try {
        await setZonaHoraria(req.body?.zona_horaria);
        const zona = await getZonaHoraria();
        console.log('ajustes - zona horaria: ' + zona);
        res.json({ zona_horaria: zona });
    } catch (error) {
        responderError(res, error, 'No se ha podido guardar la zona horaria.', {
            contexto: 'ajustes - guardado de la zona horaria'
        });
    }
});

router.get('/recibos', verifyAdmin, async (req, res) => {
    try {
        res.json({ crear_recibos_automaticamente: await getCrearRecibosAutomaticamente() });
    } catch (error) {
        responderError(res, error, 'No se han podido cargar los ajustes de recibos.', {
            contexto: 'ajustes - lectura de los ajustes de recibos'
        });
    }
});

router.put('/recibos', verifyAdmin, async (req, res) => {
    try {
        if (typeof req.body?.crear_recibos_automaticamente !== 'boolean') {
            return res.status(400).json({ error: 'El ajuste de creación automática solo puede estar activado o desactivado.' });
        }
        await setCrearRecibosAutomaticamente(req.body.crear_recibos_automaticamente);
        const activo = await getCrearRecibosAutomaticamente();
        console.log('ajustes - creación automática de recibos: ' + (activo ? 'activada' : 'desactivada'));
        res.json({ crear_recibos_automaticamente: activo });
    } catch (error) {
        responderError(res, error, 'No se han podido guardar los ajustes de recibos.', {
            contexto: 'ajustes - guardado de los ajustes de recibos'
        });
    }
});

// Vista previa (simular = true, por defecto) o ejecución manual del procedimiento que crea los recibos del año
router.post('/recibos/generar-anio', verifyAdmin, async (req, res) => {
    try {
        if (req.body?.fecha !== undefined || req.body?.ahora !== undefined) {
            return res.status(400).json({ error: 'La fecha no se puede enviar: el servidor la calcula a partir de hoy.' });
        }
        const opciones = opcionesGeneracion(req.body?.simular ?? true, req.body?.proximoDiciembre ?? false, hoyIsoEnZonaDe(await getZonaHoraria()));
        const resultado = separarResultado(await generarRecibosAnio(opciones.simular, opciones.fecha));
        console.log(
            'ajustes - generación anual: simulación ' + opciones.simular + ', fecha ' + opciones.fecha +
                ', recibos ' + resultado.filas.length + ', avisos ' + resultado.avisos.length
        );
        res.json({ simulacion: opciones.simular, fecha_simulada: opciones.fecha, ...resultado });
    } catch (error) {
        responderError(res, error, 'No se han podido generar los recibos del año. Los ya generados no se han modificado.', {
            contexto: 'ajustes - generación de los recibos del año'
        });
    }
});

export default router;
