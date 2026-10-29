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

async function pushCategoria(id, nombre, descripcion = null, propietario_id) {
    // DC-31: en la base de datos los nombres de categoría van en minúsculas; la pantalla los muestra con la primera letra en mayúscula
    nombre = typeof nombre === 'string' ? nombre.trim().toLowerCase() : nombre;
    let connection;
    try {
        connection = await getConnection();
        // F-22: el nombre no puede coincidir con el de otra categoría
        const [mismoNombre] = await connection.execute('SELECT id FROM categorias WHERE nombre = ?', [nombre]);
        if (mismoNombre.some((fila) => Number(fila.id) !== Number(id))) {
            console.log('pushCategoria - Rechazado: ya existe otra categoría con el nombre ' + nombre);
            throw new Error('Ya existe otra categoría con el nombre ' + nombre);
        }

        // F-09: con ID se edita esa categoría (también para renombrarla); sin ID se crea una nueva
        if (id) {
            const [existe] = await connection.execute('SELECT id, nombre FROM categorias WHERE id = ?', [id]);
            if (existe.length === 0) {
                console.log('pushCategoria - Rechazado: la categoría con ID ' + id + ' no existe');
                throw new Error('Categoría con ID ' + id + ' no encontrada');
            }
            // Actualizar categoría existente por ID
            console.log(`pushCategoria - Categoría ${id}: nombre ${existe[0].nombre} -> ${nombre}`);
            const [updateResult] = await connection.execute('UPDATE categorias SET nombre = ?, descripcion = COALESCE(?, descripcion) WHERE id = ?', [nombre, descripcion, id]);
            console.log(`Update realizado correctamente en tabla categorias. Filas afectadas: ${updateResult.affectedRows}`);
        } else {
            // Insertar nueva categoría
            if (!propietario_id) throw new Error('Falta el propietario para crear la categoría');
            console.log(`pushCategoria - Nueva categoría: ${nombre || 'Sin nombre'}`);
            const [insertResult] = await connection.execute('INSERT INTO categorias (nombre, descripcion, propietario_id) VALUES (?, ?, ?)', [nombre || 'Sin nombre', descripcion, propietario_id]);
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
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            console.log('deleteCategorias - Rechazado: categorías en uso: ' + categoriaIds.join(', '));
            throw new Error('No se puede eliminar la categoría porque está en uso (recibos, presupuestos u otros registros)');
        }
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { deleteCategorias, getCategorias, pushCategoria };
