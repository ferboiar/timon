/**
 * Configuración centralizada para las llamadas a la API
 * ===================================================
 *
 * Este archivo proporciona configuración para las llamadas a la API, incluyendo:
 * - URL base para todas las peticiones
 * - Interceptores para gestionar automáticamente errores de autenticación
 * - Manejo de tokens expirados con redirección a login
 */

import { cerrarSesionPorCaducidad, rutaLoginPorCaducidad } from '@/utils/sesion';
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
        // S-16: el token inválido o ausente responde 401. El 403 es autorización y no cierra la sesión.
        const mensaje = error.response?.data?.message;

        if (error.response?.status === 401 && (mensaje === 'Token inválido o expirado' || mensaje === 'Se requiere token de autenticación')) {
            console.warn('Sesión expirada o inválida. Redirigiendo a login...');

            // S-07/U-16: sin useAuth (evita el ciclo api.js ↔ useAuth.js); deja el aviso para el login
            cerrarSesionPorCaducidad();
            window.location.assign(rutaLoginPorCaducidad());

            return Promise.reject(new Error('Sesión expirada. Por favor, inicie sesión nuevamente.'));
        }

        return Promise.reject(error);
    }
);

export default apiClient;
