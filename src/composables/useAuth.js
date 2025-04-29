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
 * - Verificación periódica de la validez del token
 *
 * Valores y métodos exportados:
 * -------------------------------------
 * @property {Ref<Object|null>} currentUser - Referencia reactiva al usuario actual con datos como:
 *   - id: Identificador único del usuario
 *   - username: Nombre de usuario
 *   - email: Correo electrónico del usuario
 *   - rol: Rol del usuario en el sistema
 *   - stylePreferences: Preferencias de estilo del usuario (preset, menuMode, darkTheme, primary, surface)
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
 * @method updateStylePreferences(stylePrefs) - Actualiza las preferencias de estilo del usuario
 * @method applyUserPreferences(prefs) - Aplica las preferencias de estilo del usuario
 * @method verifySessionValidity() - Verifica si el token actual sigue siendo válido
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
import { useTheme } from '@/composables/useTheme';
import { API_BASE_URL } from '@/config/api';
import { useLayout } from '@/layout/composables/layout';
import { UsersService } from '@/service/UsersService';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

/**
 * Composable para gestionar la autenticación y comprobación de roles
 * @returns {Object} Métodos y propiedades para gestionar la autenticación
 */
export function useAuth() {
    const currentUser = ref(null); //almacena id, username, email, rol, stylePreferences
    const isAuthenticated = computed(() => !!currentUser.value); // Verifica si el usuario está autenticado
    const userRole = computed(() => currentUser.value?.rol || null); // Obtiene el rol del usuario actual
    const router = useRouter();
    const { layoutConfig } = useLayout();
    const { applyFullTheme } = useTheme();

    // Intervalo para verificación periódica del token
    let tokenVerificationInterval = null;
    // Tiempo entre verificaciones (5 minutos)
    const TOKEN_VERIFICATION_INTERVAL = 5 * 60 * 1000;

    // Roles disponibles en la aplicación según la estructura de la base de datos
    const ROLES = {
        ADMIN: 'admin',
        USER: 'user',
        LIMITED_USER: 'limited_user',
        READER: 'reader'
    };

    // Aplicar las preferencias de estilo del usuario
    const applyUserPreferences = (prefs) => {
        if (!prefs) return;

        // Aplicar preset
        if (prefs.preset && ['Aura', 'Lara'].includes(prefs.preset)) {
            layoutConfig.preset = prefs.preset;
        }

        // Aplicar menuMode
        if (prefs.menuMode && ['static', 'overlay'].includes(prefs.menuMode)) {
            layoutConfig.menuMode = prefs.menuMode;
        }

        // Aplicar tema oscuro
        if (typeof prefs.darkTheme === 'boolean') {
            layoutConfig.darkTheme = prefs.darkTheme;
        }

        // Aplicar color primario y superficie
        if (prefs.primary) {
            layoutConfig.primary = prefs.primary;
        }

        if (prefs.surface) {
            layoutConfig.surface = prefs.surface;
        }

        // Aplicar todos los cambios de tema con los valores actuales
        applyFullTheme(layoutConfig);
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
                // Cargar preferencias de estilo si el usuario está autenticado
                if (currentUser.value && currentUser.value.id) {
                    loadStylePreferences();
                    // Iniciar verificación periódica del token
                    startTokenVerification();
                }
            } catch (error) {
                console.error('Error al parsear los datos del usuario:', error);
                currentUser.value = null;
            }
        }
    };

    /**
     * Inicia la verificación periódica del token JWT
     */
    const startTokenVerification = () => {
        // Limpiar cualquier intervalo existente
        if (tokenVerificationInterval) {
            clearInterval(tokenVerificationInterval);
        }

        // Configurar un nuevo intervalo para verificar el token
        tokenVerificationInterval = setInterval(() => {
            verifySessionValidity();
        }, TOKEN_VERIFICATION_INTERVAL);
    };

    /**
     * Verifica si el token actual sigue siendo válido haciendo una petición al endpoint de verificación
     * @returns {Promise<boolean>} Resultado de la verificación
     */
    const verifySessionValidity = async () => {
        // Primero intentamos obtener el token del localStorage
        let token = localStorage.getItem('token');

        // Si no hay token en localStorage, intentamos en sessionStorage
        if (!token) {
            token = sessionStorage.getItem('token');
        }

        // Si no hay token, consideramos la sesión como inválida
        if (!token) {
            if (isAuthenticated.value) {
                console.warn('No se encontró token pero el usuario aparece como autenticado. Cerrando sesión...');
                logout();
            }
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // Si la respuesta es exitosa, el token es válido
            if (response.ok) {
                return true;
            }

            // Si la respuesta no es exitosa, el token ha expirado o es inválido
            console.warn('Token expirado o inválido detectado durante verificación periódica');
            logout();
            return false;
        } catch (error) {
            console.error('Error al verificar la validez del token:', error);
            // En caso de error de red, mantenemos la sesión activa para evitar interrupciones
            return true;
        }
    };

    /**
     * Carga las preferencias de estilo del usuario desde el servidor
     * y las almacena en currentUser.stylePreferences
     */
    const loadStylePreferences = async () => {
        if (!currentUser.value || !currentUser.value.id) return;

        try {
            const stylePrefs = await UsersService.getStylePreferences();
            if (stylePrefs) {
                // Actualiza el usuario en memoria
                currentUser.value = {
                    ...currentUser.value,
                    stylePreferences: stylePrefs
                };

                // Actualiza el usuario en el almacenamiento local
                updateStoredUser();

                // Aplica las preferencias de estilo inmediatamente
                applyUserPreferences(stylePrefs);
            }
        } catch (error) {
            console.error('Error al cargar preferencias de estilo:', error);
        }
    };

    /**
     * Actualiza las preferencias de estilo del usuario
     * @param {Object} stylePrefs - Objeto con las preferencias de estilo
     */
    const updateStylePreferences = async (stylePrefs) => {
        if (!currentUser.value || !currentUser.value.id) return;

        try {
            await UsersService.saveStylePreferences(stylePrefs);

            // Actualiza el usuario en memoria
            currentUser.value = {
                ...currentUser.value,
                stylePreferences: stylePrefs
            };

            // Actualiza el usuario en el almacenamiento local
            updateStoredUser();
        } catch (error) {
            console.error('Error al actualizar preferencias de estilo:', error);
            throw error; // Propagar el error para manejo en componentes
        }
    };

    /**
     * Actualiza el usuario en localStorage y sessionStorage
     */
    const updateStoredUser = () => {
        if (!currentUser.value) return;

        const userJSON = JSON.stringify(currentUser.value);

        // Actualizar en localStorage si existe allí
        if (localStorage.getItem('user')) {
            localStorage.setItem('user', userJSON);
        }

        // Actualizar en sessionStorage si existe allí
        if (sessionStorage.getItem('user')) {
            sessionStorage.setItem('user', userJSON);
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
            // Detener la verificación periódica del token
            if (tokenVerificationInterval) {
                clearInterval(tokenVerificationInterval);
                tokenVerificationInterval = null;
            }

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

    // Detener el intervalo de verificación al desmontar el componente
    onUnmounted(() => {
        if (tokenVerificationInterval) {
            clearInterval(tokenVerificationInterval);
            tokenVerificationInterval = null;
        }
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
        updateStylePreferences,
        applyUserPreferences,
        verifySessionValidity,
        ROLES
    };
}
