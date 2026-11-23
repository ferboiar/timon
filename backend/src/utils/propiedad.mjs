/**
 * Propiedad y visibilidad de los registros (S-01, DC-48).
 * ======================================================
 *
 * Consultas mínimas para resolver el propietario y la privacidad de un registro antes de
 * editarlo o borrarlo. Las reglas están en `autorizacion.mjs`; aquí solo se leen los datos
 * y se traducen a errores de negocio (404 si no existe, 403 si no se puede tocar).
 *
 * Subrecursos (pagos y movimientos) resuelven el propietario de su padre: anticipo o ahorro. Las
 * consultas devuelven también el id del padre para que la ruta compruebe que coincide con el enviado (S-18).
 * Cuentas y categorías son compartidas y no pasan por estas comprobaciones.
 */
import { getConnection } from '#backend/db/db_connection.mjs';
import { puedeBorrarRegistro, puedeCambiarPrivacidad, puedeEditarRegistro } from '#backend/utils/autorizacion.mjs';
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
    unaFila('SELECT p.id, p.anticipo_id, a.propietario_id, a.es_privado FROM anticipos_pagos p JOIN anticipos a ON a.id = p.anticipo_id WHERE p.id = ?', [id]);

export const registroDeMovimiento = (id) =>
    unaFila('SELECT m.id, m.ahorro_id, a.propietario_id, a.es_privado FROM ahorros_movimientos m JOIN ahorros a ON a.id = m.ahorro_id WHERE m.id = ?', [id]);

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

/**
 * Traduce `es_privado` recibido del cliente a 0, 1 o null (DC-75).
 *
 * `null` significa «no se ha enviado el campo»: conservar el valor actual. Es el mismo criterio
 * que aplican `pushRecibo`, `pushAdvance` y `pushSaving` con `COALESCE(?, es_privado)`.
 */
export function privacidadSolicitada(valor) {
    return valor === undefined || valor === null || valor === '' ? null : Number(valor) === 1 ? 1 : 0;
}

/**
 * Lanza 403 si el usuario pretende cambiar la privacidad y no puede (DC-75).
 *
 * - Valor omitido: no hay cambio, no se exige nada nuevo (COALESCE conserva).
 * - Valor igual al actual: se tolera aunque el usuario no sea el propietario, para que editar
 *   un campo cualquiera de un registro ajeno con el valor incluido siga funcionando (DC-48).
 * - Valor distinto: solo el propietario con escritura o un administrador.
 */
export function asegurarCambioPrivacidad(usuario, registro, modulo, valorSolicitado) {
    const pedido = privacidadSolicitada(valorSolicitado);

    if (!registro || pedido === null || Number(registro.es_privado) === pedido) return registro;

    if (!puedeCambiarPrivacidad(usuario, registro, modulo)) {
        throw new ErrorDeNegocio('Solo el propietario del registro o un administrador pueden cambiar su privacidad.', 403, 'PRIVACIDAD_NO_PERMITIDA');
    }

    return registro;
}
