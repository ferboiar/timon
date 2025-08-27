import { API_BASE_URL } from '@/config/api';
import axios from 'axios';

const API_URL = `${API_BASE_URL}/api/db`;

export class MtoDBService {
    static async backupDatabase() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}/backup`, {
                responseType: 'blob', // Importante para manejar la descarga de archivos
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response;
        } catch (error) {
            console.error('Error al descargar la copia de seguridad:', error);
            throw error;
        }
    }

    static async restoreDatabase(formData) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await axios.post(`${API_URL}/restore`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(token && { Authorization: `Bearer ${token}` })
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al restaurar la base de datos:', error);
            // Propagar el mensaje de error del servidor si está disponible
            throw error.response?.data || error;
        }
    }
}
