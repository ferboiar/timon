import { API_BASE_URL } from '@/config/api';
import axios from 'axios';

// Operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre los datos de los recibos

const API_URL = `${API_BASE_URL}/api/recibos`;

// Función para obtener el token de autenticación
const getAuthToken = () => {
    // Primero intenta obtener el token del localStorage
    let token = localStorage.getItem('token');

    // Si no hay token en localStorage, intenta en sessionStorage
    if (!token) {
        token = sessionStorage.getItem('token');
    }

    return token;
};

export class BillService {
    // Obtener todos los recibos
    static async getBills() {
        try {
            const token = getAuthToken();
            const response = await axios.get(API_URL, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response.data;
        } catch (error) {
            console.error('Error al obtener los recibos:', error);
            throw error;
        }
    }

    // Obtener un recibo por ID
    static async getBillById(id) {
        try {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response.data;
        } catch (error) {
            console.error(`Error al obtener el recibo con ID ${id}:`, error);
            throw error;
        }
    }

    // Guardar un recibo (crear o actualizar)
    static async saveBill(bill) {
        try {
            const token = getAuthToken();
            const response = await axios.post(API_URL, bill, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response.data;
        } catch (error) {
            console.error('BillService. Error al guardar el recibo: ', error);
            throw error;
        }
    }

    // Eliminar un recibo
    static async deleteBill(id, fecha, periodicidad) {
        try {
            const token = getAuthToken();
            const response = await axios.delete(`${API_URL}/${id}`, {
                params: { fecha, periodicidad },
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al eliminar el recibo ${periodicidad} del ${fecha} con ID ${id}: `, error);
            throw error;
        }
    }

    // Obtener recibos por periodicidad
    static async getBillsByPeriodicity(periodicity) {
        try {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}?periodicidad=${periodicity}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al obtener los recibos con periodicidad ${periodicity}: `, error);
            throw error;
        }
    }

    // Obtener recibos por año
    static async getBillsByYear(year) {
        try {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}?año=${year}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al obtener los recibos del año ${year}: `, error);
            throw error;
        }
    }

    // Obtener recibos inactivos
    static async getInactiveBills() {
        try {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}?activo=0`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response.data;
        } catch (error) {
            console.error('BillService. Error al obtener los recibos inactivos: ', error);
            throw error;
        }
    }
}
