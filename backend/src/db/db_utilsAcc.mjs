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

async function pushAccount(id, nombre, tipo, iban = null, saldo_actual = 0, descripcion = null, activa = 1) {
    let connection;
    try {
        connection = await getConnection();

        if (id) {
            // Actualizar cuenta existente
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
            const [insertResult] = await connection.execute('INSERT INTO cuentas (nombre, tipo, iban, saldo_actual, descripcion, activa) VALUES (?, ?, ?, ?, ?, ?)', [nombre, tipo, iban, saldo_actual, descripcion, activa]);
            console.log(`Insert realizado correctamente en tabla cuentas. Filas afectadas: ${insertResult.affectedRows}`);
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.error('Error: Entrada duplicada para IBAN:', iban);
            throw new Error(`El IBAN ${iban} ya existe en la base de datos.`);
        } else {
            console.error('Error al insertar o actualizar la cuenta:', error);
            throw error;
        }
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
