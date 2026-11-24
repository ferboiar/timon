/**
 * ¿Quién puede marcar o desmarcar `es_privado`? (DC-75, F-49)
 * ==========================================================
 *
 * La interfaz decide con esta regla si renderiza el control; el servidor sigue siendo la
 * autoridad y responde 403 `PRIVACIDAD_NO_PERMITIDA` si alguien intenta cambiarla sin permiso.
 *
 * - Administrador: siempre.
 * - `user` y `limited_user`: en los registros de los que son propietarios. En el alta el creador
 *   es el propietario, así que ven el control.
 * - `reader`: nunca.
 *
 * La regla usa el rol y `propietario_id` (que no cambia al editar), nunca `perm_*`: el cliente no
 * los recibe. Un usuario con permiso de solo lectura verá el control en sus registros y el
 * servidor responderá 403 al guardar, igual que hoy con cualquier otro campo (limitación conocida).
 */
import { useAuth } from '@/composables/useAuth';
import { computed } from 'vue';

/** Roles que pueden marcar la privacidad de un registro que crean. */
const ROLES_CON_ALTA = ['user', 'limited_user'];

export function usePrivacidad() {
    const { currentUser, isAdmin } = useAuth();

    const idUsuario = computed(() => Number(currentUser.value?.id ?? 0));

    /** ¿Se renderiza el control? En el alta, `esAlta: true` (el creador es el propietario). */
    const puedeCambiarPrivacidad = (registro, { esAlta = false } = {}) => {
        if (!currentUser.value) return false;
        if (isAdmin.value) return true;
        if (currentUser.value.rol === 'reader') return false;
        if (esAlta) return ROLES_CON_ALTA.includes(currentUser.value.rol);

        return Number(registro?.propietario_id) === idUsuario.value;
    };

    return { puedeCambiarPrivacidad };
}
