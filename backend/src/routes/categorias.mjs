/**
 * API para la gestión de categorías
 *
 * Este módulo proporciona endpoints para administrar las categorías utilizadas en la aplicación.
 * Las categorías sirven para clasificar recibos, gastos y otros elementos financieros.
 * Permite obtener todas las categorías existentes, crear nuevas categorías,
 * actualizar categorías existentes y eliminar categorías por ID o en lote.
 *
 * @module routes/categorias
 */

import { deleteCategorias, getCategorias, pushCategoria } from '#backend/db/db_utilsCats.mjs';
import { autorizar } from '#backend/middleware/auth.mjs';
import { responderError } from '../utils/errorDeNegocio.mjs';
import { Router } from 'express';

const router = Router();

router.get('/', autorizar('categorias', 'lectura'), async (req, res) => {
    try {
        const categorias = await getCategorias();
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las categorías' });
    }
});

router.post('/', autorizar('categorias', 'escritura'), async (req, res) => {
    const { id, nombre, descripcion } = req.body;
    if (!nombre) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }
    try {
        await pushCategoria(id, nombre, descripcion, req.user.id);
        res.status(201).json({ message: 'Categoría insertada o actualizada correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudo guardar la categoría.', { contexto: 'categorias - POST' });
    }
});

router.delete('/', autorizar('categorias', 'borrado'), async (req, res) => {
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
        responderError(res, error, 'No se pudieron eliminar las categorías.', { contexto: 'categorias - DELETE' });
    }
});

export default router;
