import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

/**
 * Composable para gestionar la autenticación y comprobación de roles
 * @returns {Object} Métodos y propiedades para gestionar la autenticación
 */
export function useAuth() {
    const currentUser = ref(null);
    const isAuthenticated = computed(() => !!currentUser.value);
    const userRole = computed(() => currentUser.value?.rol || null);
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
