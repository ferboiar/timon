import { API_BASE_URL } from '@/config/api';
import axios from 'axios';

// Ajustes del sistema: zona horaria, creación automática de recibos y generación manual del año (DC-24, DC-25)

const API_URL = `${API_BASE_URL}/api/ajustes`;

function cabeceras() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function errorDe(error, mensajePorDefecto) {
    return new Error(error.response?.data?.error || mensajePorDefecto);
}

export class AjustesService {
    // Zona horaria de la aplicación (cualquier usuario autenticado)
    static async getGeneral() {
        try {
            const respuesta = await axios.get(`${API_URL}/general`, { headers: cabeceras() });
            return respuesta.data;
        } catch (error) {
            throw errorDe(error, 'No se pudieron obtener los ajustes generales');
        }
    }

    // Cambia la zona horaria (solo administrador)
    static async saveZonaHoraria(zona) {
        try {
            const respuesta = await axios.put(`${API_URL}/general`, { zona_horaria: zona }, { headers: cabeceras() });
            return respuesta.data;
        } catch (error) {
            throw errorDe(error, 'No se pudo guardar la zona horaria');
        }
    }

    // Interruptor de la creación automática de recibos (solo administrador)
    static async getRecibos() {
        try {
            const respuesta = await axios.get(`${API_URL}/recibos`, { headers: cabeceras() });
            return respuesta.data;
        } catch (error) {
            throw errorDe(error, 'No se pudieron obtener los ajustes de recibos');
        }
    }

    static async saveCrearRecibosAutomaticamente(activo) {
        try {
            const respuesta = await axios.put(`${API_URL}/recibos`, { crear_recibos_automaticamente: activo }, { headers: cabeceras() });
            return respuesta.data;
        } catch (error) {
            throw errorDe(error, 'No se pudo guardar el ajuste');
        }
    }

    // Vista previa (simular = true) o ejecución manual del procedimiento que crea los recibos del año
    static async generarRecibosAnio(simular = true) {
        try {
            const respuesta = await axios.post(`${API_URL}/recibos/generar-anio`, { simular }, { headers: cabeceras() });
            return respuesta.data;
        } catch (error) {
            throw errorDe(error, 'No se pudieron generar los recibos del año');
        }
    }
}
