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
    if (!nombre) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }
    try {
        await pushCategoria(nombre, descripcion);
        res.status(201).json({ message: 'Categoría insertada o actualizada correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al insertar o actualizar la categoría: ${error.message}`, details: error.stack });
    }
});

router.delete('/', async (req, res) => {
    let { categoriaIds } = req.body;
    // Si recibimos un objeto con una propiedad categoriaIds, extraemos el array
    if (categoriaIds && typeof categoriaIds === 'object' && 'categoriaIds' in categoriaIds) {
        categoriaIds = categoriaIds.categoriaIds;
    }
    if (!categoriaIds) {
        return res.status(400).json({
            error: 'No se han proporcionado IDs de categorías',
            received: categoriaIds
        });
    }

    if (!Array.isArray(categoriaIds)) {
        return res.status(400).json({
            error: 'El parámetro categoriaIds debe ser un array',
            received: {
                type: typeof categoriaIds,
                value: categoriaIds
            }
        });
    }

    if (categoriaIds.length === 0) {
        return res.status(400).json({
            error: 'La lista de IDs no puede estar vacía',
            received: categoriaIds
        });
    }
    try {
        const numericCategoriaIds = categoriaIds.map(Number); // Asegurarse de que todos los IDs sean números
        await deleteCategorias(numericCategoriaIds);
        res.status(200).json({ message: 'Categoría(s) eliminada(s) correctamente' });
    } catch (error) {
        res.status(500).json({ error: `Error al eliminar la(s) categoría(s): ${error.message}`, details: error.stack });
    }
});

export default router;
