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

// DC-38: el importe pendiente no se guarda; es el principal menos la suma de los pagos pagados. El estado completado se deduce de él.
const SQL_PENDIENTE = "a.importe_original - COALESCE((SELECT SUM(p.importe) FROM anticipos_pagos p WHERE p.anticipo_id = a.id AND p.estado = 'pagado'), 0)";
const SQL_ESTADO = "CASE WHEN a.estado IN ('pausado', 'cancelado') THEN a.estado WHEN (" + SQL_PENDIENTE + ") < 0.005 THEN 'completado' ELSE 'activo' END";
const SQL_ANTICIPO = 'SELECT a.id, a.concepto, a.importe_original, ROUND(' + SQL_PENDIENTE + ', 2) AS pendiente, a.pago_sugerido, a.fecha_inicio, a.fecha_fin_prevista, a.descripcion, ' + SQL_ESTADO + ' AS estado, a.cuenta_origen_id, a.periodicidad, a.created_at, a.updated_at, a.propietario_id, a.es_privado FROM anticipos a';

async function leerPendiente(connection, anticipoId) {
    const [filas] = await connection.execute('SELECT ROUND(' + SQL_PENDIENTE + ', 2) AS pendiente FROM anticipos a WHERE a.id = ?', [anticipoId]);
    return filas.length ? filas[0].pendiente : 0;
}

