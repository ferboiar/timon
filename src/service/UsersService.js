import { apiClient } from '@/config/api';
import { getApiErrorMessage } from '@/utils/apiError';

/** Error con el mensaje del servidor o el texto por defecto (S-07). */
function errorDe(error, porDefecto) {
    return new Error(getApiErrorMessage({ message: porDefecto, response: error?.response }));
}

export const UsersService = {
    /**
     * Obtener todos los usuarios
     * @returns {Promise<Array>} Lista de usuarios
     */
    async getUsers() {
        try {
            const { data } = await apiClient.get('/api/users');
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al obtener usuarios');
        }
    },

    /**
     * Guardar un usuario (crear nuevo o actualizar existente)
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario guardado
     */
    async saveUser(userData) {
        try {
            const { data } = userData.id ? await apiClient.put('/api/users', userData) : await apiClient.post('/api/users', userData);
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al guardar usuario');
        }
    },

    /**
     * Eliminar usuarios
     * @param {Object} params - Parámetros con IDs de usuarios a eliminar
     * @returns {Promise<Object>} Resultado de la operación
     */
    async deleteUsers(params) {
        try {
            const { data } = await apiClient.delete('/api/users', { data: params });
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al eliminar usuarios');
        }
    },

    /**
     * Cambiar contraseña de un usuario
     * @param {Object} params - Parámetros con ID de usuario y nueva contraseña
     * @returns {Promise<Object>} Resultado de la operación
     */
    async changePassword(params) {
        try {
            const { data } = await apiClient.put('/api/users/password', params);
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al cambiar contraseña');
        }
    },

    /**
     * Guardar preferencias de estilo del usuario
     * @param {Object} stylePrefs - Preferencias de estilo (preset, menuMode, darkTheme, primary, surface)
     * @returns {Promise<Object>} Resultado de la operación
     */
    async saveStylePreferences(stylePrefs) {
        try {
            const { data } = await apiClient.put('/api/users/style-preferences', stylePrefs);
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al guardar preferencias de estilo');
        }
    },

    /**
     * Obtener preferencias de estilo del usuario actual
     * @returns {Promise<Object>} Preferencias de estilo del usuario
     */
    async getStylePreferences() {
        try {
            const { data } = await apiClient.get('/api/users/style-preferences');
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al obtener preferencias de estilo');
        }
    }
};
