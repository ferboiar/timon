import { API_BASE_URL, apiClient } from '@/config/api';

const API_URL = `${API_BASE_URL}/api/cuentas`;

export class AccService {
    // Obtener todas las cuentas
    static async getAccounts() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.get(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al obtener las cuentas:', error);
            throw error;
        }
    }

    // Guardar una cuenta (crear o actualizar)
    static async saveAccount(account) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.post(API_URL, account, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al guardar la cuenta:', error);
            throw error;
        }
    }

    // Eliminar una o más cuentas
    static async deleteAccounts(accounts) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.delete(API_URL, {
                data: { accounts },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al eliminar la(s) cuenta(s):', error);
            throw error;
        }
    }

    // Obtener tipos de cuenta
    static async getTipos() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.get(`${API_URL}/tipos`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al obtener los tipos:', error);
            throw error;
        }
    }
}
