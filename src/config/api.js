/**
 * Configuración centralizada para las conexiones a la API
 * Solo define la URL base para todas las peticiones al backend
 */

// URL base para las conexiones a la API
// En desarrollo usamos localhost con el puerto definido en las variables de entorno del frontend
// En producción, se puede cambiar a la URL del servidor de producción
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Para usar esta configuración en los componentes o servicios, simplemente:
// import { API_BASE_URL } from '@/config/api';
//
// Y luego concatenar con la ruta específica:
// fetch(`${API_BASE_URL}/api/auth/login`, {...})

export default API_BASE_URL;
