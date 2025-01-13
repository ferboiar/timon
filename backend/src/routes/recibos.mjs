// Importamos Router de express para crear rutas
import { Router } from 'express';
// Importamos las funciones getRecibos y pushRecibo desde el módulo db_utils.mjs
import { getRecibos, pushRecibo } from '../db/db_utils.mjs';

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

export default router;
