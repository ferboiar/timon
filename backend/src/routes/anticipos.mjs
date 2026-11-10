/**
 * API para la gestión de anticipos y préstamos
 *
 * Este módulo proporciona endpoints para administrar anticipos o préstamos en la aplicación.
 * Permite obtener todos los anticipos, crear o actualizar anticipos con sus planes de pago,
 * eliminar anticipos, gestionar pagos individuales, y recalcular planes de pago cuando
 * es necesario. Incluye funcionalidades para manejar diferentes periodicidades de pago.
 *
 * Respuesta de error (DC-39, F-48):
 * - Un error de negocio (datos no válidos 400, recurso inexistente 404, operación no
 *   permitida 409, sesión no identificada 401) trae un mensaje breve y accionable que se
 *   devuelve tal cual en el campo "error", que la pantalla muestra con getApiErrorMessage.
 * - Cualquier otro error es un fallo interno (500): el mensaje visible compone el texto
 *   propio de la operación con la causa del catálogo compartido, sin SQL ni nombres
 *   internos; el detalle completo queda en el log del servidor (DC-09).
 * - Esta ruta la usa cualquier usuario con sesión, así que el texto no supone
 *   conocimientos de administrador (audiencia general).
 * Todas las operaciones que escriben en varias filas son transaccionales: si responden con error, no han cambiado nada.
 *
 * @module routes/anticipos
 */

import { deleteAdvances, getAdvances, getPagos, getPeriodicidades, handlePaymentDeletion, pushAdvance, pushPago, recalculatePaymentPlan, sustituirPago } from '#backend/db/db_utilsAdv.mjs';
import { autorizar } from '#backend/middleware/auth.mjs';
import { filtrarVisibles, puedeVerRegistro } from '../utils/autorizacion.mjs';
import { asegurarBorrado, asegurarEdicion, registroDeAnticipo, registroDePago } from '../utils/propiedad.mjs';
import { responderError } from '#backend/utils/errorDeNegocio.mjs';
import { leerBooleano, leerEnteroPositivo, leerListaEnterosPositivos } from '#backend/utils/parametros.mjs';
import { Router } from 'express';

const router = Router();

// Obtener todos los anticipos
router.get('/', autorizar('anticipos', 'lectura'), async (req, res) => {
    try {
        const advances = await getAdvances();
        res.json(filtrarVisibles(req.usuario, advances, 'anticipos'));
    } catch (error) {
        responderError(res, error, 'No se han podido cargar los anticipos.', { contexto: 'anticipos - listado' });
    }
});

