import { computed, reactive } from 'vue';

const layoutConfig = reactive({
    preset: 'Aura',
    primary: 'emerald',
    surface: null,
    darkTheme: true, // Modo oscuro efectivo: se deduce de colorScheme
    colorScheme: 'dark', // Apariencia general: 'system' (sigue al navegador), 'light' u 'dark'
    menuMode: 'static'
});

const APARIENCIAS = ['system', 'light', 'dark'];
const CLAVE_APARIENCIA = 'timon.colorScheme'; // Copia de la preferencia guardada, para pintar bien desde el primer momento sin esperar al servidor

function leerAparienciaDelNavegador() {
    try {
        const modo = localStorage.getItem(CLAVE_APARIENCIA);
        return APARIENCIAS.includes(modo) ? modo : null;
    } catch {
        return null;
    }
}

function guardarAparienciaEnNavegador(modo) {
    try {
        localStorage.setItem(CLAVE_APARIENCIA, modo);
    } catch {
        // Sin almacenamiento local (por ejemplo, modo privado): la preferencia sigue guardada en el servidor
    }
}
const consultaOscuroSistema = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

/**
 * Indica si una apariencia general equivale ahora mismo al modo oscuro
 * @param {string} modo - 'system' (sigue al navegador), 'light' u 'dark'
 * @returns {boolean}
 */
export function resolverModoOscuro(modo) {
    if (modo === 'system') return consultaOscuroSistema ? consultaOscuroSistema.matches : true;
    return modo !== 'light';
}

/**
 * Aplica una apariencia general: actualiza la configuración y la clase app-dark del documento
 * @param {string} modo - 'system', 'light' u 'dark'
 * @param {boolean} [recordar] - Si es true, recuerda la apariencia en este navegador (solo para la preferencia guardada)
 */
export function aplicarApariencia(modo, recordar = false) {
    const valida = APARIENCIAS.includes(modo) ? modo : 'dark';
    layoutConfig.colorScheme = valida;
    layoutConfig.darkTheme = resolverModoOscuro(valida);
    document.documentElement.classList.toggle('app-dark', layoutConfig.darkTheme);
    if (recordar) guardarAparienciaEnNavegador(valida);
}

// Con «Sistema», la aplicación sigue en directo los cambios de modo del navegador
if (consultaOscuroSistema) {
    consultaOscuroSistema.addEventListener('change', () => {
        if (layoutConfig.colorScheme === 'system') aplicarApariencia('system');
    });
}

// Al arrancar se aplica la preferencia recordada en este navegador; cuando llegan las del servidor, estas mandan (useAuth)
const aparienciaRecordada = leerAparienciaDelNavegador();
if (aparienciaRecordada) {
    aplicarApariencia(aparienciaRecordada);
}

const layoutState = reactive({
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    profileSidebarVisible: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false,
    activeMenuItem: null
});

export function useLayout() {
    const setActiveMenuItem = (item) => {
        layoutState.activeMenuItem = item.value || item;
    };

    const toggleDarkMode = () => {
        if (!document.startViewTransition) {
            executeDarkModeToggle();

            return;
        }

        document.startViewTransition(() => executeDarkModeToggle(event));
    };

    const executeDarkModeToggle = () => {
        aplicarApariencia(layoutConfig.darkTheme ? 'light' : 'dark'); // El botón de la barra fija claro u oscuro; la preferencia guardada se cambia en Ajustes › Aspecto
    };

    // Asegúrate de que la clase 'app-dark' se aplique al cargar la página si darkTheme es true
    if (layoutConfig.darkTheme) {
        document.documentElement.classList.add('app-dark');
    }

    const toggleMenu = () => {
        if (layoutConfig.menuMode === 'overlay') {
            layoutState.overlayMenuActive = !layoutState.overlayMenuActive;
        }

        if (window.innerWidth > 991) {
            layoutState.staticMenuDesktopInactive = !layoutState.staticMenuDesktopInactive;
        } else {
            layoutState.staticMenuMobileActive = !layoutState.staticMenuMobileActive;
        }
    };

    const isSidebarActive = computed(() => layoutState.overlayMenuActive || layoutState.staticMenuMobileActive);

    const isDarkTheme = computed(() => layoutConfig.darkTheme);

    const getPrimary = computed(() => layoutConfig.primary);

    const getSurface = computed(() => layoutConfig.surface);

    return {
        layoutConfig,
        layoutState,
        toggleMenu,
        isSidebarActive,
        isDarkTheme,
        getPrimary,
        getSurface,
        setActiveMenuItem,
        toggleDarkMode,
        applyColorScheme: aplicarApariencia
    };
}
