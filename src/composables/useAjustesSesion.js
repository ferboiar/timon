/**
 * Ajustes que solo duran mientras la sesión está abierta (DC-21)
 *
 * «Permitir editar/borrar recibos pagados» (DC-21) y «Permitir declarar fechas fuera del año en curso» (DC-29) vuelven a desactivarse al cerrar sesión (useAuth.logout) o al recargar la página.
 */
import { ref } from 'vue';

export const permitirEditarPagados = ref(false);
export const permitirFechasFueraDeAnio = ref(false);

export function reiniciarAjustesSesion() {
    permitirEditarPagados.value = false;
    permitirFechasFueraDeAnio.value = false;
}
