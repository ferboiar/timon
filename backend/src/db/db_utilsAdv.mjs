/**
 * Utilidades para la gestión de anticipos en la base de datos
 *
 * Este módulo proporciona funciones para interactuar con las tablas 'anticipos' y 'anticipos_pagos'.
 * Permite gestionar préstamos o anticipos con un plan de pagos asociado, incluyendo operaciones
 * como obtener todos los anticipos, crear o actualizar anticipos y sus pagos asociados,
 * eliminar anticipos, y gestionar el plan de pagos de forma automatizada según la periodicidad.
 * También incluye funcionalidad para recalcular pagos cuando se modifica un anticipo.
 *
 * Transacciones (F-27, DC-39): las operaciones públicas que escriben en más de una fila (pushAdvance, pushPago,
 * handlePaymentDeletion, sustituirPago, deleteAdvances, recalculatePaymentPlan y recalculatePendingPayments) se ejecutan
 * con enTransaccion: o se aplican enteras o no se aplica nada. Todas empiezan bloqueando la fila del anticipo
 * (bloquearAnticipo, SELECT ... FOR UPDATE), de modo que dos peticiones sobre el mismo anticipo se ejecutan una detrás
 * de otra y no pisan sus cálculos. Las funciones internas reciben la conexión de quien las llama y no abren otra.
 *
 * @module db_utilsAdv
 */

import { enTransaccion, getConnection } from './db_connection.mjs';
import { fechaISO, siguienteFechaAnclada, sumarMesesAnclado } from '../utils/fechasAnticipos.mjs';
import { ErrorDeNegocio } from '../utils/errorDeNegocio.mjs';

// DC-38: el importe pendiente no se guarda; es el principal menos la suma de los pagos pagados. El estado completado se deduce de él.
const SQL_PENDIENTE = "a.importe_original - COALESCE((SELECT SUM(p.importe) FROM anticipos_pagos p WHERE p.anticipo_id = a.id AND p.estado = 'pagado'), 0)";
const SQL_ESTADO = "CASE WHEN a.estado IN ('pausado', 'cancelado') THEN a.estado WHEN (" + SQL_PENDIENTE + ") < 0.005 THEN 'completado' ELSE 'activo' END";
const SQL_ANTICIPO = 'SELECT a.id, a.concepto, a.importe_original, ROUND(' + SQL_PENDIENTE + ', 2) AS pendiente, a.pago_sugerido, a.fecha_inicio, a.fecha_fin_prevista, a.descripcion, ' + SQL_ESTADO + ' AS estado, a.cuenta_origen_id, a.periodicidad, a.created_at, a.updated_at, a.propietario_id, a.es_privado FROM anticipos a';

async function leerPendiente(connection, anticipoId) {
    const [filas] = await connection.execute('SELECT ROUND(' + SQL_PENDIENTE + ', 2) AS pendiente FROM anticipos a WHERE a.id = ?', [anticipoId]);
    return filas.length ? filas[0].pendiente : 0;
}

// Traduce los errores de clave foránea de MariaDB (una cuenta que no existe) a un 400 con un mensaje que el usuario entienda.
// El resto de errores se devuelven tal cual: las rutas los tratan como fallos internos y no muestran su detalle.
function traducirErrorBD(error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return errorHttp(400, 'La cuenta indicada no existe');
    }
    return error;
}

// Crea un error con código HTTP: las rutas lo devuelven tal cual (400 datos no válidos, 404 no existe)
// F-48: es un error de negocio de la utilidad compartida, no un error con `status` suelto
function errorHttp(estado, mensaje, codigo = null) {
    return new ErrorDeNegocio(mensaje, estado, codigo);
}

/**
 * Bloquea la fila del anticipo hasta el final de la transacción (SELECT ... FOR UPDATE) y devuelve true si existe.
 * Todas las operaciones que modifican un anticipo o sus pagos empiezan por aquí: el bloqueo las serializa por anticipo
 * y evita, por ejemplo, que dos recálculos simultáneos del plan inserten los mismos pagos dos veces.
 * Se bloquea siempre primero el anticipo y después se leen o escriben sus pagos, en ese orden, para que dos
 * transacciones no puedan bloquearse mutuamente (interbloqueo).
 */
async function bloquearAnticipo(connection, anticipoId) {
    const [filas] = await connection.execute('SELECT id FROM anticipos WHERE id = ? FOR UPDATE', [anticipoId]);
    return filas.length > 0;
}

