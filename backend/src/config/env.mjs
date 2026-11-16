import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta absoluta al archivo .env (dos niveles arriba desde /src/config/)
const envPath = path.resolve(__dirname, '../../.env');

// Cargar variables de entorno desde el archivo .env
dotenv.config({ path: envPath });

// Valores predeterminados para configuraciones críticas, utilizados si no se declaran en .env
const defaults = {
    JWT_EXPIRATION: '24h',
    PORT_BACKEND: 3000,
    LOGIN_MAX_INTENTOS: 5,
    LOGIN_IP_MAX_INTENTOS: 30,
    LOGIN_VENTANA_MS: 15 * 60 * 1000
};

/** Entero positivo del entorno, o el valor por defecto si falta o no es válido. */
function enteroPositivo(valor, porDefecto) {
    const numero = Number.parseInt(valor, 10);
    return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
}

if (!process.env.JWT_SECRET) {
    console.warn(`ADVERTENCIA: JWT_SECRET no está definido en ${envPath}.`);
}

if (!process.env.JWT_EXPIRATION) {
    console.warn(`ADVERTENCIA: JWT_EXPIRATION no está definido en ${envPath}. Usando valor predeterminado (${defaults.JWT_EXPIRATION}).`);
    process.env.JWT_EXPIRATION = defaults.JWT_EXPIRATION;
}

// Exportar variables de configuración
export const config = {
    jwt: {
        secret: process.env.JWT_SECRET,
        expiration: process.env.JWT_EXPIRATION
    },
    server: {
        port: process.env.PORT_BACKEND || defaults.PORT_BACKEND
    },
    login: {
        maxIntentos: enteroPositivo(process.env.LOGIN_MAX_INTENTOS, defaults.LOGIN_MAX_INTENTOS),
        ipMaxIntentos: enteroPositivo(process.env.LOGIN_IP_MAX_INTENTOS, defaults.LOGIN_IP_MAX_INTENTOS),
        ventanaMs: enteroPositivo(process.env.LOGIN_VENTANA_MS, defaults.LOGIN_VENTANA_MS)
    },
    db: {
        // Aquí podrías agregar configuraciones relacionadas con la base de datos
        // que podrían estar en variables de entorno
    }
};

// Exportar una función para obtener cualquier variable de entorno con un valor predeterminado
export function getEnv(key, defaultValue = null) {
    return process.env[key] || defaultValue;
}

// Para uso directo de process.env en código existente (evita errores)
export default process.env;
