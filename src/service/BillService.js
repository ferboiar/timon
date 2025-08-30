import { API_BASE_URL } from '@/config/api';
import axios from 'axios';

// Operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre los datos de los recibos

const API_URL = `${API_BASE_URL}/api/recibos`;

export class BillService {
    // Obtener todos los recibos
    static async getBills() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}?activo=0`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response.data;
        } catch (error) {
            console.error('BillService. Error al obtener los recibos inactivos: ', error);
            throw error;
        }
    }

    // Obtener historial de pagos de un recibo
    static async getBillHistory(id) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}/${id}/historial`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al obtener el historial del recibo con ID ${id}: `, error);
            throw error;
        }
    }

    // Generar nuevas fechas para un recibo
    static async generateBillDates(id) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/${id}/generar-fechas`,
                {},
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al generar nuevas fechas para el recibo con ID ${id}: `, error);
            throw error;
        }
    }

    // Actualizar fechas de todos los recibos (solo admin)
    static async updateAllBillsDates() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/actualizar-fechas`,
                {},
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );
            return response.data;
        } catch (error) {
            console.error('BillService. Error al actualizar fechas de todos los recibos: ', error);
            throw error;
        }
    }
}
