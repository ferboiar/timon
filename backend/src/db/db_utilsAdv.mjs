/**
 * Utilidades para la gestión de anticipos en la base de datos
 *
 * Este módulo proporciona funciones para interactuar con las tablas 'anticipos' y 'anticipos_pagos'.
 * Permite gestionar préstamos o anticipos con un plan de pagos asociado, incluyendo operaciones
 * como obtener todos los anticipos, crear o actualizar anticipos y sus pagos asociados,
 * eliminar anticipos, y gestionar el plan de pagos de forma automatizada según la periodicidad.
 * También incluye funcionalidad para recalcular pagos cuando se modifica un anticipo.
 *
 * @module db_utilsAdv
 */

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

        // Asegurarse de que los valores undefined sean tratados como null
        concepto = concepto ?? null;
        importe_total = importe_total ?? null;
        pago_sugerido = pago_sugerido ?? null;
        fecha_inicio = fecha_inicio ?? null;
        fecha_fin_prevista = fecha_fin_prevista ?? null;
        descripcion = descripcion ?? null;
        estado = estado ?? null;
        cuenta_origen_id = cuenta_origen_id ?? null;
        periodicidad = periodicidad ?? null;

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

        console.log(`recalculatePaymentPlan - Iniciando recálculo del plan de pagos para el anticipo con ID: ${anticipoId}`);
        console.log(`recalculatePaymentPlan - Datos recibidos: importe_total=${importe_total}, pago_sugerido=${pago_sugerido}, fecha_inicio=${fecha_inicio}, periodicidad=${periodicidad}`);

        // Obtener datos del anticipo si no se proporcionan
        if (!importe_total || !pago_sugerido || !fecha_inicio || !periodicidad) {
            const [anticipoData] = await connection.execute('SELECT importe_total, pago_sugerido, fecha_inicio, periodicidad FROM anticipos WHERE id = ?', [anticipoId]);
            if (anticipoData.length === 0) {
                throw new Error(`Anticipo con ID ${anticipoId} no encontrado`);
            }
            ({ importe_total, pago_sugerido, fecha_inicio, periodicidad } = anticipoData[0]);
            console.log(`recalculatePaymentPlan - Datos obtenidos de la base de datos: importe_total=${importe_total}, pago_sugerido=${pago_sugerido}, fecha_inicio=${fecha_inicio}, periodicidad=${periodicidad}`);
        }

        // Obtener la cuenta_origen_id del anticipo
        const [anticipo] = await connection.execute('SELECT cuenta_origen_id FROM anticipos WHERE id = ?', [anticipoId]);
        if (anticipo.length === 0) {
            throw new Error(`Anticipo con ID ${anticipoId} no encontrado`);
        }
        const cuentaDestinoId = anticipo[0].cuenta_origen_id;

        console.log(`recalculatePaymentPlan - Cuenta origen asociada al anticipo: ${cuentaDestinoId}`);

        // Obtener todos los pagos existentes (pagados y pendientes)
        const [existingPagos] = await connection.execute('SELECT * FROM anticipos_pagos WHERE anticipo_id = ? ORDER BY fecha ASC', [anticipoId]);

        console.log(`recalculatePaymentPlan - Pagos existentes: ${JSON.stringify(existingPagos)}`);

        // Filtrar los pagos pendientes
        const pagosPendientes = existingPagos.filter((pago) => pago.estado === 'pendiente');

        // Restar los pagos pendientes del saldo restante
        let saldoRestante = importe_total;
        for (const pago of pagosPendientes) {
            saldoRestante -= pago.importe;
        }

        console.log(`recalculatePaymentPlan - Saldo restante después de considerar los pagos pendientes: ${saldoRestante}`);

        // Determinar la fecha del próximo pago basándote en el último pago existente
        let fechaPago = new Date(fecha_inicio);
        if (existingPagos.length > 0) {
            const ultimaFechaPago = new Date(existingPagos[existingPagos.length - 1].fecha);
            fechaPago = new Date(ultimaFechaPago);
            fechaPago.setMonth(fechaPago.getMonth() + getMonthsFromPeriodicidad(periodicidad));
        }

        // Crear nuevos pagos si es necesario
        let ultimaFechaPago = null;
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
            console.log(`recalculatePaymentPlan - Nuevo pago creado con importe: ${importePago}, fecha: ${fechaPago.toISOString().split('T')[0]}`);
            saldoRestante -= importePago;
            ultimaFechaPago = new Date(fechaPago); // Actualizar la fecha del último pago
            fechaPago.setMonth(fechaPago.getMonth() + getMonthsFromPeriodicidad(periodicidad));
        }

        // Actualizar la fecha fin prevista del anticipo con la fecha del último pago
        if (ultimaFechaPago) {
            await connection.execute('UPDATE anticipos SET fecha_fin_prevista = ? WHERE id = ?', [ultimaFechaPago.toISOString().split('T')[0], anticipoId]);
            console.log(`recalculatePaymentPlan - Fecha fin prevista actualizada a: ${ultimaFechaPago.toISOString().split('T')[0]}`);
        }

        console.log(`recalculatePaymentPlan - Plan de pagos recalculado exitosamente para el anticipo con ID: ${anticipoId}`);
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
            const [existingPago] = await connection.execute('SELECT estado, importe, fecha FROM anticipos_pagos WHERE id = ?', [id]);
            const wasPagado = existingPago.length > 0 && existingPago[0].estado === 'pagado';
            const previousImporte = existingPago[0]?.importe || 0;
            const previousFecha = existingPago[0]?.fecha;

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

            // Si el importe cambia y el pago está pendiente, recalcular los pagos posteriores
            if (estado === 'pendiente' && previousImporte !== importe) {
                console.log(`pushPago - Recalculando pagos pendientes para el anticipo ${anticipo_id} debido a cambio en el importe.`);
                await recalculatePostEditPayments(anticipo_id, previousImporte, importe, previousFecha);
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

async function recalculatePostEditPayments(anticipo_id, previousImporte, newImporte, previousFecha) {
    let connection;
    try {
        connection = await getConnection();

        console.log(`recalculatePostEditPayments - Inicio para anticipo_id: ${anticipo_id}`);
        console.log(`recalculatePostEditPayments - previousImporte: ${previousImporte}, newImporte: ${newImporte}, previousFecha: ${previousFecha}`);

        // Convertir importes a números para asegurar operaciones numéricas correctas
        const prevImporte = parseFloat(previousImporte);
        const nuevoImporte = parseFloat(newImporte);
        // Diferencia a redistribuir (positiva si hay que añadir a otros pagos, negativa si hay que restar)
        let diferencia = prevImporte - nuevoImporte;

        console.log(`recalculatePostEditPayments - Diferencia a redistribuir: ${diferencia}`);

        // Si no hay diferencia a redistribuir, terminamos
        if (Math.abs(diferencia) < 0.01) {
            console.log('recalculatePostEditPayments - No hay diferencia significativa para redistribuir');
            return;
        }

        // Obtener datos del anticipo
        const [anticipo] = await connection.execute('SELECT importe_total, pago_sugerido FROM anticipos WHERE id = ?', [anticipo_id]);
        if (anticipo.length === 0) throw new Error(`Anticipo con ID ${anticipo_id} no encontrado`);

        const importeTotal = parseFloat(anticipo[0].importe_total);
        const pagoSugerido = parseFloat(anticipo[0].pago_sugerido);

        console.log(`recalculatePostEditPayments - Importe total del anticipo: ${importeTotal}`);
        console.log(`recalculatePostEditPayments - Importe sugerido: ${pagoSugerido}`);

        // Obtener pagos pendientes posteriores a la fecha del pago editado
        const [pendingPayments] = await connection.execute("SELECT id, importe, fecha FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente' AND fecha > ? ORDER BY fecha ASC", [anticipo_id, previousFecha]);

        if (pendingPayments.length === 0) {
            console.log('recalculatePostEditPayments - No hay pagos pendientes posteriores para redistribuir');
            return;
        }

        console.log(`recalculatePostEditPayments - Número de pagos pendientes posteriores: ${pendingPayments.length}`);

        // Convertir todos los importes a números
        const pagos = pendingPayments.map((p) => ({
            id: p.id,
            fecha: new Date(p.fecha),
            importe: parseFloat(p.importe),
            nuevoImporte: null // Inicializar nuevoImporte como null
        }));

        // Mostrar estado inicial de los pagos
        pagos.forEach((pago, idx) => {
            console.log(`recalculatePostEditPayments - Pago pendiente #${idx + 1}: ID=${pago.id}, Fecha=${pago.fecha}, Importe=${pago.importe.toFixed(2)}`);
        });

        // CASO 1: Si hay que añadir a los pagos posteriores (diferencia > 0)
        if (diferencia > 0) {
            console.log(`recalculatePostEditPayments - CASO 1: Reducción del pago, redistribuyendo ${diferencia} entre los demás pagos`);

            // Paso 1: Primero intentamos llevar los pagos por debajo del importe sugerido hasta el importe sugerido
            let diferenciaRestante = diferencia;

            // Ordenar los pagos por importe (de menor a mayor) para ajustar primero los más bajos
            const pagosOrdenadosPorImporte = [...pagos].sort((a, b) => a.importe - b.importe);

            for (const pago of pagosOrdenadosPorImporte) {
                if (diferenciaRestante <= 0) break;

                // Si el pago está por debajo del importe sugerido, aumentarlo hasta el sugerido
                if (pago.importe < pagoSugerido) {
                    const incrementoMaximo = Math.min(diferenciaRestante, pagoSugerido - pago.importe);
                    pago.nuevoImporte = parseFloat((pago.importe + incrementoMaximo).toFixed(2));
                    diferenciaRestante -= incrementoMaximo;

                    console.log(`recalculatePostEditPayments - Incrementando pago ID ${pago.id} de ${pago.importe.toFixed(2)} a ${pago.nuevoImporte.toFixed(2)} (incremento: ${incrementoMaximo.toFixed(2)})`);
                }
            }

            // Paso 2: Distribuir la diferencia restante entre TODOS los pagos posteriores equitativamente
            if (diferenciaRestante > 0) {
                console.log(`recalculatePostEditPayments - Diferencia restante para distribuir equitativamente: ${diferenciaRestante.toFixed(2)}`);

                // Calculamos cuánto corresponde a cada pago de la diferencia restante (en números enteros)
                const numeroPagos = pagos.length;
                const cantidadBase = Math.floor(diferenciaRestante);
                const cantidadPorPago = Math.floor(cantidadBase / numeroPagos);
                let resto = cantidadBase - cantidadPorPago * numeroPagos;
                const centavosExtra = Math.round((diferenciaRestante - cantidadBase) * 100);

                console.log(`recalculatePostEditPayments - Distribución base: ${cantidadPorPago} por pago, resto: ${resto}, centavos extra: ${centavosExtra}`);

                // Distribuir la cantidad base y el resto entre los pagos
                for (let i = 0; i < pagos.length; i++) {
                    const pago = pagos[i];
                    let ajuste = cantidadPorPago;

                    // Distribuir el resto (números enteros) - primeros pagos reciben 1 extra
                    if (resto > 0) {
                        ajuste += 1;
                        resto--;
                    }

                    // Distribuir los centavos extra - primeros pagos reciben 0.01 extra
                    if (i < centavosExtra) {
                        ajuste += 0.01;
                    }

                    // Calcular el nuevo importe del pago
                    const importeBase = pago.nuevoImporte !== null ? pago.nuevoImporte : pago.importe;
                    const nuevoImporte = parseFloat((importeBase + ajuste).toFixed(2));

                    console.log(`recalculatePostEditPayments - Ajustando pago ID ${pago.id} de ${importeBase.toFixed(2)} a ${nuevoImporte} (ajuste: ${ajuste.toFixed(2)})`);
                    pago.nuevoImporte = nuevoImporte;
                }
            }
        }
        // CASO 2: Si hay que reducir los pagos posteriores (diferencia < 0)
        else {
            // Código para el caso de aumento del pago (diferencia < 0)
            // Este caso funciona correctamente según las pruebas, así que lo dejamos sin cambios
            const diferenciaAbs = Math.abs(diferencia);
            console.log(`recalculatePostEditPayments - CASO 2: Aumento del pago, quitando ${diferenciaAbs.toFixed(2)} de los demás pagos`);

            // Paso 1: Primero intentamos reducir los pagos por encima del importe sugerido hasta el importe sugerido
            const pagosAltos = pagos.filter((p) => p.importe > pagoSugerido).sort((a, b) => b.importe - a.importe); // Del más alto al más bajo

            let reduccionAplicada = 0;
            for (const pago of pagosAltos) {
                const reduccionMaxima = Math.min(diferenciaAbs - reduccionAplicada, pago.importe - pagoSugerido);
                if (reduccionMaxima <= 0) continue;

                pago.nuevoImporte = parseFloat((pago.importe - reduccionMaxima).toFixed(2));
                reduccionAplicada += reduccionMaxima;

                console.log(`recalculatePostEditPayments - Reduciendo pago ID ${pago.id} de ${pago.importe.toFixed(2)} a ${pago.nuevoImporte.toFixed(2)} (reducción: ${reduccionMaxima.toFixed(2)})`);

                if (Math.abs(reduccionAplicada - diferenciaAbs) < 0.01) break;
            }

            // Paso 2: Si aún queda diferencia por reducir, reducir proporcionalmente los pagos restantes
            const restantePorReducir = diferenciaAbs - reduccionAplicada;
            if (restantePorReducir > 0.01) {
                console.log(`recalculatePostEditPayments - Reducción restante por aplicar: ${restantePorReducir.toFixed(2)}`);

                const pagosRestantes = pagos.filter((p) => p.nuevoImporte === null);
                if (pagosRestantes.length > 0) {
                    const cantidadBase = Math.floor(restantePorReducir);
                    const reduccionPorPago = Math.floor(cantidadBase / pagosRestantes.length);
                    let resto = cantidadBase - reduccionPorPago * pagosRestantes.length;
                    const centavosExtra = Math.round((restantePorReducir - cantidadBase) * 100);

                    for (let i = 0; i < pagosRestantes.length; i++) {
                        const pago = pagosRestantes[i];
                        let reduccion = reduccionPorPago;

                        // Distribuir el resto (números enteros)
                        if (resto > 0) {
                            reduccion += 1;
                            resto--;
                        }

                        // Distribuir los centavos extra
                        if (i < centavosExtra) {
                            reduccion += 0.01;
                        }

                        const nuevoImporte = Math.max(0.01, parseFloat((pago.importe - reduccion).toFixed(2)));

                        pago.nuevoImporte = nuevoImporte;
                        console.log(`recalculatePostEditPayments - Reduciendo pago ID ${pago.id} de ${pago.importe.toFixed(2)} a ${pago.nuevoImporte.toFixed(2)} (reducción: ${reduccion.toFixed(2)})`);
                    }
                }
            }
        }

        // Aplicar los nuevos importes a la base de datos
        for (const pago of pagos) {
            if (pago.nuevoImporte !== null) {
                await connection.execute('UPDATE anticipos_pagos SET importe = ? WHERE id = ?', [pago.nuevoImporte, pago.id]);
            }
        }

        // PASO FINAL: Verificar que la suma total de pagos pendientes coincida con el importe total del anticipo
        const [allPendingPayments] = await connection.execute("SELECT id, importe FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente'", [anticipo_id]);

        const totalActual = allPendingPayments.reduce((sum, p) => sum + parseFloat(p.importe), 0);
        console.log(`recalculatePostEditPayments - Suma de todos los pagos pendientes después de ajustes: ${totalActual.toFixed(2)}`);
        console.log(`recalculatePostEditPayments - Importe total del anticipo: ${importeTotal.toFixed(2)}`);

        // Ajustar el último pago si hay alguna discrepancia
        const diferenciaTotales = Math.round((importeTotal - totalActual) * 100) / 100;
        if (Math.abs(diferenciaTotales) > 0.01) {
            console.log(`recalculatePostEditPayments - Detectada discrepancia de ${diferenciaTotales.toFixed(2)}. Ajustando el último pago...`);

            const [lastPayments] = await connection.execute("SELECT id, importe FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente' ORDER BY fecha DESC LIMIT 1", [anticipo_id]);

            if (lastPayments.length > 0) {
                const lastPago = lastPayments[0];
                const nuevoImporte = Math.max(0.01, parseFloat(lastPago.importe) + diferenciaTotales);

                console.log(`recalculatePostEditPayments - Ajustando último pago ID ${lastPago.id} de ${parseFloat(lastPago.importe).toFixed(2)} a ${nuevoImporte.toFixed(2)}`);
                await connection.execute('UPDATE anticipos_pagos SET importe = ? WHERE id = ?', [nuevoImporte, lastPago.id]);
            }
        }

        // Verificación final
        const [finalPendingPayments] = await connection.execute("SELECT importe FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente'", [anticipo_id]);

        const totalFinal = finalPendingPayments.reduce((sum, p) => sum + parseFloat(p.importe), 0);
        console.log(`recalculatePostEditPayments - Suma final de todos los pagos pendientes: ${totalFinal.toFixed(2)}`);
        console.log(`recalculatePostEditPayments - Importe total del anticipo: ${importeTotal.toFixed(2)}`);
        console.log(`recalculatePostEditPayments - Diferencia final: ${(totalFinal - importeTotal).toFixed(2)}`);
        console.log(`recalculatePostEditPayments - Recálculo completado para anticipo ${anticipo_id}`);
    } catch (error) {
        console.error('Error en recalculatePostEditPayments:', error);
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

async function handlePaymentDeletion(pagoId) {
    let connection;
    try {
        connection = await getConnection();

        // Obtener detalles del pago a eliminar
        const [pago] = await connection.execute('SELECT anticipo_id, importe, estado FROM anticipos_pagos WHERE id = ?', [pagoId]);
        if (pago.length === 0) {
            throw new Error(`Pago con ID ${pagoId} no encontrado`);
        }

        const { anticipo_id, importe, estado } = pago[0];

        // Eliminar el pago
        const [result] = await connection.execute('DELETE FROM anticipos_pagos WHERE id = ?', [pagoId]);
        console.log(`Pago eliminado, filas afectadas: ${result.affectedRows}`);

        // Si el estado era "pagado", revertir el descuento en el anticipo
        if (estado === 'pagado') {
            await connection.execute('UPDATE anticipos SET importe_total = importe_total + ? WHERE id = ?', [importe, anticipo_id]);
        }

        // Calcular el saldo restante
        const [saldoResult] = await connection.execute('SELECT importe_total FROM anticipos WHERE id = ?', [anticipo_id]);
        const saldoRestante = saldoResult[0]?.importe_total || 0;

        return { saldoRestante, anticipoId: anticipo_id };
    } catch (error) {
        console.error('Error en handlePaymentDeletion:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function recalculatePendingPayments(anticipoId) {
    let connection;
    try {
        connection = await getConnection();

        // Obtener los pagos pendientes del anticipo
        const [pendingPayments] = await connection.execute("SELECT id, importe FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente' ORDER BY fecha ASC", [anticipoId]);

        if (pendingPayments.length === 0) {
            console.log(`recalculatePendingPayments - No hay pagos pendientes para el anticipo ${anticipoId}`);
            return;
        }

        // Calcular el saldo restante del anticipo
        const [anticipo] = await connection.execute('SELECT importe_total FROM anticipos WHERE id = ?', [anticipoId]);

        if (anticipo.length === 0) {
            throw new Error(`Anticipo con ID ${anticipoId} no encontrado`);
        }

        const saldoRestante = anticipo[0].importe_total;

        // Prorratear el saldo restante entre los pagos pendientes
        const nuevoImporte = parseFloat((saldoRestante / pendingPayments.length).toFixed(2));
        let ajuste = saldoRestante - nuevoImporte * pendingPayments.length;

        for (const pago of pendingPayments) {
            const importeFinal = nuevoImporte + (ajuste > 0 ? 0.01 : ajuste < 0 ? -0.01 : 0);
            ajuste -= ajuste > 0 ? 0.01 : ajuste < 0 ? -0.01 : 0;

            await connection.execute('UPDATE anticipos_pagos SET importe = ? WHERE id = ?', [importeFinal, pago.id]);
        }

        console.log(`recalculatePendingPayments - Pagos pendientes recalculados para el anticipo ${anticipoId}`);
    } catch (error) {
        console.error('Error en recalculatePendingPayments:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { deleteAdvances, deletePago, getAdvances, getPagos, getPeriodicidades, handlePaymentDeletion, pushAdvance, pushPago, recalculatePaymentPlan, recalculatePendingPayments };
