import { getConnection } from './db_connection.mjs';

const validFilters = ['periodicidad', 'fecha', 'año', 'concepto', 'categoria'];

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
        let query = 'SELECT * FROM recibos WHERE 1=1';
        const params = [];

        console.log('Parámetros recibidos:', filters);

        // Eliminar el parámetro vscodeBrowserReqId si está presente
        delete filters.vscodeBrowserReqId;

        console.log('Parámetros procesados:', filters);

        // Validar filtros antes de construir la consulta
        for (const key of Object.keys(filters)) {
            if (!validFilters.includes(key) && key !== 'fecha') {
                throw new Error(`Filtro no válido: ${key}. Filtros válidos: ${validFilters.join(', ')}`);
            }
        }

        // Construir la consulta basada en los filtros válidos
        for (const [key, value] of Object.entries(filters)) {
            if (value) {
                if (key === 'año') {
                    query += ' AND YEAR(fecha) = ?';
                    params.push(value);
                } else if (key === 'fecha' && value.includes('a')) {
                    const [startDate, endDate] = value.split('a');
                    query += ' AND fecha BETWEEN ? AND ?';
                    params.push(startDate, endDate);
                } else if (validFilters.includes(key)) {
                    query += ` AND ${key} = ?`;
                    params.push(value);
                }
            }
        }

        console.log('Consulta construida:', query);
        console.log('Parámetros de la consulta:', params);

        const [rows] = await connection.execute(query, params);
        return rows;
    } catch (error) {
        console.error('Error al obtener los recibos:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Inserta un nuevo recibo en la base de datos.
 *
 * @param {string} fecha - La fecha del recibo.
 * @param {string} concepto - El concepto del recibo.
 * @param {string} periodicidad - La periodicidad del recibo.
 * @param {number} importe - El importe del recibo.
 * @param {string} [categoria=null] - La categoría del recibo (opcional).
 * @throws {Error} - Si falta algún parámetro obligatorio.
 */
async function pushRecibo(fecha, concepto, periodicidad, importe, categoria = null) {
    // Verificar que todos los parámetros obligatorios estén presentes
    if (!fecha || !concepto || !periodicidad || !importe) {
        throw new Error("Los parámetros 'fecha', 'concepto', 'periodicidad' e 'importe' son obligatorios.");
    }

    let connection;
    try {
        connection = await getConnection();
        const query = `
            INSERT INTO recibos (fecha, concepto, categoria, periodicidad, importe)
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [fecha, concepto, categoria, periodicidad, importe];
        await connection.execute(query, params);
    } catch (error) {
        console.error('Error al insertar el recibo:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { getRecibos, pushRecibo };
