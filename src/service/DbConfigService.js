import { API_BASE_URL } from '@/config/api';
import { getApiErrorMessage } from '@/utils/apiError';

const API_URL = `${API_BASE_URL}/api/db-config`;

/**
 * Mensaje de error de una respuesta `fetch` no correcta.
 * El texto por defecto viaja en el hueco del mensaje del propio error.
 */
function mensajeDeRespuestaError(cuerpo, porDefecto) {
    return getApiErrorMessage({ message: porDefecto, response: { data: cuerpo } });
}

export class DbConfigService {
    /**
     * Obtiene la configuración actual de la base de datos.
     * @returns {Promise<Object>}
     */
    static async getDbConfig() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al obtener la configuración de la base de datos'));
        }
        return await response.json();
    }

    /**
     * Obtiene solo la contraseña de la base de datos.
     * @returns {Promise<Object>}
     */
    static async getDbPassword() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/password`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const error = await response.json();
                throw new Error(mensajeDeRespuestaError(error, 'Error al obtener la contraseña'));
            } else {
                const errorText = await response.text();
                throw new Error(`Server returned non-JSON response: ${errorText}`);
            }
        }
        return await response.json();
    }

    /**
     * Prueba una nueva configuración de conexión a la base de datos.
     * @param {Object} config - Datos de conexión a probar.
     * @returns {Promise<Object>}
     */
    static async testDbConnection(config) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al probar la conexión a la base de datos'));
        }
        return await response.json();
    }

    /**
     * Guarda la nueva configuración de la base de datos.
     * @param {Object} config - Nueva configuración a guardar.
     * @returns {Promise<Object>}
     */
    static async saveDbConfig(config) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al guardar la configuración de la base de datos'));
        }
        return await response.json();
    }

    /**
     * Restaura la configuración de la base de datos desde el backup.
     * @returns {Promise<Object>}
     */
    static async restoreDbConfig() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/restore`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(mensajeDeRespuestaError(error, 'Error al restaurar la configuración de la base de datos'));
        }
        return await response.json();
    }
}
