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
            console.log('BillService. Guardando recibo:', bill);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            // Imprimir información detallada antes de enviar
            console.log('BillService. Detalles de la petición:');
            console.log('BillService. URL:', API_URL);
            console.log('BillService. Token presente:', !!token);
            console.log('BillService. Modo fechas:', bill.modoFechas);
            console.log('BillService. Cargos:', bill.cargo);

            const response = await axios.post(API_URL, bill, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            console.log('BillService. Respuesta exitosa:', response.data);
            return response.data;
        } catch (error) {
            console.error('BillService. Error al guardar el recibo: ', error);
            console.error('BillService. Detalles del error:', {
                mensaje: error.message,
                respuesta: error.response?.data,
                status: error.response?.status
            });

            // Mejorar el mensaje de error para que sea más descriptivo
            if (error.response && error.response.data && error.response.data.error) {
                // Si el backend devuelve un mensaje de error específico, lanzarlo
                throw new Error(error.response.data.error);
            } else if (error.response && error.response.status) {
                // Si hay un código de estado, incluirlo en el mensaje
                throw new Error(`Error ${error.response.status}: No se pudo guardar el recibo. Compruebe la conexión con el servidor.`);
            } else {
                throw new Error('Error al guardar el recibo. Verifique su conexión a Internet.');
            }
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
