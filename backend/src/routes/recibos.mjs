/**
 * API para la gestión de recibos
 *
 * Este módulo proporciona endpoints para administrar recibos o facturas periódicas.
 * Permite obtener recibos con diversos filtros (periodicidad, fecha, año, etc.),
 * crear o actualizar recibos y eliminar recibos individuales o en masa.
 * Cada recibo puede tener fechas de cargo asociadas y estados específicos.
 *
 * @module routes/recibos
 */

// Importamos Router de express para crear rutas
import { completarFechasAnio, deleteRecibo, getRecibos, pushRecibo } from '#backend/db/db_utils.mjs';
import { autorizar } from '#backend/middleware/auth.mjs';
import { filtrarVisibles } from '../utils/autorizacion.mjs';
import { asegurarBorrado, asegurarEdicion, registroDeRecibo } from '../utils/propiedad.mjs';
import { detalleParaLog, responderError } from '../utils/errorDeNegocio.mjs';
import { Router } from 'express';

// Creamos una instancia de Router
const router = Router();

// Definimos una ruta GET para obtener recibos
router.get('/', autorizar('recibos', 'lectura'), async (req, res) => {
    // Obtenemos los filtros de la consulta
    const filters = req.query;
    try {
        // Llamamos a la función getRecibos con los filtros y enviamos la respuesta en formato JSON
        const recibos = await getRecibos(filters);
        //It sends the recibos data as a JSON response to the client, facilitating the transfer of structured data between the server and the client.
        res.json(filtrarVisibles(req.usuario, recibos, 'recibos'));
    } catch (error) {
        // Si hay un error, enviamos una respuesta con el código de estado y el mensaje de error
        responderError(res, error, 'No se pudieron obtener los recibos.', { contexto: 'recibos - GET' });
    }
});

router.post('/', autorizar('recibos', 'escritura'), async (req, res) => {
    const { id, concepto, periodicidad, importe, categoria, cargo, cuenta_id, fecha_inicial, modoFechas, permitirFueraDeAnio, es_privado } = req.body;

    // Si estamos en modo automático y no se proporciona fecha_inicial, error
    if (modoFechas === 'auto' && !fecha_inicial) {
        return res.status(400).json({
            error: 'En modo automático, el campo fecha_inicial es obligatorio.'
        });
    }

    // Si estamos en modo manual y no se proporciona cargo, error
    if (modoFechas === 'manual' && (!cargo || !Array.isArray(cargo) || cargo.length === 0)) {
        return res.status(400).json({
            error: 'En modo manual, el campo cargo es obligatorio y debe ser un array no vacío.'
        });
    }

    // Si no se especifica modoFechas, verificar requisitos tradicionales
    if (!modoFechas) {
        // Si no se proporciona cargo, verificar que se haya proporcionado fecha_inicial
        if (!cargo && !fecha_inicial) {
            return res.status(400).json({
                error: 'Se debe proporcionar al menos uno de estos campos: cargo o fecha_inicial.'
            });
        }

        // Si se proporciona cargo, verificar que sea un array
        if (cargo && !Array.isArray(cargo)) {
            return res.status(400).json({
                error: 'El campo cargo debe ser un array.'
            });
        }
    }

    if (!cuenta_id) {
        return res.status(400).json({ error: 'El campo cuenta_id es obligatorio.' });
    }

    if (es_privado !== undefined && ![0, 1, '0', '1'].includes(es_privado)) {
        return res.status(400).json({ error: 'es_privado debe ser 0 o 1.' });
    }

    try {
        // Verificar que req.user y req.user.id existen
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'No se pudo identificar al usuario. Posible error de autenticación.' });
        }

        const propietarioId = req.user.id; // Obtenemos el ID del usuario del token JWT

        console.log('recibos - ==== INICIO PETICIÓN POST /recibos ====');
        console.log('recibos - Datos validados correctamente, procediendo a llamar pushRecibo');
        console.log('recibos - Llamando a pushRecibo con ID:', id);
        console.log('recibos - Tipo de cargo:', Array.isArray(cargo) ? 'Array' : typeof cargo);
        console.log('recibos - Número de fechas en cargo:', cargo ? cargo.length : 0);

        if (cargo && cargo.length > 0) {
            console.log('recibos - Primera fecha en cargo:', JSON.stringify(cargo[0]));
            console.log('recibos - Comentario en cargo[0]:', cargo[0].comentario, 'Tipo:', typeof cargo[0].comentario);
            if (cargo.length > 1) {
                console.log('recibos - Segunda fecha en cargo:', JSON.stringify(cargo[1]));
            }
        }
        const fueraDeAnioPermitido = permitirFueraDeAnio === true && req.usuario.rol === 'admin'; // DC-29: solo un administrador puede saltarse la regla del año del recibo
        if (permitirFueraDeAnio === true && !fueraDeAnioPermitido) {
            console.log('recibos - permitirFueraDeAnio ignorado: el usuario no es administrador');
        }
        if (id) {
            asegurarEdicion(req.usuario, await registroDeRecibo(id), 'recibos');
        }

        const resultado = await pushRecibo(id, concepto, periodicidad, importe, categoria, cargo, propietarioId, cuenta_id, fecha_inicial, modoFechas, fueraDeAnioPermitido, es_privado);
        console.log('recibos - pushRecibo completado con éxito para ID:', id);
        console.log('recibos - ==== FIN PETICIÓN POST /recibos (ÉXITO) ====');
        res.status(201).json({ message: 'Recibo insertado o actualizado correctamente', ...resultado });
    } catch (error) {
        console.error('recibos - alta o edición: ' + detalleParaLog(error));
        console.log('recibos - ==== FIN PETICIÓN POST /recibos (ERROR) ====');
        responderError(res, error, 'No se pudo guardar el recibo.', { contexto: 'recibos - POST' });
    }
});

// Definimos una ruta DELETE para eliminar recibos
router.delete('/:id', autorizar('recibos', 'borrado'), async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha, periodicidad } = req.query;
        const forzar = req.query.permitirPagados === '1' && req.usuario.rol === 'admin'; // Opción de sesión del administrador (DC-21)
        asegurarBorrado(req.usuario, await registroDeRecibo(id), 'recibos');
        const success = await deleteRecibo(id, fecha, periodicidad, undefined, forzar);
        if (success) {
            res.status(200).send({ message: 'Recibo eliminado correctamente' });
        } else {
            res.status(404).send({ message: 'Recibo no encontrado' });
        }
    } catch (error) {
        responderError(res, error, 'No se pudo eliminar el recibo.', { clave: 'message', contexto: 'recibos - DELETE' });
    }
});

// Ruta para generar nuevas fechas de cargo para un recibo específico
router.post('/:id/generar-fechas', autorizar('recibos', 'escritura'), async (req, res) => {
    try {
        const { id } = req.params;
        asegurarEdicion(req.usuario, await registroDeRecibo(id), 'recibos');
        const creadas = await completarFechasAnio(id);
        res.status(200).json({
            message: creadas > 0 ? 'Se han añadido ' + creadas + ' fecha(s) de cargo hasta completar el año' : 'No faltan fechas de cargo para completar el año',
            creadas
        });
    } catch (error) {
        responderError(res, error, 'No se pudieron generar nuevas fechas.', { contexto: 'recibos - generar-fechas' });
    }
});

export default router;
