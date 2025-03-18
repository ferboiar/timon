import { getConnection } from './db_connection.mjs';

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

async function pushSaving(id, concepto, descripcion = null, ahorrado = 0, fecha_objetivo = null, periodicidad = null, importe_periodico, activo = 1) {
    let connection;
    try {
        connection = await getConnection();

        if (id) {
            // Actualizar ahorro existente
            const [updateResult] = await connection.execute('UPDATE ahorros SET concepto = ?, descripcion = COALESCE(?, descripcion), ahorrado = ?, fecha_objetivo = ?, periodicidad = ?, importe_periodico = ?, activo = ? WHERE id = ?', [
                concepto,
                descripcion,
                ahorrado,
                fecha_objetivo,
                periodicidad,
                importe_periodico,
                activo,
                id
            ]);
            console.log(`Update realizado correctamente en tabla ahorros. Filas afectadas: ${updateResult.affectedRows}`);
        } else {
            // Insertar nuevo ahorro
            const [insertResult] = await connection.execute('INSERT INTO ahorros (concepto, descripcion, ahorrado, fecha_objetivo, periodicidad, importe_periodico, activo) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                concepto,
                descripcion,
                ahorrado,
                fecha_objetivo,
                periodicidad,
                importe_periodico,
                activo
            ]);
            console.log(`Insert realizado correctamente en tabla ahorros. Filas afectadas: ${insertResult.affectedRows}`);
        }
    } catch (error) {
        console.error('Error al insertar o actualizar el ahorro:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function deleteSavings(savings) {
    let connection;
    try {
        connection = await getConnection();
        if (!Array.isArray(savings)) {
            savings = [savings];
        }
        console.log('Ahorros a eliminar:', savings);
        const placeholders = savings.map(() => '?').join(',');
        const [deleteResult] = await connection.execute(`DELETE FROM ahorros WHERE id IN (${placeholders})`, savings);
        console.log(`Delete realizado correctamente en tabla ahorros. Filas afectadas: ${deleteResult.affectedRows}`);
    } catch (error) {
        console.error('Error al eliminar los ahorros:', error);
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

export { deleteSavings, getPeriodicidades, getSavings, pushSaving };
