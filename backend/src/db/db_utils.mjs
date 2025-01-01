import { getConnection } from './db_connection.mjs';

const validFilters = ['periodicidad', 'fecha', 'año', 'concepto', 'categoria'];

/**
 * Formatea una fecha en formato ISO 8601 a dd/mm/yy
 * @param {string} isoDate - Fecha en formato ISO 8601
 * @returns {string} - Fecha formateada en dd/mm/yy
 */
function formatDate(isoDate) {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}

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

        console.log('API. Consulta construida:', query);
        console.log('API. Parámetros de la consulta:', params);

        const [rows] = await connection.execute(query, params);

        // Formatear las fechas en los resultados
        return rows.map((row) => {
            if (row.fecha) {
                row.fecha = formatDate(row.fecha);
            }
            return row;
        });
    } catch (error) {
        console.error('API. Error al obtener los recibos:', error);
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
