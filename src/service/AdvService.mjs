import axios from 'axios';

const API_URL = 'http://localhost:3000/api/anticipos';

export class AdvService {
    // Obtener todos los anticipos
    static async getAdvances() {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error('Error al obtener anticipos:', error);
            throw error;
        }
    }

    // Guardar un anticipo (crear o actualizar)
    static async saveAdvance(advance) {
        try {
            const response = await axios.post(API_URL, advance);
            return response.data;
        } catch (error) {
            console.error('Error al guardar el anticipo:', error);
            throw error;
        }
    }

    // Eliminar uno o más anticipos
    static async deleteAdvances(advances) {
        try {
            const response = await axios.delete(API_URL, { data: { advances } });
            return response.data;
        } catch (error) {
            console.error('Error al eliminar el/los anticipo(s):', error);
            throw error;
        }
    }

    // Obtener periodicidades de anticipos
    static async getPeriodicidades() {
        try {
            const response = await axios.get(`${API_URL}/periodicidades`);
            return response.data;
        } catch (error) {
            console.error('Error al obtener las periodicidades:', error);
            throw error;
        }
    }

    // Obtener pagos de un anticipo específico
    static async getPagos(anticipoId) {
        try {
            const response = await axios.get(`${API_URL}/${anticipoId}/pagos`);
            return response.data;
        } catch (error) {
            console.error('Error al obtener los pagos:', error);
            throw error;
        }
    }

    // Guardar un pago (crear o actualizar)
    static async savePago(pago) {
        try {
            const response = await axios.post(`${API_URL}/pagos`, pago);
            return response.data;
        } catch (error) {
            console.error('Error al guardar el pago:', error);
            throw error;
        }
    }

    // Eliminar un pago
    static async deletePago(pagoId) {
        try {
            const response = await axios.delete(`${API_URL}/pagos/${pagoId}`);
            return response.data;
        } catch (error) {
            console.error('Error al eliminar el pago:', error);
            throw error;
        }
    }
}
