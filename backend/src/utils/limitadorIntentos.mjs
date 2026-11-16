/**
 * Limitador de intentos en memoria (S-04b, DC-63).
 *
 * Cuenta solo los fallos de una clave (IP + usuario) dentro de una ventana. Un
 * inicio de sesión correcto reinicia la cuenta. El reloj se inyecta para poder
 * probar la ventana sin esperas y la limpieza periódica no mantiene el proceso vivo.
 *
 * @module utils/limitadorIntentos
 */

/**
 * Crea un limitador con ventana deslizante por clave.
 *
 * @param {{ maxIntentos?: number, ventanaMs?: number, ahora?: () => number, programarLimpieza?: boolean }} opciones
 * @returns {{ comprobar: Function, registrarFallo: Function, registrarExito: Function, limpiar: Function, maxIntentos: number, ventanaMs: number }}
 */
export function crearLimitador({ maxIntentos = 5, ventanaMs = 15 * 60 * 1000, ahora = Date.now, programarLimpieza = true } = {}) {
    if (!Number.isInteger(maxIntentos) || maxIntentos < 1) throw new TypeError('maxIntentos debe ser un entero positivo');
    if (!Number.isInteger(ventanaMs) || ventanaMs < 1) throw new TypeError('ventanaMs debe ser un entero positivo');
    if (typeof ahora !== 'function') throw new TypeError('ahora debe ser una función');

    /** @type {Map<string, { fallos: number, primero: number }>} */
    const registros = new Map();

    function limpiar() {
        const instante = ahora();
        for (const [clave, registro] of registros) {
            if (instante - registro.primero >= ventanaMs) registros.delete(clave);
        }
    }

    function estado(clave) {
        limpiar();
        const registro = registros.get(clave);
        if (!registro) return { bloqueado: false, intentos: 0, segundosRestantes: 0 };

        const transcurrido = ahora() - registro.primero;
        if (transcurrido >= ventanaMs) {
            registros.delete(clave);
            return { bloqueado: false, intentos: 0, segundosRestantes: 0 };
        }

        const bloqueado = registro.fallos >= maxIntentos;
        return {
            bloqueado,
            intentos: registro.fallos,
            segundosRestantes: bloqueado ? Math.max(1, Math.ceil((ventanaMs - transcurrido) / 1000)) : 0
        };
    }

    function registrarFallo(clave) {
        limpiar();
        const registro = registros.get(clave);
        if (registro) registro.fallos += 1;
        else registros.set(clave, { fallos: 1, primero: ahora() });

        return estado(clave);
    }

    function registrarExito(clave) {
        registros.delete(clave);
    }

    const temporizador = programarLimpieza ? setInterval(limpiar, ventanaMs) : null;
    if (temporizador && typeof temporizador.unref === 'function') temporizador.unref();

    return { comprobar: estado, registrarFallo, registrarExito, limpiar, maxIntentos, ventanaMs };
}

/** Clave normalizada: IP y usuario en minúsculas, sin espacios y acotado a 50. */
export function claveDeIntento(ip, username) {
    const usuario = typeof username === 'string' ? username.trim().toLowerCase().slice(0, 50) : '';
    const origen = typeof ip === 'string' && ip.trim() ? ip.trim() : 'desconocida';

    return origen + '|' + usuario;
}
