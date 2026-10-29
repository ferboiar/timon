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

async function pushSaving(id, concepto, descripcion = null, ahorrado = 0, fecha_objetivo = null, periodicidad = null, importe_periodico, activo = 1, propietario_id) {
    let connection;
    let enTransaccion = false;
    try {
        connection = await getConnection();

        // DC-31/F-44: el concepto se guarda en minúsculas; la pantalla lo capitaliza al mostrarlo
        const conceptoOriginal = concepto;
        concepto = typeof concepto === 'string' ? concepto.trim().toLowerCase() : concepto;
        if (conceptoOriginal !== concepto) {
            console.log(`pushSaving - Concepto normalizado a minúsculas: ${JSON.stringify(conceptoOriginal)} -> ${JSON.stringify(concepto)}`);
        }

        if (id) {
            if (Number.isNaN(Number(ahorrado))) {
                throw new Error('El importe ahorrado no es válido');
            }

            // Actualizar ahorro existente: ahorrado solo se puede cambiar a mano mientras no tenga movimientos
            await connection.beginTransaction();
            enTransaccion = true;

            const [actual] = await connection.execute('SELECT ahorrado FROM ahorros WHERE id = ? FOR UPDATE', [id]);
            if (actual.length === 0) {
                throw new Error(`Ahorro con ID ${id} no encontrado`);
            }
            const [conteo] = await connection.execute('SELECT COUNT(*) AS n FROM ahorros_movimientos WHERE ahorro_id = ?', [id]);
            const numMovimientos = Number(conteo[0].n);
            const ahorradoActual = actual[0].ahorrado;
            const cambiaAhorrado = Math.round(Number(ahorrado) * 100) !== Math.round(Number(ahorradoActual ?? 0) * 100);

            if (numMovimientos > 0 && cambiaAhorrado) {
                console.log(`pushSaving - Rechazado: el ahorro ${id} tiene ${numMovimientos} movimientos y no se puede modificar ahorrado (actual ${ahorradoActual}, recibido ${ahorrado})`);
                throw new Error('No se puede modificar el importe ahorrado de un ahorro con movimientos; añade un movimiento positivo o negativo');
            }
            if (cambiaAhorrado) {
                console.log(`pushSaving - Ahorro ${id} sin movimientos: valor inicial de ahorrado ${ahorradoActual} -> ${ahorrado}`);
            }

            const ahorradoFinal = numMovimientos > 0 ? ahorradoActual : ahorrado;
            const [updateResult] = await connection.execute('UPDATE ahorros SET concepto = ?, descripcion = COALESCE(?, descripcion), ahorrado = ?, fecha_objetivo = ?, periodicidad = ?, importe_periodico = ?, activo = ? WHERE id = ?', [
                concepto,
                descripcion,
                ahorradoFinal,
                fecha_objetivo,
                periodicidad,
                importe_periodico,
                activo,
                id
            ]);
            console.log(`Update realizado correctamente en tabla ahorros. Filas afectadas: ${updateResult.affectedRows}`);

            await connection.commit();
            enTransaccion = false;
            console.log(`pushSaving - Transacción confirmada para el ahorro ${id}`);
        } else {
            // Insertar nuevo ahorro
            if (!propietario_id) throw new Error('Falta el propietario para crear el ahorro');
            console.log(`pushSaving - Nuevo ahorro: ${concepto}, valor inicial de ahorrado ${ahorrado}`);
            const [insertResult] = await connection.execute('INSERT INTO ahorros (concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo, propietario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                concepto,
                descripcion,
                ahorrado,
                fecha_objetivo,
                periodicidad,
                importe_periodico,
                activo,
                propietario_id
            ]);
            console.log(`Insert realizado correctamente en tabla ahorros. Filas afectadas: ${insertResult.affectedRows}`);
        }
    } catch (error) {
        if (connection && enTransaccion) {
            try {
                await connection.rollback();
                console.log('pushSaving - Transacción revertida: no se ha guardado ningún cambio');
            } catch (rollbackError) {
                console.error('pushSaving - Error al revertir la transacción:', rollbackError);
            }
        }
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
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            console.log('deleteSavings - Rechazado: el ahorro tiene registros asociados: ' + String(savings));
            throw new Error('No se puede eliminar el ahorro porque tiene registros asociados');
        }
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
    let enTransaccion = false;
    try {
        connection = await getConnection();

        if (!fecha || !tipo) {
            throw new Error('Faltan campos obligatorios: fecha y tipo');
        }
        if (importe === undefined || importe === null || Number.isNaN(Number(importe))) {
            throw new Error('El importe del movimiento no es válido');
        }

        // El movimiento y el ajuste de ahorrado se guardan juntos o no se guarda nada
        await connection.beginTransaction();
        enTransaccion = true;

        let ahorroId = ahorro_id;
        let diferencia = Number(importe);

        if (id) {
            // Bloquear el movimiento y tomar de la base de datos su ahorro y su importe anterior
            const [anterior] = await connection.execute('SELECT ahorro_id, importe FROM ahorros_movimientos WHERE id = ? FOR UPDATE', [id]);
            if (anterior.length === 0) {
                throw new Error('Movimiento no encontrado');
            }
            ahorroId = anterior[0].ahorro_id;
            const importeAnterior = anterior[0].importe;
            diferencia = Math.round((Number(importe) - Number(importeAnterior)) * 100) / 100;
            console.log(`pushMovimiento - Editando el movimiento ID ${id} del ahorro ${ahorroId}: importe ${importeAnterior} -> ${importe} (diferencia ${diferencia.toFixed(2)})`);

            const [updateResult] = await connection.execute('UPDATE ahorros_movimientos SET importe = ?, fecha = ?, tipo = ?, descripcion = COALESCE(?, descripcion) WHERE id = ?', [importe, fecha, tipo, descripcion, id]);
            console.log(`Update realizado correctamente en tabla ahorros_movimientos. Filas afectadas: ${updateResult.affectedRows}`);
        } else {
            console.log(`pushMovimiento - Nuevo movimiento del ahorro ${ahorroId}: importe ${importe}, fecha ${fecha}, tipo ${tipo}`);
            const [insertResult] = await connection.execute('INSERT INTO ahorros_movimientos (ahorro_id, importe, fecha, tipo, descripcion) VALUES (?, ?, ?, ?, ?)', [ahorro_id, importe, fecha, tipo, descripcion]);
            console.log(`Insert realizado correctamente en tabla ahorros_movimientos. Filas afectadas: ${insertResult.affectedRows}`);
        }

        // Actualizar ahorrado solo con la diferencia que aporta este movimiento
        const [updateAhorroResult] = await connection.execute('UPDATE ahorros SET ahorrado = COALESCE(ahorrado, 0) + ? WHERE id = ?', [diferencia, ahorroId]);
        if (updateAhorroResult.affectedRows === 0) {
            throw new Error(`Ahorro con ID ${ahorroId} no encontrado`);
        }
        console.log(`Update realizado correctamente en tabla ahorros. Filas afectadas: ${updateAhorroResult.affectedRows} (ahorrado ${diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)})`);

        await connection.commit();
        enTransaccion = false;
        console.log(`pushMovimiento - Transacción confirmada para el ahorro ${ahorroId}`);
    } catch (error) {
        if (connection && enTransaccion) {
            try {
                await connection.rollback();
                console.log('pushMovimiento - Transacción revertida: no se ha guardado ningún cambio');
            } catch (rollbackError) {
                console.error('pushMovimiento - Error al revertir la transacción:', rollbackError);
            }
        }
        console.error('Error al insertar o actualizar el movimiento:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function deleteMovimiento(id) {
    let connection;
    let enTransaccion = false;
    try {
        connection = await getConnection();
        await connection.beginTransaction();
        enTransaccion = true;

        // Obtener el importe del movimiento antes de eliminarlo
        const [movimiento] = await connection.execute('SELECT ahorro_id, importe FROM ahorros_movimientos WHERE id = ? FOR UPDATE', [id]);
        if (movimiento.length === 0) {
            throw new Error('Movimiento no encontrado');
        }

        const { ahorro_id, importe } = movimiento[0];
        console.log(`deleteMovimiento - Eliminando el movimiento ID ${id} del ahorro ${ahorro_id} (importe ${importe})`);

        // Eliminar el movimiento
        const [deleteResult] = await connection.execute('DELETE FROM ahorros_movimientos WHERE id = ?', [id]);
        console.log(`Delete realizado correctamente en tabla ahorros_movimientos. Filas afectadas: ${deleteResult.affectedRows}`);

        // Actualizar el valor de ahorrado en la tabla ahorros
        const [updateAhorroResult] = await connection.execute('UPDATE ahorros SET ahorrado = COALESCE(ahorrado, 0) - ? WHERE id = ?', [importe, ahorro_id]);
        const variacion = -Number(importe);
        console.log(`Update realizado correctamente en tabla ahorros. Filas afectadas: ${updateAhorroResult.affectedRows} (ahorrado ${variacion >= 0 ? '+' : ''}${variacion.toFixed(2)})`);

        await connection.commit();
        enTransaccion = false;
        console.log(`deleteMovimiento - Transacción confirmada para el ahorro ${ahorro_id}`);
    } catch (error) {
        if (connection && enTransaccion) {
            try {
                await connection.rollback();
                console.log('deleteMovimiento - Transacción revertida: no se ha guardado ningún cambio');
            } catch (rollbackError) {
                console.error('deleteMovimiento - Error al revertir la transacción:', rollbackError);
            }
        }
        console.error('Error al eliminar el movimiento:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { deleteMovimiento, deleteSavings, getMovimientos, getPeriodicidades, getSavings, pushMovimiento, pushSaving };
