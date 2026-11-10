/**
 * Utilidades de sesión del navegador.
 * ==================================
 *
 * Centralizan la limpieza de los dos almacenes y el aviso de caducidad, para que el guard
 * del router y el interceptor de `apiClient` se comporten igual sin importar `useAuth`
 * (S-07: evita el ciclo `api.js` ↔ `useAuth.js` y el uso del composable fuera de un
 * componente).
 *
 * El aviso vive en `sessionStorage` y se consume una sola vez en el login (U-16).
 */

const CLAVE_AVISO = 'timon.avisoSesion';

/** Elimina el token y el usuario de los dos almacenes. Conserva `rememberedUser`. */
export function limpiarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
}

/** Marca que la próxima visita al login debe avisar de la caducidad. */
export function marcarSesionCaducada() {
    sessionStorage.setItem(CLAVE_AVISO, 'caducada');
}

/** Devuelve el aviso pendiente y lo borra, para mostrarlo una sola vez. */
export function consumirAvisoSesion() {
    const aviso = sessionStorage.getItem(CLAVE_AVISO);
    sessionStorage.removeItem(CLAVE_AVISO);

    return aviso;
}

/** Limpia la sesión y deja el aviso de caducidad para el login. */
export function cerrarSesionPorCaducidad() {
    limpiarSesion();
    marcarSesionCaducada();
}

/** ¿Hay una caducidad pendiente de avisar? No la consume: el login puede montarse varias veces. */
export function hayAvisoSesion() {
    return sessionStorage.getItem(CLAVE_AVISO) === 'caducada';
}

/** Ruta de login con el motivo de caducidad, para que el aviso no dependa del montaje. */
export function rutaLoginPorCaducidad() {
    return '/auth/login?motivo=caducada';
}
