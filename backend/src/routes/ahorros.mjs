import { Router } from 'express';
import { deleteSavings, getSavings, pushSaving } from '../db/db_utilsSav.mjs';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const savings = await getSavings();
        res.json(savings);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los ahorros' });
    }
});

router.post('/', async (req, res) => {
    const { id, concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo } = req.body;
    try {
        await pushSaving(id, concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo);
        res.status(201).json({ message: 'Ahorro insertado o actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al insertar o actualizar el ahorro: ${error.message}`, details: error.stack });
    }
});

router.delete('/', async (req, res) => {
    const { savings } = req.body;
    try {
        await deleteSavings(savings);
        res.status(200).json({ message: 'Ahorro(s) eliminado(s) correctamente' });
    } catch (error) {
        res.status(500).json({ error: `Error al eliminar el/los ahorro(s): ${error.message}`, details: error.stack });
    }
});

export default router;
