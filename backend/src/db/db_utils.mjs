import { getConnection } from './db_connection.mjs';

const validFilters = ['periodicidad', 'fecha', 'año', 'concepto', 'categoria'];

async function getRecibos(filters) {
    let connection;
    try {
        connection = await getConnection();
        let query = 'SELECT * FROM recibos WHERE 1=1';
        const params = [];

        for (const [key, value] of Object.entries(filters)) {
            if (value) {
                if (!validFilters.includes(key)) {
                    throw new Error(`Filtro no válido: ${key}. Filtros válidos: ${validFilters.join(', ')}`);
                }
                if (key === 'año') {
                    query += ' AND YEAR(fecha) = ?';
                } else {
                    query += ` AND ${key} = ?`;
                }
                params.push(value);
            }
        }

        const [rows] = await connection.execute(query, params);
        return rows;
    } catch (error) {
        console.error('Error al obtener los recibos:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { getRecibos };
