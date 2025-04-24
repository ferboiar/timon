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

const router = Router();

router.get('/', async (req, res) => {
    try {
        const savings = await getSavings();
        res.json(savings);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los ahorros' });
    }
});

router.post('/', async (req, res) => {
    const { id, concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo } = req.body;
    try {
        await pushSaving(id, concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo);
        res.status(201).json({ message: 'Ahorro insertado o actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al insertar o actualizar el ahorro: ${error.message}`, details: error.stack });
    }
});

router.delete('/', async (req, res) => {
    const { savings } = req.body;
    try {
        await deleteSavings(savings);
        res.status(200).json({ message: 'Ahorro(s) eliminado(s) correctamente' });
    } catch (error) {
        res.status(500).json({ error: `Error al eliminar el/los ahorro(s): ${error.message}`, details: error.stack });
    }
});

router.get('/periodicidades', async (req, res) => {
    try {
        const periodicidades = await getPeriodicidades();
        res.json(periodicidades);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las periodicidades' });
    }
});

router.get('/:ahorroId/movimientos', async (req, res) => {
    const { ahorroId } = req.params;
    try {
        const movimientos = await getMovimientos(ahorroId);
        res.json(movimientos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los movimientos' });
    }
});

router.post('/movimientos', async (req, res) => {
    const { id, ahorro_id, importe, fecha, tipo, descripcion } = req.body;
    try {
        await pushMovimiento(id, ahorro_id, importe, fecha, tipo, descripcion);
        res.status(201).json({ message: 'Movimiento insertado o actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al insertar o actualizar el movimiento: ${error.message}`, details: error.stack });
    }
});

router.delete('/movimientos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await deleteMovimiento(id);
        res.status(200).json({ message: 'Movimiento eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: `Error al eliminar el movimiento: ${error.message}`, details: error.stack });
    }
});

export default router;
