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

async function pushAccount(nombre, tipo, iban = null, saldo_actual = 0, descripcion = null, activa = 1) {
    let connection;
    try {
        connection = await getConnection();
        const [existingAccount] = await connection.execute('SELECT * FROM cuentas WHERE nombre = ?', [nombre]);

        if (existingAccount.length > 0) {
            // Actualizar cuenta existente
            const [updateResult] = await connection.execute('UPDATE cuentas SET tipo = ?, iban = ?, saldo_actual = ?, descripcion = COALESCE(?, descripcion), activa = ? WHERE nombre = ?', [tipo, iban, saldo_actual, descripcion, activa, nombre]);
            console.log(`Update realizado correctamente en tabla cuentas. Filas afectadas: ${updateResult.affectedRows}`);
        } else {
            // Insertar nueva cuenta
            const [insertResult] = await connection.execute('INSERT INTO cuentas (nombre, tipo, iban, saldo_actual, descripcion, activa) VALUES (?, ?, ?, ?, ?, ?)', [nombre, tipo, iban, saldo_actual, descripcion, activa]);
            console.log(`Insert realizado correctamente en tabla cuentas. Filas afectadas: ${insertResult.affectedRows}`);
        }
    } catch (error) {
        console.error('Error al insertar o actualizar la cuenta:', error);
        throw error;
    } finally {
        if (connection) connection.release();
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

export { deleteAccounts, getAccounts, pushAccount };
