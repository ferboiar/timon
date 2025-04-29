/**
 * Configuración centralizada para las llamadas a la API
 * ===================================================
 *
 * Este archivo proporciona configuración para las llamadas a la API, incluyendo:
 * - URL base para todas las peticiones
 * - Interceptores para gestionar automáticamente errores de autenticación
 * - Manejo de tokens expirados con redirección a login
 */

import { useAuth } from '@/composables/useAuth';
import axios from 'axios';

// URL base para todas las peticiones API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Instancia centralizada de axios con configuración común
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para añadir el token a las peticiones
apiClient.interceptors.request.use(
    (config) => {
        // Primero intentamos obtener el token del localStorage (usuario eligió "Recordarme")
        let token = localStorage.getItem('token');

        // Si no hay token en localStorage, intentamos en sessionStorage
        if (!token) {
            token = sessionStorage.getItem('token');
        }

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores de autenticación (401, 403)
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Verificar si el error es de autenticación (401) o autorización (403)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Si el error es por token expirado o inválido
            if (error.response.data && (error.response.data.message === 'Token inválido o expirado' || error.response.data.message === 'Se requiere token de autenticación')) {
                console.warn('Sesión expirada o inválida. Redirigiendo a login...');

                // Usar useAuth() para cerrar la sesión correctamente
                const { logout } = useAuth();
                logout();

                // No propagamos el error ya que el logout ya maneja la redirección
                return Promise.reject(new Error('Sesión expirada. Por favor, inicie sesión nuevamente.'));
            }
        }

        // Para otros errores, los propagamos normalmente
        return Promise.reject(error);
    }
);

export default apiClient;
