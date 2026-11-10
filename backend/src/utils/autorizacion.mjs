/**
 * Matriz de autorización de Timón (DC-48).
 * ========================================
 *
 * Funciones puras, sin acceso a la base de datos, para que la regla de negocio se pueda
 * probar sin MariaDB. El middleware `autorizar` carga el usuario vigente y aplica estas
 * funciones; las rutas usan las de registro para decidir si se puede editar o borrar.
 *
 * Reglas (DC-48):
 * - admin: ve, crea, edita y borra todo, privados incluidos.
 * - user: ve lo que permita perm_*; crea, edita y borra cualquier registro visible si
 *   perm_<módulo> es `escritura`.
 * - limited_user: ve lo que permita perm_*; crea si escritura; edita solo registros de los
 *   que es propietario; nunca borra.
 * - reader: solo lectura.
 * - es_privado = 1: solo lo ven su propietario y admin. Un registro no visible tampoco se
 *   edita ni se borra (admin sí).
 * - propietario_id no cambia nunca al editar.
 * - Subrecursos (pagos, movimientos, fechas): heredan visibilidad y permisos del padre.
 * - Cuentas y categorías: compartidas, sin privacidad ni comprobación de propiedad.
 */

export const MODULOS = ['recibos', 'presupuestos', 'ahorros', 'anticipos', 'transacciones', 'categorias', 'cuentas'];

export const ACCIONES = ['lectura', 'escritura', 'borrado'];

/** Módulos compartidos: se ignora `es_privado` y la propiedad del registro (DC-48). */
export const MODULOS_COMPARTIDOS = ['cuentas', 'categorias'];

/** ¿Puede el usuario realizar la acción sobre el módulo? Solo rol y perm_*. */
export function puedeAcceder(usuario, modulo, accion) {
    if (!usuario) return false;
    if (usuario.rol === 'admin') return true;

    const permiso = usuario[`perm_${modulo}`];

    if (!permiso || permiso === 'no') return false;
    if (accion === 'lectura') return true;
    if (usuario.rol === 'reader') return false;
    if (usuario.rol === 'limited_user') return accion === 'escritura' && permiso === 'escritura';

    return permiso === 'escritura';
}

/** ¿Puede el usuario ver el registro? Admin y compartidos siempre; privados, solo el propietario. */
export function puedeVerRegistro(usuario, registro, modulo) {
    if (!usuario || !registro) return false;
    if (MODULOS_COMPARTIDOS.includes(modulo)) return true;
    if (usuario.rol === 'admin') return true;

    return Number(registro.es_privado) === 0 || Number(registro.propietario_id) === Number(usuario.id);
}

/** ¿Puede el usuario editar el registro? Además de la matriz, exige visibilidad y, para limited_user, propiedad. */
export function puedeEditarRegistro(usuario, registro, modulo) {
    if (!usuario || !registro) return false;
    if (usuario.rol === 'admin') return true;
    if (MODULOS_COMPARTIDOS.includes(modulo)) return true;
    if (!puedeVerRegistro(usuario, registro, modulo)) return false;
    if (usuario.rol === 'user') return true;
    if (usuario.rol === 'limited_user') return Number(registro.propietario_id) === Number(usuario.id);

    return false;
}

/** ¿Puede el usuario borrar el registro? limited_user y reader nunca; user, si es visible. */
export function puedeBorrarRegistro(usuario, registro, modulo) {
    if (!usuario || !registro) return false;
    if (usuario.rol === 'admin') return true;
    if (MODULOS_COMPARTIDOS.includes(modulo)) return true;
    if (!puedeVerRegistro(usuario, registro, modulo)) return false;

    return usuario.rol === 'user';
}

/** Filtra un listado por visibilidad. Admin y módulos compartidos lo reciben completo. */
export function filtrarVisibles(usuario, filas, modulo) {
    if (!usuario || usuario.rol === 'admin' || MODULOS_COMPARTIDOS.includes(modulo)) return filas;

    return filas.filter((fila) => puedeVerRegistro(usuario, fila, modulo));
}
