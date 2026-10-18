/**
 * Mensaje de error de una petición al backend para mostrar al usuario.
 * Prefiere el mensaje que envía el servidor (respuesta { error }) al texto genérico de axios,
 * que siempre es «Request failed with status code NNN».
 */
export function getApiErrorMessage(error) {
    return error?.response?.data?.error ?? error?.message ?? 'Error desconocido';
}
