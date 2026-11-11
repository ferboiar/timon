/**
 * Validación de categorías (F-41).
 *
 * El límite de descripción es 255, el mismo del control de la pantalla y de la columna
 * `categorias.descripcion` (VARCHAR(255)). No se cambia el esquema por este hallazgo.
 */
import { ErrorDeNegocio } from './errorDeNegocio.mjs';

export const LONGITUD_MAXIMA_DESCRIPCION_CATEGORIA = 255;

/** Valida nombre y descripción; lanza ErrorDeNegocio 400 con un mensaje claro. */
export function validarCategoria({ nombre, descripcion } = {}) {
    if (nombre === undefined || nombre === null || (typeof nombre === 'string' && nombre.trim() === '')) {
        throw new ErrorDeNegocio('El nombre de la categoría es obligatorio.', 400);
    }
    if (typeof nombre !== 'string') {
        throw new ErrorDeNegocio('El nombre de la categoría debe ser texto.', 400);
    }

    if (descripcion === undefined || descripcion === null) return;
    if (typeof descripcion !== 'string') {
        throw new ErrorDeNegocio('La descripción de la categoría debe ser texto.', 400);
    }
    if (descripcion.length > LONGITUD_MAXIMA_DESCRIPCION_CATEGORIA) {
        throw new ErrorDeNegocio(
            'La descripción de la categoría no puede superar los ' + LONGITUD_MAXIMA_DESCRIPCION_CATEGORIA + ' caracteres.',
            400
        );
    }
}
