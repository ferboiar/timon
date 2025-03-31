import { Router } from 'express';
import { deleteAdvances, deletePago, getAdvances, getPagos, getPeriodicidades, handlePaymentDeletion, pushAdvance, pushPago, recalculatePendingPayments } from '../db/db_utilsAdv.mjs';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const advances = await getAdvances();
        res.json(advances);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los anticipos' });
    }
});

router.post('/', async (req, res) => {
    const { id, concepto, importe_total, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad } = req.body;
    try {
        await pushAdvance(id, concepto, importe_total, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad);
        res.status(201).json({ message: 'Anticipo insertado o actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al guardar el anticipo: ${error.message}` });
    }
});

router.delete('/', async (req, res) => {
    const { advances } = req.body;
    console.log('DELETE /api/anticipos - IDs recibidos para eliminar:', advances);
    if (!Array.isArray(advances) || advances.length === 0) {
        console.error('DELETE /api/anticipos - No se proporcionaron IDs de anticipos para eliminar');
        return res.status(400).json({ error: 'No se proporcionaron IDs de anticipos para eliminar' });
    }
    try {
        await deleteAdvances(advances);
        console.log('DELETE /api/anticipos - Anticipos eliminados con éxito');
        res.status(200).json({ message: 'Anticipo(s) eliminado(s) correctamente' });
    } catch (error) {
        console.error('DELETE /api/anticipos - Error al eliminar el/los anticipo(s):', error);
        res.status(500).json({ error: `Error al eliminar el/los anticipo(s): ${error.message}` });
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

router.get('/:anticipoId/pagos', async (req, res) => {
    const { anticipoId } = req.params;
    try {
        const pagos = await getPagos(anticipoId);
        res.json(pagos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los pagos' });
    }
});

router.post('/pagos', async (req, res) => {
    const { id, anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id } = req.body;
    try {
        await pushPago(id, anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id);
        res.status(201).json({ message: 'Pago insertado o actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al guardar el pago: ${error.message}` });
    }
});

router.delete('/pagos/:id', async (req, res) => {
    const { id } = req.params;
    try {
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

router.post('/delete-payment', async (req, res) => {
    const { pagoId } = req.body;

    if (!pagoId) {
        return res.status(400).json({ error: 'Pago ID es requerido' });
    }

    try {
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

router.post('/recalculate-payments', async (req, res) => {
    const { anticipoId } = req.body;

    if (!anticipoId) {
        return res.status(400).json({ error: 'Anticipo ID es requerido' });
    }

    try {
        await recalculatePendingPayments(anticipoId);
        res.status(200).json({ message: 'Pagos pendientes recalculados correctamente' });
    } catch (error) {
        console.error('Error al recalcular los pagos pendientes:', error);
        res.status(500).json({ error: 'Error al recalcular los pagos pendientes' });
    }
});

export default router;
