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
import { actualizarFechasRecibos, deleteRecibo, generarNuevasFechasRecibo, getHistorialRecibo, getRecibos, pushRecibo } from '#backend/db/db_utils.mjs';
import { verifyToken } from '#backend/middleware/auth.mjs';
import { Router } from 'express';

// Creamos una instancia de Router
const router = Router();

// Definimos una ruta GET para obtener recibos
router.get('/', verifyToken, async (req, res) => {
    // Obtenemos los filtros de la consulta
    const filters = req.query;
    try {
        // Llamamos a la función getRecibos con los filtros y enviamos la respuesta en formato JSON
        const recibos = await getRecibos(filters);
        //It sends the recibos data as a JSON response to the client, facilitating the transfer of structured data between the server and the client.
        res.json(recibos);
    } catch (error) {
        // Si hay un error, enviamos una respuesta con el código de estado y el mensaje de error
        if (error.message.startsWith('Filtro no válido')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al obtener los recibos' });
        }
    }
});

router.post('/', verifyToken, async (req, res) => {
    const { id, concepto, periodicidad, importe, categoria, cargo, cuenta_id, fecha_inicial } = req.body;

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

    if (!cuenta_id) {
        return res.status(400).json({ error: 'El campo cuenta_id es obligatorio.' });
    }

    try {
        // Verificar que req.user y req.user.id existen
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'No se pudo identificar al usuario. Posible error de autenticación.' });
        }

        const propietarioId = req.user.id; // Obtenemos el ID del usuario del token JWT

        await pushRecibo(id, concepto, periodicidad, importe, categoria, cargo, propietarioId, cuenta_id, fecha_inicial);
        res.status(201).json({ message: 'Recibo insertado o actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al insertar o actualizar el recibo: ${error.message}`, details: error.stack });
    }
});

// Definimos una ruta DELETE para eliminar recibos
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha, periodicidad } = req.query;
        const success = await deleteRecibo(id, fecha, periodicidad);
        if (success) {
            res.status(200).send({ message: 'Recibo eliminado correctamente' });
        } else {
            res.status(404).send({ message: 'Recibo no encontrado' });
        }
    } catch (error) {
        res.status(500).send({ message: 'Error al eliminar el recibo', error: error.message });
    }
});

// Ruta para obtener historial de pagos de un recibo
router.get('/:id/historial', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const historial = await getHistorialRecibo(id);
        res.json(historial);
    } catch (error) {
        res.status(500).json({
            error: 'Error al obtener el historial del recibo',
            details: error.message
        });
    }
});

// Ruta para generar nuevas fechas de cargo para un recibo específico
router.post('/:id/generar-fechas', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await generarNuevasFechasRecibo(id);
        if (resultado) {
            res.status(200).json({
                message: 'Nuevas fechas generadas correctamente'
            });
        } else {
            res.status(200).json({
                message: 'No fue necesario generar nuevas fechas'
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Error al generar nuevas fechas',
            details: error.message
        });
    }
});

// Ruta para actualizar fechas de todos los recibos
router.post('/actualizar-fechas', verifyToken, async (req, res) => {
    try {
        // Verificar que el usuario sea admin
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                error: 'No tienes permisos para realizar esta acción'
            });
        }

        const resultado = await actualizarFechasRecibos();
        res.status(200).json({
            message: 'Proceso de actualización completado',
            resultado
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al actualizar fechas de recibos',
            details: error.message
        });
    }
});

export default router;