/**
 * Indica si el plan cuadra: la suma de los pagos pendientes es igual al importe pendiente del anticipo (DC-40).
 * Se usa antes de editar un pago: solo si el plan cuadraba tiene sentido repartir la diferencia entre los pendientes;
 * si ya había un hueco, repartirlo de forma automática haría que algún pago absorbiera un importe que nadie ha decidido.
 * Tolerancia de un céntimo para los redondeos.
 */
async function planCuadra(connection, anticipoId) {
    const pendiente = Number(await leerPendiente(connection, anticipoId));
    const [filas] = await connection.execute("SELECT COALESCE(SUM(importe), 0) AS suma FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente'", [anticipoId]);
    return Math.abs(pendiente - Number(filas[0].suma)) < 0.01;
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

/**
 * Crea o actualiza un anticipo y, si tiene periodicidad y pago sugerido, genera o completa su plan de pagos.
 *
 * Transacción (F-27, DC-39): el anticipo y su plan se guardan juntos o no se guarda nada. Si la generación del plan
 * falla (por ejemplo, porque superaría los 1200 pagos), el anticipo ni se crea ni se modifica.
 * Devuelve el id del anticipo.
 */
async function pushAdvance(id, concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista = null, descripcion = null, estado = 'activo', cuenta_origen_id, periodicidad, propietario_id, es_privado = null) {
    // S-01/DC-48: null conserva la privacidad en la edición; 0 pública; 1 solo propietario y admin
    const valorPrivado = es_privado === undefined || es_privado === null || es_privado === '' ? null : Number(es_privado) === 1 ? 1 : 0;

    try {
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
            throw errorHttp(400, 'El importe del anticipo debe ser un número mayor o igual que 0');
        }

        // DC-38: completado se deduce del importe pendiente y no se guarda
        if (estado === 'completado') estado = 'activo';

        // DC-31/F-44: el concepto se guarda en minúsculas; la pantalla lo capitaliza al mostrarlo
        const conceptoOriginal = concepto;
        concepto = typeof concepto === 'string' ? concepto.trim().toLowerCase() : concepto;
        if (conceptoOriginal !== concepto) {
            console.log('pushAdvance - Concepto normalizado a minúsculas: ' + JSON.stringify(conceptoOriginal) + ' -> ' + JSON.stringify(concepto));
        }

        // Desde aquí se escribe en varias filas (anticipo y plan): todo dentro de una transacción
        return await enTransaccion(null, async (connection) => {
            if (id) {
                // Se bloquea el anticipo antes de tocarlo: ninguna otra petición puede cambiar sus pagos mientras se recalcula el plan
                if (!(await bloquearAnticipo(connection, id))) {
                    throw errorHttp(404, 'Anticipo con ID ' + id + ' no encontrado');
                }

                // Actualizar anticipo existente
                const [result] = await connection.execute(
                    'UPDATE anticipos SET concepto = ?, importe_original = ?, pago_sugerido = ?, fecha_inicio = ?, fecha_fin_prevista = ?, descripcion = COALESCE(?, descripcion), estado = ?, cuenta_origen_id = ?, periodicidad = ?, es_privado = COALESCE(?, es_privado) WHERE id = ?',
                    [concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad, valorPrivado, id]
                );
                console.log('Actualización realizada en anticipos, filas afectadas: ' + result.affectedRows);

                // Si se especifica periodicidad y pago sugerido, recalcular el plan de pagos
                if (periodicidad && Number(pago_sugerido) > 0) {
                    await generarPlanDePagos(connection, id);
                } else {
                    console.log('pushAdvance - Plan de pagos no recalculado para el anticipo ' + id + ': requiere periodicidad y un pago sugerido mayor que 0');
                }
                return id;
            }

            // Insertar nuevo anticipo
            if (!propietario_id) throw errorHttp(400, 'Falta el propietario para crear el anticipo');
            const [result] = await connection.execute('INSERT INTO anticipos (concepto, importe_original, pago_sugerido, fecha_inicio, fecha_fin_prevista, descripcion, estado, cuenta_origen_id, periodicidad, propietario_id, es_privado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 0))', [
                concepto,
                importe_original,
                pago_sugerido,
                fecha_inicio,
                fecha_fin_prevista,
                descripcion,
                estado,
                cuenta_origen_id,
                periodicidad,
                propietario_id,
                valorPrivado
            ]);
            console.log('Inserción realizada en anticipos, filas afectadas: ' + result.affectedRows);

            // El anticipo recién creado solo es visible para esta transacción, así que no hace falta bloquearlo
            const anticipoId = result.insertId;

            // Si se especifica periodicidad y pago sugerido, crear el plan de pagos
            if (periodicidad && Number(pago_sugerido) > 0) {
                await generarPlanDePagos(connection, anticipoId);
            } else {
                console.log('pushAdvance - Plan de pagos no generado para el anticipo ' + anticipoId + ': requiere periodicidad y un pago sugerido mayor que 0');
            }
            return anticipoId;
        });
    } catch (error) {
        console.error('Error en pushAdvance:', error.status ? error.message : error);
        throw traducirErrorBD(error);
    }
}

