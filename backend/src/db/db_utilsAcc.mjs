/**
 * Utilidades para la gestión de cuentas bancarias en la base de datos
 *
 * Este módulo proporciona funciones para interactuar con la tabla 'cuentas' de la base de datos.
 * Incluye operaciones como obtener todas las cuentas, crear o actualizar cuentas,
 * eliminar cuentas y obtener los tipos de cuentas válidos desde la definición de la tabla.
 * Gestiona cuentas bancarias con atributos como nombre, tipo, IBAN, saldo y estado activo.
 *
 * @module db_utilsAcc
 */

import { getConnection } from './db_connection.mjs';

async function getAccounts() {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM cuentas ORDER BY nombre ASC');
        return rows;
    } catch (error) {
        console.error('Error al obtener las cuentas:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function pushAccount(id, nombre, tipo, iban = null, saldo_actual = 0, descripcion = null, activa = 1, propietario_id) {
    let connection;
    try {
        connection = await getConnection();

        // El IBAN es opcional: vacío o solo espacios se guarda como NULL, porque UNIQUE(iban) admite varios NULL pero no varias cadenas vacías (F-06)
        const ibanRecibido = iban;
        const ibanTexto = iban === null || iban === undefined ? '' : String(iban).trim();
        iban = ibanTexto !== '' ? ibanTexto : null;
        if (ibanRecibido !== iban) {
            console.log(`pushAccount - IBAN normalizado: ${JSON.stringify(ibanRecibido)} -> ${JSON.stringify(iban)}`);
        }

        // DC-31/F-44: el nombre se guarda en minúsculas; la pantalla lo capitaliza al mostrarlo
        const nombreOriginal = nombre;
        nombre = typeof nombre === 'string' ? nombre.trim().toLowerCase() : nombre;
        if (nombreOriginal !== nombre) {
            console.log(`pushAccount - Nombre normalizado a minúsculas: ${JSON.stringify(nombreOriginal)} -> ${JSON.stringify(nombre)}`);
        }

        if (id) {
            // Actualizar cuenta existente
            console.log(`pushAccount - Actualizando la cuenta ${id}: ${nombre} (${tipo}), IBAN: ${iban ?? 'sin IBAN'}`);
            const [updateResult] = await connection.execute('UPDATE cuentas SET nombre = ?, tipo = ?, iban = ?, saldo_actual = ?, descripcion = COALESCE(?, descripcion), activa = ? WHERE id = ?', [
                nombre,
                tipo,
                iban,
                saldo_actual,
                descripcion,
                activa,
                id
            ]);
            console.log(`Update realizado correctamente en tabla cuentas. Filas afectadas: ${updateResult.affectedRows}`);
        } else {
            // Insertar nueva cuenta
            if (!propietario_id) throw new Error('Falta el propietario para crear la cuenta');
            console.log(`pushAccount - Nueva cuenta: ${nombre} (${tipo}), IBAN: ${iban ?? 'sin IBAN'}`);
            const [insertResult] = await connection.execute('INSERT INTO cuentas (nombre, tipo, iban, saldo_actual, descripcion, activa, propietario_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [nombre, tipo, iban, saldo_actual, descripcion, activa, propietario_id]);
            console.log(`Insert realizado correctamente en tabla cuentas. Filas afectadas: ${insertResult.affectedRows}`);
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.error('Error: Entrada duplicada para IBAN:', iban);
            let mensaje = `El IBAN ${iban} ya está asignado a otra cuenta.`;
            try {
                const [filas] = await connection.execute('SELECT nombre FROM cuentas WHERE iban = ?', [iban]);
                if (filas.length > 0) {
                    mensaje = `El IBAN ${iban} ya está asignado a la cuenta «${filas[0].nombre}».`;
                }
            } catch (consultaError) {
                console.error('pushAccount - No se pudo identificar la cuenta con el IBAN duplicado:', consultaError);
            }
            const duplicado = new Error(mensaje);
            duplicado.code = 'IBAN_DUPLICADO';
            throw duplicado;
        }
        console.error('Error al insertar o actualizar la cuenta:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

async function deleteAccounts(accounts) {
    let connection;
    try {
        connection = await getConnection();
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        console.log('Cuentas a eliminar:', accounts);
        const placeholders = accounts.map(() => '?').join(',');
        const [deleteResult] = await connection.execute(`DELETE FROM cuentas WHERE id IN (${placeholders})`, accounts);
        console.log(`Delete realizado correctamente en tabla cuentas. Filas afectadas: ${deleteResult.affectedRows}`);
    } catch (error) {
        console.error('Error al eliminar las cuentas:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function getTipos() {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute("SHOW COLUMNS FROM cuentas LIKE 'tipo'");
        return rows[0].Type.match(/enum\(([^)]+)\)/)[1]
            .split(',')
            .map((value) => value.replace(/'/g, ''));
    } catch (error) {
        console.error('Error al obtener los tipos:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

export { deleteAccounts, getAccounts, getTipos, pushAccount };
