/**
 * Propiedad y visibilidad de los registros (S-01, DC-48).
 * ======================================================
 *
 * Consultas mínimas para resolver el propietario y la privacidad de un registro antes de
 * editarlo o borrarlo. Las reglas están en `autorizacion.mjs`; aquí solo se leen los datos
 * y se traducen a errores de negocio (404 si no existe, 403 si no se puede tocar).
 *
 * Subrecursos (pagos y movimientos) resuelven el propietario de su padre: anticipo o ahorro.
 * Cuentas y categorías son compartidas y no pasan por estas comprobaciones.
 */
import { getConnection } from '#backend/db/db_connection.mjs';
import { puedeBorrarRegistro, puedeEditarRegistro } from '#backend/utils/autorizacion.mjs';
import { ErrorDeNegocio } from '#backend/utils/errorDeNegocio.mjs';

/** Ejecuta una consulta de una sola fila y libera la conexión. */
async function unaFila(sql, parametros) {
    let connection;
    try {
        connection = await getConnection();
        const [filas] = await connection.execute(sql, parametros);
        return filas[0] ?? null;
    } finally {
        if (connection) connection.release();
    }
}

const SQL_BASE = 'SELECT id, propietario_id, es_privado FROM ';

export const registroDeRecibo = (id) => unaFila(`${SQL_BASE}recibos WHERE id = ?`, [id]);
export const registroDeAhorro = (id) => unaFila(`${SQL_BASE}ahorros WHERE id = ?`, [id]);
export const registroDeAnticipo = (id) => unaFila(`${SQL_BASE}anticipos WHERE id = ?`, [id]);

export const registroDePago = (id) =>
    unaFila('SELECT p.id, a.propietario_id, a.es_privado FROM anticipos_pagos p JOIN anticipos a ON a.id = p.anticipo_id WHERE p.id = ?', [id]);

export const registroDeMovimiento = (id) =>
    unaFila('SELECT m.id, a.propietario_id, a.es_privado FROM ahorros_movimientos m JOIN ahorros a ON a.id = m.ahorro_id WHERE m.id = ?', [id]);

/** Lanza 404 si el registro no existe y 403 si el usuario no puede editarlo. */
export function asegurarEdicion(usuario, registro, modulo) {
    if (!registro) throw new ErrorDeNegocio('No se ha encontrado el registro.', 404, 'REGISTRO_NO_ENCONTRADO');
    if (!puedeEditarRegistro(usuario, registro, modulo)) {
        throw new ErrorDeNegocio('No tienes permisos para modificar este registro.', 403, 'SIN_PERMISO');
    }
    return registro;
}

/** Lanza 404 si el registro no existe y 403 si el usuario no puede borrarlo. */
export function asegurarBorrado(usuario, registro, modulo) {
    if (!registro) throw new ErrorDeNegocio('No se ha encontrado el registro.', 404, 'REGISTRO_NO_ENCONTRADO');
    if (!puedeBorrarRegistro(usuario, registro, modulo)) {
        throw new ErrorDeNegocio('No tienes permisos para borrar este registro.', 403, 'SIN_PERMISO');
    }
    return registro;
}