/**
 * Genera los pagos pendientes que faltan para cubrir el importe pendiente del anticipo (función interna).
 *
 * Recibe la conexión de quien la llama, que ya ha bloqueado el anticipo y es dueño de la transacción. No elimina
 * pagos existentes: al importe pendiente (principal menos pagos pagados) le resta lo que ya suman los pagos
 * pendientes y crea pagos nuevos de hasta el pago sugerido por lo que falte, a continuación del último pago.
 */
async function generarPlanDePagos(connection, anticipoId) {
    try {
        console.log('recalculatePaymentPlan - Iniciando recálculo del plan de pagos para el anticipo con ID: ' + anticipoId);

        // DC-38: todos los datos salen de la base de datos; el importe pendiente es el principal menos los pagos pagados
        const [anticipoData] = await connection.execute(SQL_ANTICIPO + ' WHERE a.id = ?', [anticipoId]);
        if (anticipoData.length === 0) {
            throw errorHttp(404, 'Anticipo con ID ' + anticipoId + ' no encontrado');
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

        // F-46/DC-41: la secuencia está anclada en el día de fecha_inicio. Si el día no existe
        // en un mes se usa el último día de ese mes, sin arrastrar desvíos ni depender de la zona horaria.
        const mesesPeriodo = getMonthsFromPeriodicidad(periodicidad);
        if (mesesPeriodo <= 0) {
            throw errorHttp(400, 'La periodicidad del anticipo no permite generar fechas de pago');
        }
        const diaAncla = Number(fechaISO(fecha_inicio).slice(8, 10));
        let fechaPagoISO;
        if (existingPagos.length > 0) {
            const ultimaFechaExistente = fechaISO(existingPagos[existingPagos.length - 1].fecha);
            fechaPagoISO = siguienteFechaAnclada(ultimaFechaExistente, fechaISO(fecha_inicio), mesesPeriodo);
        } else {
            fechaPagoISO = fechaISO(fecha_inicio);
        }

        // Crear nuevos pagos si es necesario
        // El pago sugerido llega como cadena desde la base de datos (por ejemplo '0.00'): se convierte a número y se valida antes de crear ningún pago
        pago_sugerido = Number(pago_sugerido);
        if (porPlanificar > 0) {
            if (!Number.isFinite(pago_sugerido) || pago_sugerido <= 0) {
                throw errorHttp(400, 'El pago sugerido debe ser mayor que 0 para generar el plan de pagos');
            }
            if (Math.ceil(porPlanificar / pago_sugerido) > 1200) {
                throw errorHttp(400, 'El plan tendría más de 1200 pagos. Sube el pago sugerido o baja el importe.');
            }
        }
        let ultimaFechaPago = null;
        while (porPlanificar > 0) {
            const importePago = porPlanificar > pago_sugerido ? pago_sugerido : porPlanificar;
            await connection.execute('INSERT INTO anticipos_pagos (anticipo_id, importe, fecha, tipo, estado, cuenta_destino_id) VALUES (?, ?, ?, ?, ?, ?)', [
                anticipoId,
                importePago,
                fechaPagoISO,
                'regular',
                'pendiente',
                cuentaDestinoId
            ]);
            console.log('recalculatePaymentPlan - Nuevo pago creado con importe: ' + importePago + ', fecha: ' + fechaPagoISO);
            porPlanificar = Math.round((porPlanificar - importePago) * 100) / 100; // F-36
            ultimaFechaPago = fechaPagoISO;
            fechaPagoISO = sumarMesesAnclado(fechaPagoISO, mesesPeriodo, diaAncla);
        }

        // Actualizar la fecha fin prevista del anticipo con la fecha del último pago
        if (ultimaFechaPago) {
            await connection.execute('UPDATE anticipos SET fecha_fin_prevista = ? WHERE id = ?', [ultimaFechaPago, anticipoId]);
            console.log('recalculatePaymentPlan - Fecha fin prevista actualizada a: ' + ultimaFechaPago);
        }

        console.log('recalculatePaymentPlan - Plan de pagos recalculado exitosamente para el anticipo con ID: ' + anticipoId);
    } catch (error) {
        console.error('Error en recalculatePaymentPlan:', error.status ? error.message : error);
        throw error;
    }
}

/**
 * Genera o completa el plan de pagos de un anticipo (lo usa POST /recalculate-payment-plan).
 * Es la versión pública de generarPlanDePagos: abre su propia transacción y bloquea el anticipo, o se une a la de
 * quien la llame si se le pasa una conexión.
 */
async function recalculatePaymentPlan(anticipoId, conexion = null) {
    return enTransaccion(conexion, async (connection) => {
        if (!(await bloquearAnticipo(connection, anticipoId))) {
            throw errorHttp(404, 'Anticipo con ID ' + anticipoId + ' no encontrado');
        }
        return generarPlanDePagos(connection, anticipoId);
    });
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

/**
 * Elimina uno o más anticipos con todos sus pagos.
 *
 * Transacción (F-27, DC-39): se bloquean los anticipos y se borran primero sus pagos y después los anticipos; si algo
 * falla no se borra nada. Devuelve cuántos anticipos se han eliminado.
 */
async function deleteAdvances(advances) {
    if (!Array.isArray(advances)) advances = [advances];
    console.log('deleteAdvances - IDs de anticipos a eliminar:', advances);
    try {
        return await enTransaccion(null, async (connection) => {
            const placeholders = advances.map(() => '?').join(',');

            // Bloqueo de todos los anticipos a borrar antes de tocar sus pagos
            await connection.execute('SELECT id FROM anticipos WHERE id IN (' + placeholders + ') FOR UPDATE', advances);

            // Eliminar pagos asociados (la clave foránea también los borraría en cascada, pero así queda traza)
            const [deletePagosResult] = await connection.execute('DELETE FROM anticipos_pagos WHERE anticipo_id IN (' + placeholders + ')', advances);
            console.log('deleteAdvances - Pagos eliminados, filas afectadas:', deletePagosResult.affectedRows);

            // Eliminar anticipos
            const [deleteAnticiposResult] = await connection.execute('DELETE FROM anticipos WHERE id IN (' + placeholders + ')', advances);
            console.log('deleteAdvances - Anticipos eliminados, filas afectadas:', deleteAnticiposResult.affectedRows);
            return deleteAnticiposResult.affectedRows;
        });
    } catch (error) {
        console.error('deleteAdvances - Error al eliminar los anticipos:', error);
        throw error;
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
        console.error('Error en getPeriodicidades:', error.status ? error.message : error);
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
        console.error('Error en getPagos:', error.status ? error.message : error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Crea o actualiza un pago de un anticipo. Devuelve el id del pago.
 *
 * Transacción (F-27, DC-39): el pago y el recálculo de los demás pagos que provoca se guardan juntos. Antes de nada se
 * bloquea el anticipo (bloquearAnticipo) para que ninguna otra petición modifique sus pagos mientras se calcula.
 *
 * - Edición (id): el anticipo se deduce del propio pago. El anticipo_id que llegue en la petición se ignora, para no
 *   actuar sobre un anticipo distinto de aquel al que pertenece el pago.
 * - Alta: si el pago es extraordinario se completa el plan (generarPlanDePagos) en la misma transacción.
 * Un pago pagado no puede pasar a cancelado (DC-38).
 * Si cambia el importe de un pago que queda pendiente, o que queda pagado con el plan cuadrado, la diferencia se reparte
 * entre los pagos pendientes posteriores (DC-08, DC-40).
 */
async function pushPago(id, anticipo_id, importe, fecha, tipo, descripcion = null, estado = 'pendiente', cuenta_destino_id) {
    try {
        return await enTransaccion(null, async (connection) => {
            if (id) {
                // El anticipo se averigua desde el propio pago
                const [duenio] = await connection.execute('SELECT anticipo_id FROM anticipos_pagos WHERE id = ?', [id]);
                if (duenio.length === 0) {
                    throw errorHttp(404, 'Pago con ID ' + id + ' no encontrado');
                }
                const anticipoDelPago = duenio[0].anticipo_id;
                await bloquearAnticipo(connection, anticipoDelPago);

                // El pago se lee de nuevo ya con el anticipo bloqueado: mientras se esperaba el bloqueo otra petición pudo modificarlo o borrarlo
                const [existingPago] = await connection.execute('SELECT estado, importe, fecha FROM anticipos_pagos WHERE id = ?', [id]);
                if (existingPago.length === 0) {
                    throw errorHttp(404, 'Pago con ID ' + id + ' no encontrado');
                }
                const previousEstado = existingPago[0].estado;
                const previousImporte = existingPago[0].importe;
                const previousFecha = existingPago[0].fecha;

                // DC-38: un pago pagado no puede cancelarse; para rectificarlo se vuelve a pendiente
                if (previousEstado === 'pagado' && estado === 'cancelado') {
                    throw errorHttp(400, 'Un pago pagado no puede cancelarse: vuelve a pendiente si hay que rectificarlo');
                }

                // DC-40: se anota si el plan cuadraba antes de la edición (suma de pendientes igual al importe pendiente)
                const planCuadrabaAntes = await planCuadra(connection, anticipoDelPago);

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
                console.log('pushPago - Pago ' + id + ' del anticipo ' + anticipoDelPago + ': estado ' + previousEstado + ' -> ' + estado + ', importe ' + previousImporte + ' -> ' + importe + ', fecha ' + previousFecha + ' -> ' + fecha);

                // Si el importe cambia, la diferencia se reparte entre los pagos pendientes posteriores (DC-08) para que la suma de
                // los pendientes siga igual al importe pendiente del anticipo:
                // - pago que queda pendiente: siempre, como hasta ahora;
                // - pago que queda pagado (DC-40): solo si el plan cuadraba antes de la edición. Si no cuadraba, el hueco que ya había
                //   no se reparte a escondidas entre los pagos: se deja como estaba y se anota en el log.
                const importeCambia = Math.abs(Number(previousImporte) - Number(importe)) >= 0.01;
                if (importeCambia && (estado === 'pendiente' || (estado === 'pagado' && planCuadrabaAntes))) {
                    console.log('pushPago - Recalculando pagos pendientes para el anticipo ' + anticipoDelPago + ' debido a cambio en el importe.');
                    await recalculatePostEditPayments(connection, anticipoDelPago, previousImporte, importe, previousFecha);
                } else if (importeCambia && estado === 'pagado') {
                    console.log('pushPago - Anticipo ' + anticipoDelPago + ': el plan no cuadraba con el importe pendiente antes de editar el pago; los pagos pendientes no se recalculan.');
                }
                return id;
            }

            // Alta: el anticipo debe existir y se bloquea igual que en la edición
            if (!(await bloquearAnticipo(connection, anticipo_id))) {
                throw errorHttp(404, 'Anticipo con ID ' + anticipo_id + ' no encontrado');
            }
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
                await generarPlanDePagos(connection, anticipo_id);
            }
            return result.insertId;
        });
    } catch (error) {
        console.error('Error en pushPago:', error.status ? error.message : error);
        throw traducirErrorBD(error);
    }
}

/**
 * Reparte la diferencia de importe de un pago pendiente editado entre los pagos pendientes posteriores (DC-08).
 * Función interna: usa la conexión, y por tanto la transacción y el bloqueo del anticipo, de pushPago.
 */
async function recalculatePostEditPayments(connection, anticipo_id, previousImporte, newImporte, previousFecha) {
    try {
        console.log('recalculatePostEditPayments - Inicio para anticipo_id: ' + anticipo_id);
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
        if (anticipo.length === 0) throw errorHttp(404, 'No se ha encontrado el anticipo.', 'ANTICIPO_NO_ENCONTRADO');

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
        console.error('Error en recalculatePostEditPayments:', error.status ? error.message : error);
        throw error;
    }
}

/**
 * Completa el plan de pagos tras borrar un pago con reparto (DC-12). Función interna.
 *
 * Calcula el importe que falta por colocar (importe pendiente menos lo que ya suman los pagos pendientes), sube primero
 * los pagos pendientes que estén por debajo del pago sugerido hasta ese tope y, si aún queda importe, crea pagos
 * nuevos con generarPlanDePagos. Usa la conexión (transacción y bloqueo del anticipo) de handlePaymentDeletion.
 * Devuelve cuántos pagos se han ajustado y cuántos se han creado.
 */
async function completarPlanTrasBorrado(connection, anticipoId) {
    try {
        const [anticipo] = await connection.execute(SQL_ANTICIPO + ' WHERE a.id = ?', [anticipoId]);
        if (anticipo.length === 0) {
            throw errorHttp(404, 'Anticipo con ID ' + anticipoId + ' no encontrado');
        }
        const pendiente = Number(anticipo[0].pendiente);
        const pagoSugerido = Number(anticipo[0].pago_sugerido);

        // Importe que falta por colocar: el importe pendiente del anticipo menos lo que ya suman los pagos pendientes
        const [pendientes] = await connection.execute("SELECT id, importe FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente' ORDER BY importe ASC, fecha ASC", [anticipoId]);
        const sumaPendientes = pendientes.reduce((total, p) => total + Number(p.importe), 0);
        let restante = Math.round((pendiente - sumaPendientes) * 100) / 100;
        console.log('completarPlanTrasBorrado - Anticipo ' + anticipoId + ': pendiente del anticipo ' + pendiente.toFixed(2) + ', pagos pendientes ' + sumaPendientes.toFixed(2) + ' en ' + pendientes.length + ' pagos, por colocar ' + restante.toFixed(2) + ', pago sugerido ' + pagoSugerido.toFixed(2));

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
            console.log('completarPlanTrasBorrado - Pago ID ' + pago.id + ' de ' + actual.toFixed(2) + ' a ' + nuevoImporte.toFixed(2) + ' (+' + incremento.toFixed(2) + ')');
        }

        // Paso 2: crear los pagos nuevos que hagan falta, de hasta el pago sugerido, a continuación del último pago
        let pagosCreados = 0;
        if (restante > 0) {
            console.log('completarPlanTrasBorrado - Quedan ' + restante.toFixed(2) + ' por colocar: se crean pagos nuevos de hasta ' + pagoSugerido.toFixed(2));
            const [antes] = await connection.execute('SELECT COUNT(*) AS n FROM anticipos_pagos WHERE anticipo_id = ?', [anticipoId]);
            await generarPlanDePagos(connection, anticipoId);
            const [despues] = await connection.execute('SELECT COUNT(*) AS n FROM anticipos_pagos WHERE anticipo_id = ?', [anticipoId]);
            pagosCreados = Number(despues[0].n) - Number(antes[0].n);
        }

        console.log('completarPlanTrasBorrado - Anticipo ' + anticipoId + ': ' + pagosAjustados + ' pagos ajustados y ' + pagosCreados + ' pagos nuevos');
        return { pagosAjustados, pagosCreados };
    } catch (error) {
        console.error('Error en completarPlanTrasBorrado:', error.status ? error.message : error);
        throw error;
    }
}

/**
 * Elimina un pago y, si redistribuir es true, coloca su importe en el resto del plan (DC-12).
 *
 * Transacción (F-27, DC-39): el borrado y el reparto van juntos. Si el reparto falla, por ejemplo porque el plan
 * superaría los 1200 pagos, el pago no se borra. Errores con código: 404 si el pago no existe y 400 si se pide
 * repartir y el anticipo no tiene pago sugerido y periodicidad (se comprueba antes de borrar nada).
 */
async function handlePaymentDeletion(pagoId, redistribuir = false) {
    try {
        return await enTransaccion(null, async (connection) => {
            // Se localiza el anticipo del pago y se bloquea antes de leer o borrar nada
            const [duenio] = await connection.execute('SELECT anticipo_id FROM anticipos_pagos WHERE id = ?', [pagoId]);
            if (duenio.length === 0) {
                throw errorHttp(404, 'Pago con ID ' + pagoId + ' no encontrado');
            }
            const anticipo_id = duenio[0].anticipo_id;
            await bloquearAnticipo(connection, anticipo_id);

            // Detalles del pago a eliminar, ya con el anticipo bloqueado (otra petición pudo borrarlo mientras se esperaba)
            const [pago] = await connection.execute('SELECT importe, estado FROM anticipos_pagos WHERE id = ?', [pagoId]);
            if (pago.length === 0) {
                throw errorHttp(404, 'Pago con ID ' + pagoId + ' no encontrado');
            }
            const { importe, estado } = pago[0];

            // Recalcular puede crear pagos nuevos: hace falta pago sugerido y periodicidad, y se comprueba antes de borrar nada (DC-12)
            if (redistribuir) {
                const [datos] = await connection.execute('SELECT pago_sugerido, periodicidad FROM anticipos WHERE id = ?', [anticipo_id]);
                if (!(Number(datos[0].pago_sugerido) > 0) || !datos[0].periodicidad) {
                    throw errorHttp(400, 'No se pueden recalcular los pagos: el anticipo necesita un pago sugerido mayor que 0 y una periodicidad');
                }
            }

            // Eliminar el pago
            console.log('handlePaymentDeletion - Eliminando el pago ID: ' + pagoId + ' (anticipo ' + anticipo_id + ', importe ' + importe + ', estado ' + estado + ', redistribuir: ' + (redistribuir ? 'sí' : 'no') + ')');
            const [result] = await connection.execute('DELETE FROM anticipos_pagos WHERE id = ?', [pagoId]);
            console.log('Pago eliminado, filas afectadas: ' + result.affectedRows);

            // DC-38: el importe pendiente se deriva de los pagos pagados y sube solo al borrar un pagado
            const pendiente = await leerPendiente(connection, anticipo_id);

            // Completar el plan con el importe del pago eliminado: ajustar los pendientes hasta el sugerido y crear los pagos que falten (DC-12)
            let redistribuido = false;
            let pagosAjustados = 0;
            let pagosCreados = 0;
            if (redistribuir) {
                ({ pagosAjustados, pagosCreados } = await completarPlanTrasBorrado(connection, anticipo_id));
                redistribuido = pagosAjustados + pagosCreados > 0;
                if (redistribuido) {
                    console.log('handlePaymentDeletion - Importe ' + importe + ' colocado en el anticipo ' + anticipo_id + ': ' + pagosAjustados + ' pagos ajustados y ' + pagosCreados + ' pagos nuevos');
                } else {
                    console.log('handlePaymentDeletion - No había importe que colocar en el anticipo ' + anticipo_id + ': el plan ya cubre el importe pendiente');
                }
            }

            // El importe pendiente devuelto es el de antes del reparto: el reparto solo mueve importes entre pagos pendientes
            return { pendiente, anticipoId: anticipo_id, redistribuido, pagosAjustados, pagosCreados };
        });
    } catch (error) {
        console.error('Error en handlePaymentDeletion:', error.status ? error.message : error);
        throw error;
    }
}

/**
 * Sustituye un pago por uno nuevo en una sola operación («Añadirlo en uno nuevo», F-25, F-27, DC-39).
 *
 * En una única transacción crea el pago nuevo (siempre pendiente) y borra el antiguo, sin repartir su importe: si el
 * pago nuevo no se puede crear, el antiguo se conserva. Antes eran dos peticiones y un fallo en la segunda dejaba
 * los dos pagos. Datos del pago nuevo: importe (mayor que 0), fecha (AAAA-MM-DD), tipo (regular o extraordinario),
 * descripcion (opcional) y cuenta_destino_id. Devuelve el id del pago nuevo, el anticipo y el importe pendiente.
 */
async function sustituirPago(pagoId, datos) {
    try {
        const { importe, fecha, tipo = 'regular', descripcion = null, cuenta_destino_id } = datos ?? {};

        // Validación de los datos del pago nuevo antes de abrir la transacción
        const importeNuevo = Number(importe);
        if (importe === null || importe === undefined || importe === '' || !Number.isFinite(importeNuevo) || importeNuevo <= 0) {
            throw errorHttp(400, 'El importe del pago nuevo debe ser un número mayor que 0');
        }
        if (typeof fecha !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha + 'T00:00:00Z'))) {
            throw errorHttp(400, 'La fecha del pago nuevo debe ser una fecha válida con el formato AAAA-MM-DD');
        }
        if (tipo !== 'regular' && tipo !== 'extraordinario') {
            throw errorHttp(400, 'El tipo del pago nuevo debe ser regular o extraordinario');
        }
        if (!cuenta_destino_id) {
            throw errorHttp(400, 'La cuenta destino del pago nuevo es obligatoria');
        }

        return await enTransaccion(null, async (connection) => {
            // Se localiza el anticipo del pago antiguo y se bloquea antes de crear o borrar nada
            const [duenio] = await connection.execute('SELECT anticipo_id FROM anticipos_pagos WHERE id = ?', [pagoId]);
            if (duenio.length === 0) {
                throw errorHttp(404, 'Pago con ID ' + pagoId + ' no encontrado');
            }
            const anticipo_id = duenio[0].anticipo_id;
            await bloquearAnticipo(connection, anticipo_id);

            // Primero se crea el pago nuevo: si falla (por ejemplo, cuenta inexistente) no se ha borrado nada
            let resultadoAlta;
            try {
                [resultadoAlta] = await connection.execute('INSERT INTO anticipos_pagos (anticipo_id, importe, fecha, tipo, descripcion, estado, cuenta_destino_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                    anticipo_id,
                    importeNuevo,
                    fecha,
                    tipo,
                    descripcion,
                    'pendiente',
                    cuenta_destino_id
                ]);
            } catch (error) {
                if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                    throw errorHttp(400, 'La cuenta destino indicada no existe');
                }
                throw error;
            }

            // Después se borra el pago antiguo, sin repartir su importe
            const [resultadoBaja] = await connection.execute('DELETE FROM anticipos_pagos WHERE id = ?', [pagoId]);
            console.log('sustituirPago - Pago ' + pagoId + ' sustituido por el pago ' + resultadoAlta.insertId + ' en el anticipo ' + anticipo_id + ' (filas borradas: ' + resultadoBaja.affectedRows + ')');

            const pendiente = await leerPendiente(connection, anticipo_id);
            return { pagoNuevoId: resultadoAlta.insertId, anticipoId: anticipo_id, pendiente };
        });
    } catch (error) {
        console.error('Error en sustituirPago:', error.status ? error.message : error);
        throw error;
    }
}

