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
import { ErrorDeNegocio, responderError } from '../utils/errorDeNegocio.mjs';
import { leerEnteroPositivo, leerListaEnterosPositivos } from '../utils/parametros.mjs';

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
        const ahorroId = id ? leerEnteroPositivo(id, 'id') : null;
        if (ahorroId) {
            asegurarEdicion(req.usuario, await registroDeAhorro(ahorroId), 'ahorros');
        }

        await pushSaving(ahorroId, concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo, req.usuario.id, es_privado, req.usuario.id);
        res.status(201).json({ message: 'Ahorro insertado o actualizado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo guardar el ahorro.', { contexto: 'ahorros - POST' });
    }
});

router.delete('/', autorizar('ahorros', 'borrado'), async (req, res) => {
    const { savings } = req.body;
    try {
        const ids = leerListaEnterosPositivos(savings, 'savings');
        for (const id of ids) {
            asegurarBorrado(req.usuario, await registroDeAhorro(id), 'ahorros');
        }

        await deleteSavings(ids);
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
    try {
        const ahorroId = leerEnteroPositivo(req.params.ahorroId, 'ahorroId');
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
        responderError(res, error, 'No se pudieron obtener los movimientos.', { contexto: 'ahorros - GET movimientos' });
    }
});

router.post('/movimientos', autorizar('ahorros', 'escritura'), async (req, res) => {
    const { id, ahorro_id, importe, fecha, tipo, descripcion } = req.body;
    try {
        const movimientoId = id === undefined || id === null || id === '' ? null : leerEnteroPositivo(id, 'id');
        const ahorroId = leerEnteroPositivo(ahorro_id, 'ahorro_id');
        // S-18: al editar, el padre se resuelve del propio movimiento; el del cuerpo solo vale al crear
        const registro = movimientoId ? await registroDeMovimiento(movimientoId) : await registroDeAhorro(ahorroId);
        asegurarEdicion(req.usuario, registro, 'ahorros');

        if (movimientoId && Number(registro.ahorro_id) !== Number(ahorroId)) {
            throw new ErrorDeNegocio('El movimiento no pertenece al ahorro indicado.', 400, 'PADRE_INCORRECTO');
        }

        await pushMovimiento(movimientoId, ahorroId, importe, fecha, tipo, descripcion, req.usuario.id);
        console.log('ahorros - movimiento guardado: movimiento ' + (movimientoId || 'nuevo') + ' del ahorro ' + (movimientoId ? registro.ahorro_id : ahorroId));
        res.status(201).json({ message: 'Movimiento insertado o actualizado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo guardar el movimiento.', { contexto: 'ahorros - POST movimiento' });
    }
});

router.delete('/movimientos/:id', autorizar('ahorros', 'borrado'), async (req, res) => {
    try {
        const id = leerEnteroPositivo(req.params.id, 'id');
        asegurarBorrado(req.usuario, await registroDeMovimiento(id), 'ahorros');
        await deleteMovimiento(id, req.usuario.id);
        res.status(200).json({ message: 'Movimiento eliminado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo eliminar el movimiento.', { contexto: 'ahorros - DELETE movimiento' });
    }
});

export default router;
