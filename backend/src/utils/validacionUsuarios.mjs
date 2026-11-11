/**
 * Validación de usuarios (F-42, DC-51).
 *
 * Funciones puras, sin base de datos ni Express, para que la ruta valide antes de hashear
 * la contraseña y para que la prueba de paridad pueda compararlas con las de la pantalla.
 * Los mensajes son los mismos que usa `src/utils/validacionUsuarios.js`.
 *
 * Política de contraseña (DC-51): entre 8 y 72 caracteres, máximo 72 bytes UTF-8
 * (límite de bcrypt), al menos una letra y un número. En la edición de usuario la
 * contraseña es opcional; si llega vacía se ignora y si llega con valor se valida igual.
 */
import { ErrorDeNegocio } from './errorDeNegocio.mjs';

export const ROLES_USUARIO = ['admin', 'user', 'limited_user', 'reader'];
export const PERMISOS_USUARIO = ['no', 'lectura', 'escritura'];
export const MODULOS_PERMISO = [
    'recibos',
    'presupuestos',
    'ahorros',
    'anticipos',
    'transacciones',
    'categorias',
    'cuentas'
];

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

/** Quita espacios de los extremos solo si el valor es texto. */
export function limpiarTexto(valor) {
    return typeof valor === 'string' ? valor.trim() : valor;
}

/** Mensaje de error del nombre de usuario, o null si es válido. */
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

/** Mensaje de error del correo, o null si es válido. */
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

/**
 * Mensaje de error de la contraseña, o null si es válida.
 * Con `obligatoria = false`, un valor vacío se considera «no enviado» y es válido.
 */
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

/** Mensaje de error del rol, o null si es válido. */
export function errorRol(valor) {
    if (valor === undefined || valor === null || valor === '') return 'El rol es obligatorio.';
    if (typeof valor !== 'string') return 'El rol debe ser admin, user, limited_user o reader.';

    if (!ROLES_USUARIO.includes(valor.trim())) return 'El rol debe ser admin, user, limited_user o reader.';

    return null;
}

/** Mensaje del primer permiso inválido, o null si todos son válidos o no se envían. */
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

/** Devuelve solo los permisos enviados y válidos, sin claves vacías. */
function normalizarPermisos(datos = {}) {
    const permisos = {};

    for (const modulo of MODULOS_PERMISO) {
        const valor = datos['perm_' + modulo];
        if (valor === undefined || valor === null || valor === '') continue;
        permisos['perm_' + modulo] = valor;
    }

    return permisos;
}

function lanzarPrimerError(errores) {
    const error = errores.find(Boolean);
    if (error) throw new ErrorDeNegocio(error, 400);
}

/** Valida un alta y devuelve los datos normalizados. */
export function validarAltaUsuario(datos = {}) {
    datos = datos ?? {};
    lanzarPrimerError([
        errorNombreUsuario(datos.username),
        errorEmail(datos.email),
        errorPassword(datos.password, { obligatoria: true }),
        errorRol(datos.rol),
        errorPermisos(datos)
    ]);

    return {
        username: limpiarTexto(datos.username),
        email: limpiarTexto(datos.email),
        password: datos.password,
        rol: limpiarTexto(datos.rol),
        permisos: normalizarPermisos(datos)
    };
}

/** Valida una edición y devuelve los datos normalizados. La contraseña es opcional. */
export function validarEdicionUsuario(datos = {}) {
    datos = datos ?? {};

    if (datos.id === undefined || datos.id === null || datos.id === '') {
        throw new ErrorDeNegocio('El usuario indicado no es válido.', 400);
    }

    lanzarPrimerError([
        errorNombreUsuario(datos.username),
        errorEmail(datos.email),
        errorPassword(datos.password, { obligatoria: false }),
        errorRol(datos.rol),
        errorPermisos(datos)
    ]);

    return {
        id: datos.id,
        username: limpiarTexto(datos.username),
        email: limpiarTexto(datos.email),
        password: datos.password,
        rol: limpiarTexto(datos.rol),
        permisos: normalizarPermisos(datos)
    };
}

/** Valida un cambio de contraseña y devuelve los datos normalizados. */
export function validarCambioPassword(datos = {}) {
    datos = datos ?? {};

    if (datos.id === undefined || datos.id === null || datos.id === '') {
        throw new ErrorDeNegocio('El usuario indicado no es válido.', 400);
    }

    const error = errorPassword(datos.password, { obligatoria: true });
    if (error) throw new ErrorDeNegocio(error, 400);

    return { id: datos.id, password: datos.password };
}
