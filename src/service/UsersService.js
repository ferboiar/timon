import { API_BASE_URL } from '@/config/api';
import { getApiErrorMessage } from '@/utils/apiError';

/**
 * Mensaje de error de una respuesta `fetch` no correcta.
 * El texto por defecto viaja en el hueco del mensaje del propio error.
 */
function mensajeDeRespuestaError(cuerpo, porDefecto) {
    return getApiErrorMessage({ message: porDefecto, response: { data: cuerpo } });
}

export const UsersService = {
    /**
     * Obtener todos los usuarios
     * @returns {Promise<Array>} Lista de usuarios
     */
    async getUsers() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al obtener usuarios'));
        }
        return await response.json();
    },

    /**
     * Guardar un usuario (crear nuevo o actualizar existente)
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario guardado
     */
    async saveUser(userData) {
        const url = `${API_BASE_URL}/api/users`;
        const method = userData.id ? 'PUT' : 'POST';
        const body = JSON.stringify(userData);

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
            },
            body
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al guardar usuario'));
        }

        return await response.json();
    },

    /**
     * Eliminar usuarios
     * @param {Object} params - Parámetros con IDs de usuarios a eliminar
     * @returns {Promise<Object>} Resultado de la operación
     */
    async deleteUsers(params) {
        const url = `${API_BASE_URL}/api/users`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al eliminar usuarios'));
        }

        return await response.json();
    },

    /**
     * Cambiar contraseña de un usuario
     * @param {Object} params - Parámetros con ID de usuario y nueva contraseña
     * @returns {Promise<Object>} Resultado de la operación
     */
    async changePassword(params) {
        const url = `${API_BASE_URL}/api/users/password`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al cambiar contraseña'));
        }

        return await response.json();
    },

    /**
     * Guardar preferencias de estilo del usuario
     * @param {Object} stylePrefs - Preferencias de estilo (preset, menuMode, darkTheme, primary, surface)
     * @returns {Promise<Object>} Resultado de la operación
     */
    async saveStylePreferences(stylePrefs) {
        const url = `${API_BASE_URL}/api/users/style-preferences`;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(stylePrefs)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al guardar preferencias de estilo'));
        }

        return await response.json();
    },

    /**
     * Obtener preferencias de estilo del usuario actual
     * @returns {Promise<Object>} Preferencias de estilo del usuario
     */
    async getStylePreferences() {
        const url = `${API_BASE_URL}/api/users/style-preferences`;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al obtener preferencias de estilo'));
        }

        return await response.json();
    }
};