async function getAdvances() {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(SQL_ANTICIPO + ' ORDER BY a.fecha_inicio ASC');
        return rows;
    } catch (error) {
        console.error('Error al obtener anticipos:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function pushAdvance(id, concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista = null, descripcion = null, estado = 'activo', cuenta_origen_id, periodicidad, propietario_id) {
    let connection;
    try {
        connection = await getConnection();

        // Asegurarse de que los valores undefined sean tratados como null
        concepto = concepto ?? null;
        importe_original = importe_original ?? null;
        pago_sugerido = pago_sugerido ?? null;
        fecha_inicio = fecha_inicio ?? null;
        fecha_fin_prevista = fecha_fin_prevista ?? null;
        descripcion = descripcion ?? null;
        estado = estado ?? null;
        cuenta_origen_id = cuenta_origen_id ?? null;
        periodicidad = periodicidad ?? null;

        // DC-38: el importe es el principal del anticipo: número mayor o igual que 0
        if (importe_original === null || importe_original === '' || !Number.isFinite(Number(importe_original)) || Number(importe_original) < 0) {
            throw new Error('El importe del anticipo debe ser un número mayor o igual que 0');
        }

        // DC-38: completado se deduce del importe pendiente y no se guarda
        if (estado === 'completado') estado = 'activo';

        // DC-31/F-44: el concepto se guarda en minúsculas; la pantalla lo capitaliza al mostrarlo
        const conceptoOriginal = concepto;
        concepto = typeof concepto === 'string' ? concepto.trim().toLowerCase() : concepto;
        if (conceptoOriginal !== concepto) {
            console.log('pushAdvance - Concepto normalizado a minúsculas: ' + JSON.stringify(conceptoOriginal) + ' -> ' + JSON.stringify(concepto));
        }

        if (id) {
            // Actualizar anticipo existente
            const [result] = await connection.execute(
                'UPDATE anticipos SET concepto = ?, importe_original = ?, pago_sugerido = ?, fecha_inicio = ?, fecha_fin_prevista = ?, descripcion = COALESCE(?, descripcion), estado = ?, cuenta_origen_id = ?, periodicidad = ? WHERE id = ?',
                [concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad, id]
            );
            console.log('Actualización realizada en anticipos, filas afectadas: ' + result.affectedRows);

            // Si se especifica periodicidad y pago sugerido, recalcular el plan de pagos
            if (periodicidad && Number(pago_sugerido) > 0) {
                await recalculatePaymentPlan(id);
            } else {
                console.log('pushAdvance - Plan de pagos no recalculado para el anticipo ' + id + ': requiere periodicidad y un pago sugerido mayor que 0');
            }
        } else {
            // Insertar nuevo anticipo
            if (!propietario_id) throw new Error('Falta el propietario para crear el anticipo');
            const [result] = await connection.execute('INSERT INTO anticipos (concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad, propietario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                concepto,
                importe_original,
                pago_sugerido,
                fecha_inicio,
                fecha_fin_prevista,
                descripcion,
                estado,
                cuenta_origen_id,
                periodicidad,
                propietario_id
            ]);
            console.log('Inserción realizada en anticipos, filas afectadas: ' + result.affectedRows);

            const anticipoId = result.insertId;

            // Si se especifica periodicidad y pago sugerido, crear el plan de pagos
            if (periodicidad && Number(pago_sugerido) > 0) {
                await recalculatePaymentPlan(anticipoId);
            } else {
                console.log('pushAdvance - Plan de pagos no generado para el anticipo ' + anticipoId + ': requiere periodicidad y un pago sugerido mayor que 0');
            }
        }
    } catch (error) {
        console.error('Error en pushAdvance:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function recalculatePaymentPlan(anticipoId) {
    let connection;
    try {
        connection = await getConnection();

        console.log('recalculatePaymentPlan - Iniciando recálculo del plan de pagos para el anticipo con ID: ' + anticipoId);

        // DC-38: todos los datos salen de la base de datos; el importe pendiente es el principal menos los pagos pagados
        const [anticipoData] = await connection.execute(SQL_ANTICIPO + ' WHERE a.id = ?', [anticipoId]);
        if (anticipoData.length === 0) {
            throw new Error('Anticipo con ID ' + anticipoId + ' no encontrado');
        }
        const { pendiente, fecha_inicio, periodicidad, cuenta_origen_id: cuentaDestinoId } = anticipoData[0];
        let pago_sugerido = anticipoData[0].pago_sugerido;
        console.log('recalculatePaymentPlan - Datos obtenidos de la base de datos: pendiente=' + pendiente + ', pago_sugerido=' + pago_sugerido + ', fecha_inicio=' + fecha_inicio + ', periodicidad=' + periodicidad);
        console.log('recalculatePaymentPlan - Cuenta origen asociada al anticipo: ' + cuentaDestinoId);

        // Obtener todos los pagos existentes (pagados y pendientes)
        const [existingPagos] = await connection.execute('SELECT * FROM anticipos_pagos WHERE anticipo_id = ? ORDER BY fecha ASC', [anticipoId]);

        console.log('recalculatePaymentPlan - Pagos existentes: ' + JSON.stringify(existingPagos));

        // Filtrar los pagos pendientes
        const pagosPendientes = existingPagos.filter((pago) => pago.estado === 'pendiente');

        // Restar los pagos pendientes del importe pendiente del anticipo: lo que queda es lo que falta por planificar
        let porPlanificar = Number(pendiente);
        for (const pago of pagosPendientes) {
            porPlanificar -= Number(pago.importe);
        }

        porPlanificar = Math.round(porPlanificar * 100) / 100; // F-36: sin residuos de coma flotante
        console.log('recalculatePaymentPlan - Importe por planificar después de considerar los pagos pendientes: ' + porPlanificar);

        // Determinar la fecha del próximo pago basándote en el último pago existente
        let fechaPago = new Date(fecha_inicio);
        if (existingPagos.length > 0) {
            const ultimaFechaExistente = new Date(existingPagos[existingPagos.length - 1].fecha);
            fechaPago = new Date(ultimaFechaExistente);
            fechaPago.setMonth(fechaPago.getMonth() + getMonthsFromPeriodicidad(periodicidad));
        }

        // Crear nuevos pagos si es necesario
        // El pago sugerido llega como cadena desde la base de datos (por ejemplo '0.00'): se convierte a número y se valida antes de crear ningún pago
        pago_sugerido = Number(pago_sugerido);
        if (porPlanificar > 0) {
            if (!Number.isFinite(pago_sugerido) || pago_sugerido <= 0) {
                throw new Error('El pago sugerido debe ser mayor que 0 para generar el plan de pagos');
            }
            if (Math.ceil(porPlanificar / pago_sugerido) > 1200) {
                throw new Error('El plan superaría los 1200 pagos; revisa el importe y el pago sugerido');
            }
        }
        let ultimaFechaPago = null;
        while (porPlanificar > 0) {
            const importePago = porPlanificar > pago_sugerido ? pago_sugerido : porPlanificar;
            await connection.execute('INSERT INTO anticipos_pagos (anticipo_id, importe, fecha, tipo, estado, cuenta_destino_id) VALUES (?, ?, ?, ?, ?, ?)', [
                anticipoId,
                importePago,
                fechaPago.toISOString().split('T')[0],
                'regular',
                'pendiente',
                cuentaDestinoId
            ]);
            console.log('recalculatePaymentPlan - Nuevo pago creado con importe: ' + importePago + ', fecha: ' + fechaPago.toISOString().split('T')[0]);
            porPlanificar = Math.round((porPlanificar - importePago) * 100) / 100; // F-36
            ultimaFechaPago = new Date(fechaPago); // Actualizar la fecha del último pago
            fechaPago.setMonth(fechaPago.getMonth() + getMonthsFromPeriodicidad(periodicidad));
        }

        // Actualizar la fecha fin prevista del anticipo con la fecha del último pago
        if (ultimaFechaPago) {
            await connection.execute('UPDATE anticipos SET fecha_fin_prevista = ? WHERE id = ?', [ultimaFechaPago.toISOString().split('T')[0], anticipoId]);
            console.log('recalculatePaymentPlan - Fecha fin prevista actualizada a: ' + ultimaFechaPago.toISOString().split('T')[0]);
        }

        console.log('recalculatePaymentPlan - Plan de pagos recalculado exitosamente para el anticipo con ID: ' + anticipoId);
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
            // Obtener el estado y el importe actuales del pago antes de actualizarlo
            const [existingPago] = await connection.execute('SELECT estado, importe, fecha FROM anticipos_pagos WHERE id = ?', [id]);
            if (existingPago.length === 0) {
                throw new Error('Pago con ID ' + id + ' no encontrado');
            }
            const previousEstado = existingPago[0].estado;
            const previousImporte = existingPago[0].importe;
            const previousFecha = existingPago[0].fecha;

            // DC-38: un pago pagado no puede cancelarse; para rectificarlo se vuelve a pendiente
            if (previousEstado === 'pagado' && estado === 'cancelado') {
                const noCancelable = new Error('Un pago pagado no puede cancelarse: vuelve a pendiente si hay que rectificarlo');
                noCancelable.status = 400;
                throw noCancelable;
            }

            // Actualizar el pago existente. DC-38: el importe pendiente se deriva de los pagos pagados, así que no hay nada que ajustar
            const [result] = await connection.execute('UPDATE anticipos_pagos SET importe = ?, fecha = ?, tipo = ?, descripcion = COALESCE(?, descripcion), estado = ?, cuenta_destino_id = ? WHERE id = ?', [
                importe,
                fecha,
                tipo,
                descripcion,
                estado,
                cuenta_destino_id,
                id
            ]);
            console.log('Actualización en anticipos_pagos, filas afectadas: ' + result.affectedRows);

            // Si el importe cambia y el pago está pendiente, recalcular los pagos posteriores
            if (estado === 'pendiente' && Math.abs(Number(previousImporte) - Number(importe)) >= 0.01) {
                console.log('pushPago - Recalculando pagos pendientes para el anticipo ' + anticipo_id + ' debido a cambio en el importe.');
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
            console.log('Inserción en anticipos_pagos, filas afectadas: ' + result.affectedRows);

            // Si el pago es extraordinario, ajustar los últimos pagos regulares
            if (tipo === 'extraordinario') {
                await recalculatePaymentPlan(anticipo_id);
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
        const [anticipo] = await connection.execute(SQL_ANTICIPO + ' WHERE a.id = ?', [anticipo_id]);
        if (anticipo.length === 0) throw new Error(`Anticipo con ID ${anticipo_id} no encontrado`);

        const importeTotal = parseFloat(anticipo[0].pendiente);
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

        console.log('deletePago - ID recibido: ' + id);

        // Obtener el anticipo del pago antes de eliminarlo
        const [pago] = await connection.execute('SELECT anticipo_id FROM anticipos_pagos WHERE id = ?', [id]);
        if (pago.length === 0) {
            throw new Error('Pago con ID ' + id + ' no encontrado');
        }
        const { anticipo_id } = pago[0];

        // Eliminar el pago
        const [result] = await connection.execute('DELETE FROM anticipos_pagos WHERE id = ?', [id]);
        console.log('Eliminación en anticipos_pagos, filas afectadas: ' + result.affectedRows);

        // DC-38: el importe pendiente se deriva de los pagos pagados y sube solo al borrar un pagado; se devuelve a la ruta
        return await leerPendiente(connection, anticipo_id);
    } catch (error) {
        console.error('Error en deletePago:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function completarPlanTrasBorrado(anticipoId) {
    let connection;
    try {
        connection = await getConnection();

        const [anticipo] = await connection.execute(SQL_ANTICIPO + ' WHERE a.id = ?', [anticipoId]);
        if (anticipo.length === 0) {
            throw new Error(`Anticipo con ID ${anticipoId} no encontrado`);
        }
        const pendiente = Number(anticipo[0].pendiente);
        const pagoSugerido = Number(anticipo[0].pago_sugerido);

        // Importe que falta por colocar: el importe pendiente del anticipo menos lo que ya suman los pagos pendientes
        const [pendientes] = await connection.execute("SELECT id, importe FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente' ORDER BY importe ASC, fecha ASC", [anticipoId]);
        const sumaPendientes = pendientes.reduce((total, p) => total + Number(p.importe), 0);
        let restante = Math.round((pendiente - sumaPendientes) * 100) / 100;
        console.log(`completarPlanTrasBorrado - Anticipo ${anticipoId}: pendiente del anticipo ${pendiente.toFixed(2)}, pagos pendientes ${sumaPendientes.toFixed(2)} en ${pendientes.length} pagos, por colocar ${restante.toFixed(2)}, pago sugerido ${pagoSugerido.toFixed(2)}`);

        // Paso 1: subir los pagos pendientes que estén por debajo del pago sugerido hasta ese tope
        let pagosAjustados = 0;
        for (const pago of pendientes) {
            if (restante <= 0) break;
            const actual = Number(pago.importe);
            if (actual >= pagoSugerido) continue;
            const incremento = Math.round(Math.min(restante, pagoSugerido - actual) * 100) / 100;
            const nuevoImporte = Math.round((actual + incremento) * 100) / 100;
            await connection.execute('UPDATE anticipos_pagos SET importe = ? WHERE id = ?', [nuevoImporte, pago.id]);
            restante = Math.round((restante - incremento) * 100) / 100;
            pagosAjustados++;
            console.log(`completarPlanTrasBorrado - Pago ID ${pago.id} de ${actual.toFixed(2)} a ${nuevoImporte.toFixed(2)} (+${incremento.toFixed(2)})`);
        }

        // Paso 2: crear los pagos nuevos que hagan falta, de hasta el pago sugerido, a continuación del último pago
        let pagosCreados = 0;
        if (restante > 0) {
            console.log(`completarPlanTrasBorrado - Quedan ${restante.toFixed(2)} por colocar: se crean pagos nuevos de hasta ${pagoSugerido.toFixed(2)}`);
            const [antes] = await connection.execute('SELECT COUNT(*) AS n FROM anticipos_pagos WHERE anticipo_id = ?', [anticipoId]);
            await recalculatePaymentPlan(anticipoId);
            const [despues] = await connection.execute('SELECT COUNT(*) AS n FROM anticipos_pagos WHERE anticipo_id = ?', [anticipoId]);
            pagosCreados = Number(despues[0].n) - Number(antes[0].n);
        }

        console.log(`completarPlanTrasBorrado - Anticipo ${anticipoId}: ${pagosAjustados} pagos ajustados y ${pagosCreados} pagos nuevos`);
        return { pagosAjustados, pagosCreados };
    } catch (error) {
        console.error('Error en completarPlanTrasBorrado:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function handlePaymentDeletion(pagoId, redistribuir = false) {
    let connection;
    try {
        connection = await getConnection();

        // Obtener detalles del pago a eliminar
        const [pago] = await connection.execute('SELECT anticipo_id, importe, estado FROM anticipos_pagos WHERE id = ?', [pagoId]);
        if (pago.length === 0) {
            throw new Error(`Pago con ID ${pagoId} no encontrado`);
        }

        const { anticipo_id, importe, estado } = pago[0];

        // Recalcular puede crear pagos nuevos: hace falta pago sugerido y periodicidad, y se comprueba antes de borrar nada (DC-12)
        if (redistribuir) {
            const [datos] = await connection.execute('SELECT pago_sugerido, periodicidad FROM anticipos WHERE id = ?', [anticipo_id]);
            if (datos.length === 0) {
                throw new Error(`Anticipo con ID ${anticipo_id} no encontrado`);
            }
            if (!(Number(datos[0].pago_sugerido) > 0) || !datos[0].periodicidad) {
                const sinDatos = new Error('No se pueden recalcular los pagos: el anticipo necesita un pago sugerido mayor que 0 y una periodicidad');
                sinDatos.status = 400;
                throw sinDatos;
            }
        }

        // Eliminar el pago
        console.log('handlePaymentDeletion - Eliminando el pago ID: ' + pagoId + ' (anticipo ' + anticipo_id + ', importe ' + importe + ', estado ' + estado + ', redistribuir: ' + (redistribuir ? 'sí' : 'no') + ')');
        const [result] = await connection.execute('DELETE FROM anticipos_pagos WHERE id = ?', [pagoId]);
        console.log(`Pago eliminado, filas afectadas: ${result.affectedRows}`);

        // DC-38: el importe pendiente se deriva de los pagos pagados y sube solo al borrar un pagado
        const pendiente = await leerPendiente(connection, anticipo_id);

        // Completar el plan con el importe del pago eliminado: ajustar los pendientes hasta el sugerido y crear los pagos que falten (DC-12)
        let redistribuido = false;
        let pagosAjustados = 0;
        let pagosCreados = 0;
        if (redistribuir) {
            ({ pagosAjustados, pagosCreados } = await completarPlanTrasBorrado(anticipo_id));
            redistribuido = pagosAjustados + pagosCreados > 0;
            if (redistribuido) {
                console.log('handlePaymentDeletion - Importe ' + importe + ' colocado en el anticipo ' + anticipo_id + ': ' + pagosAjustados + ' pagos ajustados y ' + pagosCreados + ' pagos nuevos');
            } else {
                console.log('handlePaymentDeletion - No había importe que colocar en el anticipo ' + anticipo_id + ': el plan ya cubre el importe pendiente');
            }
        }

        return { pendiente, anticipoId: anticipo_id, redistribuido, pagosAjustados, pagosCreados };
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

        // Calcular el importe pendiente del anticipo
        const [anticipo] = await connection.execute(SQL_ANTICIPO + ' WHERE a.id = ?', [anticipoId]);

        if (anticipo.length === 0) {
            throw new Error(`Anticipo con ID ${anticipoId} no encontrado`);
        }

        const importePendiente = Number(anticipo[0].pendiente);

        // Prorratear el importe pendiente entre los pagos pendientes
        const nuevoImporte = parseFloat((importePendiente / pendingPayments.length).toFixed(2));
        let ajuste = importePendiente - nuevoImporte * pendingPayments.length;

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
