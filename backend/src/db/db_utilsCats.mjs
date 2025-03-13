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
            const [insertResult] = await connection.execute('INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion]);
            console.log(`Insert realizado correctamente en tabla categorias. Filas afectadas: ${insertResult.affectedRows}`);
        }
    } catch (error) {
        console.error('Error al insertar o actualizar la categoría:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function deleteCategorias(categorias) {
    let connection;
    try {
        connection = await getConnection();
        if (!Array.isArray(categorias)) {
            categorias = [categorias];
        }
        console.log('Categorías a eliminar:', categorias);
        const [deleteResult] = await connection.execute('DELETE FROM categorias WHERE nombre IN (?)', [categorias]);
        console.log(`Delete realizado correctamente en tabla categorias. Filas afectadas: ${deleteResult.affectedRows}`);
    } catch (error) {
        console.error('Error al eliminar las categorías:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { deleteCategorias, getCategorias, pushCategoria };
