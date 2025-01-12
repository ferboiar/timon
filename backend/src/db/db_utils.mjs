import { getConnection } from './db_connection.mjs';

const validFilters = ['periodicidad', 'fecha', 'año', 'concepto', 'categoria', 'estado'];

/**
 * Obtiene los recibos de la base de datos según los filtros proporcionados.
 * Si no se proporcionan filtros, devuelve todos los recibos.
 * Si se proporciona un filtro no válido, lanza un error.
 * Puede manejar rangos de fechas si el filtro 'fecha' contiene dos fechas separadas por la 'a'.
 * Ej.: http://127.0.0.1:3000/api/recibos?fecha=2024-09-01a2024-12-01
 * @param {Object} filters - Filtros para aplicar a la consulta.
 * @returns {Array} - Lista de recibos que cumplen con los filtros.
 */
async function getRecibos(filters) {
    let connection;
    try {
        connection = await getConnection();
        let query = `
            SELECT r.*, fc.fecha, fc.estado, fc.comentario
            FROM recibos r
            JOIN fechas_cargo fc ON r.id = fc.recibo_id
            WHERE 1=1
        `;
        const params = [];

        console.log('API. Parámetros recibidos:', filters);

        // Eliminar el parámetro vscodeBrowserReqId si está presente
        delete filters.vscodeBrowserReqId;

        // Validar filtros antes de construir la consulta
        for (const key of Object.keys(filters)) {
            if (!validFilters.includes(key) && key !== 'fecha') {
                throw new Error(`API. Filtro no válido: ${key}. Filtros válidos: ${validFilters.join(', ')}`);
            }
        }

        // Construir la consulta basada en los filtros válidos
        for (const [key, value] of Object.entries(filters)) {
            if (value) {
                if (key === 'año') {
                    query += ' AND YEAR(fc.fecha) = ?';
                    params.push(value);
                } else if (key === 'fecha' && value.includes('a')) {
                    const [startDate, endDate] = value.split('a');
                    query += ' AND fc.fecha BETWEEN ? AND ?';
                    params.push(startDate, endDate);
                } else if (validFilters.includes(key)) {
                    query += ` AND ${key === 'estado' ? 'fc.' : 'r.'}${key} = ?`;
                    params.push(value);
                }
            }
        }

        console.log('API. Consulta construida:', query);
        console.log('API. Parámetros de la consulta:', params);

        const [rows] = await connection.execute(query, params);

        return rows;
    } catch (error) {
        console.error('API. Error al obtener los recibos:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Inserta o actualiza un recibo en la base de datos.
 *
 * @param {number} id - El ID del recibo.
 * @param {string} concepto - El concepto del recibo.
 * @param {string} periodicidad - La periodicidad del recibo.
 * @param {number} importe - El importe del recibo.
 * @param {string} categoria - La categoría del recibo.
 * @param {Array} cargo - Un array de objetos que contiene fecha, estado y comentario.
 * @throws {Error} - Si falta algún parámetro obligatorio.
 */
async function pushRecibo(id, concepto, periodicidad, importe, categoria, cargo) {
    // Verificar que todos los parámetros obligatorios estén presentes
    if (!concepto || !periodicidad || !importe || !categoria || !cargo || !Array.isArray(cargo)) {
        throw new Error('Los campos concepto, periodicidad, importe, categoria y cargo son obligatorios.');
    }

    let connection;
    try {
        connection = await getConnection();

        if (id) {
            // Comprobar si el recibo ya existe
            const [existingRecibo] = await connection.execute('SELECT * FROM recibos WHERE id = ?', [id]);

            if (existingRecibo.length > 0) {
                // Actualizar recibo existente
                await connection.execute('UPDATE recibos SET concepto = ?, periodicidad = ?, importe = ?, categoria = ? WHERE id = ?', [concepto, periodicidad, importe, categoria, id]);

                // Actualizar fechas de cargo
                for (const c of cargo) {
                    const [existingCargo] = await connection.execute('SELECT * FROM fechas_cargo WHERE recibo_id = ? AND fecha = ?', [id, c.fecha]);
                    if (existingCargo.length > 0) {
                        //actualiza si existe
                        await connection.execute('UPDATE fechas_cargo SET estado = ?, comentario = ? WHERE recibo_id = ? AND fecha = ?', [c.estado, c.comentario, id, c.fecha]);
                    } else {
                        //insertar si no existe
                        await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario) VALUES (?, ?, ?, ?)', [id, c.fecha, c.estado, c.comentario]);
                    }
                }
            } else {
                throw new Error('El recibo con el ID especificado no existe.');
            }
        } else {
            // Insertar nuevo recibo
            const [result] = await connection.execute('INSERT INTO recibos (concepto, periodicidad, importe, categoria) VALUES (?, ?, ?, ?)', [concepto, periodicidad, importe, categoria]);

            const newReciboId = result.insertId;

            // Insertar fechas de cargo
            for (const c of cargo) {
                await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario) VALUES (?, ?, ?, ?)', [newReciboId, c.fecha, c.estado, c.comentario]);
            }
        }
    } catch (error) {
        console.error('API. Error al insertar o actualizar el recibo:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { getRecibos, pushRecibo };
