import { Router } from 'express';
import { deleteCategorias, getCategorias, pushCategoria } from '../db/db_utilsCats.mjs';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const categorias = await getCategorias();
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las categorías' });
    }
});

router.post('/', async (req, res) => {
    const { nombre, descripcion } = req.body;
    try {
        await pushCategoria(nombre, descripcion);
        res.status(201).json({ message: 'Categoría insertada o actualizada correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al insertar o actualizar la categoría: ${error.message}`, details: error.stack });
    }
});

router.delete('/', async (req, res) => {
    const { categorias } = req.body;
    try {
        await deleteCategorias(categorias);
        res.status(200).json({ message: 'Categoría(s) eliminada(s) correctamente' });
    } catch (error) {
        res.status(500).json({ error: `Error al eliminar la(s) categoría(s): ${error.message}`, details: error.stack });
    }
});

export default router;
