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
import { Router } from 'express';
// Importamos las funciones getRecibos y pushRecibo desde el módulo db_utils.mjs
import { deleteRecibo, getRecibos, pushRecibo } from '../db/db_utils.mjs';

// Creamos una instancia de Router
const router = Router();

// Definimos una ruta GET para obtener recibos
router.get('/', async (req, res) => {
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

router.post('/', async (req, res) => {
    const { id, concepto, periodicidad, importe, categoria, cargo } = req.body;
    if (!Array.isArray(cargo)) {
        return res.status(400).json({ error: 'El campo cargo es obligatorio y debe ser un array.' });
    }
    try {
        await pushRecibo(id, concepto, periodicidad, importe, categoria, cargo);
        res.status(201).json({ message: 'Recibo insertado o actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al insertar o actualizar el recibo: ${error.message}`, details: error.stack });
    }
});

// Definimos una ruta DELETE para eliminar recibos
router.delete('/:id', async (req, res) => {
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

export default router;
