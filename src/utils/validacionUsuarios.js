/**
 * Validación de usuarios en la pantalla (F-42, DC-51).
 *
 * Espejo de `backend/src/utils/validacionUsuarios.mjs`: mismos límites y mensajes.
 * Las funciones devuelven un mensaje o null; la pantalla decide si deshabilita Guardar.
 * La prueba de paridad `backend/test/paridadValidacionUsuarios.test.mjs` compara ambas.
 */

export const ROLES_USUARIO = ['admin', 'user', 'limited_user', 'reader'];
export const PERMISOS_USUARIO = ['no', 'lectura', 'escritura'];
export const MODULOS_PERMISO = ['recibos', 'presupuestos', 'ahorros', 'anticipos', 'transacciones', 'categorias', 'cuentas'];

export const LONGITUD_MAXIMA_USUARIO = 50;
export const LONGITUD_MAXIMA_EMAIL = 100;
export const LONGITUD_MINIMA_PASSWORD = 8;
export const LONGITUD_MAXIMA_PASSWORD = 72;
export const LONGITUD_MAXIMA_PASSWORD_BYTES = 72;
export const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tieneCaracteresDeControl(texto) {
    for (const caracter of texto) {
        const codigo = caracter.codePointAt(0);
        if (codigo <= 0x1f || codigo === 0x7f) return true;
    }
    return false;
}

export function limpiarTexto(valor) {
    return typeof valor === 'string' ? valor.trim() : valor;
}

export function errorNombreUsuario(valor) {
    if (valor === undefined || valor === null || valor === '') return 'El nombre de usuario es obligatorio.';
    if (typeof valor !== 'string') return 'El nombre de usuario debe ser texto.';

    const texto = valor.trim();
    if (texto === '') return 'El nombre de usuario es obligatorio.';
    if (texto.length > LONGITUD_MAXIMA_USUARIO) {
        return 'El nombre de usuario no puede superar los ' + LONGITUD_MAXIMA_USUARIO + ' caracteres.';
    }
    if (tieneCaracteresDeControl(texto)) return 'El nombre de usuario no puede contener caracteres de control.';

    return null;
}

export function errorEmail(valor) {
    if (valor === undefined || valor === null || valor === '') return 'El correo es obligatorio.';
    if (typeof valor !== 'string') return 'El correo debe ser texto.';

    const texto = valor.trim();
    if (texto === '') return 'El correo es obligatorio.';
    if (texto.length > LONGITUD_MAXIMA_EMAIL) {
        return 'El correo no puede superar los ' + LONGITUD_MAXIMA_EMAIL + ' caracteres.';
    }
    if (tieneCaracteresDeControl(texto)) return 'El correo no puede contener caracteres de control.';
    if (!PATRON_EMAIL.test(texto)) return 'El correo no tiene un formato válido.';

    return null;
}

export function errorPassword(valor, { obligatoria = true } = {}) {
    const vacia = valor === undefined || valor === null || valor === '';
    if (vacia) return obligatoria ? 'La contraseña es obligatoria.' : null;
    if (typeof valor !== 'string') return 'La contraseña debe ser texto.';
    if (valor.length < LONGITUD_MINIMA_PASSWORD || valor.length > LONGITUD_MAXIMA_PASSWORD) {
        return 'La contraseña debe tener entre ' + LONGITUD_MINIMA_PASSWORD + ' y ' + LONGITUD_MAXIMA_PASSWORD + ' caracteres.';
    }
    if (new TextEncoder().encode(valor).length > LONGITUD_MAXIMA_PASSWORD_BYTES) {
        return 'La contraseña no puede superar los ' + LONGITUD_MAXIMA_PASSWORD_BYTES + ' bytes.';
    }
    if (!/\p{L}/u.test(valor) || !/\d/.test(valor)) {
        return 'La contraseña debe incluir al menos una letra y un número.';
    }

    return null;
}

export function errorRol(valor) {
    if (valor === undefined || valor === null || valor === '') return 'El rol es obligatorio.';
    if (typeof valor !== 'string') return 'El rol debe ser admin, user, limited_user o reader.';
    if (!ROLES_USUARIO.includes(valor.trim())) return 'El rol debe ser admin, user, limited_user o reader.';

    return null;
}

export function errorPermisos(datos = {}) {
    for (const modulo of MODULOS_PERMISO) {
        const valor = datos['perm_' + modulo];
        if (valor === undefined || valor === null || valor === '') continue;
        if (!PERMISOS_USUARIO.includes(valor)) {
            return 'El permiso de ' + modulo + ' debe ser no, lectura o escritura.';
        }
    }

    return null;
}
