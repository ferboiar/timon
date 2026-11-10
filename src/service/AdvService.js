import { API_BASE_URL, apiClient } from '@/config/api';

const API_URL = `${API_BASE_URL}/api/anticipos`;

export class AdvService {
    // Obtener todos los anticipos
    static async getAdvances() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.get(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al obtener anticipos:', error);
            throw error;
        }
    }

    // Guardar un anticipo (crear o actualizar)
    static async saveAdvance(advance) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.post(API_URL, advance, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al guardar el anticipo:', error);
            throw error;
        }
    }

    // Eliminar uno o más anticipos
    static async deleteAdvances(advances) {
        console.log('deleteAdvances - IDs de anticipos a eliminar:', advances);
        if (!Array.isArray(advances) || advances.length === 0) {
            console.error('deleteAdvances - No se proporcionaron IDs de anticipos para eliminar:', advances);
            throw new Error('No se proporcionaron IDs de anticipos para eliminar');
        }
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.delete(API_URL, {
                data: { advances },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('deleteAdvances - Respuesta del servidor:', response.data);
            return response.data;
        } catch (error) {
            console.error('deleteAdvances - Error al eliminar el/los anticipo(s):', error);
            throw error;
        }
    }

    // Obtener periodicidades de anticipos
    static async getPeriodicidades() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.get(`${API_URL}/periodicidades`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al obtener las periodicidades:', error);
            throw error;
        }
    }

    // Obtener pagos de un anticipo específico
    static async getPagos(anticipoId) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.get(`${API_URL}/${anticipoId}/pagos`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al obtener los pagos:', error);
            throw error;
        }
    }

    // Guardar un pago (crear o actualizar)
    static async savePago(pago) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.post(`${API_URL}/pagos`, pago, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al guardar el pago:', error);
            throw error;
        }
    }

    // Eliminar un pago (DC-39). Con redistribuir = true el servidor coloca su importe en el resto del plan (DC-12);
    // el borrado y el reparto van en la misma transacción
    static async handlePaymentDeletion(pagoId, redistribuir = false) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.delete(`${API_URL}/pagos/${pagoId}`, {
                params: { redistribuir },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al eliminar el pago:', error);
            throw error;
        }
    }

    // Sustituir un pago por uno nuevo en una sola operación atómica (F-25, F-27, DC-39):
    // el servidor crea el pago nuevo (pendiente) y borra el antiguo en la misma transacción
    static async replacePago(pagoId, pago) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.post(`${API_URL}/pagos/${pagoId}/sustituir`, pago, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al sustituir el pago:', error);
            throw error;
        }
    }

    // Recalcular plan de pagos
    static async recalculatePaymentPlan(anticipoId) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await apiClient.post(
                `${API_URL}/recalculate-payment-plan`,
                { anticipoId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error al recalcular el plan de pagos:', error);
            throw error;
        }
    }
}
