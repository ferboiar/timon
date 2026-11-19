/**
 * Validación de categorías (F-41, F-55).
 *
 * Los límites son los de las columnas: el nombre admite 30 caracteres (`categorias.nombre`,
 * VARCHAR(30)) y la descripción 255 (`categorias.descripcion`, VARCHAR(255)). El nombre se
 * mide ya recortado, porque es como se guarda. No se cambia el esquema por estos hallazgos.
 */
import { ErrorDeNegocio } from './errorDeNegocio.mjs';

export const LONGITUD_MAXIMA_NOMBRE_CATEGORIA = 30;
export const LONGITUD_MAXIMA_DESCRIPCION_CATEGORIA = 255;

/**
 * Mensaje de negocio de la columna que se ha desbordado, o null si no es nombre ni descripción.
 * Se usa al validar y al traducir `ER_DATA_TOO_LONG` (F-55).
 */
export function mensajeDeCategoriaDemasiadoLarga(campo) {
    if (campo === 'nombre') return 'El nombre de la categoría no puede superar los ' + LONGITUD_MAXIMA_NOMBRE_CATEGORIA + ' caracteres.';
    if (campo === 'descripcion') return 'La descripción de la categoría no puede superar los ' + LONGITUD_MAXIMA_DESCRIPCION_CATEGORIA + ' caracteres.';
    return null;
}

/** Valida nombre y descripción; lanza ErrorDeNegocio 400 con un mensaje claro. */
export function validarCategoria({ nombre, descripcion } = {}) {
    if (nombre === undefined || nombre === null || (typeof nombre === 'string' && nombre.trim() === '')) {
        throw new ErrorDeNegocio('El nombre de la categoría es obligatorio.', 400);
    }
    if (typeof nombre !== 'string') {
        throw new ErrorDeNegocio('El nombre de la categoría debe ser texto.', 400);
    }
    // F-55: el nombre se guarda recortado, así que se mide ya recortado.
    if (nombre.trim().length > LONGITUD_MAXIMA_NOMBRE_CATEGORIA) {
        throw new ErrorDeNegocio(mensajeDeCategoriaDemasiadoLarga('nombre'), 400);
    }

    if (descripcion === undefined || descripcion === null) return;
    if (typeof descripcion !== 'string') {
        throw new ErrorDeNegocio('La descripción de la categoría debe ser texto.', 400);
    }
    if (descripcion.length > LONGITUD_MAXIMA_DESCRIPCION_CATEGORIA) {
        throw new ErrorDeNegocio(mensajeDeCategoriaDemasiadoLarga('descripcion'), 400);
    }
}