// Guardar un anticipo (crear o actualizar)
router.post('/', autorizar('anticipos', 'escritura'), async (req, res) => {
    const { id, concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad, es_privado } = req.body;
    try {
        if (es_privado !== undefined && ![0, 1, '0', '1'].includes(es_privado)) {
            return res.status(400).json({ error: 'es_privado debe ser 0 o 1.' });
        }
        if (id) {
            asegurarEdicion(req.usuario, await registroDeAnticipo(id), 'anticipos');
        }

        await pushAdvance(id, concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad, req.user.id, es_privado);
        console.log('anticipos - guardado: anticipo ' + (id || 'nuevo'));
        res.status(201).json({ message: 'Anticipo insertado o actualizado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se ha podido guardar el anticipo.', { contexto: 'anticipos - guardado' });
    }
});

// Eliminar uno o más anticipos (con todos sus pagos, en una sola transacción)
router.delete('/', autorizar('anticipos', 'borrado'), async (req, res) => {
    try {
        const { advances } = req.body;

        if (!Array.isArray(advances) || advances.length === 0) {
            return res.status(400).json({ error: 'Selecciona al menos un anticipo para eliminar.' });
        }

        // F-43: cada id debe ser un entero positivo; un valor mal formado no llega a la base de datos
        const ids = leerListaEnterosPositivos(advances, 'advances');

        for (const id of ids) {
            asegurarBorrado(req.usuario, await registroDeAnticipo(id), 'anticipos');
        }

        await deleteAdvances(ids);
        console.log('anticipos - borrado: ' + ids.length + ' anticipo(s)');
        res.status(200).json({ message: 'Anticipo(s) eliminado(s) correctamente' });
    } catch (error) {
        responderError(res, error, 'No se han podido eliminar los anticipos.', { contexto: 'anticipos - borrado' });
    }
});

// Obtener periodicidades de anticipos
router.get('/periodicidades', autorizar('anticipos', 'lectura'), async (req, res) => {
    try {
        const periodicidades = await getPeriodicidades();
        res.json(periodicidades);
    } catch (error) {
        responderError(res, error, 'No se han podido cargar las periodicidades.', { contexto: 'anticipos - periodicidades' });
    }
});

// Obtener los pagos de un anticipo
router.get('/:anticipoId/pagos', autorizar('anticipos', 'lectura'), async (req, res) => {
    try {
        const anticipoId = leerEnteroPositivo(req.params.anticipoId, 'anticipoId');
        const anticipo = await registroDeAnticipo(anticipoId);
        if (!anticipo) {
            return res.status(404).json({ error: 'Anticipo no encontrado' });
        }
        if (!puedeVerRegistro(req.usuario, anticipo, 'anticipos')) {
            return res.status(403).json({ error: 'No tienes permisos para ver este anticipo' });
        }

        const pagos = await getPagos(anticipoId);
        res.json(pagos);
    } catch (error) {
        responderError(res, error, 'No se han podido cargar los pagos.', { contexto: 'anticipos - pagos' });
    }
});

// Guardar un pago (crear o actualizar). Un pago pagado no puede pasar a cancelado (400, DC-38)
router.post('/pagos', autorizar('anticipos', 'escritura'), async (req, res) => {
    const { id, anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id } = req.body;
    try {
        asegurarEdicion(req.usuario, await registroDeAnticipo(anticipo_id), 'anticipos');
        await pushPago(id, anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id);
        console.log('anticipos - pago guardado: pago ' + (id || 'nuevo') + ' del anticipo ' + anticipo_id);
        res.status(201).json({ message: 'Pago insertado o actualizado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se ha podido guardar el pago.', { contexto: 'anticipos - guardado del pago' });
    }
});

// Sustituir un pago por uno nuevo en una sola transacción (F-25, F-27, DC-39)
// Cuerpo: importe, fecha (AAAA-MM-DD), tipo, descripcion y cuenta_destino_id del pago nuevo, que siempre queda pendiente.
router.post('/pagos/:id/sustituir', autorizar('anticipos', 'escritura'), async (req, res) => {
    try {
        const pagoId = leerEnteroPositivo(req.params.id, 'id');
        asegurarEdicion(req.usuario, await registroDePago(pagoId), 'anticipos');
        const { pagoNuevoId, anticipoId, pendiente } = await sustituirPago(pagoId, req.body);
        console.log('anticipos - sustitución de pago: pago ' + pagoId + ' del anticipo ' + anticipoId + ' por el pago ' + pagoNuevoId);
        res.status(201).json({ message: 'Pago sustituido correctamente', pagoNuevoId, anticipoId, pendiente });
    } catch (error) {
        responderError(res, error, 'No se ha podido guardar la sustitución del pago.', { contexto: 'anticipos - sustitución de pago' });
    }
});

// Eliminar un pago (DC-39). Una sola ruta para los dos casos:
// - sin parámetro (o redistribuir=false): se borra el pago y nada más;
// - redistribuir=true: además se coloca su importe en el resto del plan (DC-12), con el borrado y el reparto en la misma transacción.
router.delete('/pagos/:id', autorizar('anticipos', 'borrado'), async (req, res) => {
    try {
        const pagoId = leerEnteroPositivo(req.params.id, 'id');
        asegurarBorrado(req.usuario, await registroDePago(pagoId), 'anticipos');
        // Lectura estricta: "?redistribuir=ture" es un 400, no un "no" silencioso
        const redistribuir = leerBooleano(req.query.redistribuir, 'redistribuir');

        const { pendiente, anticipoId, redistribuido, pagosAjustados, pagosCreados } = await handlePaymentDeletion(pagoId, redistribuir);
        console.log(
            'anticipos - borrado de pago: pago ' + pagoId + ' del anticipo ' + anticipoId + ' (pendiente ' + pendiente +
                ', redistribuido: ' + redistribuido + ', pagos ajustados: ' + pagosAjustados + ', pagos nuevos: ' + pagosCreados + ')'
        );
        res.status(200).json({
            message: 'Pago eliminado correctamente',
            pendiente,
            anticipoId,
            redistribuido,
            pagosAjustados,
            pagosCreados
        });
    } catch (error) {
        responderError(res, error, 'No se ha podido eliminar el pago.', { contexto: 'anticipos - borrado de pago' });
    }
});

// Generar o completar el plan de pagos de un anticipo
router.post('/recalculate-payment-plan', autorizar('anticipos', 'escritura'), async (req, res) => {
    try {
        const { anticipoId } = req.body;

        if (!anticipoId) {
            return res.status(400).json({ error: 'Selecciona el anticipo.' });
        }

        const anticipoIdValidado = leerEnteroPositivo(anticipoId, 'anticipoId');
        asegurarEdicion(req.usuario, await registroDeAnticipo(anticipoIdValidado), 'anticipos');
        await recalculatePaymentPlan(anticipoIdValidado); // Los datos del anticipo los lee la propia función
        console.log('anticipos - plan de pagos recalculado: anticipo ' + anticipoId);
        res.status(200).json({ message: 'Plan de pagos recalculado correctamente' });
    } catch (error) {
        responderError(res, error, 'No se ha podido recalcular el plan de pagos.', { contexto: 'anticipos - recálculo del plan' });
    }
});

export default router;
