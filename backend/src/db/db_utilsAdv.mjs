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

            // Cambiar estado a completado si el importe_total es 0€
            if (importe_total === 0) {
                await connection.execute('UPDATE anticipos SET estado = ? WHERE id = ?', ['completado', id]);
                console.log(`Anticipo ${id} marcado como completado.`);
            }

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

            // Cambiar estado a completado si el importe_total es 0€
            if (importe_total === 0) {
                await connection.execute('UPDATE anticipos SET estado = ? WHERE id = ?', ['completado', anticipoId]);
                console.log(`Anticipo ${anticipoId} marcado como completado.`);
            }

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

        console.log(`recalculatePaymentPlan - Recalculando pagos para anticipo ${anticipoId}`);

        // Obtener la cuenta_origen_id del anticipo
        const [anticipo] = await connection.execute('SELECT cuenta_origen_id FROM anticipos WHERE id = ?', [anticipoId]);
        if (anticipo.length === 0) {
            throw new Error(`Anticipo con ID ${anticipoId} no encontrado`);
        }
        const cuentaDestinoId = anticipo[0].cuenta_origen_id;

        console.log(`recalculatePaymentPlan - Cuenta origen ID: ${cuentaDestinoId}`);

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

        console.log(`recalculatePaymentPlan - Saldo restante después de pagos existentes: ${saldoRestante}`);

        // Crear nuevos pagos si es necesario
        let ultimaFechaPago = null; // Variable para almacenar la fecha del último pago
        while (saldoRestante > 0) {
            const importePago = saldoRestante > pago_sugerido ? pago_sugerido : saldoRestante;
            const [insertResult] = await connection.execute('INSERT INTO anticipos_pagos (anticipo_id, importe, fecha, tipo, estado, cuenta_destino_id) VALUES (?, ?, ?, ?, ?, ?)', [
                anticipoId,
                importePago,
                fechaPago.toISOString().split('T')[0],
                'regular',
                'pendiente',
                cuentaDestinoId
            ]);
            console.log(`recalculatePaymentPlan - Nuevo pago creado, filas afectadas: ${insertResult.affectedRows}`);
            saldoRestante -= importePago;
            ultimaFechaPago = new Date(fechaPago); // Actualizar la fecha del último pago
            fechaPago.setMonth(fechaPago.getMonth() + getMonthsFromPeriodicidad(periodicidad));
        }

        // Actualizar la fecha fin prevista del anticipo con la fecha del último pago
        if (ultimaFechaPago) {
            const [updateResult] = await connection.execute('UPDATE anticipos SET fecha_fin_prevista = ? WHERE id = ?', [ultimaFechaPago.toISOString().split('T')[0], anticipoId]);
            console.log(`recalculatePaymentPlan - Fecha fin prevista actualizada, filas afectadas: ${updateResult.affectedRows}`);
        }

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

        console.log('deleteAdvances - IDs de anticipos a eliminar:', advances);

        // Eliminar pagos asociados
        const placeholders = advances.map(() => '?').join(',');
        const [deletePagosResult] = await connection.execute(`DELETE FROM anticipos_pagos WHERE anticipo_id IN (${placeholders})`, advances);
        console.log('deleteAdvances - Pagos eliminados, filas afectadas:', deletePagosResult.affectedRows);

        // Eliminar anticipos
        const [deleteAnticiposResult] = await connection.execute(`DELETE FROM anticipos WHERE id IN (${placeholders})`, advances);
        console.log('deleteAdvances - Anticipos eliminados, filas afectadas:', deleteAnticiposResult.affectedRows);
    } catch (error) {
        console.error('deleteAdvances - Error al eliminar los anticipos:', error);
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

                // Verificar si el importe_total es 0€ con margen de error
                const [anticipo] = await connection.execute('SELECT importe_total FROM anticipos WHERE id = ?', [anticipo_id]);
                if (anticipo.length > 0 && Math.abs(parseFloat(anticipo[0].importe_total)) < 1e-10) {
                    await connection.execute('UPDATE anticipos SET estado = ? WHERE id = ?', ['completado', anticipo_id]);
                    console.log(`Anticipo ${anticipo_id} marcado como completado.`);
                }
            }

            // Si el estado cambia de "pagado" a "pendiente", revertir el descuento previamente aplicado
            if (wasPagado && estado === 'pendiente') {
                const [updateAnticipo] = await connection.execute('UPDATE anticipos SET importe_total = importe_total + ? WHERE id = ?', [previousImporte, anticipo_id]);
                console.log(`Reversión del descuento en el anticipo, filas afectadas: ${updateAnticipo.affectedRows}`);

                // Cambiar el estado del anticipo a "activo" si el importe_total ya no es 0
                const [anticipo] = await connection.execute('SELECT importe_total, estado FROM anticipos WHERE id = ?', [anticipo_id]);
                if (anticipo.length > 0 && parseFloat(anticipo[0].importe_total) > 0 && anticipo[0].estado === 'completado') {
                    await connection.execute('UPDATE anticipos SET estado = ? WHERE id = ?', ['activo', anticipo_id]);
                    console.log(`Anticipo ${anticipo_id} marcado como activo.`);
                }
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

                // Verificar si el importe_total es 0€ con margen de error
                const [anticipo] = await connection.execute('SELECT importe_total FROM anticipos WHERE id = ?', [anticipo_id]);
                if (anticipo.length > 0 && Math.abs(parseFloat(anticipo[0].importe_total)) < 1e-10) {
                    await connection.execute('UPDATE anticipos SET estado = ? WHERE id = ?', ['completado', anticipo_id]);
                    console.log(`Anticipo ${anticipo_id} marcado como completado.`);
                }
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

        console.log(`deletePago - ID recibido: ${id}`);

        // Obtener el importe y estado del pago antes de eliminarlo
        const [pago] = await connection.execute('SELECT anticipo_id, importe, estado FROM anticipos_pagos WHERE id = ?', [id]);
        if (pago.length === 0) {
            throw new Error(`Pago con ID ${id} no encontrado`);
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
