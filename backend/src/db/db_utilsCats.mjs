/**
 * Utilidades para la gestión de categorías en la base de datos
 *
 * Este módulo proporciona funciones para interactuar con la tabla 'categorias' de la base de datos.
 * Incluye operaciones como obtener todas las categorías (con gestión especial para la categoría "Otros"),
 * crear o actualizar categorías, y eliminar categorías mediante sus identificadores.
 * Las categorías se utilizan para clasificar los recibos y otros elementos del sistema.
 *
 * @module db_utilsCats
 */

import { getConnection } from './db_connection.mjs';

async function getCategorias() {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM categorias ORDER BY nombre ASC');
        // Mover "Otros" al final del resultado
        const otrosIndex = rows.findIndex((row) => row.nombre.toLowerCase() === 'otros');
        if (otrosIndex !== -1) {
            const otros = rows.splice(otrosIndex, 1)[0];
            rows.push(otros);
        }
        return rows;
    } catch (error) {
        console.error('Error al obtener las categorías:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function pushCategoria(nombre, descripcion = null) {
    let connection;
    try {
        connection = await getConnection();
        const [existingCategoria] = await connection.execute('SELECT * FROM categorias WHERE nombre = ?', [nombre]);

        if (existingCategoria.length > 0) {
            // Actualizar categoría existente
            const [updateResult] = await connection.execute('UPDATE categorias SET descripcion = COALESCE(?, descripcion) WHERE nombre = ?', [descripcion, nombre]);
            console.log(`Update realizado correctamente en tabla categorias. Filas afectadas: ${updateResult.affectedRows}`);
        } else {
            // Insertar nueva categoría
            const [insertResult] = await connection.execute('INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)', [nombre || 'Sin nombre', descripcion]);
            console.log(`Insert realizado correctamente en tabla categorias. Filas afectadas: ${insertResult.affectedRows}`);
        }
    } catch (error) {
        console.error('Error al insertar o actualizar la categoría:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function deleteCategorias(categoriaIds) {
    let connection;
    try {
        connection = await getConnection();
        if (!Array.isArray(categoriaIds)) {
            categoriaIds = [categoriaIds];
        }
        categoriaIds = categoriaIds.map(Number); // Asegurarse de que todos los IDs sean números
        console.log('API. Categorías a eliminar:', categoriaIds);
        const placeholders = categoriaIds.map(() => '?').join(','); // Crear placeholders para cada ID
        const [deleteResult] = await connection.execute(`DELETE FROM categorias WHERE id IN (${placeholders})`, categoriaIds); // Pasar los IDs como una lista
        console.log(`API. Delete realizado correctamente en tabla categorias. Filas afectadas: ${deleteResult.affectedRows}`);
    } catch (error) {
        console.error('API. Error al eliminar las categorías:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { deleteCategorias, getCategorias, pushCategoria };
