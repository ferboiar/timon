/**
 * Ajustes que solo duran mientras la sesión está abierta (DC-21)
 *
 * «Permitir editar/borrar recibos pagados» vuelve a desactivarse al cerrar sesión (useAuth.logout) o al recargar la página.
 */
import { ref } from 'vue';

export const permitirEditarPagados = ref(false);

export function reiniciarAjustesSesion() {
    permitirEditarPagados.value = false;
}
