/**
 * Utilidades para la gestión de recibos en la base de datos
 *
 * Este módulo proporciona funciones para interactuar con las tablas 'recibos' y 'fechas_cargo'.
 * Incluye operaciones como obtener, crear, actualizar y eliminar recibos,
 * así como gestionar los filtros de búsqueda y validar valores permitidos.
 * Soporta filtrado por múltiples criterios como periodicidad, fecha, año, etc.
 *
 * @module db_utils
 */

import { getConnection } from './db_connection.mjs';

const validFilters = ['periodicidad', 'fecha', 'año', 'concepto', 'categoria', 'estado', 'activo'];

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
            SELECT r.*, c.nombre AS categoria, fc.id AS fc_id, fc.recibo_id, fc.fecha, fc.estado, fc.activo, fc.comentario
            FROM recibos r
            LEFT JOIN fechas_cargo fc ON r.id = fc.recibo_id
            LEFT JOIN categorias c ON r.categoria_id = c.id
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
            if (value !== undefined && value !== null) {
                // Cambiado para permitir valores false
                if (key === 'año') {
                    query += ' AND YEAR(fc.fecha) = ?';
                    params.push(value);
                } else if (key === 'fecha' && value.includes('a')) {
                    const [startDate, endDate] = value.split('a');
                    query += ' AND fc.fecha BETWEEN ? AND ?';
                    params.push(startDate, endDate);
                } else if (key === 'activo') {
                    // Convertir el valor a 1 o 0, independientemente de si viene como string, boolean o number
                    const numericValue = value === true || value === 'true' || value === 1 || value === '1' ? 1 : 0;
                    query += ' AND fc.activo = ?';
                    params.push(numericValue);
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

async function getValidValues(column, table = 'recibos') {
    let connection;
    try {
        connection = await getConnection();
        if (table === 'categorias') {
            const [rows] = await connection.execute(`SELECT nombre FROM categorias`);
            return rows.map((row) => row.nombre);
        } else {
            const [rows] = await connection.execute(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
            const enumValues = rows[0].Type.match(/enum\((.*)\)/)[1]
                .replace(/'/g, '')
                .split(',');
            return enumValues;
        }
    } catch (error) {
        console.error(`API. Error al obtener valores válidos para ${column} de la tabla ${table}:`, error);
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
 * @throws {Error} - Si falta algún parámetro obligatorio o si algún parámetro no es válido.
 */
async function pushRecibo(id, concepto, periodicidad, importe, categoria, cargo) {
    console.log('pushRecibo(). Parámetros recibidos:', { id, concepto, periodicidad, importe, categoria, cargo });
    // Verificar que todos los parámetros obligatorios estén presentes
    if (!concepto || !periodicidad || !importe || !categoria || !cargo || !Array.isArray(cargo)) {
        throw new Error('API. Los campos concepto, periodicidad, importe, categoria y cargo son obligatorios.');
    }

    const activo = cargo[0].activo; //guardo el valor de activo para luego actualizar todas las fechas de cargo, no sea que se borre al procesar el array
    // Filtrar elementos del array cargo que tienen fecha como null. Esas fechas no se deben insertar en la base de datos.
    if (periodicidad !== 'mensual') {
        cargo = cargo.filter((c) => c.fecha !== null);
    } else {
        // si es mensual, solo se debe insertar el primer array de cargo
        cargo = [cargo[0]];
    }
    console.log('pushRecibo(). Parámetros filtrados:', { id, concepto, periodicidad, importe, categoria, cargo });

    // Obtener valores válidos desde la base de datos
    const validCategorias = await getValidValues('nombre', 'categorias');
    const validPeriodicidades = await getValidValues('periodicidad');
    const validEstados = await getValidValues('estado', 'fechas_cargo');
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (typeof concepto !== 'string' || concepto.length > 30) {
        throw new Error('API. El concepto debe ser una cadena de texto de máximo 30 caracteres.');
    }
    if (!validPeriodicidades.includes(periodicidad)) {
        throw new Error(`API. La periodicidad debe ser una de las siguientes: ${validPeriodicidades.join(', ')}.`);
    }
    if (typeof importe !== 'number' || importe < 0) {
        throw new Error('API. El importe debe ser un número positivo.');
    }
    if (!validCategorias.includes(categoria)) {
        throw new Error(`API. La categoría debe ser una de las siguientes: ${validCategorias.join(', ')}.`);
    }
    for (const c of cargo) {
        if (c.fecha) {
            if (!dateRegex.test(new Date(c.fecha).toISOString().split('T')[0])) {
                throw new Error('API. La fecha debe estar en el formato YYYY-MM-DD.');
            }
        }
        if (!validEstados.includes(c.estado)) {
            throw new Error(`API. El estado del cargo debe ser uno de los siguientes: ${validEstados.join(', ')}.`);
        }
        if (c.activo === undefined || c.activo === null) {
            c.activo = 1; // Valor por defecto
        } else {
            // Convertir a 1 o 0 explícitamente
            c.activo = c.activo ? 1 : 0;
        }
    }

    let connection;
    try {
        connection = await getConnection();

        if (id) {
            // Comprobar si el recibo ya existe
            const [existingRecibo] = await connection.execute('SELECT * FROM recibos WHERE id = ?', [id]);

            if (existingRecibo.length > 0) {
                // Actualizar recibo existente
                const [updateResult] = await connection.execute('UPDATE recibos SET concepto = ?, periodicidad = ?, importe = ?, categoria_id = (SELECT id FROM categorias WHERE nombre = ?) WHERE id = ?', [
                    concepto,
                    periodicidad,
                    importe,
                    categoria,
                    id
                ]);

                // Traza para comprobar que el update se haya hecho correctamente
                console.log(`Update realizado correctamente en tabla recibos. Filas afectadas: ${updateResult.affectedRows}`);

                // Actualizar fechas de cargo
                for (const c of cargo) {
                    const f = new Date(c.fecha);
                    const fechaLocal = new Date(f.getTime() - f.getTimezoneOffset() * 60000);
                    const fecha = new Date(fechaLocal).toISOString().split('T')[0]; // Convertir fecha al formato YYYY-MM-DD

                    const [existingCargo] = await connection.execute('SELECT * FROM fechas_cargo WHERE id = ?', [c.id]);
                    const estado = c.estado === '' ? 'pendiente' : c.estado; // Si estado está vacío, se considera 'pendiente'
                    if (existingCargo.length > 0) {
                        // Actualizar si existe, incluyendo activo
                        const [updateCargoResult] = await connection.execute('UPDATE fechas_cargo SET estado = ?, comentario = ?, fecha = ?, activo = ? WHERE id = ?', [estado, c.comentario, fecha, c.activo, c.id]);
                        console.log(`Update realizado correctamente en tabla fechas_cargo. Filas afectadas: ${updateCargoResult.affectedRows}`);
                    } else {
                        // Insertar si no existe, incluyendo activo
                        await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, ?, ?, ?)', [id, fecha, estado, c.comentario, c.activo]);
                    }
                }

                // Actualizar el valor de activo para todas las fechas de cargo del recibo dado que activo
                // es un valor global para todas las fechas de cargo de un mismo recibo
                await connection.execute('UPDATE fechas_cargo SET activo = ? WHERE recibo_id = ?', [activo, id]);
            } else {
                throw new Error('API. El recibo con el ID especificado no existe.');
            }
        } else {
            // Insertar nuevo recibo
            const [result] = await connection.execute('INSERT INTO recibos (concepto, periodicidad, importe, categoria_id) VALUES (?, ?, ?, (SELECT id FROM categorias WHERE nombre = ?))', [concepto, periodicidad, importe, categoria]);
            const newReciboId = result.insertId;

            // Insertar fechas de cargo
            for (const c of cargo) {
                const estado = c.estado === '' ? 'pendiente' : c.estado;

                const f = new Date(c.fecha);
                const fechaLocal = new Date(f.getTime() - f.getTimezoneOffset() * 60000);
                const fecha = new Date(fechaLocal).toISOString().split('T')[0]; // Convertir fecha al formato YYYY-MM-DD

                //const fecha = new Date(c.fecha).toISOString().split('T')[0]; // Convertir fecha al formato YYYY-MM-DD
                await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, ?, ?, ?)', [newReciboId, fecha, estado, c.comentario, c.activo]);
            }
        }
    } catch (error) {
        console.error('API. Error al insertar o actualizar el recibo: ', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function deleteRecibo(id, fecha, periodicidad) {
    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        if (periodicidad === 'bimestral' || periodicidad === 'trimestral') {
            if (!fecha) {
                // Borrar todos los recibos de fechas_cargo con recibo_id = id
                await connection.query('DELETE FROM fechas_cargo WHERE recibo_id = ?', [id]);

                // Borrar todos los recibos de recibos con id = id
                const [result] = await connection.query('DELETE FROM recibos WHERE id = ?', [id]);
                await connection.commit();
                return result.affectedRows > 0;
            }
        }

        if (periodicidad !== 'mensual') {
            const fecha_formateada = fecha ? new Date(fecha).toISOString().split('T')[0] : null; // Convertir fecha al formato YYYY-MM-DD

            if (fecha_formateada) {
                // Eliminar recibo de la tabla fechas_cargo
                await connection.query('DELETE FROM fechas_cargo WHERE recibo_id = ? AND fecha = ?', [id, fecha_formateada]);
            } else {
                // Eliminar todos los recibos de fechas_cargo con recibo_id = id
                await connection.query('DELETE FROM fechas_cargo WHERE recibo_id = ?', [id]);
            }

            // Si no tiene más fechas de cargo eliminar el recibo de la tabla recibos
            const [remainingCargos] = await connection.query('SELECT COUNT(*) as count FROM fechas_cargo WHERE recibo_id = ?', [id]);
            if (remainingCargos[0].count === 0) {
                const [result] = await connection.query('DELETE FROM recibos WHERE id = ?', [id]);
                await connection.commit();
                return result.affectedRows > 0;
            } else {
                await connection.commit();
                return true;
            }
        } else {
            // Para recibos mensuales, eliminar las entradas en fechas_cargo y luego de la tabla recibos
            await connection.query('DELETE FROM fechas_cargo WHERE recibo_id = ?', [id]);
            const [result] = await connection.query('DELETE FROM recibos WHERE id = ?', [id]);
            await connection.commit();
            return result.affectedRows > 0;
        }
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('API. Error al eliminar el recibo: ', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { deleteRecibo, getRecibos, pushRecibo };
