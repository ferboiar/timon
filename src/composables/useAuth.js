/**
 * Composable para la gestión de autenticación y autorización de usuarios en la aplicación Timón
 * ==========================================================================================
 *
 * Este composable proporciona una solución completa para manejar el estado de autenticación
 * del usuario, gestionar roles y permisos, y realizar operaciones relacionadas con la sesión.
 *
 * Funcionalidad principal:
 * - Gestión del estado de autenticación (login/logout)
 * - Persistencia de la sesión mediante localStorage y sessionStorage
 * - Sistema de verificación de roles y permisos basado en jerarquía
 * - Métodos para comprobar permisos específicos (isAdmin, isUser, canRead)
 * - Gestión del cierre de sesión con redirección automática
 *
 * Valores y métodos exportados:
 * -------------------------------------
 * @property {Ref<Object|null>} currentUser - Referencia reactiva al usuario actual con datos como:
 *   - id: Identificador único del usuario
 *   - username: Nombre de usuario
 *   - email: Correo electrónico del usuario
 *   - rol: Rol del usuario en el sistema
 *
 * @property {ComputedRef<boolean>} isAuthenticated - Indica si hay un usuario autenticado actualmente
 * @property {ComputedRef<string|null>} userRole - Devuelve el rol del usuario actual o null si no hay usuario
 * @property {ComputedRef<boolean>} isAdmin - Indica si el usuario actual tiene rol de administrador
 * @property {ComputedRef<boolean>} isUser - Indica si el usuario tiene rol de usuario estándar o administrador
 * @property {ComputedRef<boolean>} canRead - Indica si el usuario tiene al menos permisos de lectura
 *
 * @property {Object} ROLES - Objeto con los roles disponibles en la aplicación:
 *   - ADMIN: 'admin' - Acceso completo a todas las funcionalidades
 *   - USER: 'user' - Usuario estándar con acceso a la mayoría de funcionalidades
 *   - LIMITED_USER: 'limited_user' - Usuario con acceso limitado
 *   - READER: 'reader' - Usuario con permisos solo de lectura
 *
 * @method hasRole(role) - Verifica si el usuario actual tiene exactamente el rol especificado
 * @method hasAnyRole(roles) - Verifica si el usuario tiene al menos uno de los roles en el array
 * @method logout() - Cierra la sesión del usuario actual y redirecciona a la página de login
 * @method refreshUser() - Actualiza los datos del usuario desde el almacenamiento local
 *
 * Uso típico:
 * ```js
 * import { useAuth } from '@/composables/useAuth';
 *
 * const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();
 *
 * // Comprobar autenticación
 * if (isAuthenticated.value) {
 *   // El usuario está autenticado
 *   console.log(`Bienvenido ${currentUser.value.username}`);
 * }
 *
 * // Control de acceso basado en roles
 * if (isAdmin.value) {
 *   // Mostrar funcionalidades de administración
 * }
 * ```
 *
 * @returns {Object} Conjunto de propiedades y métodos para gestionar la autenticación
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

/**
 * Composable para gestionar la autenticación y comprobación de roles
 * @returns {Object} Métodos y propiedades para gestionar la autenticación
 */
export function useAuth() {
    const currentUser = ref(null); //almacena id, username, email, rol
    const isAuthenticated = computed(() => !!currentUser.value); // Verifica si el usuario está autenticado
    const userRole = computed(() => currentUser.value?.rol || null); // Obtiene el rol del usuario actual
    const router = useRouter();

    // Roles disponibles en la aplicación según la estructura de la base de datos
    const ROLES = {
        ADMIN: 'admin',
        USER: 'user',
        LIMITED_USER: 'limited_user',
        READER: 'reader'
    };

    // Inicializar: carga el usuario desde localStorage o sessionStorage
    const loadUser = () => {
        // Primero intentamos obtener el usuario de localStorage
        let user = localStorage.getItem('user');

        // Si no existe en localStorage, intentamos en sessionStorage
        if (!user) {
            user = sessionStorage.getItem('user');
        }

        if (user) {
            try {
                currentUser.value = JSON.parse(user);
            } catch (error) {
                console.error('Error al parsear los datos del usuario:', error);
                currentUser.value = null;
            }
        }
    };

    // Verificar si el usuario tiene un rol específico
    const hasRole = (role) => {
        return userRole.value === role;
    };

    // Verificar si el usuario tiene al menos uno de los roles proporcionados
    const hasAnyRole = (roles) => {
        if (!userRole.value) return false;
        return roles.includes(userRole.value);
    };

    // Verificar si el usuario es administrador
    const isAdmin = computed(() => hasRole(ROLES.ADMIN));

    // Verificar si el usuario es usuario estándar o superior
    const isUser = computed(() => hasAnyRole([ROLES.ADMIN, ROLES.USER]));

    // Verificar si el usuario tiene permisos de lectura como mínimo
    const canRead = computed(() => hasAnyRole([ROLES.ADMIN, ROLES.USER, ROLES.LIMITED_USER, ROLES.READER]));

    // Función para cerrar sesión
    const logout = () => {
        try {
            // Eliminar tokens y datos de usuario
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            currentUser.value = null;

            // Mantener el usuario recordado si existe
            if (localStorage.getItem('rememberedUser')) {
                console.log('Manteniendo usuario recordado para autocompletado');
            } else {
                localStorage.removeItem('rememberedUser');
                sessionStorage.removeItem('rememberedUser');
            }

            console.log('Sesión cerrada correctamente');

            // Redireccionar a la página de login
            router.push('/auth/login');
        } catch (error) {
            console.error('Error al cerrar la sesión:', error);
        }
    };

    // Cargar el usuario al montar el componente
    onMounted(() => {
        loadUser();
    });

    // Refrescar el usuario (útil después de cambios de rol o datos)
    const refreshUser = () => {
        loadUser();
    };

    return {
        currentUser,
        isAuthenticated,
        userRole,
        isAdmin,
        isUser,
        canRead,
        hasRole,
        hasAnyRole,
        logout,
        refreshUser,
        ROLES
    };
}
