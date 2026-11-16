/**
 * Opciones del tope de intentos por IP para `/api/auth/login` (S-04b, DC-63).
 *
 * Este módulo no importa `express-rate-limit`: la ruta crea el middleware con
 * `rateLimit(opcionesLimitadorIp(config.login))`. La instanciación en el propio módulo
 * de la ruta es la que CodeQL reconoce; la fábrica anterior en otro fichero no lo era.
 *
 * Complementa al limitador propio por IP+usuario: este último no cubre la rotación
 * de nombres de usuario ni un ataque que reparta intentos entre muchas cuentas.
 *
 * @module middleware/limitadorIp
 */

export const MENSAJE_LIMITE_IP = 'Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.';

/**
 * Opciones puras para `rateLimit(...)`.
 *
 * - `skipSuccessfulRequests: true`: solo cuentan las respuestas no exitosas; un login
 *   correcto no consume cupo y descuenta el que hubiera.
 * - `ipv6Subnet: 56`: la librería agrupa las IPv6 por subred /56 en su generador de
 *   clave por defecto; se fija explícitamente para que la política sea visible.
 * - `standardHeaders: 'draft-7'` y `legacyHeaders: false`: se emiten las cabeceras
 *   `RateLimit-*` del borrador 7, sin las antiguas `X-RateLimit-*`.
 * - El 429 usa el mismo cuerpo y `Retry-After` que el limitador propio.
 *
 * @param {{ ipMaxIntentos?: number, ventanaMs?: number }} config
 * @returns {Object} Opciones de `express-rate-limit`
 */
export function opcionesLimitadorIp({ ipMaxIntentos = 30, ventanaMs = 15 * 60 * 1000 } = {}) {
    if (!Number.isInteger(ipMaxIntentos) || ipMaxIntentos < 1) throw new TypeError('ipMaxIntentos debe ser un entero positivo');
    if (!Number.isInteger(ventanaMs) || ventanaMs < 1) throw new TypeError('ventanaMs debe ser un entero positivo');

    return {
        windowMs: ventanaMs,
        limit: ipMaxIntentos,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        ipv6Subnet: 56,
        handler: (req, res) => {
            const reinicio = req.rateLimit?.resetTime;
            const segundos = reinicio instanceof Date ? Math.max(1, Math.ceil((reinicio.getTime() - Date.now()) / 1000)) : Math.max(1, Math.ceil(ventanaMs / 1000));

            res.set('Retry-After', String(segundos));
            return res.status(429).json({ success: false, message: MENSAJE_LIMITE_IP });
        }
    };
}