/**
 * Reparte el importe pendiente a partes iguales entre los pagos pendientes. Está exportada pero no la usa ninguna ruta.
 * Transacción y bloqueo del anticipo como el resto de operaciones compuestas (F-27, DC-39).
 */
async function recalculatePendingPayments(anticipoId, conexion = null) {
    return enTransaccion(conexion, async (connection) => {
        try {
            if (!(await bloquearAnticipo(connection, anticipoId))) {
                throw errorHttp(404, 'Anticipo con ID ' + anticipoId + ' no encontrado');
            }

            // Obtener los pagos pendientes del anticipo
            const [pendingPayments] = await connection.execute("SELECT id, importe FROM anticipos_pagos WHERE anticipo_id = ? AND estado = 'pendiente' ORDER BY fecha ASC", [anticipoId]);

            if (pendingPayments.length === 0) {
                console.log('recalculatePendingPayments - No hay pagos pendientes para el anticipo ' + anticipoId);
                return;
            }

            // Calcular el importe pendiente del anticipo
            const [anticipo] = await connection.execute(SQL_ANTICIPO + ' WHERE a.id = ?', [anticipoId]);
            const importePendiente = Number(anticipo[0].pendiente);

            // Prorratear el importe pendiente entre los pagos pendientes
            const nuevoImporte = parseFloat((importePendiente / pendingPayments.length).toFixed(2));
            let ajuste = importePendiente - nuevoImporte * pendingPayments.length;

            for (const pago of pendingPayments) {
                const importeFinal = nuevoImporte + (ajuste > 0 ? 0.01 : ajuste < 0 ? -0.01 : 0);
                ajuste -= ajuste > 0 ? 0.01 : ajuste < 0 ? -0.01 : 0;

                await connection.execute('UPDATE anticipos_pagos SET importe = ? WHERE id = ?', [importeFinal, pago.id]);
            }

            console.log('recalculatePendingPayments - Pagos pendientes recalculados para el anticipo ' + anticipoId);
        } catch (error) {
            console.error('Error en recalculatePendingPayments:', error.status ? error.message : error);
            throw error;
        }
    });
}

export { deleteAdvances, getAdvances, getPagos, getPeriodicidades, handlePaymentDeletion, pushAdvance, pushPago, recalculatePaymentPlan, recalculatePendingPayments, sustituirPago };
