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
import { ErrorDeNegocio } from '../utils/errorDeNegocio.mjs';
import { esErrorDeReferencia } from '../utils/catalogoErrores.mjs';

/**
 * Bloquea la fila del ahorro hasta el final de la transacción (SELECT … FOR UPDATE, DC-39) y devuelve true si existe.
 * Las operaciones que modifican un movimiento empiezan por aquí: se bloquea primero el padre y después se lee el hijo,
 * en ese orden, para que dos transacciones no puedan bloquearse mutuamente (S-26).
 */
async function bloquearAhorro(connection, ahorroId) {
    const [filas] = await connection.execute('SELECT id FROM ahorros WHERE id = ? FOR UPDATE', [ahorroId]);
    return filas.length > 0;
}

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

async function pushSaving(id, concepto, descripcion = null, ahorrado = 0, fecha_objetivo = null, periodicidad = null, importe_periodico, activo = 1, propietario_id, es_privado = null, usuarioId = null) {
    let connection;
    let enTransaccion = false;
    // S-01/DC-48: null conserva la privacidad en la edición; 0 pública; 1 solo propietario y admin
    const valorPrivado = es_privado === undefined || es_privado === null || es_privado === '' ? null : Number(es_privado) === 1 ? 1 : 0;

    // F-52: mysql2 no acepta undefined; los campos opcionales se guardan como NULL.
    descripcion = descripcion ?? null;
    fecha_objetivo = fecha_objetivo ?? null;
    periodicidad = periodicidad ?? null;
    importe_periodico = importe_periodico ?? null;
    usuarioId = usuarioId ?? null;
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
                throw new ErrorDeNegocio('El importe ahorrado no es válido');
            }

            // Actualizar ahorro existente: ahorrado solo se puede cambiar a mano mientras no tenga movimientos
            await connection.beginTransaction();
            enTransaccion = true;

            const [actual] = await connection.execute('SELECT ahorrado FROM ahorros WHERE id = ? FOR UPDATE', [id]);
            if (actual.length === 0) {
                throw new ErrorDeNegocio(`Ahorro con ID ${id} no encontrado`, 404);
            }
            const [conteo] = await connection.execute('SELECT COUNT(*) AS n FROM ahorros_movimientos WHERE ahorro_id = ?', [id]);
            const numMovimientos = Number(conteo[0].n);
            const ahorradoActual = actual[0].ahorrado;
            const cambiaAhorrado = Math.round(Number(ahorrado) * 100) !== Math.round(Number(ahorradoActual ?? 0) * 100);

            if (numMovimientos > 0 && cambiaAhorrado) {
                console.log(`pushSaving - Rechazado: el ahorro ${id} tiene ${numMovimientos} movimientos y no se puede modificar ahorrado (actual ${ahorradoActual}, recibido ${ahorrado})`);
                throw new ErrorDeNegocio('No se puede modificar el importe ahorrado de un ahorro con movimientos; añade un movimiento positivo o negativo', 409);
            }
            if (cambiaAhorrado) {
                console.log(`pushSaving - Ahorro ${id} sin movimientos: valor inicial de ahorrado ${ahorradoActual} -> ${ahorrado}`);
            }

            const ahorradoFinal = numMovimientos > 0 ? ahorradoActual : ahorrado;
            await connection.execute('UPDATE ahorros SET concepto = ?, descripcion = COALESCE(?, descripcion), ahorrado = ?, fecha_objetivo = ?, periodicidad = ?, importe_periodico = ?, activo = ?, es_privado = COALESCE(?, es_privado), modificado_por = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
                concepto,
                descripcion,
                ahorradoFinal,
                fecha_objetivo,
                periodicidad,
                importe_periodico,
                activo,
                valorPrivado,
                usuarioId,
                id
            ]);

            await connection.commit();
            enTransaccion = false;
            console.log(`pushSaving - Transacción confirmada para el ahorro ${id}`);
        } else {
            // Insertar nuevo ahorro
            if (!propietario_id) throw new ErrorDeNegocio('Falta el propietario para crear el ahorro');
            console.log(`pushSaving - Nuevo ahorro: ${concepto}, valor inicial de ahorrado ${ahorrado}`);
            await connection.execute('INSERT INTO ahorros (concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo, propietario_id, es_privado, modificado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 0), ?)', [
                concepto,
                descripcion,
                ahorrado,
                fecha_objetivo,
                periodicidad,
                importe_periodico,
                activo,
                propietario_id,
                valorPrivado,
                usuarioId
            ]);
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
    if (!Array.isArray(savings)) {
        savings = [savings];
    }
    // S-26: la lista llega validada de la ruta (leerListaEnterosPositivos); aquí se vuelve a comprobar para no
    // construir un IN () inválido ni aceptar identificadores que no sean enteros positivos. El borrado se acota con
    // esos mismos identificadores y los movimientos caen por la clave foránea en cascada (0001).
    const ids = savings.map((valor) => Number(valor));
    if (ids.length === 0 || ids.some((valor) => !Number.isSafeInteger(valor) || valor <= 0)) {
        throw new ErrorDeNegocio('La lista de ahorros a eliminar debe traer al menos un identificador válido', 400);
    }
    try {
        connection = await getConnection();
        const placeholders = ids.map(() => '?').join(',');
        await connection.execute(`DELETE FROM ahorros WHERE id IN (${placeholders})`, ids);
    } catch (error) {
        console.error('Error al eliminar los ahorros:', error);
        if (esErrorDeReferencia(error)) {
            console.log('deleteSavings - Rechazado: el ahorro tiene registros asociados: ' + String(ids));
            throw new ErrorDeNegocio('No se puede eliminar el ahorro porque tiene registros asociados', 409);
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

async function pushMovimiento(id, ahorro_id, importe, fecha, tipo, descripcion = null, usuarioId = null) {
    let connection;
    let enTransaccion = false;
    usuarioId = usuarioId ?? null;
    try {
        connection = await getConnection();

        if (!fecha || !tipo) {
            throw new ErrorDeNegocio('Faltan campos obligatorios: fecha y tipo');
        }
        if (importe === undefined || importe === null || Number.isNaN(Number(importe))) {
            throw new ErrorDeNegocio('El importe del movimiento no es válido');
        }

        // El movimiento y el ajuste de ahorrado se guardan juntos o no se guarda nada
        await connection.beginTransaction();
        enTransaccion = true;

        let ahorroId = ahorro_id;
        let diferencia = Number(importe);

        if (id) {
            // Primera lectura: a qué ahorro pertenece el movimiento
            const [duenio] = await connection.execute('SELECT ahorro_id FROM ahorros_movimientos WHERE id = ?', [id]);
            if (duenio.length === 0) {
                throw new ErrorDeNegocio('Movimiento no encontrado', 404);
            }
            ahorroId = duenio[0].ahorro_id;

            // S-26: si la petición indica un ahorro, tiene que ser el del movimiento. La comprobación no depende solo
            // del chequeo de la ruta (S-18): la capa de base de datos no actúa sobre un ahorro distinto.
            if (ahorro_id !== undefined && ahorro_id !== null && ahorro_id !== '' && Number(ahorro_id) !== Number(ahorroId)) {
                console.log(`pushMovimiento - Rechazado: el movimiento ${id} pertenece al ahorro ${ahorroId}, no al ${ahorro_id}`);
                throw new ErrorDeNegocio('El movimiento no pertenece al ahorro indicado.', 400, 'PADRE_INCORRECTO');
            }

            // DC-39: se bloquea primero el ahorro y después se lee el movimiento acotado a él, que puede haber cambiado
            // mientras se esperaba el bloqueo
            if (!(await bloquearAhorro(connection, ahorroId))) {
                throw new ErrorDeNegocio(`Ahorro con ID ${ahorroId} no encontrado`, 404);
            }
            const [anterior] = await connection.execute('SELECT importe FROM ahorros_movimientos WHERE id = ? AND ahorro_id = ? FOR UPDATE', [id, ahorroId]);
            if (anterior.length === 0) {
                throw new ErrorDeNegocio('Movimiento no encontrado', 404);
            }
            const importeAnterior = anterior[0].importe;
            diferencia = Math.round((Number(importe) - Number(importeAnterior)) * 100) / 100;
            console.log(`pushMovimiento - Editando el movimiento ID ${id} del ahorro ${ahorroId}: importe ${importeAnterior} -> ${importe} (diferencia ${diferencia.toFixed(2)}), autor ${usuarioId ?? 'sistema'}`);

            await connection.execute('UPDATE ahorros_movimientos SET importe = ?, fecha = ?, tipo = ?, descripcion = COALESCE(?, descripcion), modificado_por = ? WHERE id = ? AND ahorro_id = ?', [importe, fecha, tipo, descripcion, usuarioId, id, ahorroId]);
        } else {
            console.log(`pushMovimiento - Nuevo movimiento del ahorro ${ahorroId}: importe ${importe}, fecha ${fecha}, tipo ${tipo}, autor ${usuarioId ?? 'sistema'}`);
            await connection.execute('INSERT INTO ahorros_movimientos (ahorro_id, importe, fecha, tipo, descripcion, modificado_por) VALUES (?, ?, ?, ?, ?, ?)', [ahorro_id, importe, fecha, tipo, descripcion, usuarioId]);
        }

        // Actualizar ahorrado solo con la diferencia que aporta este movimiento
        const [updateAhorroResult] = await connection.execute('UPDATE ahorros SET ahorrado = COALESCE(ahorrado, 0) + ?, modificado_por = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [diferencia, usuarioId, ahorroId]);
        if (updateAhorroResult.affectedRows === 0) {
            throw new ErrorDeNegocio(`Ahorro con ID ${ahorroId} no encontrado`, 404);
        }

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

async function deleteMovimiento(id, usuarioId = null) {
    let connection;
    let enTransaccion = false;
    usuarioId = usuarioId ?? null;
    try {
        connection = await getConnection();
        await connection.beginTransaction();
        enTransaccion = true;

        // Primera lectura: a qué ahorro pertenece el movimiento
        const [duenio] = await connection.execute('SELECT ahorro_id FROM ahorros_movimientos WHERE id = ?', [id]);
        if (duenio.length === 0) {
            throw new ErrorDeNegocio('Movimiento no encontrado', 404);
        }
        const ahorroId = duenio[0].ahorro_id;

        // DC-39: se bloquea el ahorro y después se lee el movimiento acotado a él (S-26); el importe sale de esa
        // segunda lectura, ya con el padre bloqueado
        if (!(await bloquearAhorro(connection, ahorroId))) {
            throw new ErrorDeNegocio(`Ahorro con ID ${ahorroId} no encontrado`, 404);
        }
        const [movimiento] = await connection.execute('SELECT importe FROM ahorros_movimientos WHERE id = ? AND ahorro_id = ? FOR UPDATE', [id, ahorroId]);
        if (movimiento.length === 0) {
            throw new ErrorDeNegocio('Movimiento no encontrado', 404);
        }

        const { importe } = movimiento[0];
        console.log(`deleteMovimiento - Eliminando el movimiento ID ${id} del ahorro ${ahorroId} (importe ${importe})`);

        // Eliminar el movimiento, acotado al ahorro del que se han leído sus datos
        const [resultadoBaja] = await connection.execute('DELETE FROM ahorros_movimientos WHERE id = ? AND ahorro_id = ?', [id, ahorroId]);
        if (resultadoBaja.affectedRows !== 1) {
            throw new ErrorDeNegocio('Movimiento no encontrado', 404);
        }

        // Actualizar el valor de ahorrado en la tabla ahorros
        await connection.execute('UPDATE ahorros SET ahorrado = COALESCE(ahorrado, 0) - ?, modificado_por = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [importe, usuarioId, ahorroId]);

        await connection.commit();
        enTransaccion = false;
        console.log(`deleteMovimiento - Transacción confirmada para el ahorro ${ahorroId}`);
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
