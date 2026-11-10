/**
 * API para la gestión de ahorros
 *
 * Este módulo proporciona endpoints para administrar objetivos de ahorro en la aplicación.
 * Permite obtener todos los ahorros existentes, crear o actualizar objetivos de ahorro,
 * eliminar ahorros, gestionar los movimientos (depósitos o retiros) asociados a cada ahorro,
 * y obtener las periodicidades disponibles para planes de ahorro.
 *
 * @module routes/ahorros
 */

import { deleteMovimiento, deleteSavings, getMovimientos, getPeriodicidades, getSavings, pushMovimiento, pushSaving } from '#backend/db/db_utilsSav.mjs';
import { Router } from 'express';
import { autorizar } from '#backend/middleware/auth.mjs';
import { filtrarVisibles, puedeVerRegistro } from '../utils/autorizacion.mjs';
import { asegurarBorrado, asegurarEdicion, registroDeAhorro, registroDeMovimiento } from '../utils/propiedad.mjs';
import { responderError } from '../utils/errorDeNegocio.mjs';

const router = Router();

router.get('/', autorizar('ahorros', 'lectura'), async (req, res) => {
    try {
        const savings = await getSavings();
        res.json(filtrarVisibles(req.usuario, savings, 'ahorros'));
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los ahorros' });
    }
});

router.post('/', autorizar('ahorros', 'escritura'), async (req, res) => {
    const { id, concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo, es_privado } = req.body;
    try {
        if (es_privado !== undefined && ![0, 1, '0', '1'].includes(es_privado)) {
            return res.status(400).json({ error: 'es_privado debe ser 0 o 1.' });
        }
        if (id) {
            asegurarEdicion(req.usuario, await registroDeAhorro(id), 'ahorros');
        }

        await pushSaving(id, concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo, req.user.id, es_privado);
        res.status(201).json({ message: 'Ahorro insertado o actualizado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo guardar el ahorro.', { contexto: 'ahorros - POST' });
    }
});

router.delete('/', autorizar('ahorros', 'borrado'), async (req, res) => {
    const { savings } = req.body;
    try {
        for (const id of savings ?? []) {
            asegurarBorrado(req.usuario, await registroDeAhorro(id), 'ahorros');
        }

        await deleteSavings(savings);
        res.status(200).json({ message: 'Ahorro(s) eliminado(s) correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudieron eliminar los ahorros.', { contexto: 'ahorros - DELETE' });
    }
});

router.get('/periodicidades', autorizar('ahorros', 'lectura'), async (req, res) => {
    try {
        const periodicidades = await getPeriodicidades();
        res.json(periodicidades);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las periodicidades' });
    }
});

router.get('/:ahorroId/movimientos', autorizar('ahorros', 'lectura'), async (req, res) => {
    const { ahorroId } = req.params;
    try {
        const ahorro = await registroDeAhorro(ahorroId);
        if (!ahorro) {
            return res.status(404).json({ error: 'Ahorro no encontrado' });
        }
        if (!puedeVerRegistro(req.usuario, ahorro, 'ahorros')) {
            return res.status(403).json({ error: 'No tienes permisos para ver este ahorro' });
        }

        const movimientos = await getMovimientos(ahorroId);
        res.json(movimientos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los movimientos' });
    }
});

router.post('/movimientos', autorizar('ahorros', 'escritura'), async (req, res) => {
    const { id, ahorro_id, importe, fecha, tipo, descripcion } = req.body;
    try {
        asegurarEdicion(req.usuario, await registroDeAhorro(ahorro_id), 'ahorros');
        await pushMovimiento(id, ahorro_id, importe, fecha, tipo, descripcion);
        res.status(201).json({ message: 'Movimiento insertado o actualizado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo guardar el movimiento.', { contexto: 'ahorros - POST movimiento' });
    }
});

router.delete('/movimientos/:id', autorizar('ahorros', 'borrado'), async (req, res) => {
    const { id } = req.params;
    try {
        asegurarBorrado(req.usuario, await registroDeMovimiento(id), 'ahorros');
        await deleteMovimiento(id);
        res.status(200).json({ message: 'Movimiento eliminado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo eliminar el movimiento.', { contexto: 'ahorros - DELETE movimiento' });
    }
});

export default router;
