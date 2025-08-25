import { API_BASE_URL } from '@/config/api';
import axios from 'axios';

const API_URL = `${API_BASE_URL}/api/db-config`;

export class DbConfigService {
    /**
     * Obtiene la configuración actual de la base de datos.
     * @returns {Promise<Object>}
     */
    static async getDbConfig() {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error('Error al obtener la configuración de la base de datos:', error);
            throw error;
        }
    }

    /**
     * Prueba una nueva configuración de conexión a la base de datos.
     * @param {Object} config - Datos de conexión a probar.
     * @returns {Promise<Object>}
     */
    static async testDbConnection(config) {
        try {
            const response = await axios.post(`${API_URL}/test`, config);
            return response.data;
        } catch (error) {
            console.error('Error al probar la conexión a la base de datos:', error);
            throw error;
        }
    }

    /**
     * Guarda la nueva configuración de la base de datos.
     * @param {Object} config - Nueva configuración a guardar.
     * @returns {Promise<Object>}
     */
    static async saveDbConfig(config) {
        try {
            const response = await axios.put(API_URL, config);
            return response.data;
        } catch (error) {
            console.error('Error al guardar la configuración de la base de datos:', error);
            throw error;
        }
    }

    /**
     * Restaura la configuración de la base de datos desde el backup.
     * @returns {Promise<Object>}
     */
    static async restoreDbConfig() {
        try {
            const response = await axios.post(`${API_URL}/restore`);
            return response.data;
        } catch (error) {
            console.error('Error al restaurar la configuración de la base de datos:', error);
            throw error;
        }
    }
}
