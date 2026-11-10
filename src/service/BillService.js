import { API_BASE_URL, apiClient } from '@/config/api';

// Operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre los datos de los recibos

const API_URL = `${API_BASE_URL}/api/recibos`;

export class BillService {
    // Obtener todos los recibos
    static async getBills() {
        try {
            const response = await apiClient.get(API_URL);
            return response.data;
        } catch (error) {
            console.error('Error al obtener los recibos:', error);
            throw error;
        }
    }

    // Guardar un recibo (crear o actualizar)
    static async saveBill(bill) {
        try {
            console.log('BillService. Guardando recibo:', bill);

            // Imprimir información detallada antes de enviar
            console.log('BillService. Detalles de la petición:');
            console.log('BillService. URL:', API_URL);
            console.log('BillService. Modo fechas:', bill.modoFechas);
            console.log('BillService. Cargos:', bill.cargo);

            const response = await apiClient.post(API_URL, bill);
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
    static async deleteBill(id, fecha, periodicidad, permitirPagados = false) {
        try {
            const response = await apiClient.delete(`${API_URL}/${id}`, {
                params: { fecha, periodicidad, ...(permitirPagados ? { permitirPagados: 1 } : {}) }
            });
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al eliminar el recibo ${periodicidad} del ${fecha} con ID ${id}: `, error);
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    }

    // Obtener recibos por periodicidad
    static async getBillsByPeriodicity(periodicity, year) {
        try {
            const response = await apiClient.get(API_URL, {
                params: { periodicidad: periodicity, ...(year ? { año: year } : {}) }
            });
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al obtener los recibos con periodicidad ${periodicity}: `, error);
            throw error;
        }
    }

    // Obtener los cargos pendientes de años anteriores al indicado (atrasados) de una periodicidad
    static async getOverdueBills(periodicity, year) {
        try {
            const response = await apiClient.get(API_URL, {
                params: { periodicidad: periodicity, estado: 'pendiente', fecha: '1900-01-01a' + (year - 1) + '-12-31' }
            });
            return response.data;
        } catch (error) {
            console.error('BillService. Error al obtener los cargos atrasados ' + periodicity + ': ', error);
            throw error;
        }
    }

    // Obtener recibos por año
    static async getBillsByYear(year) {
        try {
            const response = await apiClient.get(`${API_URL}?año=${year}`);
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al obtener los recibos del año ${year}: `, error);
            throw error;
        }
    }

    // Obtener recibos inactivos
    static async getInactiveBills() {
        try {
            const response = await apiClient.get(`${API_URL}?activo=0`);
            return response.data;
        } catch (error) {
            console.error('BillService. Error al obtener los recibos inactivos: ', error);
            throw error;
        }
    }

    // Generar nuevas fechas para un recibo
    static async generateBillDates(id) {
        try {
            const response = await apiClient.post(`${API_URL}/${id}/generar-fechas`, {});
            return response.data;
        } catch (error) {
            console.error(`BillService. Error al generar nuevas fechas para el recibo con ID ${id}: `, error);
            if (error.response?.data?.error) {
                throw new Error(error.response.data.error);
            }
            throw error;
        }
    }
}
