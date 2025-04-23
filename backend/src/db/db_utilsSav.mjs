/**
 * Utilidades para la gestión de ahorros en la base de datos
 *
 * Este módulo proporciona funciones para interactuar con las tablas 'ahorros' y 'ahorros_movimientos'.
 * Incluye operaciones como obtener todos los ahorros, gestionar sus movimientos asociados,
 * crear o actualizar objetivos de ahorro, eliminar ahorros, y obtener las periodicidades disponibles.
 * Permite un seguimiento detallado del progreso de ahorro con registros de depósitos y retiros.
 *
 * @module db_utilsSav
 */

import { getConnection } from './db_connection.mjs';

async function getSavings() {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM ahorros ORDER BY concepto ASC');
        return rows;
    } catch (error) {
        console.error('Error al obtener los ahorros:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function pushSaving(id, concepto, descripcion = null, ahorrado = 0, fecha_objetivo = null, periodicidad = null, importe_periodico, activo = 1) {
    let connection;
    try {
        connection = await getConnection();

        if (id) {
            // Actualizar ahorro existente
            const [updateResult] = await connection.execute('UPDATE ahorros SET concepto = ?, descripcion = COALESCE(?, descripcion), ahorrado = ?, fecha_objetivo = ?, periodicidad = ?, importe_periodico = ?, activo = ? WHERE id = ?', [
                concepto,
                descripcion,
                ahorrado,
                fecha_objetivo,
                periodicidad,
                importe_periodico,
                activo,
                id
            ]);
            console.log(`Update realizado correctamente en tabla ahorros. Filas afectadas: ${updateResult.affectedRows}`);
        } else {
            // Insertar nuevo ahorro
            const [insertResult] = await connection.execute('INSERT INTO ahorros (concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                concepto,
                descripcion,
                ahorrado,
                fecha_objetivo,
                periodicidad,
                importe_periodico,
                activo
            ]);
            console.log(`Insert realizado correctamente en tabla ahorros. Filas afectadas: ${insertResult.affectedRows}`);
        }
    } catch (error) {
        console.error('Error al insertar o actualizar el ahorro:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function deleteSavings(savings) {
    let connection;
    try {
        connection = await getConnection();
        if (!Array.isArray(savings)) {
            savings = [savings];
        }
        console.log('Ahorros a eliminar:', savings);
        const placeholders = savings.map(() => '?').join(',');
        const [deleteResult] = await connection.execute(`DELETE FROM ahorros WHERE id IN (${placeholders})`, savings);
        console.log(`Delete realizado correctamente en tabla ahorros. Filas afectadas: ${deleteResult.affectedRows}`);
    } catch (error) {
        console.error('Error al eliminar los ahorros:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function getPeriodicidades() {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute("SHOW COLUMNS FROM ahorros LIKE 'periodicidad'");
        return rows[0].Type.match(/enum\(([^)]+)\)/)[1]
            .split(',')
            .map((value) => value.replace(/'/g, ''));
    } catch (error) {
        console.error('Error al obtener las periodicidades:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function getMovimientos(ahorroId) {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM ahorros_movimientos WHERE ahorro_id = ? ORDER BY fecha ASC', [ahorroId]);
        return rows;
    } catch (error) {
        console.error('Error al obtener los movimientos:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function pushMovimiento(id, ahorro_id, importe, fecha, tipo, descripcion = null) {
    let connection;
    try {
        connection = await getConnection();

        if (!fecha || !tipo) {
            throw new Error('Faltan campos obligatorios: fecha y tipo');
        }

        if (id) {
            // Actualizar movimiento existente
            const [updateResult] = await connection.execute('UPDATE ahorros_movimientos SET importe = ?, fecha = ?, tipo = ?, descripcion = COALESCE(?, descripcion) WHERE id = ?', [importe, fecha, tipo, descripcion, id]);
            console.log(`Update realizado correctamente en tabla ahorros_movimientos. Filas afectadas: ${updateResult.affectedRows}`);
        } else {
            // Insertar nuevo movimiento
            const [insertResult] = await connection.execute('INSERT INTO ahorros_movimientos (ahorro_id, importe, fecha, tipo, descripcion) VALUES (?, ?, ?, ?, ?)', [ahorro_id, importe, fecha, tipo, descripcion]);
            console.log(`Insert realizado correctamente en tabla ahorros_movimientos. Filas afectadas: ${insertResult.affectedRows}`);
        }

        // Actualizar el valor de ahorrado en la tabla ahorros
        const [updateAhorroResult] = await connection.execute('UPDATE ahorros SET ahorrado = ahorrado + ? WHERE id = ?', [importe, ahorro_id]);
        console.log(`Update realizado correctamente en tabla ahorros. Filas afectadas: ${updateAhorroResult.affectedRows}`);
    } catch (error) {
        console.error('Error al insertar o actualizar el movimiento:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function deleteMovimiento(id) {
    let connection;
    try {
        connection = await getConnection();

        // Obtener el importe del movimiento antes de eliminarlo
        const [movimiento] = await connection.execute('SELECT ahorro_id, importe FROM ahorros_movimientos WHERE id = ?', [id]);
        if (movimiento.length === 0) {
            throw new Error('Movimiento no encontrado');
        }

        const { ahorro_id, importe } = movimiento[0];

        // Eliminar el movimiento
        const [deleteResult] = await connection.execute('DELETE FROM ahorros_movimientos WHERE id = ?', [id]);
        console.log(`Delete realizado correctamente en tabla ahorros_movimientos. Filas afectadas: ${deleteResult.affectedRows}`);

        // Actualizar el valor de ahorrado en la tabla ahorros
        const [updateAhorroResult] = await connection.execute('UPDATE ahorros SET ahorrado = ahorrado - ? WHERE id = ?', [importe, ahorro_id]);
        console.log(`Update realizado correctamente en tabla ahorros. Filas afectadas: ${updateAhorroResult.affectedRows}`);
    } catch (error) {
        console.error('Error al eliminar el movimiento:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { deleteMovimiento, deleteSavings, getMovimientos, getPeriodicidades, getSavings, pushMovimiento, pushSaving };
