import axios from 'axios';

// Operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre los datos de los recibos

const API_URL = 'http://localhost:3000/api/recibos';

export class BillService {
    // Obtener todos los recibos
    static async getBills() {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error('Error al obtener los recibos:', error);
            throw error;
        }
    }

    // Obtener un recibo por ID
    static async getBillById(id) {
        try {
            const response = await axios.get(`${API_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error al obtener el recibo con ID ${id}:`, error);
            throw error;
        }
    }

    // Crear un nuevo recibo
    static async createBill(bill) {
        try {
            const response = await axios.post(API_URL, bill);
            return response.data;
        } catch (error) {
            console.error('Error al crear el recibo:', error);
            throw error;
        }
    }

    // Actualizar un recibo existente
    static async updateBill(id, bill) {
        try {
            const response = await axios.put(`${API_URL}/${id}`, bill);
            return response.data;
        } catch (error) {
            console.error(`Error al actualizar el recibo con ID ${id}:`, error);
            throw error;
        }
    }

    // Eliminar un recibo
    static async deleteBill(id) {
        try {
            const response = await axios.delete(`${API_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error al eliminar el recibo con ID ${id}:`, error);
            throw error;
        }
    }

    // Obtener recibos por periodicidad
    static async getBillsByPeriodicity(periodicity) {
        try {
            const response = await axios.get(`${API_URL}?periodicidad=${periodicity}`);
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al obtener los recibos con periodicidad ${periodicity}:`, error);
            throw error;
        }
    }
}
