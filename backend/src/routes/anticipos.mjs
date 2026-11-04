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

import { deleteAdvances, getAdvances, getPagos, getPeriodicidades, handlePaymentDeletion, pushAdvance, pushPago, recalculatePaymentPlan, sustituirPago } from '#backend/db/db_utilsAdv.mjs';
import { verifyToken } from '#backend/middleware/auth.mjs';
import { leerBooleano, leerEnteroPositivo, leerListaEnterosPositivos } from '#backend/utils/parametros.mjs';
import { Router } from 'express';

const router = Router();

/*
 * Respuesta de error de estas rutas (DC-39):
 * - Un error con propiedad "status" (datos no válidos, 400; recurso inexistente, 404) trae un mensaje breve pensado
 *   para mostrarse tal cual al usuario: se devuelve con su código en el campo "error", que la pantalla muestra con
 *   getApiErrorMessage.
 * - Cualquier otro error es un fallo interno (500): solo se devuelve el texto genérico de la ruta, porque el detalle
 *   puede contener SQL o nombres internos. El detalle queda en el log del servidor.
 * Todas las operaciones que escriben en varias filas son transaccionales: si responden con error, no han cambiado nada.
 */
function responderError(res, error, mensajeGenerico) {
    const estado = error.status ?? 500;
    const mensaje = error.status ? error.message : mensajeGenerico;
    console.error('anticipos - Respuesta de error ' + estado + ': ' + mensaje + (error.status ? '' : ' (detalle: ' + error.message + ')'));
    return res.status(estado).json({ error: mensaje });
}

// Obtener todos los anticipos
router.get('/', verifyToken, async (req, res) => {
    try {
        const advances = await getAdvances();
        res.json(advances);
    } catch (error) {
        responderError(res, error, 'Error al obtener los anticipos');
    }
});

// Guardar un anticipo (crear o actualizar)
router.post('/', verifyToken, async (req, res) => {
    const { id, concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad } = req.body;
    try {
        await pushAdvance(id, concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad, req.user.id);
        res.status(201).json({ message: 'Anticipo insertado o actualizado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo guardar el anticipo');
    }
});

// Eliminar uno o más anticipos (con todos sus pagos, en una sola transacción)
router.delete('/', verifyToken, async (req, res) => {
    try {
        const { advances } = req.body;
        console.log('DELETE /api/anticipos - IDs recibidos para eliminar:', advances);
        if (!Array.isArray(advances) || advances.length === 0) {
            console.error('DELETE /api/anticipos - No se proporcionaron IDs de anticipos para eliminar');
            return res.status(400).json({ error: 'No se proporcionaron IDs de anticipos para eliminar' });
        }
        // F-43: cada id debe ser un entero positivo; un valor mal formado no llega a la base de datos
        await deleteAdvances(leerListaEnterosPositivos(advances, 'advances'));
        console.log('DELETE /api/anticipos - Anticipos eliminados con éxito');
        res.status(200).json({ message: 'Anticipo(s) eliminado(s) correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudieron eliminar los anticipos');
    }
});

// Obtener periodicidades de anticipos
router.get('/periodicidades', verifyToken, async (req, res) => {
    try {
        const periodicidades = await getPeriodicidades();
        res.json(periodicidades);
    } catch (error) {
        responderError(res, error, 'Error al obtener las periodicidades');
    }
});

// Obtener los pagos de un anticipo
router.get('/:anticipoId/pagos', verifyToken, async (req, res) => {
    try {
        const anticipoId = leerEnteroPositivo(req.params.anticipoId, 'anticipoId');
        const pagos = await getPagos(anticipoId);
        res.json(pagos);
    } catch (error) {
        responderError(res, error, 'Error al obtener los pagos');
    }
});

// Guardar un pago (crear o actualizar). Un pago pagado no puede pasar a cancelado (400, DC-38)
router.post('/pagos', verifyToken, async (req, res) => {
    const { id, anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id } = req.body;
    try {
        await pushPago(id, anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id);
        res.status(201).json({ message: 'Pago insertado o actualizado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo guardar el pago');
    }
});

// Sustituir un pago por uno nuevo en una sola transacción (F-25, F-27, DC-39)
// Cuerpo: importe, fecha (AAAA-MM-DD), tipo, descripcion y cuenta_destino_id del pago nuevo, que siempre queda pendiente.
router.post('/pagos/:id/sustituir', verifyToken, async (req, res) => {
    try {
        const pagoId = leerEnteroPositivo(req.params.id, 'id');
        console.log('sustituir-pago - Procesando pago ID: ' + pagoId);
        const { pagoNuevoId, anticipoId, pendiente } = await sustituirPago(pagoId, req.body);
        res.status(201).json({ message: 'Pago sustituido correctamente', pagoNuevoId, anticipoId, pendiente });
    } catch (error) {
        responderError(res, error, 'No se pudo sustituir el pago');
    }
});

// Eliminar un pago (DC-39). Una sola ruta para los dos casos:
// - sin parámetro (o redistribuir=false): se borra el pago y nada más;
// - redistribuir=true: además se coloca su importe en el resto del plan (DC-12), con el borrado y el reparto en la misma transacción.
router.delete('/pagos/:id', verifyToken, async (req, res) => {
    try {
        const pagoId = leerEnteroPositivo(req.params.id, 'id');
        // Lectura estricta: "?redistribuir=ture" es un 400, no un "no" silencioso
        const redistribuir = leerBooleano(req.query.redistribuir, 'redistribuir');

        console.log('DELETE /pagos/:id - Procesando pago ID: ' + pagoId + ' (redistribuir: ' + redistribuir + ')');
        const { pendiente, anticipoId, redistribuido, pagosAjustados, pagosCreados } = await handlePaymentDeletion(pagoId, redistribuir);
        console.log('DELETE /pagos/:id - Pago ' + pagoId + ' eliminado del anticipo ' + anticipoId + ' (pendiente ' + pendiente + ', redistribuido: ' + redistribuido + ', pagos ajustados: ' + pagosAjustados + ', pagos nuevos: ' + pagosCreados + ')');
        res.status(200).json({
            message: 'Pago eliminado correctamente',
            pendiente,
            anticipoId,
            redistribuido,
            pagosAjustados,
            pagosCreados
        });
    } catch (error) {
        responderError(res, error, 'No se pudo eliminar el pago');
    }
});

// Generar o completar el plan de pagos de un anticipo
router.post('/recalculate-payment-plan', verifyToken, async (req, res) => {
    try {
        const { anticipoId } = req.body;

        if (!anticipoId) {
            console.error('recalculate-payment-plan - Anticipo ID no proporcionado');
            return res.status(400).json({ error: 'Anticipo ID es requerido' });
        }

        console.log('recalculate-payment-plan - Procesando anticipo ID: ' + anticipoId);
        await recalculatePaymentPlan(leerEnteroPositivo(anticipoId, 'anticipoId')); // Los datos del anticipo los lee la propia función
        res.status(200).json({ message: 'Plan de pagos recalculado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo recalcular el plan de pagos');
    }
});

export default router;
