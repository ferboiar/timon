/**
 * Directiva personalizada para control de acceso basado en roles
 * Uso: v-role="'admin'" o v-role="['admin', 'user']"
 */

import { useAuth } from '@/composables/useAuth';

export const vRole = {
    beforeMount(el, binding) {
        const { hasRole, hasAnyRole } = useAuth();

        // Si no hay valor de binding, no hacer nada
        if (!binding.value) return;

        // Comprobar si el binding es un array de roles o un solo rol
        const requiredRoles = Array.isArray(binding.value) ? binding.value : [binding.value];

        // Si el usuario no tiene ninguno de los roles requeridos, ocultar el elemento
        if (!hasAnyRole(requiredRoles)) {
            el.style.display = 'none';
        }
    },

    // Actualizar cuando cambien los datos de binding
    updated(el, binding) {
        const { hasRole, hasAnyRole } = useAuth();

        if (!binding.value) return;

        const requiredRoles = Array.isArray(binding.value) ? binding.value : [binding.value];

        if (!hasAnyRole(requiredRoles)) {
            el.style.display = 'none';
        } else {
            // Restablecer estilo de visualización solo si estaba oculto
            if (el.style.display === 'none') {
                el.style.display = '';
            }
        }
    }
};
