/**
 * Directiva personalizada para control de acceso basado en roles
 *
 * Esta directiva proporciona una forma declarativa de controlar la visibilidad de elementos
 * en la interfaz de usuario basada en los roles del usuario actual. A diferencia de usar
 * v-if con una computed property como isAdmin, esta directiva simplemente oculta el elemento
 * (display: none) en lugar de eliminarlo del DOM.
 *
 * Casos de uso:
 * - Mostrar/ocultar elementos pequeños de la UI como botones o enlaces basados en roles
 * - Controlar acceso a funcionalidades específicas dentro de componentes más grandes
 * - Implementar restricciones de UI sin necesidad de lógica adicional en el componente
 *
 * Consideraciones:
 * - Para secciones completas o componentes grandes, es preferible usar v-if con isAdmin u otras
 *   propiedades computadas, ya que esto evita renderizar completamente el elemento
 * - Esta directiva solo oculta visualmente el elemento, pero sigue estando en el DOM
 *
 * Uso:
 * v-role="'admin'" o v-role="['admin', 'user']"
 */

import { useAuth } from '@/composables/useAuth';

export const vRole = {
    beforeMount(el, binding) {
        const { hasAnyRole } = useAuth();

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
        const { hasAnyRole } = useAuth();

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
