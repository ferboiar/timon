import { apiClient } from '@/config/api';
import { getApiErrorMessage } from '@/utils/apiError';

const API_URL = '/api/db-config';

/** Error con el mensaje del servidor o el texto por defecto (S-07). */
function errorDe(error, porDefecto) {
    return new Error(getApiErrorMessage({ message: porDefecto, response: error?.response }));
}

export class DbConfigService {
    /**
     * Obtiene la configuración actual de la base de datos.
     * @returns {Promise<Object>}
     */
    static async getDbConfig() {
        try {
            const { data } = await apiClient.get(API_URL);
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al obtener la configuración de la base de datos');
        }
    }

    /**
     * Obtiene solo la contraseña de la base de datos.
     * @returns {Promise<Object>}
     */
    static async getDbPassword() {
        try {
            const { data } = await apiClient.get(`${API_URL}/password`);
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al obtener la contraseña');
        }
    }

    /**
     * Prueba una nueva configuración de conexión a la base de datos.
     * @param {Object} config - Datos de conexión a probar.
     * @returns {Promise<Object>}
     */
    static async testDbConnection(config) {
        try {
            const { data } = await apiClient.post(`${API_URL}/test`, config);
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al probar la conexión a la base de datos');
        }
    }

    /**
     * Guarda la nueva configuración de la base de datos.
     * @param {Object} config - Nueva configuración a guardar.
     * @returns {Promise<Object>}
     */
    static async saveDbConfig(config) {
        try {
            const { data } = await apiClient.put(API_URL, config);
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al guardar la configuración de la base de datos');
        }
    }

    /**
     * Restaura la configuración de la base de datos desde el backup.
     * @returns {Promise<Object>}
     */
    static async restoreDbConfig() {
        try {
            const { data } = await apiClient.post(`${API_URL}/restore`);
            return data;
        } catch (error) {
            throw errorDe(error, 'Error al restaurar la configuración de la base de datos');
        }
    }
}
