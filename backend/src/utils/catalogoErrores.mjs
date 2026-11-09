/**
 * Catálogo compartido de causas de error (F-48).
 *
 * Traduce el error de la base de datos o del sistema operativo a una frase que
 * una persona pueda entender: qué ha pasado y qué puede hacer. Nunca devuelve
 * códigos del motor (`ER_*`), nombres de tabla o columna, rutas de fichero,
 * trazas ni códigos de `errno`; el detalle completo queda en el log (DC-09).
 *
 * Dos audiencias, decididas por la ruta y no por el rol de quien llama:
 * - `admin`: rutas que el servidor exige como administrador. El mensaje puede
 *   hablar del servicio de la base de datos, del disco o de las herramientas
 *   del servidor.
 * - `general`: rutas de uso general. El texto se entiende sin conocimientos
 *   técnicos y remite al administrador.
 *
 * Todas las funciones son puras: se prueban sin base de datos ni servidor.
 */

/** Audiencia de una ruta reservada al administrador. */
export const AUDIENCIA_ADMIN = 'admin';

/** Audiencia de una ruta de uso general. */
export const AUDIENCIA_GENERAL = 'general';

/** Cierre del mensaje cuando la causa no está en el catálogo. */
const AVISOS = {
    [AUDIENCIA_ADMIN]: 'La causa no se ha podido identificar; consulta el registro del servidor.',
    [AUDIENCIA_GENERAL]: 'Inténtalo de nuevo y, si persiste, avisa al administrador.'
};

const BASE_NO_ACCESIBLE = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'EPIPE'];
const CREDENCIALES = ['ER_ACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR', 'ER_NOT_SUPPORTED_AUTH_MODE'];
const BASE_OCUPADA = ['ER_LOCK_WAIT_TIMEOUT', 'ER_LOCK_DEADLOCK'];
const DISCO_O_PERMISOS = ['ENOSPC', 'EACCES', 'EPERM'];
const DATO_REFERENCIADO = ['ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED'];

/** Nombres legibles de los índices únicos: el duplicado se resuelve por campo. */
const NOMBRES_DE_INDICE = {
    username_UNIQUE: 'nombre de usuario',
    username: 'nombre de usuario',
    email: 'correo',
    uq_categorias_nombre: 'nombre de categoría',
    nombre: 'nombre',
    iban: 'IBAN'
};

/** Nombres legibles de las columnas que pueden desbordarse. */
const NOMBRES_DE_CAMPO = {
    username: 'nombre de usuario',
    email: 'correo',
    concepto: 'concepto',
    descripcion: 'descripción',
    nombre: 'nombre',
    iban: 'IBAN',
    password: 'contraseña',
    rol: 'rol'
};

function textoDe(error) {
    if (error === null || error === undefined) return '';
    if (typeof error === 'string') return error;
    return String(error.sqlMessage || error.message || '');
}

/** Código del error, mirando también la causa encadenada. */
export function codigoDeError(error) {
    const codigo = error?.code ?? error?.cause?.code ?? error?.errno;
    return codigo === null || codigo === undefined ? '' : String(codigo);
}

/** Cierre del mensaje cuando la causa no se puede identificar. */
export function avisoDesconocido(audiencia = AUDIENCIA_GENERAL) {
    return AVISOS[audiencia] || AVISOS[AUDIENCIA_GENERAL];
}

/**
 * Nombre del índice único que ha provocado un duplicado, leído de la clave que
 * informa el motor (`for key 'tabla.indice'`). No se deduce del texto libre.
 *
 * @returns {string|null}
 */
export function nombreDeIndiceDuplicado(error) {
    if (codigoDeError(error) !== 'ER_DUP_ENTRY') return null;
    const coincidencia = textoDe(error).match(/for key '`?(?:[^.'`]+`?\.)?`?([^'`.]+)`?'/);
    return coincidencia ? coincidencia[1] : null;
}

/** Nombre legible del campo afectado por un duplicado, o `null`. */
export function campoDuplicado(error) {
    const indice = nombreDeIndiceDuplicado(error);
    if (!indice) return null;
    return NOMBRES_DE_INDICE[indice] || null;
}

/** Columna que ha desbordado su longitud, o `null` si el error no es de ese tipo. */
export function campoDemasiadoLargo(error) {
    if (codigoDeError(error) !== 'ER_DATA_TOO_LONG') return null;
    const coincidencia = textoDe(error).match(/column '([^']+)'/i);
    return coincidencia ? coincidencia[1] : null;
}

function esHerramientaAusente(error) {
    const codigo = codigoDeError(error);
    if (codigo === 'ENOENT' || codigo === '127' || codigo === '126') return true;
    return /command not found|no such file or directory/i.test(String(error?.stderr || '') + ' ' + textoDe(error));
}

/**
 * Mensaje de la causa cuando el catálogo la reconoce.
 *
 * `null` significa «no identificada» o «la resuelve el módulo»: el duplicado
 * por campo se compone en el módulo que conoce el dato afectado.
 *
 * @returns {string|null}
 */
export function mensajeDeCausa(error) {
    const codigo = codigoDeError(error);

    if (BASE_NO_ACCESIBLE.includes(codigo)) {
        return 'No se puede acceder a la base de datos. Comprueba que el servicio esté en marcha y que la dirección y el puerto sean correctos.';
    }
    if (CREDENCIALES.includes(codigo)) {
        return 'El servidor de la base de datos ha rechazado el usuario o la contraseña de la configuración.';
    }
    if (codigo === 'ER_BAD_DB_ERROR') {
        return 'El servidor no tiene ninguna base de datos con ese nombre.';
    }
    if (DATO_REFERENCIADO.includes(codigo)) {
        return 'No se puede eliminar porque tiene datos asociados.';
    }
    if (codigo === 'ER_DATA_TOO_LONG') {
        const campo = campoDemasiadoLargo(error);
        const nombre = campo ? NOMBRES_DE_CAMPO[campo] : null;
        return nombre ? 'El valor de «' + nombre + '» es demasiado largo.' : 'Uno de los datos es demasiado largo.';
    }
    if (BASE_OCUPADA.includes(codigo)) {
        return 'La base de datos está ocupada. Inténtalo de nuevo en unos segundos.';
    }
    if (DISCO_O_PERMISOS.includes(codigo)) {
        return 'No hay espacio en disco o falta permiso de escritura en el servidor.';
    }
    if (esHerramientaAusente(error)) {
        return 'La herramienta de copia de seguridad no está instalada en el servidor.';
    }
    return null;
}

/**
 * Compone el mensaje visible de un error técnico: mensaje propio de la
 * operación y, detrás, la causa identificada o el aviso por audiencia.
 */
export function mensajeTecnico(mensajePropio, error, { audiencia = AUDIENCIA_GENERAL, aviso = null } = {}) {
    const causa = mensajeDeCausa(error) || aviso || avisoDesconocido(audiencia);
    return [mensajePropio, causa].filter(Boolean).join(' ');
}
