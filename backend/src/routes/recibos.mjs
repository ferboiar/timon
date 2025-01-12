import { Router } from 'express';
import { getRecibos, pushRecibo } from '../db/db_utils.mjs';

const router = Router();

router.get('/', async (req, res) => {
    const filters = req.query;
    try {
        const recibos = await getRecibos(filters);
        res.json(recibos);
    } catch (error) {
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
