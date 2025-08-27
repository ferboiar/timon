/**
 * API para la gestión de anticipos y préstamos
 *
 * Este módulo proporciona endpoints para administrar anticipos o préstamos en la aplicación.
 * Permite obtener todos los anticipos, crear o actualizar anticipos con sus planes de pago,
 * eliminar anticipos, gestionar pagos individuales, y recalcular planes de pago cuando
 * es necesario. Incluye funcionalidades para manejar diferentes periodicidades de pago.
 *
 * @module routes/anticipos
 */

import { deleteAdvances, deletePago, getAdvances, getPagos, getPeriodicidades, handlePaymentDeletion, pushAdvance, pushPago, recalculatePaymentPlan } from '#backend/db/db_utilsAdv.mjs';
import { verifyToken } from '#backend/middleware/auth.mjs';
import { Router } from 'express';

const router = Router();

// Obtener todos los anticipos
router.get('/', verifyToken, async (req, res) => {
    try {
        const advances = await getAdvances();
        res.json(advances);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los anticipos' });
    }
});

// Guardar un anticipo (crear o actualizar)
router.post('/', verifyToken, async (req, res) => {
    const { id, concepto, importe_total, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad } = req.body;
    try {
        await pushAdvance(id, concepto, importe_total, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad);
        res.status(201).json({ message: 'Anticipo insertado o actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al guardar el anticipo: ${error.message}` });
    }
});

// Eliminar uno o más anticipos
router.delete('/', verifyToken, async (req, res) => {
    try {
        const { advances } = req.body;
        console.log('DELETE /api/anticipos - IDs recibidos para eliminar:', advances);
        if (!Array.isArray(advances) || advances.length === 0) {
            console.error('DELETE /api/anticipos - No se proporcionaron IDs de anticipos para eliminar');
            return res.status(400).json({ error: 'No se proporcionaron IDs de anticipos para eliminar' });
        }
        await deleteAdvances(advances);
        console.log('DELETE /api/anticipos - Anticipos eliminados con éxito');
        res.status(200).json({ message: 'Anticipo(s) eliminado(s) correctamente' });
    } catch (error) {
        console.error('DELETE /api/anticipos - Error al eliminar el/los anticipo(s):', error);
        res.status(500).json({ error: `Error al eliminar el/los anticipo(s): ${error.message}` });
    }
});

// Obtener periodicidades de anticipos
router.get('/periodicidades', verifyToken, async (req, res) => {
    try {
        const periodicidades = await getPeriodicidades();
        res.json(periodicidades);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las periodicidades' });
    }
});

router.get('/:anticipoId/pagos', verifyToken, async (req, res) => {
    const { anticipoId } = req.params;
    try {
        const pagos = await getPagos(anticipoId);
        res.json(pagos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los pagos' });
    }
});

router.post('/pagos', verifyToken, async (req, res) => {
    const { id, anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id } = req.body;
    try {
        await pushPago(id, anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id);
        res.status(201).json({ message: 'Pago insertado o actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al guardar el pago: ${error.message}` });
    }
});

// Eliminar un pago
router.delete('/pagos/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const saldoRestante = await deletePago(id); // Modificar deletePago para devolver el saldo restante
        res.status(200).json({
            message: 'Pago eliminado correctamente',
            saldoRestante,
            options: ['Recalcular pagos restantes', 'Añadir un nuevo pago con el saldo restante']
        });
    } catch (error) {
        res.status(500).json({ error: `Error al eliminar el pago: ${error.message}` });
    }
});

// Manejar la eliminación de un pago
router.post('/delete-payment', verifyToken, async (req, res) => {
    try {
        const { pagoId } = req.body;

        if (!pagoId) {
            return res.status(400).json({ error: 'Pago ID es requerido' });
        }

        const { saldoRestante, anticipoId } = await handlePaymentDeletion(pagoId);
        res.status(200).json({
            message: 'Pago eliminado correctamente',
            saldoRestante,
            anticipoId
        });
    } catch (error) {
        console.error('Error al eliminar el pago:', error);
        res.status(500).json({ error: 'Error al eliminar el pago' });
    }
});

router.post('/recalculate-payment-plan', verifyToken, async (req, res) => {
    try {
        const { anticipoId } = req.body;

        if (!anticipoId) {
            console.error('recalculate-payment-plan - Anticipo ID no proporcionado');
            return res.status(400).json({ error: 'Anticipo ID es requerido' });
        }

        console.log(`recalculate-payment-plan - Procesando anticipo ID: ${anticipoId}`);
        await recalculatePaymentPlan(anticipoId); // Los datos faltantes se obtendrán en la función
        res.status(200).json({ message: 'Plan de pagos recalculado correctamente' });
    } catch (error) {
        console.error('Error al recalcular el plan de pagos:', error);
        res.status(500).json({ error: 'Error al recalcular el plan de pagos' });
    }
});

export default router;
