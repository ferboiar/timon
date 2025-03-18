import axios from 'axios';

const API_URL = 'http://localhost:3000/api/ahorros';

export class SavService {
    // Obtener todos los ahorros
    static async getSavings() {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error('Error al obtener los ahorros:', error);
            throw error;
        }
    }

    // Guardar un ahorro (crear o actualizar)
    static async saveSaving(saving) {
        try {
            const response = await axios.post(API_URL, saving);
            return response.data;
        } catch (error) {
            console.error('Error al guardar el ahorro:', error);
            throw error;
        }
    }

    // Eliminar uno o más ahorros
    static async deleteSavings(savings) {
        try {
            const response = await axios.delete(API_URL, { data: { savings } });
            return response.data;
        } catch (error) {
            console.error('Error al eliminar el/los ahorro(s):', error);
            throw error;
        }
    }

    // Obtener periodicidades
    static async getPeriodicidades() {
        try {
            const response = await axios.get(`${API_URL}/periodicidades`);
            return response.data;
        } catch (error) {
            console.error('Error al obtener las periodicidades:', error);
            throw error;
        }
    }
}
