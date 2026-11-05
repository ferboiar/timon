/**
 * Mensaje de error de una petición al backend para mostrar al usuario.
 *
 * El servidor no usa una única forma de respuesta: unas rutas envían
 * `{ error }` y otras `{ message }`. Este ayudante las entiende las dos y evita
 * mostrar el texto genérico de axios, que siempre es
 * «Request failed with status code NNN».
 *
 * Orden: `data.error`, `data.message`, `error.message`, una cadena lanzada y,
 * si no hay nada útil, «Error desconocido».
 */

/** Devuelve el texto recortado si tiene contenido, o null. */
function textoUtil(valor) {
    return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}

export function getApiErrorMessage(error) {
    const datos = error?.response?.data;

    return textoUtil(datos?.error) ?? textoUtil(datos?.message) ?? textoUtil(error?.message) ?? textoUtil(error) ?? 'Error desconocido';
}
