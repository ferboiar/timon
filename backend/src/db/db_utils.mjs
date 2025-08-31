/**
 * Utilidades para la gestión de recibos en la base de datos
 *
 * Este módulo proporciona funciones para interactuar con las tablas 'recibos', 'recibos_historico' y 'fechas_cargo'.
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

/**
 * Obtiene el historial de pagos de un recibo específico
 * @param {number} reciboId - ID del recibo
 * @returns {Array} - Historial de pagos del recibo
 */
async function getHistorialRecibo(reciboId) {
    let connection;
    try {
        connection = await getConnection();
        const query = `
            SELECT * FROM recibos_historico
            WHERE recibo_id = ?
            ORDER BY fecha_pago DESC
        `;

        const [rows] = await connection.execute(query, [reciboId]);
        return rows;
    } catch (error) {
        console.error('API. Error al obtener el historial del recibo:', error);
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
 * Genera fechas futuras basadas en la periodicidad, fecha inicial y número de fechas a generar
 * @param {string} fechaInicial - Fecha inicial en formato YYYY-MM-DD
 * @param {string} periodicidad - Periodicidad del recibo (mensual, bimestral, trimestral, anual)
 * @param {number} cantidad - Número de fechas a generar
 * @returns {Array} - Array de objetos de fecha con estado "pendiente"
 */
function generarFechasFuturas(fechaInicial, periodicidad, cantidad) {
    const fechas = [];
    const fecha = new Date(fechaInicial);

    for (let i = 0; i < cantidad; i++) {
        // Crear una copia de la fecha actual para no modificar la original
        const nuevaFecha = new Date(fecha);

        // Avanzar la fecha según la periodicidad
        switch (periodicidad) {
            case 'mensual':
                nuevaFecha.setMonth(nuevaFecha.getMonth() + i);
                break;
            case 'bimestral':
                nuevaFecha.setMonth(nuevaFecha.getMonth() + i * 2);
                break;
            case 'trimestral':
                nuevaFecha.setMonth(nuevaFecha.getMonth() + i * 3);
                break;
            case 'anual':
                nuevaFecha.setFullYear(nuevaFecha.getFullYear() + i);
                break;
        }

        // Formatear la fecha como YYYY-MM-DD
        const fechaFormateada = nuevaFecha.toISOString().split('T')[0];

        // Añadir la fecha al array
        fechas.push({
            fecha: fechaFormateada,
            estado: 'pendiente',
            comentario: i === 0 ? 'Fecha inicial' : '',
            activo: 1
        });
    }

    return fechas;
}

/**
 * Inserta o actualiza un recibo en la base de datos con soporte para generación automática de fechas
 *
 * @param {number} id - El ID del recibo.
 * @param {string} concepto - El concepto del recibo.
 * @param {string} periodicidad - La periodicidad del recibo.
 * @param {number} importe - El importe del recibo.
 * @param {string} categoria - La categoría del recibo.
 * @param {Array} cargo - Un array de objetos que contiene fecha, estado y comentario.
 *                        Si no se proporciona o está vacío, se generarán fechas automáticamente basadas en fecha_inicial.
 * @param {number} propietarioId - El ID del usuario propietario del recibo.
 * @param {number} cuenta_id - El ID de la cuenta asociada al recibo.
 * @param {string} fecha_inicial - La fecha inicial para generar automáticamente las fechas de cargo. Formato YYYY-MM-DD.
 * @param {string} modoFechas - El modo de manejo de fechas: 'auto' (generar automáticamente) o 'manual' (establecidas por el usuario).
 * @throws {Error} - Si falta algún parámetro obligatorio o si algún parámetro no es válido.
 */
async function pushRecibo(id, concepto, periodicidad, importe, categoria, cargo, propietarioId, cuenta_id, fecha_inicial, modoFechas) {
    console.log('API db_utils.mjs: ==== INICIO FUNCIÓN pushRecibo ====');
    console.log('API db_utils.mjs: Parámetros recibidos:');
    console.log('API db_utils.mjs: - ID:', id);
    console.log('API db_utils.mjs: - Concepto:', concepto);
    console.log('API db_utils.mjs: - Periodicidad:', periodicidad);
    console.log('API db_utils.mjs: - Importe:', importe);
    console.log('API db_utils.mjs: - Categoría:', categoria);
    console.log('API db_utils.mjs: - Propietario ID:', propietarioId);
    console.log('API db_utils.mjs: - Cuenta ID:', cuenta_id);
    console.log('API db_utils.mjs: - Fecha Inicial:', fecha_inicial);
    console.log('API db_utils.mjs: - Modo Fechas:', modoFechas);
    console.log('API db_utils.mjs: - Cargo tipo:', typeof cargo);
    console.log('API db_utils.mjs: - Cargo es array:', Array.isArray(cargo));
    console.log('API db_utils.mjs: - Cargo longitud:', cargo ? cargo.length : 'No definido');

    if (cargo && cargo.length > 0) {
        console.log('API db_utils.mjs: - Primera fecha en cargo:', JSON.stringify(cargo[0]));
        if (cargo.length > 1) {
            console.log('API db_utils.mjs: - Segunda fecha en cargo:', JSON.stringify(cargo[1]));
        }
    }

    // Verificar que todos los parámetros obligatorios estén presentes
    if (!concepto || !periodicidad || !importe || !categoria || !propietarioId || !cuenta_id) {
        console.log('API db_utils.mjs: ERROR - Faltan parámetros obligatorios');
        throw new Error('API. Los campos concepto, periodicidad, importe, categoria, propietarioId y cuenta_id son obligatorios.');
    }

    // Manejar validaciones específicas según el modo de fechas
    if (modoFechas === 'auto') {
        if (!fecha_inicial) {
            console.log('API db_utils.mjs: ERROR - En modo automático falta fecha_inicial');
            throw new Error('API. En modo automático, fecha_inicial es obligatorio.');
        }
    } else if (modoFechas === 'manual') {
        if (!cargo || cargo.length === 0) {
            console.log('API db_utils.mjs: ERROR - En modo manual cargo está vacío');
            throw new Error('API. En modo manual, cargo es obligatorio y debe contener al menos un elemento.');
        }
    } else {
        // Modo no especificado, usar validación tradicional
        // Si es un nuevo recibo y no se proporcionan fechas, verificar que se proporcione fecha_inicial
        if (!id && (!cargo || cargo.length === 0) && !fecha_inicial) {
            console.log('API db_utils.mjs: ERROR - Nuevo recibo sin cargo ni fecha_inicial');
            throw new Error('API. Para un nuevo recibo, se debe proporcionar cargo o fecha_inicial.');
        }
    }

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

    // Si se proporcionó fecha_inicial, validarla
    if (fecha_inicial && !dateRegex.test(fecha_inicial)) {
        throw new Error('API. La fecha inicial debe estar en el formato YYYY-MM-DD.');
    }

    // Determinar si necesitamos generar fechas automáticamente
    const generarFechasAutomaticamente = modoFechas === 'auto' || !cargo || cargo.length === 0;

    // Preparar el array de fechas de cargo a procesar
    let fechasCargo = cargo;

    // Si estamos en modo automático, generar nuevas fechas
    if (generarFechasAutomaticamente && fecha_inicial) {
        // Determinar el número de fechas a generar según la periodicidad
        let cantidadFechas;
        switch (periodicidad) {
            case 'mensual':
                cantidadFechas = 12; // Un año
                break;
            case 'bimestral':
                cantidadFechas = 6; // Un año
                break;
            case 'trimestral':
                cantidadFechas = 4; // Un año
                break;
            case 'anual':
                cantidadFechas = 1; // Una fecha
                break;
        }

        // Generar las nuevas fechas
        fechasCargo = generarFechasFuturas(fecha_inicial, periodicidad, cantidadFechas);
    } else {
        // En modo manual, validar el array de cargo proporcionado
        // Filtrar elementos del array cargo que tienen fecha como null
        fechasCargo = cargo.filter((c) => c.fecha !== null);

        // Validar cada elemento del array
        for (const c of fechasCargo) {
            if (c.fecha) {
                if (!dateRegex.test(new Date(c.fecha).toISOString().split('T')[0])) {
                    throw new Error('API. La fecha debe estar en el formato YYYY-MM-DD.');
                }
            }
            if (c.estado && !validEstados.includes(c.estado)) {
                throw new Error(`API. El estado del cargo debe ser uno de los siguientes: ${validEstados.join(', ')}.`);
            }
            if (c.activo === undefined || c.activo === null) {
                c.activo = 1; // Valor por defecto
            } else {
                // Convertir a 1 o 0 explícitamente
                c.activo = c.activo ? 1 : 0;
            }
        }
    }

    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        if (id) {
            // Comprobar si el recibo ya existe
            const [existingRecibo] = await connection.execute('SELECT * FROM recibos WHERE id = ?', [id]);

            if (existingRecibo.length > 0) {
                // Si se proporcionó una nueva fecha_inicial, actualizarla
                if (fecha_inicial) {
                    // Actualizar recibo existente con la nueva fecha_inicial
                    await connection.execute('UPDATE recibos SET concepto = ?, periodicidad = ?, importe = ?, categoria_id = (SELECT id FROM categorias WHERE nombre = ?), propietario_id = ?, cuenta_id = ?, fecha_inicial = ? WHERE id = ?', [
                        concepto,
                        periodicidad,
                        importe,
                        categoria,
                        propietarioId,
                        cuenta_id,
                        fecha_inicial,
                        id
                    ]);
                } else {
                    // Actualizar recibo existente sin cambiar fecha_inicial
                    await connection.execute('UPDATE recibos SET concepto = ?, periodicidad = ?, importe = ?, categoria_id = (SELECT id FROM categorias WHERE nombre = ?), propietario_id = ?, cuenta_id = ? WHERE id = ?', [
                        concepto,
                        periodicidad,
                        importe,
                        categoria,
                        propietarioId,
                        cuenta_id,
                        id
                    ]);
                }

                // Si estamos en modo automático y tenemos ID de recibo y fecha_inicial, manejamos de forma especial
                if (modoFechas === 'auto' && id && fecha_inicial) {
                    // Obtener todas las fechas de cargo existentes para este recibo
                    const [existingFechas] = await connection.execute('SELECT * FROM fechas_cargo WHERE recibo_id = ? ORDER BY fecha ASC', [id]);

                    // Si hay fechas existentes, actualizarlas con las nuevas fechas generadas
                    if (existingFechas.length > 0) {
                        // Generar nuevas fechas basadas en fecha_inicial y periodicidad
                        const nuevasFechas = generarFechasFuturas(fecha_inicial, periodicidad, existingFechas.length);

                        // Actualizar cada fecha existente con la nueva fecha correspondiente
                        for (let i = 0; i < existingFechas.length; i++) {
                            // Solo actualizamos la fecha, mantenemos los demás datos
                            await connection.execute('UPDATE fechas_cargo SET fecha = ? WHERE id = ?', [nuevasFechas[i].fecha, existingFechas[i].id]);
                        }
                    } else {
                        // Si no hay fechas existentes, crear nuevas
                        for (const c of fechasCargo) {
                            await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, ?, ?, ?)', [id, c.fecha, c.estado, c.comentario || '', c.activo]);
                        }
                    }
                } else {
                    // Modo manual: Actualizar fechas de cargo de manera tradicional
                    console.log('API: Procesando fechas en modo manual. Recibidas:', cargo.length, 'fechas para el recibo ID:', id);
                    for (const c of cargo) {
                        console.log('API: Procesando cargo:', c);

                        // Si tiene ID pero no fecha, podría ser una actualización de solo comentario o estado
                        if (!c.fecha && c.id) {
                            console.log('API: Detectada posible actualización de solo comentario o estado para ID:', c.id);
                            try {
                                // Obtener los datos actuales para preservar la fecha
                                const [existingCargo] = await connection.execute('SELECT * FROM fechas_cargo WHERE id = ?', [c.id]);

                                if (existingCargo.length > 0) {
                                    console.log('API: Encontrado cargo existente para actualización parcial:', existingCargo[0]);

                                    // Usar los valores existentes para los campos no proporcionados
                                    const estado = c.estado !== undefined ? c.estado : existingCargo[0].estado;
                                    const comentario = c.comentario !== undefined ? c.comentario : existingCargo[0].comentario;
                                    const activo = c.activo !== undefined ? c.activo : existingCargo[0].activo;
                                    const fecha = existingCargo[0].fecha; // Preservar la fecha existente

                                    console.log('API: Realizando actualización parcial con valores:');
                                    console.log('API: - Estado:', estado);
                                    console.log('API: - Comentario:', comentario);
                                    console.log('API: - Activo:', activo);
                                    console.log('API: - Fecha (preservada):', fecha);

                                    const [updateResult] = await connection.execute('UPDATE fechas_cargo SET estado = ?, comentario = ?, activo = ? WHERE id = ?', [estado, comentario, activo, c.id]);

                                    console.log('API: Resultado de actualización parcial:', updateResult.affectedRows, 'filas afectadas');

                                    // Verificar después de la actualización
                                    const [verifyUpdate] = await connection.execute('SELECT * FROM fechas_cargo WHERE id = ?', [c.id]);
                                    if (verifyUpdate.length > 0) {
                                        console.log('API: Verificación después de actualización parcial:', `Estado: ${verifyUpdate[0].estado}`, `Comentario: "${verifyUpdate[0].comentario}"`, `Activo: ${verifyUpdate[0].activo}`);
                                    }
                                }
                            } catch (error) {
                                console.error('API: ERROR en actualización parcial:', error.message);
                                throw error;
                            }
                            continue;
                        }

                        if (!c.fecha) {
                            console.log('API: Ignorando cargo sin fecha');
                            continue; // Ignorar elementos sin fecha para nuevos cargos
                        }

                        ////const f = new Date(c.fecha);
                        //const fechaLocal = new Date(f.getTime() - f.getTimezoneOffset() * 60000);
                        ////const fecha = new Date(f).toISOString().split('T')[0]; // Convertir fecha al formato YYYY-MM-DD

                        const fecha = c.fecha;

                        // Validar fecha antes de procesar (evitar fechas como 1970-01-01)
                        if (fecha === '1970-01-01') {
                            console.log('API: Ignorando fecha inválida:', fecha);
                            continue; // Ignorar fechas inválidas
                        }

                        const estado = c.estado === '' ? 'pendiente' : c.estado; // Si estado está vacío, se considera 'pendiente'

                        if (c.id) {
                            try {
                                // Actualizar si existe, incluyendo activo
                                console.log('API: Actualizando fecha_cargo con ID:', c.id, 'Estado:', estado, 'Comentario:', c.comentario, 'Fecha:', fecha);
                                const [existingCargo] = await connection.execute('SELECT * FROM fechas_cargo WHERE id = ?', [c.id]);

                                if (existingCargo.length > 0) {
                                    console.log('API: Encontrado cargo existente:', existingCargo[0]);

                                    // Mostrar diferencias entre valores antiguos y nuevos
                                    console.log(
                                        'API: Diferencias detectadas:',
                                        existingCargo[0].estado !== estado ? `Estado: ${existingCargo[0].estado} -> ${estado}` : 'Estado: Sin cambios',
                                        existingCargo[0].comentario !== c.comentario ? `Comentario: "${existingCargo[0].comentario}" -> "${c.comentario}"` : 'Comentario: Sin cambios',
                                        existingCargo[0].activo !== c.activo ? `Activo: ${existingCargo[0].activo} -> ${c.activo}` : 'Activo: Sin cambios'
                                    );

                                    // Realizar la actualización
                                    console.log('API: REALIZANDO ACTUALIZACIÓN para fecha_cargo ID:', c.id);
                                    console.log('API: Valores a actualizar:');
                                    console.log('API: - Estado:', estado);
                                    console.log('API: - Comentario:', c.comentario, 'Tipo:', typeof c.comentario);
                                    console.log('API: - Fecha:', fecha);
                                    console.log('API: - Activo:', c.activo);

                                    // Asegurar que el comentario nunca sea undefined
                                    const comentarioFinal = c.comentario !== undefined ? c.comentario : '';

                                    const [updateResult] = await connection.execute('UPDATE fechas_cargo SET estado = ?, comentario = ?, fecha = ?, activo = ? WHERE id = ?', [estado, comentarioFinal, fecha, c.activo, c.id]);
                                    console.log('API: Resultado de actualización:', updateResult.affectedRows, 'filas afectadas');

                                    // Verificar que la actualización fue efectiva
                                    if (updateResult.affectedRows === 0) {
                                        console.error('API: ¡ADVERTENCIA! La actualización no afectó ninguna fila');
                                    }

                                    // Verificar que los datos se actualizaron correctamente
                                    const [verifyUpdate] = await connection.execute('SELECT * FROM fechas_cargo WHERE id = ?', [c.id]);
                                    if (verifyUpdate.length > 0) {
                                        console.log('API: Verificación después de actualizar:', `Estado: ${verifyUpdate[0].estado}`, `Comentario: "${verifyUpdate[0].comentario}"`, `Activo: ${verifyUpdate[0].activo}`);
                                    }

                                    // Si el estado cambia a 'cargado', guardar en el historial
                                    if (estado === 'cargado' && existingCargo[0].estado !== 'cargado') {
                                        await connection.execute('INSERT INTO recibos_historico (recibo_id, fecha_pago, importe, pagado, notas) VALUES (?, ?, ?, 1, ?)', [id, fecha, importe, c.comentario || '']);
                                        console.log('API: Guardado en historial por cambio a estado cargado');
                                    }
                                } else {
                                    console.log('API: No se encontró el cargo con ID:', c.id);
                                }
                            } catch (error) {
                                console.error('API: ERROR en actualización de fecha_cargo:', error.message);
                                throw error; // Re-lanzar para manejo en nivel superior
                            }
                        } else {
                            // Insertar si no existe, incluyendo activo
                            await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, ?, ?, ?)', [id, fecha, estado, c.comentario || '', c.activo]);

                            // Si el estado es 'cargado', guardar en el historial
                            if (estado === 'cargado') {
                                await connection.execute('INSERT INTO recibos_historico (recibo_id, fecha_pago, importe, pagado, notas) VALUES (?, ?, ?, 1, ?)', [id, fecha, importe, c.comentario || '']);
                            }
                        }
                    }
                }

                // Actualizar el valor de activo para todas las fechas de cargo del recibo
                if (cargo.length > 0 && cargo[0].activo !== undefined) {
                    await connection.execute('UPDATE fechas_cargo SET activo = ? WHERE recibo_id = ?', [cargo[0].activo, id]);
                }
            } else {
                throw new Error('API. El recibo con el ID especificado no existe.');
            }
        } else {
            // Insertar nuevo recibo
            let query = 'INSERT INTO recibos (concepto, periodicidad, importe, categoria_id, propietario_id, cuenta_id';
            let valuesPart = 'VALUES (?, ?, ?, (SELECT id FROM categorias WHERE nombre = ?), ?, ?';
            let params = [concepto, periodicidad, importe, categoria, propietarioId, cuenta_id];

            // Si se proporcionó fecha_inicial, incluirla en la consulta
            if (fecha_inicial) {
                query += ', fecha_inicial)';
                valuesPart += ', ?)';
                params.push(fecha_inicial);
            } else if (cargo && cargo.length > 0) {
                // Si no se proporcionó fecha_inicial pero sí cargo, usar la primera fecha de cargo como fecha_inicial
                query += ', fecha_inicial)';
                valuesPart += ', ?)';
                params.push(new Date(cargo[0].fecha).toISOString().split('T')[0]);
            } else {
                query += ')';
                valuesPart += ')';
            }

            const [result] = await connection.execute(query + ' ' + valuesPart, params);
            const newReciboId = result.insertId;

            console.log('API: Recibo insertado con ID:', newReciboId, 'Modo fechas:', modoFechas);

            // Determinar si necesitamos generar fechas automáticamente o usar las fechas de cargo proporcionadas
            if (modoFechas === 'auto' && fecha_inicial) {
                console.log('API: Generando fechas automáticamente para el recibo ID:', newReciboId);
                // Determinar el número de fechas a generar según la periodicidad
                let cantidadFechas;
                switch (periodicidad) {
                    case 'mensual':
                        cantidadFechas = 12; // Un año
                        break;
                    case 'bimestral':
                        cantidadFechas = 6; // Un año
                        break;
                    case 'trimestral':
                        cantidadFechas = 4; // Un año
                        break;
                    case 'anual':
                        cantidadFechas = 1; // Una fecha
                        break;
                }

                // Generar las nuevas fechas
                const fechasAutomaticas = generarFechasFuturas(fecha_inicial, periodicidad, cantidadFechas);
                console.log('API: Fechas generadas automáticamente:', fechasAutomaticas);

                // Insertar las fechas generadas automáticamente
                for (const c of fechasAutomaticas) {
                    await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, ?, ?, ?)', [newReciboId, c.fecha, c.estado, c.comentario, c.activo]);
                    console.log('API: Fecha insertada:', c.fecha, 'para recibo ID:', newReciboId);
                }
            } else if (cargo && cargo.length > 0) {
                // Insertar fechas de cargo proporcionadas manualmente
                console.log('API: Insertando fechas de cargo manuales para el recibo ID:', newReciboId);
                for (const c of cargo) {
                    if (!c.fecha) {
                        console.log('API: Ignorando cargo sin fecha:', c);
                        continue; // Ignorar elementos sin fecha
                    }

                    const estado = c.estado === '' ? 'pendiente' : c.estado;

                    ////const f = new Date(c.fecha);
                    //const fechaLocal = new Date(f.getTime() - f.getTimezoneOffset() * 60000);
                    ////const fecha = new Date(f).toISOString().split('T')[0]; // Convertir fecha al formato YYYY-MM-DD

                    const fecha = c.fecha;

                    // Validar fecha antes de insertar (evitar fechas como 1970-01-01)
                    if (fecha === '1970-01-01') {
                        console.log('API: Ignorando fecha inválida:', fecha);
                        continue; // Ignorar fechas inválidas
                    }

                    console.log('API: Insertando fecha de cargo:', fecha, 'para recibo ID:', newReciboId);
                    await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, ?, ?, ?)', [newReciboId, fecha, estado, c.comentario || '', c.activo]);

                    // Si el estado es 'cargado', guardar en el historial
                    if (estado === 'cargado') {
                        await connection.execute('INSERT INTO recibos_historico (recibo_id, fecha_pago, importe, pagado, notas) VALUES (?, ?, ?, 1, ?)', [newReciboId, fecha, importe, c.comentario || '']);
                    }
                }
            } else {
                console.log('API: ADVERTENCIA - No se han insertado fechas de cargo para el recibo ID:', newReciboId);
            }
        }

        await connection.commit();
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('API. Error al insertar o actualizar el recibo: ', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Genera nuevas fechas para un recibo cuando se completa un ciclo de pagos
 * @param {number} reciboId - ID del recibo
 * @returns {boolean} - True si se generaron nuevas fechas, False si no
 */
async function generarNuevasFechasRecibo(reciboId) {
    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // Obtener información del recibo
        const [recibos] = await connection.execute('SELECT * FROM recibos WHERE id = ?', [reciboId]);

        if (recibos.length === 0) {
            throw new Error('API. Recibo no encontrado.');
        }

        const recibo = recibos[0];

        // Obtener fechas de cargo pendientes
        const [fechasPendientes] = await connection.execute('SELECT * FROM fechas_cargo WHERE recibo_id = ? AND estado = "pendiente" AND activo = 1', [reciboId]);

        // Si aún hay fechas pendientes, no necesitamos generar nuevas
        if (fechasPendientes.length > 0) {
            await connection.commit();
            return false;
        }

        // Obtener la última fecha de cargo
        const [ultimasFechas] = await connection.execute('SELECT * FROM fechas_cargo WHERE recibo_id = ? ORDER BY fecha DESC LIMIT 1', [reciboId]);

        if (ultimasFechas.length === 0) {
            // Si no hay fechas previas, usar la fecha inicial del recibo
            const fechaInicial = recibo.fecha_inicial;
            if (!fechaInicial) {
                throw new Error('API. No se puede generar nuevas fechas: No hay fecha inicial.');
            }

            // Generar nuevas fechas basadas en la fecha inicial
            const cargo = generarFechasFuturas(fechaInicial, recibo.periodicidad, 4);

            // Insertar las nuevas fechas
            for (const c of cargo) {
                await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, ?, ?, ?)', [reciboId, c.fecha, c.estado, c.comentario, c.activo]);
            }
        } else {
            // Usar la última fecha como base para generar nuevas
            const ultimaFecha = ultimasFechas[0].fecha;

            // Determinar cuántas fechas generar según la periodicidad
            let cantidadFechas;
            switch (recibo.periodicidad) {
                case 'mensual':
                    cantidadFechas = 12; // Un año
                    break;
                case 'bimestral':
                    cantidadFechas = 6; // Un año
                    break;
                case 'trimestral':
                    cantidadFechas = 4; // Un año
                    break;
                case 'anual':
                    cantidadFechas = 1; // Una fecha
                    break;
            }

            // Generar nuevas fechas a partir de la última fecha
            const nuevaFechaBase = new Date(ultimaFecha);

            // Avanzar la fecha según la periodicidad para comenzar desde el siguiente período
            switch (recibo.periodicidad) {
                case 'mensual':
                    nuevaFechaBase.setMonth(nuevaFechaBase.getMonth() + 1);
                    break;
                case 'bimestral':
                    nuevaFechaBase.setMonth(nuevaFechaBase.getMonth() + 2);
                    break;
                case 'trimestral':
                    nuevaFechaBase.setMonth(nuevaFechaBase.getMonth() + 3);
                    break;
                case 'anual':
                    nuevaFechaBase.setFullYear(nuevaFechaBase.getFullYear() + 1);
                    break;
            }

            const nuevaFechaBaseStr = nuevaFechaBase.toISOString().split('T')[0];
            const cargo = generarFechasFuturas(nuevaFechaBaseStr, recibo.periodicidad, cantidadFechas);

            // Insertar las nuevas fechas
            for (const c of cargo) {
                await connection.execute('INSERT INTO fechas_cargo (recibo_id, fecha, estado, comentario, activo) VALUES (?, ?, ?, ?, ?)', [reciboId, c.fecha, c.estado, c.comentario, c.activo]);
            }
        }

        await connection.commit();
        return true;
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('API. Error al generar nuevas fechas para el recibo: ', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Verifica todos los recibos y genera nuevas fechas si es necesario
 * Esta función está diseñada para ser ejecutada periódicamente (por ejemplo, al final del año)
 */
async function actualizarFechasRecibos() {
    let connection;
    try {
        connection = await getConnection();

        // Obtener todos los recibos activos
        const [recibos] = await connection.execute(`
            SELECT DISTINCT r.id 
            FROM recibos r
            JOIN fechas_cargo fc ON r.id = fc.recibo_id
            WHERE fc.activo = 1
        `);

        let recibosActualizados = 0;

        // Procesar cada recibo
        for (const recibo of recibos) {
            try {
                const actualizado = await generarNuevasFechasRecibo(recibo.id);
                if (actualizado) {
                    recibosActualizados++;
                }
            } catch (error) {
                console.error(`Error al actualizar el recibo ${recibo.id}: ${error.message}`);
                // Continuar con el siguiente recibo aunque éste falle
            }
        }

        return {
            total: recibos.length,
            actualizados: recibosActualizados
        };
    } catch (error) {
        console.error('API. Error al actualizar fechas de recibos: ', error);
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

                // Borrar todos los registros históricos
                await connection.query('DELETE FROM recibos_historico WHERE recibo_id = ?', [id]);

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
                // Borrar todos los registros históricos
                await connection.query('DELETE FROM recibos_historico WHERE recibo_id = ?', [id]);

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

            // Borrar todos los registros históricos
            await connection.query('DELETE FROM recibos_historico WHERE recibo_id = ?', [id]);

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

export { actualizarFechasRecibos, deleteRecibo, generarNuevasFechasRecibo, getHistorialRecibo, getRecibos, pushRecibo };
