/**
 * Tope de intentos por IP para `/api/auth/login` (S-04b, DC-63).
 *
 * Complementa al limitador propio por IP+usuario: este último no cubre la rotación
 * de nombres de usuario ni un ataque que reparta intentos entre muchas cuentas. El
 * tope por IP se aplica como middleware antes del manejador; el limitador propio
 * mantiene su política dentro del manejador.
 *
 * CodeQL no reconoce el limitador propio y exige un control de tasa reconocible en la
 * ruta; por eso se usa `express-rate-limit` como segunda capa, sin sustituir la primera.
 *
 * @module middleware/limitadorIp
 */
import { rateLimit } from 'express-rate-limit';

export const MENSAJE_LIMITE_IP = 'Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.';

/**
 * Crea el middleware de tope por IP.
 *
 * Opciones deliberadas:
 * - `skipSuccessfulRequests: true`: solo cuentan las respuestas no exitosas; un login
 *   correcto no consume cupo y descuenta el que hubiera.
 * - `ipv6Subnet: 56`: la librería agrupa las IPv6 por subred /56 en su generador de
 *   clave por defecto; se fija explícitamente para que la política sea visible.
 * - `standardHeaders: 'draft-7'` y `legacyHeaders: false`: se emiten las cabeceras
 *   `RateLimit-*` del borrador 7, sin las antiguas `X-RateLimit-*`.
 * - El 429 usa el mismo cuerpo y `Retry-After` que el limitador propio.
 *
 * @param {{ maxIntentos?: number, ventanaMs?: number, mensaje?: string }} opciones
 * @returns {Function} Middleware de Express
 */
export function crearLimitadorIp({ maxIntentos = 30, ventanaMs = 15 * 60 * 1000, mensaje = MENSAJE_LIMITE_IP } = {}) {
    if (!Number.isInteger(maxIntentos) || maxIntentos < 1) throw new TypeError('maxIntentos debe ser un entero positivo');
    if (!Number.isInteger(ventanaMs) || ventanaMs < 1) throw new TypeError('ventanaMs debe ser un entero positivo');
    if (typeof mensaje !== 'string' || mensaje.trim() === '') throw new TypeError('mensaje debe ser texto no vacío');

    return rateLimit({
        windowMs: ventanaMs,
        limit: maxIntentos,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        ipv6Subnet: 56,
        handler: (req, res) => {
            const reinicio = req.rateLimit?.resetTime;
            const segundos = reinicio instanceof Date ? Math.max(1, Math.ceil((reinicio.getTime() - Date.now()) / 1000)) : Math.max(1, Math.ceil(ventanaMs / 1000));

            res.set('Retry-After', String(segundos));
            return res.status(429).json({ success: false, message: mensaje });
        }
    });
}
