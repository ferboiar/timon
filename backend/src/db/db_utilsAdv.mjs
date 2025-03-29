import { getConnection } from './db_connection.mjs';

async function getAdvances() {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM anticipos ORDER BY fecha_inicio ASC');
        return rows;
    } catch (error) {
        console.error('Error al obtener anticipos:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function pushAdvance(id, concepto, importe_total, pago_sugerido, fecha_inicio, fecha_fin_prevista = null, descripcion = null, estado = 'activo', cuenta_origen_id, periodicidad) {
    let connection;
    try {
        connection = await getConnection();

        if (id) {
            // Actualizar anticipo existente
            const [result] = await connection.execute(
                'UPDATE anticipos SET concepto = ?, importe_total = ?, pago_sugerido = ?, fecha_inicio = ?, fecha_fin_prevista = ?, descripcion = COALESCE(?, descripcion), estado = ?, cuenta_origen_id = ?, periodicidad = ? WHERE id = ?',
                [concepto, importe_total, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad, id]
            );
            console.log(`Actualización realizada en anticipos, filas afectadas: ${result.affectedRows}`);

            // Si se especifica periodicidad y pago sugerido, recalcular el plan de pagos
            if (periodicidad && pago_sugerido) {
                await recalculatePaymentPlan(id, importe_total, pago_sugerido, fecha_inicio, periodicidad);
            }
        } else {
            // Insertar nuevo anticipo
            const [result] = await connection.execute('INSERT INTO anticipos (concepto, importe_total, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                concepto,
                importe_total,
                pago_sugerido,
                fecha_inicio,
                fecha_fin_prevista,
                descripcion,
                estado,
                cuenta_origen_id,
                periodicidad
            ]);
            console.log(`Inserción realizada en anticipos, filas afectadas: ${result.affectedRows}`);

            const anticipoId = result.insertId;

            // Si se especifica periodicidad y pago sugerido, crear el plan de pagos
            if (periodicidad && pago_sugerido) {
                await recalculatePaymentPlan(anticipoId, importe_total, pago_sugerido, fecha_inicio, periodicidad);
            }
        }
    } catch (error) {
        console.error('Error en pushAdvance:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function recalculatePaymentPlan(anticipoId, importe_total, pago_sugerido, fecha_inicio, periodicidad) {
    let connection;
    try {
        connection = await getConnection();

        // Obtener la cuenta_origen_id del anticipo
        const [anticipo] = await connection.execute('SELECT cuenta_origen_id FROM anticipos WHERE id = ?', [anticipoId]);
        if (anticipo.length === 0) {
            throw new Error('Anticipo no encontrado');
        }
        const cuentaDestinoId = anticipo[0].cuenta_origen_id;

        // Obtener pagos pendientes existentes
        const [existingPagos] = await connection.execute("SELECT * FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente' ORDER BY fecha ASC", [anticipoId]);

        let saldoRestante = importe_total;
        let fechaPago = new Date(fecha_inicio);
        fechaPago.setMonth(fechaPago.getMonth() + getMonthsFromPeriodicidad(periodicidad));

        // Restar los pagos pendientes existentes del saldo restante
        for (const pago of existingPagos) {
            saldoRestante -= pago.importe;
            fechaPago = new Date(pago.fecha); // Actualizar la fecha al último pago existente
        }

        // Crear nuevos pagos si es necesario
        while (saldoRestante > 0) {
            const importePago = saldoRestante > pago_sugerido ? pago_sugerido : saldoRestante;
            await connection.execute('INSERT INTO anticipos_pagos (anticipo_id, importe, fecha, tipo, estado, cuenta_destino_id) VALUES (?, ?, ?, ?, ?, ?)', [
                anticipoId,
                importePago,
                fechaPago.toISOString().split('T')[0],
                'regular',
                'pendiente',
                cuentaDestinoId
            ]);
            saldoRestante -= importePago;
            fechaPago.setMonth(fechaPago.getMonth() + getMonthsFromPeriodicidad(periodicidad));
        }

        // Actualizar la fecha fin prevista del anticipo
        await connection.execute('UPDATE anticipos SET fecha_fin_prevista = ? WHERE id = ?', [fechaPago.toISOString().split('T')[0], anticipoId]);

        console.log(`Plan de pagos recalculado para anticipo ${anticipoId}`);
    } catch (error) {
        console.error('Error en recalculatePaymentPlan:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

function getMonthsFromPeriodicidad(periodicidad) {
    switch (periodicidad) {
        case 'mensual':
            return 1;
        case 'bimestral':
            return 2;
        case 'trimestral':
            return 3;
        case 'anual':
            return 12;
        default:
            return 0;
    }
}

async function deleteAdvances(advances) {
    let connection;
    try {
        connection = await getConnection();
        if (!Array.isArray(advances)) advances = [advances];

        // Eliminar pagos asociados
        const placeholders = advances.map(() => '?').join(',');
        await connection.execute(`DELETE FROM anticipos_pagos WHERE anticipo_id IN (${placeholders})`, advances);

        // Eliminar anticipos
        const [result] = await connection.execute(`DELETE FROM anticipos WHERE id IN (${placeholders})`, advances);
        console.log(`Eliminación en anticipos, filas afectadas: ${result.affectedRows}`);
    } catch (error) {
        console.error('Error en deleteAdvances:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function getPeriodicidades() {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute("SHOW COLUMNS FROM anticipos LIKE 'periodicidad'");
        return rows[0].Type.match(/enum\(([^)]+)\)/)[1]
            .split(',')
            .map((val) => val.replace(/'/g, ''));
    } catch (error) {
        console.error('Error en getPeriodicidades:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

// Funciones para gestionar pagos en anticipos_pagos

async function getPagos(anticipoId) {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM anticipos_pagos WHERE anticipo_id = ? ORDER BY fecha ASC', [anticipoId]);
        return rows;
    } catch (error) {
        console.error('Error en getPagos:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function pushPago(id, anticipo_id, importe, fecha, tipo, descripcion = null, estado = 'pendiente', cuenta_destino_id) {
    let connection;
    try {
        connection = await getConnection();

        if (id) {
            // Obtener el estado actual del pago antes de actualizarlo
            const [existingPago] = await connection.execute('SELECT estado, importe FROM anticipos_pagos WHERE id = ?', [id]);
            const wasPagado = existingPago.length > 0 && existingPago[0].estado === 'pagado';
            const previousImporte = existingPago[0]?.importe || 0;

            // Actualizar el pago existente
            const [result] = await connection.execute('UPDATE anticipos_pagos SET importe = ?, fecha = ?, tipo = ?, descripcion = COALESCE(?, descripcion), estado = ?, cuenta_destino_id = ? WHERE id = ?', [
                importe,
                fecha,
                tipo,
                descripcion,
                estado,
                cuenta_destino_id,
                id
            ]);
            console.log(`Actualización en anticipos_pagos, filas afectadas: ${result.affectedRows}`);

            // Si el estado cambia a "pagado" y no estaba previamente en "pagado", descontar el importe del anticipo
            if (estado === 'pagado' && !wasPagado) {
                const [updateAnticipo] = await connection.execute('UPDATE anticipos SET importe_total = importe_total - ? WHERE id = ?', [importe, anticipo_id]);
                console.log(`Descuento aplicado al anticipo, filas afectadas: ${updateAnticipo.affectedRows}`);
            }

            // Si el estado cambia de "pagado" a otro estado, revertir el descuento previamente aplicado
            if (wasPagado && estado !== 'pagado') {
                const [updateAnticipo] = await connection.execute('UPDATE anticipos SET importe_total = importe_total + ? WHERE id = ?', [previousImporte, anticipo_id]);
                console.log(`Reversión del descuento en el anticipo, filas afectadas: ${updateAnticipo.affectedRows}`);
            }

            // Si el importe cambia y el pago está pendiente, recalcular los pagos restantes
            if (estado === 'pendiente' && previousImporte !== importe) {
                const [anticipo] = await connection.execute('SELECT importe_total, pago_sugerido, fecha_inicio, periodicidad FROM anticipos WHERE id = ?', [anticipo_id]);
                if (anticipo.length > 0) {
                    const { importe_total, pago_sugerido, fecha_inicio, periodicidad } = anticipo[0];
                    await recalculatePaymentPlan(anticipo_id, importe_total, pago_sugerido, fecha_inicio, periodicidad);
                }
            }
        } else {
            // Insertar nuevo pago
            const [result] = await connection.execute('INSERT INTO anticipos_pagos (anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                anticipo_id,
                importe,
                fecha,
                tipo,
                descripcion,
                estado,
                cuenta_destino_id
            ]);
            console.log(`Inserción en anticipos_pagos, filas afectadas: ${result.affectedRows}`);

            // Si el estado es "pagado", descontar el importe del anticipo
            if (estado === 'pagado') {
                const [updateAnticipo] = await connection.execute('UPDATE anticipos SET importe_total = importe_total - ? WHERE id = ?', [importe, anticipo_id]);
                console.log(`Descuento aplicado al anticipo, filas afectadas: ${updateAnticipo.affectedRows}`);
            }

            // Si el pago es extraordinario, ajustar los últimos pagos regulares
            if (tipo === 'extraordinario') {
                const [anticipo] = await connection.execute('SELECT importe_total, pago_sugerido, fecha_inicio, periodicidad FROM anticipos WHERE id = ?', [anticipo_id]);
                if (anticipo.length > 0) {
                    const { importe_total, pago_sugerido, fecha_inicio, periodicidad } = anticipo[0];
                    await recalculatePaymentPlan(anticipo_id, importe_total, pago_sugerido, fecha_inicio, periodicidad);
                }
            }
        }
    } catch (error) {
        console.error('Error en pushPago:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function deletePago(id) {
    let connection;
    try {
        connection = await getConnection();

        // Obtener el importe y estado del pago antes de eliminarlo
        const [pago] = await connection.execute('SELECT anticipo_id, importe, estado FROM anticipos_pagos WHERE id = ?', [id]);
        if (pago.length === 0) {
            throw new Error('Pago no encontrado');
        }

        const { anticipo_id, importe, estado } = pago[0];

        // Eliminar el pago
        const [result] = await connection.execute('DELETE FROM anticipos_pagos WHERE id = ?', [id]);
        console.log(`Eliminación en anticipos_pagos, filas afectadas: ${result.affectedRows}`);

        // Si el estado era "pagado", revertir el descuento en el anticipo
        if (estado === 'pagado') {
            const [updateAnticipo] = await connection.execute('UPDATE anticipos SET importe_total = importe_total + ? WHERE id = ?', [importe, anticipo_id]);
            console.log(`Reversión del descuento en el anticipo, filas afectadas: ${updateAnticipo.affectedRows}`);
        }
    } catch (error) {
        console.error('Error en deletePago:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { deleteAdvances, deletePago, getAdvances, getPagos, getPeriodicidades, pushAdvance, pushPago };
