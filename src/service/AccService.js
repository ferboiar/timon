import { API_BASE_URL } from '@/config/api';
import axios from 'axios';

const API_URL = `${API_BASE_URL}/api/cuentas`;

export class AccService {
    // Obtener todas las cuentas
    static async getAccounts() {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error('Error al obtener las cuentas:', error);
            throw error;
        }
    }

    // Guardar una cuenta (crear o actualizar)
    static async saveAccount(account) {
        try {
            const response = await axios.post(API_URL, account);
            return response.data;
        } catch (error) {
            console.error('Error al guardar la cuenta:', error);
            throw error;
        }
    }

    // Eliminar una o más cuentas
    static async deleteAccounts(accounts) {
        try {
            const response = await axios.delete(API_URL, { data: { accounts } });
            return response.data;
        } catch (error) {
            console.error('Error al eliminar la(s) cuenta(s):', error);
            throw error;
        }
    }

    // Obtener tipos de cuenta
    static async getTipos() {
        try {
            const response = await axios.get(`${API_URL}/tipos`);
            return response.data;
        } catch (error) {
            console.error('Error al obtener los tipos:', error);
            throw error;
        }
    }
}
