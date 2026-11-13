import { API_BASE_URL, apiClient } from '@/config/api';
import { getApiErrorMessage } from '@/utils/apiError';

/**
 * S-02: generar o aplicar un volcado tarda mucho más que una petición normal, así que estas
 * dos operaciones tienen su propio tiempo de espera. El resto de apiClient sigue con 10 s.
 */
export const TIMEOUT_BACKUP_RESTORE_MS = 300000;

const API_URL = `${API_BASE_URL}/api/db`;

export class MtoDBService {
    static async backupDatabase() {
        try {
            const response = await apiClient.get(`${API_URL}/backup`, {
                responseType: 'blob', // Importante para manejar la descarga de archivos
                timeout: TIMEOUT_BACKUP_RESTORE_MS
            });
            return response;
        } catch (error) {
            console.error('Error al descargar la copia de seguridad:', error);
            throw error;
        }
    }

    static async restoreDatabase(formData) {
        try {
            const response = await apiClient.post(`${API_URL}/restore`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: TIMEOUT_BACKUP_RESTORE_MS
            });
            return response.data;
        } catch (error) {
            console.error('Error al restaurar la base de datos:', error);
            // Se propaga un Error con el mensaje del servidor, nunca el objeto de la respuesta
            throw new Error(getApiErrorMessage(error));
        }
    }
}
