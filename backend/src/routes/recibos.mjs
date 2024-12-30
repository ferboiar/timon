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
    const { fecha, concepto, periodicidad, importe, categoria } = req.body;
    try {
        await pushRecibo(fecha, concepto, periodicidad, importe, categoria);
        res.status(201).json({ message: 'Recibo insertado correctamente' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
