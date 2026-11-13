<script setup>
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import { useLayout } from '@/layout/composables/layout';
import { DbConfigService } from '@/service/DbConfigService';
import { MtoDBService } from '@/service/MaintenanceDBService';
import { AjustesService } from '@/service/AjustesService';
import { UsersService } from '@/service/UsersService';
import { permitirEditarPagados, permitirFechasFueraDeAnio } from '@/composables/useAjustesSesion';
import { cargarZonaHoraria, establecerZonaHoraria } from '@/composables/useZonaHoraria';
import { getApiErrorMessage } from '@/utils/apiError';
import { camposObligatoriosVacios, configuracionParaEnviar, errorPuertoBd, hayCambiosBd } from '@/utils/configuracionBd';
import { errorEmail as errorEmailUsuario, errorNombreUsuario, errorPassword as errorPasswordUsuario, errorRol as errorRolUsuario } from '@/utils/validacionUsuarios';

/**
 * Mensaje de error de las pestañas que usan rutas de F-48 (U-14).
 *
 * Los servicios basados en `fetch` lanzan un `Error` con el texto del servidor y SIN
 * `response`, así que el valor por defecto solo debe usarse cuando no hay mensaje.
 */
function mensajeDeErrorApi(error, porDefecto) {
    return getApiErrorMessage({ message: error?.message || porDefecto, response: error?.response });
}
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

const { layoutConfig, applyColorScheme } = useLayout();
const { isAdmin, ROLES, currentUser, updateStylePreferences } = useAuth();
const { primaryColors, surfaces, presetOptions, menuModeOptions, colorSchemeOptions, defaultConfig, applyFullTheme } = useTheme();
const toast = useToast();
const pestanaActiva = ref('Estilo'); // Los administradores abren Ajustes en General; el resto, en Aspecto

// Convertir el objeto ROLES a un array para el dropdown
const rolesArray = ref(Object.values(ROLES));

const preset = ref(layoutConfig.preset);
const menuMode = ref(layoutConfig.menuMode);

// Valores temporales para configuración (sin aplicar hasta guardar)
const tempLayoutConfig = ref({
    preset: layoutConfig.preset,
    menuMode: layoutConfig.menuMode,
    colorScheme: layoutConfig.colorScheme,
    darkTheme: layoutConfig.darkTheme,
    primary: layoutConfig.primary,
    surface: layoutConfig.surface
});

// Bandera para detectar si hay cambios sin guardar
const hasUnsavedChanges = computed(() => {
    return (
        tempLayoutConfig.value.preset !== layoutConfig.preset ||
        tempLayoutConfig.value.menuMode !== layoutConfig.menuMode ||
        tempLayoutConfig.value.colorScheme !== layoutConfig.colorScheme ||
        tempLayoutConfig.value.primary !== layoutConfig.primary ||
        tempLayoutConfig.value.surface !== layoutConfig.surface
    );
});

// Bandera para evitar guardar cambios durante la carga inicial
const isInitializing = ref(true);

// Observador para aplicar los cambios de estilo en tiempo real
watch(
    tempLayoutConfig,
    (newConfig) => {
        if (isInitializing.value) return;

        // Aplicar los cambios visualmente sin guardarlos en el servidor
        applyFullTheme({
            ...newConfig
        });
    },
    { deep: true }
);

// Observador específico para modo de menú
// Este actualiza inmediatamente el comportamiento del menú, sin esperar a guardar
watch(
    () => tempLayoutConfig.value.menuMode,
    (newMenuMode) => {
        if (isInitializing.value) return;

        // Actualizar directamente el modo del menú en layoutConfig
        // para que el cambio sea visible inmediatamente
        layoutConfig.menuMode = newMenuMode;
        menuMode.value = newMenuMode;
    }
);

// Gestión de usuarios
const users = ref([]);
const selectedUsers = ref([]);
const userDialog = ref(false);
const changePasswordDialog = ref(false);
const deleteUserDialog = ref(false);
const deleteSelectedUsersDialog = ref(false);

const saveDbConfigDialog = ref(false);
const restoreDbConfigDialog = ref(false);
const restoreDatabaseDialog = ref(false); // Diálogo para confirmar la restauración
const fileToRestore = ref(null); // Almacenar el fichero mientras se confirma

const user = ref({
    id: null,
    username: '',
    email: '',
    rol: 'user',
    password: ''
});

const passwordData = ref({
    id: null,
    username: '',
    password: '',
    confirmPassword: ''
});

// F-42/DC-51: mismas reglas y mensajes que el servidor.
const errorUsuarioNombre = computed(() => errorNombreUsuario(user.value.username));
const errorUsuarioEmail = computed(() => errorEmailUsuario(user.value.email));
const errorUsuarioRol = computed(() => errorRolUsuario(user.value.rol));
const errorUsuarioPassword = computed(() => errorPasswordUsuario(user.value.password, { obligatoria: user.value.id === null }));
const errorPasswordCambio = computed(() => errorPasswordUsuario(passwordData.value.password, { obligatoria: true }));

const isSaveDisabled = computed(() => Boolean(errorUsuarioNombre.value || errorUsuarioEmail.value || errorUsuarioRol.value || errorUsuarioPassword.value));

const isPasswordChangeDisabled = computed(() => Boolean(errorPasswordCambio.value || passwordData.value.password !== passwordData.value.confirmPassword));

const isDbConfigChanged = computed(() => hayCambiosBd(dbConfig.value, dbConfigOriginal.value));

/** Regla 1: sin host, puerto, usuario o base de datos no se puede probar ni guardar. */
const faltanCamposBd = computed(() => camposObligatoriosVacios(dbConfig.value));
const errorPuerto = computed(() => errorPuertoBd(dbConfig.value));
const configuracionBdValida = computed(() => faltanCamposBd.value.length === 0 && !errorPuerto.value);
const mensajeValidacionBd = computed(() => (faltanCamposBd.value.length > 0 ? 'Completa los campos obligatorios: ' + faltanCamposBd.value.join(', ') + '.' : errorPuerto.value));

// Guarda las preferencias de estilo actuales en el servidor
async function saveStylePreferences() {
    if (isInitializing.value) return;

    try {
        // Crear objeto con las preferencias actuales
        const stylePrefs = {
            preset: layoutConfig.preset,
            menuMode: layoutConfig.menuMode,
            colorScheme: layoutConfig.colorScheme,
            darkTheme: layoutConfig.darkTheme,
            primary: layoutConfig.primary,
            surface: layoutConfig.surface
        };

        // Guardar en el servidor
        await updateStylePreferences(stylePrefs);

        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Preferencias de estilo guardadas correctamente', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `No se pudieron guardar las preferencias: ${getApiErrorMessage(error)}`, life: 5000 });
        console.error('Error al guardar preferencias de estilo:', error);
    }
}

// Actualiza los colores en el estado temporal
function updateColors(type, color) {
    if (type === 'primary') {
        tempLayoutConfig.value.primary = color.name;
    } else if (type === 'surface') {
        tempLayoutConfig.value.surface = color.name;
    }
}

// Aplica y guarda todas las preferencias de estilo
async function applyAndSaveStyles() {
    // Actualizar valores del layoutConfig con los temporales
    layoutConfig.primary = tempLayoutConfig.value.primary;
    layoutConfig.surface = tempLayoutConfig.value.surface;
    layoutConfig.preset = tempLayoutConfig.value.preset;
    preset.value = tempLayoutConfig.value.preset;
    layoutConfig.menuMode = tempLayoutConfig.value.menuMode;
    menuMode.value = tempLayoutConfig.value.menuMode;
    applyColorScheme(tempLayoutConfig.value.colorScheme, true); // Se recuerda en este navegador para pintar sin parpadeo

    // Los cambios ya se han aplicado visualmente gracias al watcher,
    // aquí solo actualizamos layoutConfig y guardamos en el servidor
    await saveStylePreferences();
}

// Resetea a los valores por defecto
async function resetToDefaults() {
    // Actualizar valores temporales con los predeterminados
    tempLayoutConfig.value = { ...defaultConfig };

    // Actualizar componentes UI
    preset.value = defaultConfig.preset;
    menuMode.value = defaultConfig.menuMode;

    // Aplicar y guardar inmediatamente
    await applyAndSaveStyles();

    toast.add({ severity: 'info', summary: 'Reset', detail: 'Se han restaurado los valores por defecto de estilo', life: 3000 });
}

// Actualiza las variables temporales con los valores actuales
function syncTempConfig() {
    tempLayoutConfig.value = {
        preset: layoutConfig.preset,
        menuMode: layoutConfig.menuMode,
        colorScheme: layoutConfig.colorScheme,
        darkTheme: layoutConfig.darkTheme,
        primary: layoutConfig.primary,
        surface: layoutConfig.surface
    };
    preset.value = layoutConfig.preset;
    menuMode.value = layoutConfig.menuMode;
}

// DB Config State
const dbConfig = ref({
    DB_HOST: '',
    DB_PORT: '',
    DB_USER: '',
    DB_DATABASE: '',
    DB_SSL_CA: '',
    DB_MAINT_USER: '',
    DB_PASSWORD: '', // Solo para el formulario, no se recibe del servidor
    DB_MAINT_PASSWORD: '' // Solo para el formulario, no se recibe del servidor
});
const backupExists = ref(false);
const dbConfigOriginal = ref({});

// DB Config Functions
const fetchDbConfig = async () => {
    try {
        const { config, backupExists: hasBackup } = await DbConfigService.getDbConfig();
        dbConfig.value = { ...dbConfig.value, ...config, DB_PASSWORD: '', DB_MAINT_PASSWORD: '' };
        dbConfigOriginal.value = { ...config };
        backupExists.value = hasBackup;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: mensajeDeErrorApi(error, 'No se pudo cargar la configuración de la base de datos.'), life: 3000 });
        console.error('Error al cargar la configuración de la base de datos:', error);
    }
};

const testDbConnection = async () => {
    try {
        await DbConfigService.testDbConnection(configuracionParaEnviar(dbConfig.value));
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'La prueba de conexión fue bien.', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error en la conexión', detail: mensajeDeErrorApi(error, 'No se pudo conectar a la base de datos.'), life: 5000 });
    }
};

const confirmSaveDbConfig = () => {
    saveDbConfigDialog.value = true;
};

const confirmRestoreDbConfig = () => {
    restoreDbConfigDialog.value = true;
};

const saveDbConfig = async () => {
    try {
        await DbConfigService.saveDbConfig(configuracionParaEnviar(dbConfig.value));
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración de la conexión con base de datos guardada.', life: 3000 });
        await fetchDbConfig(); // Recargar la configuración
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error al guardar', detail: mensajeDeErrorApi(error, 'No se pudo guardar la configuración.'), life: 5000 });
    } finally {
        saveDbConfigDialog.value = false;
    }
};

const restoreDbConfig = async () => {
    try {
        await DbConfigService.restoreDbConfig();
        toast.add({ severity: 'info', summary: 'Restaurado', detail: 'Configuración restaurada desde la copia de seguridad.', life: 3000 });
        await fetchDbConfig(); // Recargar la configuración
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error al restaurar', detail: mensajeDeErrorApi(error, 'No se pudo restaurar la configuración.'), life: 5000 });
    } finally {
        restoreDbConfigDialog.value = false;
    }
};

const backupDatabase = async () => {
    try {
        const response = await MtoDBService.backupDatabase();
        const blob = new Blob([response.data], { type: 'application/sql' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup.sql';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Copia de seguridad de la base de datos descargada.', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: mensajeDeErrorApi(error, 'No se pudo descargar la copia de seguridad.'), life: 5000 });
        console.error('Error al descargar la copia de seguridad:', error);
    }
};

const onSelectFileToRestore = (event) => {
    const file = event.files[0];
    if (file) {
        fileToRestore.value = file;
        restoreDatabaseDialog.value = true;
    }
};

const restoreDatabase = async () => {
    if (!fileToRestore.value) {
        toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'No hay ningún fichero seleccionado para restaurar.', life: 3000 });
        return;
    }

    const formData = new FormData();
    formData.append('backupFile', fileToRestore.value);

    try {
        await MtoDBService.restoreDatabase(formData);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Base de datos restaurada correctamente.', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error en la restauración',
            detail: mensajeDeErrorApi(error, 'No se pudo restaurar la base de datos.'),
            life: 5000
        });
        console.error('Error al restaurar la base de datos:', error);
    } finally {
        // Limpiar el estado independientemente del resultado
        restoreDatabaseDialog.value = false;
        fileToRestore.value = null;
    }
};

// User management functions
const fetchUsers = async () => {
    try {
        const data = await UsersService.getUsers();
        users.value = data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener usuarios: ${getApiErrorMessage(error)}`, life: 5000 });
        console.error('Error al obtener usuarios:', error);
    }
};

function updateUsers() {
    fetchUsers();
    toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Lista de usuarios actualizada.', life: 3000 });
}

function openNewUser() {
    user.value = {
        id: null,
        username: '',
        email: '',
        rol: 'user',
        password: ''
    };
    userDialog.value = true;
}

function editUser(userData) {
    user.value = { ...userData, password: '' };
    userDialog.value = true;
}

function editUserPassword(userData) {
    passwordData.value = {
        id: userData.id,
        username: userData.username,
        password: '',
        confirmPassword: ''
    };
    changePasswordDialog.value = true;
}

function confirmDeleteUser(userData) {
    user.value = userData;
    deleteUserDialog.value = true;
}

function confirmDeleteSelectedUsers() {
    deleteSelectedUsersDialog.value = true;
}

function hideDialog() {
    userDialog.value = false;
    changePasswordDialog.value = false;
    deleteUserDialog.value = false;
    deleteSelectedUsersDialog.value = false;
}

async function saveUser() {
    try {
        if (isSaveDisabled.value) {
            toast.add({ severity: 'error', summary: 'Revisa los datos', detail: 'Corrige los campos marcados antes de guardar.', life: 5000 });
            return;
        }

        await UsersService.saveUser(user.value);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario guardado correctamente', life: 3000 });
        fetchUsers();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar usuario: ${getApiErrorMessage(error)}`, life: 5000 });
        console.error('Error al guardar usuario:', error);
    }
}

async function changePassword() {
    try {
        if (isPasswordChangeDisabled.value) {
            toast.add({ severity: 'error', summary: 'Revisa los datos', detail: 'Corrige la contraseña antes de guardar.', life: 5000 });
            return;
        }

        await UsersService.changePassword({
            id: passwordData.value.id,
            password: passwordData.value.password
        });
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Contraseña actualizada correctamente', life: 3000 });
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al cambiar la contraseña: ${getApiErrorMessage(error)}`, life: 5000 });
        console.error('Error al cambiar la contraseña:', error);
    }
}

async function deleteUser() {
    try {
        await UsersService.deleteUsers({ userIds: [user.value.id] });
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario eliminado correctamente', life: 3000 });
        fetchUsers();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar usuario: ${getApiErrorMessage(error)}`, life: 5000 });
        console.error('Error al eliminar usuario:', error);
    }
}

async function deleteSelectedUsers() {
    try {
        const userIds = selectedUsers.value.map((user) => user.id);
        await UsersService.deleteUsers({ userIds });
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Usuarios eliminados correctamente', life: 3000 });
        fetchUsers();
        hideDialog();
        selectedUsers.value = [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar usuarios: ${getApiErrorMessage(error)}`, life: 5000 });
        console.error('Error al eliminar usuarios:', error);
    }
}

// Observar cambios en el usuario actual para aplicar preferencias
watch(
    () => currentUser.value,
    (newUser) => {
        if (newUser && newUser.stylePreferences) {
            syncTempConfig();
        }
    },
    { immediate: true, deep: true }
);

// >>>> Ajustes generales: zona horaria (DC-25)
const zonasHorarias = ref([]);
const zonaSeleccionada = ref('Europe/Madrid');
const zonaGuardada = ref('Europe/Madrid');
const guardandoZona = ref(false);
const zonaCambiada = computed(() => zonaSeleccionada.value !== zonaGuardada.value);
const horaEnZonaSeleccionada = computed(() => {
    try {
        return new Intl.DateTimeFormat('es-ES', { timeZone: zonaSeleccionada.value, dateStyle: 'full', timeStyle: 'medium' }).format(new Date());
    } catch {
        return '';
    }
});

async function cargarAjustesGenerales() {
    const zona = await cargarZonaHoraria(true);
    const lista = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Europe/Madrid', 'UTC'];
    zonasHorarias.value = lista.includes(zona) ? lista : [zona, ...lista];
    zonaSeleccionada.value = zona;
    zonaGuardada.value = zona;
}

async function guardarZona() {
    guardandoZona.value = true;
    try {
        const ajustes = await AjustesService.saveZonaHoraria(zonaSeleccionada.value);
        establecerZonaHoraria(ajustes.zona_horaria);
        zonaGuardada.value = ajustes.zona_horaria;
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Zona horaria guardada. Se aplica a toda la aplicación.', life: 4000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: getApiErrorMessage(error), life: 5000 });
    } finally {
        guardandoZona.value = false;
    }
}
// <<<<

// >>>> Administrar recibos (DC-17, DC-21, DC-24)
const crearRecibosAutomaticamente = ref(true);
const dialogoCreacionAutomatica = ref(false);
const valorPendienteCreacion = ref(true);
const vistaPrevia = ref(null);
const cargandoVistaPrevia = ref(false);
const dialogoGenerar = ref(false);
const generandoAhora = ref(false);
const fechaSimulada = ref(null);
const avisosGeneracion = ref([]);
const puedeGenerarAhora = computed(() => !!vistaPrevia.value?.length && fechaSimulada.value === null && !cargandoVistaPrevia.value && !generandoAhora.value);

function invalidarVistaPrevia() {
    vistaPrevia.value = null;
    fechaSimulada.value = null;
    avisosGeneracion.value = [];
    dialogoGenerar.value = false;
}

async function cargarAjustesRecibos() {
    try {
        const ajustes = await AjustesService.getRecibos();
        crearRecibosAutomaticamente.value = ajustes.crear_recibos_automaticamente;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: getApiErrorMessage(error), life: 5000 });
    }
}

function pedirCambioCreacionAutomatica(valor) {
    valorPendienteCreacion.value = valor;
    dialogoCreacionAutomatica.value = true;
}

async function confirmarCambioCreacionAutomatica() {
    try {
        const ajustes = await AjustesService.saveCrearRecibosAutomaticamente(valorPendienteCreacion.value);
        crearRecibosAutomaticamente.value = ajustes.crear_recibos_automaticamente;
        toast.add({ severity: 'success', summary: 'Éxito', detail: ajustes.crear_recibos_automaticamente ? 'Creación automática activada.' : 'Creación automática desactivada hasta que la actives de nuevo.', life: 4000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: getApiErrorMessage(error), life: 5000 });
    } finally {
        dialogoCreacionAutomatica.value = false;
    }
}

async function consultarVistaPrevia(proximoDiciembre = false) {
    invalidarVistaPrevia();
    cargandoVistaPrevia.value = true;
    try {
        const resultado = await AjustesService.generarRecibosAnio(true, proximoDiciembre);
        vistaPrevia.value = resultado.filas;
        fechaSimulada.value = resultado.fecha_simulada;
        avisosGeneracion.value = resultado.avisos;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: getApiErrorMessage(error), life: 5000 });
    } finally {
        cargandoVistaPrevia.value = false;
    }
}

async function generarAhora() {
    if (!puedeGenerarAhora.value) {
        dialogoGenerar.value = false;
        return;
    }
    generandoAhora.value = true;
    try {
        const resultado = await AjustesService.generarRecibosAnio(false);
        const cantidad = resultado.filas.length;
        toast.add({
            severity: cantidad ? 'success' : 'warn',
            summary: cantidad ? 'Recibos generados' : 'Sin altas',
            detail: cantidad ? 'Recibos creados: ' + cantidad : resultado.avisos.join(' ') || 'No hay recibos que crear ahora.',
            life: 7000
        });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: getApiErrorMessage(error), life: 7000 });
    } finally {
        invalidarVistaPrevia();
        generandoAhora.value = false;
    }
}
// <<<<

// Obtener usuarios y aplicar preferencias al montar el componente
onMounted(() => {
    if (isAdmin.value) {
        fetchUsers();
        fetchDbConfig();
        cargarAjustesGenerales();
        cargarAjustesRecibos();
        pestanaActiva.value = 'general';
    }

    // Inicializar configuración temporal con los valores actuales
    syncTempConfig();

    // Permitir guardar después de la inicialización
    setTimeout(() => {
        isInitializing.value = false;
    }, 1000);
});
</script>

<template>
    <div className="card">
        <div class="font-semibold text-xl mb-4">Ajustes</div>
        <Tabs v-model:value="pestanaActiva">
            <TabList>
                <Tab v-if="isAdmin" value="general">General</Tab>
                <Tab v-if="isAdmin" value="usuarios">Usuarios</Tab>
                <Tab value="Estilo">Aspecto</Tab>
                <Tab v-if="isAdmin" value="recibos">Administrar recibos</Tab>
                <Tab v-if="isAdmin" value="db">Base de Datos</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="Estilo">
                    <div class="font-semibold text-xl mb-4">Configuración del estilo</div>
                    <div class="flex flex-col gap-4">
                        <div>
                            <span class="text-sm text-muted-color font-semibold">Color primario</span>
                            <div class="pt-2 flex gap-2 flex-wrap">
                                <button
                                    v-for="primaryColor of primaryColors"
                                    :key="primaryColor.name"
                                    type="button"
                                    :title="primaryColor.name"
                                    @click="updateColors('primary', primaryColor)"
                                    :class="['border-none w-5 h-5 rounded-full p-0 cursor-pointer outline-none outline-offset-1 m-1', { 'outline-primary': tempLayoutConfig.primary === primaryColor.name }]"
                                    :style="{ backgroundColor: `${primaryColor.name === 'noir' ? 'var(--text-color)' : primaryColor.palette['500']}` }"
                                ></button>
                            </div>
                        </div>
                        <div>
                            <span class="text-sm text-muted-color font-semibold">Superficie</span>
                            <div class="pt-2 flex gap-2 flex-wrap">
                                <button
                                    v-for="surface of surfaces"
                                    :key="surface.name"
                                    type="button"
                                    :title="surface.name"
                                    @click="updateColors('surface', surface)"
                                    :class="['border-none w-5 h-5 rounded-full p-0 cursor-pointer outline-none outline-offset-1 m-1', { 'outline-primary': tempLayoutConfig.surface === surface.name }]"
                                    :style="{ backgroundColor: `${surface.palette['500']}` }"
                                ></button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <span class="text-sm text-muted-color font-semibold">Tema</span>
                            <SelectButton v-model="tempLayoutConfig.preset" :options="presetOptions" :allowEmpty="false" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <span class="text-sm text-muted-color font-semibold">Funcionamiento del menú</span>
                            <SelectButton v-model="tempLayoutConfig.menuMode" :options="menuModeOptions" :allowEmpty="false" optionLabel="label" optionValue="value" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <span class="text-sm text-muted-color font-semibold">Apariencia general</span>
                            <SelectButton v-model="tempLayoutConfig.colorScheme" :options="colorSchemeOptions" :allowEmpty="false" optionLabel="label" optionValue="value">
                                <template #option="slotProps">
                                    <div class="flex items-center gap-2">
                                        <i :class="slotProps.option.icon" />
                                        <span>{{ slotProps.option.label }}</span>
                                    </div>
                                </template>
                            </SelectButton>
                        </div>
                        <div class="mt-6 flex flex-wrap gap-3">
                            <Button label="Reset" v-tooltip="'Restablece los ajustes de estilo'" icon="pi pi-refresh" severity="secondary" @click="resetToDefaults" />
                            <Button label="Guardar" icon="pi pi-check" @click="applyAndSaveStyles" :disabled="!hasUnsavedChanges" />
                        </div>
                    </div>
                </TabPanel>
                <TabPanel v-if="isAdmin" value="usuarios">
                    <div class="font-semibold text-xl mb-4">Gestión de usuarios</div>
                    <Toolbar class="mb-6">
                        <template #start>
                            <Button label="Nuevo" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNewUser" />
                            <Button label="Borrar" icon="pi pi-trash" severity="secondary" class="mr-2" @click="confirmDeleteSelectedUsers" :disabled="!selectedUsers.length" />
                            <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" class="mr-2" @click="updateUsers" />
                        </template>
                    </Toolbar>
                    <DataTable ref="dt_users" v-model:selection="selectedUsers" :value="users" dataKey="id" responsiveLayout="scroll" selectionMode="multiple" sortMode="multiple" removableSort stripedRows>
                        <template #empty>
                            <div class="text-center p-4">No hay usuarios a mostrar.</div>
                        </template>
                        <Column field="username" header="Usuario" sortable style="min-width: 4rem"></Column>
                        <Column field="email" header="E-Mail" sortable style="min-width: 12rem"></Column>
                        <Column field="rol" header="Rol" sortable style="min-width: 12rem"></Column>
                        <Column :exportable="false">
                            <template #body="usersSlotProps">
                                <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editUser(usersSlotProps.data)" />
                                <Button icon="pi pi-key" outlined rounded class="mr-2" @click="editUserPassword(usersSlotProps.data)" />
                                <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteUser(usersSlotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
                <TabPanel v-if="isAdmin" value="db">
                    <div class="text-xl font-semibold mb-4">Gestión de la base de datos</div>

                    <div class="grid">
                        <div class="col-12">
                            <div class="card">
                                <div class="text-lg font-semibold">Parámetros de Conexión</div>
                                <p>
                                    Modifica los parámetros para conectar con la base de datos.<br />
                                    <b>¡Atención!</b> Una configuración incorrecta puede dejar la aplicación inoperativa.
                                </p>
                                <div class="grid grid-cols-1 md:grid-cols-[max-content_max-content] justify-start gap-x-4 gap-y-4 mt-4">
                                    <div>
                                        <div style="display: grid; grid-template-columns: 10rem 20rem; align-items: center; row-gap: 0.75rem">
                                            <label for="db-host" style="justify-self: end; text-align: right; padding-right: 0.75rem">Host</label>
                                            <InputText id="db-host" v-model="dbConfig.DB_HOST" class="w-full" />

                                            <label for="db-port" style="justify-self: end; text-align: right; padding-right: 0.75rem">Puerto</label>
                                            <InputText id="db-port" v-model="dbConfig.DB_PORT" class="w-full" />

                                            <label for="db-user" style="justify-self: end; text-align: right; padding-right: 0.75rem">Usuario</label>
                                            <InputText id="db-user" v-model="dbConfig.DB_USER" class="w-full" />

                                            <label for="db-password" style="justify-self: end; text-align: right; padding-right: 0.75rem">Contraseña</label>
                                            <Password id="db-password" v-model="dbConfig.DB_PASSWORD" :feedback="false" toggleMask placeholder="En blanco para no cambiarla" inputClass="w-full" />

                                            <label for="db-database" style="justify-self: end; text-align: right; padding-right: 0.75rem">Base de Datos</label>
                                            <InputText id="db-database" v-model="dbConfig.DB_DATABASE" class="w-full" />
                                        </div>
                                    </div>

                                    <div class="flex">
                                        <div style="display: grid; grid-template-columns: 10rem 20rem; grid-template-rows: 1fr auto auto; align-items: center; row-gap: 0.75rem">
                                            <label for="db-ca" style="justify-self: end; align-self: start; text-align: right; padding-right: 0.75rem; padding-block: 0.5rem">CA TLS</label>
                                            <Textarea id="db-ca" v-model="dbConfig.DB_SSL_CA" class="w-full" style="align-self: stretch; min-height: 6rem; resize: none" placeholder="Certificado de la CA (opcional)" />

                                            <label for="db-maint-user" style="justify-self: end; text-align: right; padding-right: 0.75rem; line-height: 1.2"
                                                >Usuario de mantenimiento
                                                <i class="pi pi-question-circle" v-tooltip.top="'Usuario opcional con permisos para copias de seguridad y restauración. Si lo dejas vacío, se usa el usuario de la aplicación.'"></i
                                            ></label>
                                            <InputText id="db-maint-user" v-model="dbConfig.DB_MAINT_USER" class="w-full" placeholder="Opcional" />

                                            <label for="db-maint-password" style="justify-self: end; text-align: right; padding-right: 0.75rem; line-height: 1.2">Contraseña de mantenimiento</label>
                                            <Password id="db-maint-password" v-model="dbConfig.DB_MAINT_PASSWORD" :feedback="false" toggleMask placeholder="En blanco para no cambiarla" inputClass="w-full" />
                                        </div>
                                    </div>
                                </div>
                                <div v-if="!configuracionBdValida" class="text-red-500 mt-3">{{ mensajeValidacionBd }}</div>
                                <div class="flex flex-wrap gap-2 mt-4 justify-content-end">
                                    <Button @click="testDbConnection" label="Probar" icon="pi pi-bolt" severity="secondary" v-tooltip="'Prueba la conexión con los valores introducidos'" :disabled="!configuracionBdValida" />
                                    <Button @click="confirmSaveDbConfig" label="Guardar" icon="pi pi-save" v-tooltip="'Guarda los cambios'" :disabled="!isDbConfigChanged || !configuracionBdValida" />
                                    <Button @click="confirmRestoreDbConfig" label="Restaurar" icon="pi pi-history" severity="danger" v-tooltip="'Restablece los valores anteriores'" :disabled="!backupExists" />
                                </div>
                            </div>
                        </div>

                        <div class="col-12">
                            <div class="card">
                                <div class="text-lg font-semibold">Respaldo y Restauración</div>
                                <p>Crea una copia de seguridad completa de la base de datos o restáurala a partir de un archivo previo.</p>
                                <div class="flex flex-wrap gap-2 mt-4">
                                    <Button label="Respaldar" icon="pi pi-download" severity="secondary" @click="backupDatabase" />
                                    <FileUpload
                                        mode="basic"
                                        name="backupSql"
                                        :auto="true"
                                        @uploader="onSelectFileToRestore"
                                        accept=".sql"
                                        customUpload
                                        chooseLabel="Restaurar"
                                        chooseIcon="pi pi-upload"
                                        class="p-button-secondary"
                                        invalidFileTypeMessage="El archivo «{0}» no es una copia de seguridad. Selecciona un archivo con extensión .sql."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabPanel>
                <TabPanel v-if="isAdmin" value="general">
                    <div class="font-semibold text-xl mb-4">Ajustes generales</div>
                    <div class="card">
                        <div class="text-lg font-semibold mb-2">Zona horaria</div>
                        <p>
                            Las horas se guardan siempre en UTC. La zona horaria elegida decide qué día, mes y año son «hoy» y en qué hora se muestran las fechas y los registros en toda la aplicación, con el cambio de hora de verano incluido sin que
                            tengas que tocar nada.
                        </p>
                        <div class="flex flex-col gap-2 mt-4" style="max-width: 26rem">
                            <label for="zona-horaria" class="font-bold">Zona horaria de la aplicación</label>
                            <Select id="zona-horaria" v-model="zonaSeleccionada" :options="zonasHorarias" filter placeholder="Selecciona una zona" fluid />
                            <small class="text-muted-color">Ahora mismo en esa zona: {{ horaEnZonaSeleccionada }}</small>
                        </div>
                        <div class="flex flex-wrap gap-2 mt-4">
                            <Button label="Guardar" icon="pi pi-save" :disabled="!zonaCambiada" :loading="guardandoZona" @click="guardarZona" />
                            <Button label="Descartar" icon="pi pi-times" severity="secondary" :disabled="!zonaCambiada" @click="zonaSeleccionada = zonaGuardada" />
                        </div>
                    </div>
                </TabPanel>
                <TabPanel v-if="isAdmin" value="recibos">
                    <div class="font-semibold text-xl mb-4">Administrar recibos</div>

                    <div class="card">
                        <div class="text-lg font-semibold mb-2">Crear recibos del año automáticamente</div>
                        <p>
                            Cada día a las 03:00 (en la zona horaria de Ajustes › General) la base de datos revisa si hay que crear recibos. Desde el 1 de diciembre crea, para cada recibo, el del año siguiente con sus fechas, el importe del último
                            pago y las mismas características. También pone al día los años que falten si el servidor estuvo parado. Solo crea recibos nuevos: nunca modifica ni borra los existentes.
                        </p>
                        <p class="mt-2">
                            <b>Riesgos.</b> Si lo desactivas, no se creará ningún recibo hasta que lo actives de nuevo a mano, aunque cierres la sesión. En enero el año nuevo estaría vacío hasta que generes los recibos con el botón de abajo, y los
                            pendientes del año anterior seguirían viéndose como atrasados. Si lo reactivas después de mucho tiempo, creará de golpe todos los años pendientes hasta el límite; revisa antes la vista previa.
                        </p>
                        <div class="flex items-center gap-3 mt-4">
                            <ToggleSwitch :modelValue="crearRecibosAutomaticamente" @update:modelValue="pedirCambioCreacionAutomatica" />
                            <span>{{ crearRecibosAutomaticamente ? 'Activada' : 'Desactivada' }}</span>
                        </div>
                    </div>

                    <div class="card">
                        <div class="text-lg font-semibold mb-2">Generar los recibos del año ahora</div>
                        <p>
                            Cada recibo pertenece a un año. Este proceso crea sus sucesores y sus fechas de cargo, sin modificar ni borrar los recibos existentes. Conserva las características del origen; usa el importe del último cargo pagado, o el
                            del recibo si no hay pagos.
                        </p>
                        <p class="mt-2">
                            La generación automática actúa a las 03:00 en la zona de Ajustes. La ejecución manual sirve para adelantarte a esa hora desde el 1 de diciembre, recuperar años pendientes o reintentar tras una incidencia. Funciona tanto
                            con la automatización activada como desactivada.
                        </p>
                        <p class="mt-2">
                            Hasta el 30 de noviembre solo se completan años hasta el actual. Desde el 1 de diciembre también se permite el siguiente. Se toman las series sin sucesor, con fecha inicial y replicación habilitada; si faltan varios años
                            se ponen al día. No se duplican sucesores.
                        </p>
                        <p class="mt-2">
                            «Vista previa de hoy» consulta qué se puede crear ahora, sin guardarlo. «Simular el próximo 1 de diciembre» proyecta los datos actuales a esa fecha; los resultados pueden variar si cambian los recibos o pagos. El mismo 1
                            de diciembre se simula hoy; después se usa el del año siguiente. Una simulación nunca habilita la creación real.
                        </p>
                        <p class="mt-2">
                            «Generar ahora» solo se habilita tras una vista previa de hoy con recibos. Pide confirmación y vuelve a calcular con los datos reales del momento. Si otro proceso ya los creó, puede no crear nada. Los avisos de cadencia se
                            muestran en cada recibo y los avisos generales, aparte.
                        </p>
                        <div class="flex flex-wrap gap-2 mt-4">
                            <Button label="Vista previa de hoy" icon="pi pi-search" severity="secondary" :disabled="cargandoVistaPrevia || generandoAhora" @click="consultarVistaPrevia(false)" />
                            <Button label="Simular el próximo 1 de diciembre" icon="pi pi-calendar" severity="secondary" :disabled="cargandoVistaPrevia || generandoAhora" @click="consultarVistaPrevia(true)" />
                            <Button label="Generar ahora" icon="pi pi-play" :disabled="!puedeGenerarAhora" @click="dialogoGenerar = true" />
                        </div>
                        <p v-if="vistaPrevia !== null" class="mt-4">{{ fechaSimulada ? 'Simulación al ' + $formatDate(fechaSimulada) + ': no se ha creado nada.' : 'Vista previa de hoy: no se ha creado nada.' }}</p>
                        <p v-for="aviso in avisosGeneracion" :key="aviso" class="mt-2">{{ aviso }}</p>
                        <DataTable v-if="vistaPrevia" :value="vistaPrevia" stripedRows class="mt-4">
                            <template #empty>
                                <div class="text-center p-4">{{ fechaSimulada ? 'No hay recibos elegibles que crear en la fecha simulada.' : 'No hay recibos elegibles que crear hoy. Puedes simular el próximo 1 de diciembre.' }}</div>
                            </template>
                            <Column field="concepto" header="Recibo" />
                            <Column field="anio_nuevo" header="Año" />
                            <Column field="fechas" header="Fechas" />
                            <Column header="Primera">
                                <template #body="p">{{ $formatDate(p.data.primera) }}</template>
                            </Column>
                            <Column header="Última">
                                <template #body="p">{{ $formatDate(p.data.ultima) }}</template>
                            </Column>
                            <Column header="Aviso">
                                <template #body="p"><Tag v-if="p.data.aviso" severity="warn" :value="p.data.aviso" /></template>
                            </Column>
                        </DataTable>
                    </div>

                    <div class="card">
                        <div class="text-lg font-semibold mb-2">Permitir editar/borrar recibos pagados</div>
                        <p>
                            Por defecto no se permite editar ni borrar los recibos pagados, salvo los del mes y año en curso: los de meses anteriores se consideran cerrados. Con esta opción activada puedes editar y borrar también los pagados de meses
                            cerrados, por ejemplo para corregir un error antiguo.
                        </p>
                        <p class="mt-2"><b>Solo dura la sesión.</b> Se desactiva al cerrar sesión o al recargar la página. Úsala con cuidado: borrar un cargo pagado no se puede deshacer.</p>
                        <div class="flex items-center gap-3 mt-4">
                            <ToggleSwitch v-model="permitirEditarPagados" />
                            <span>{{ permitirEditarPagados ? 'Activada' : 'Desactivada' }}</span>
                        </div>
                    </div>

                    <div class="card">
                        <div class="text-lg font-semibold mb-2">Permitir declarar fechas fuera del año en curso</div>
                        <p>
                            Cada recibo es de un año natural: todas sus fechas de cargo deben caer en el año de su fecha inicial. Por defecto, al guardar un recibo la pantalla avisa y el servidor rechaza cualquier fecha de otro año. Para tener un
                            recibo de otro año se usa otro recibo, el que crea cada año el proceso automático.
                        </p>
                        <p class="mt-2">
                            <b>Qué ocurre al activarla.</b> Mientras esté activada, al guardar un recibo se admiten fechas de cargo y fecha inicial de cualquier año: la pantalla no avisa y el servidor no las rechaza (solo lo acepta si quien guarda es
                            administrador). El recibo se guarda con esas fechas tal cual; no se crea ningún recibo nuevo ni se mueve ninguna fecha existente. No cambia las demás reglas: los cargos pagados de meses cerrados siguen necesitando la
                            opción «Permitir editar/borrar recibos pagados» y los ejercicios cerrados siguen sin poder editarse.
                        </p>
                        <p class="mt-2">
                            <b>Úsala con cuidado.</b> Un recibo con fechas de más de un año deja de cumplir la regla de un recibo por año (DC-14): «Generar nuevas fechas» y el proceso que crea los recibos del año siguiente no están pensados para él.
                            Actívala solo para corregir un caso concreto y desactívala después.
                        </p>
                        <p class="mt-2"><b>Solo dura la sesión.</b> Se desactiva automáticamente al cerrar sesión o al recargar la página, y vuelve a estar desactivada la próxima vez que entres.</p>
                        <div class="flex items-center gap-3 mt-4">
                            <ToggleSwitch v-model="permitirFechasFueraDeAnio" />
                            <span>{{ permitirFechasFueraDeAnio ? 'Activada' : 'Desactivada' }}</span>
                        </div>
                    </div>

                    <Dialog v-model:visible="dialogoCreacionAutomatica" :style="{ width: '500px' }" header="Confirmar" :modal="true">
                        <div class="flex items-center gap-4">
                            <i class="pi pi-exclamation-triangle !text-3xl" />
                            <span v-if="valorPendienteCreacion">¿Activar la creación automática de recibos? El proceso volverá a ejecutarse cada día a las 03:00 y, si faltan años, los creará.</span>
                            <span v-else>¿Desactivar la creación automática de recibos? No se creará ningún recibo, ni siquiera en diciembre, hasta que la actives de nuevo a mano.</span>
                        </div>
                        <template #footer>
                            <Button label="No" icon="pi pi-times" autofocus text @click="dialogoCreacionAutomatica = false" />
                            <Button label="Sí" icon="pi pi-check" @click="confirmarCambioCreacionAutomatica" />
                        </template>
                    </Dialog>
                    <Dialog v-model:visible="dialogoGenerar" :style="{ width: '500px' }" header="Confirmar" :modal="true">
                        <div class="flex items-center gap-4">
                            <i class="pi pi-exclamation-triangle !text-3xl" />
                            <span>Se crearán los recibos de la vista previa ({{ vistaPrevia ? vistaPrevia.length : 0 }}). Solo se añaden recibos nuevos, no se modifica ni se borra nada. ¿Continuar?</span>
                        </div>
                        <template #footer>
                            <Button label="No" icon="pi pi-times" autofocus text @click="dialogoGenerar = false" />
                            <Button label="Sí" icon="pi pi-check" :loading="generandoAhora" @click="generarAhora" />
                        </template>
                    </Dialog>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>

    <!-- Diálogo para crear/editar usuario -->
    <Dialog v-model:visible="userDialog" :style="{ width: '450px' }" header="Detalle del usuario" :modal="true">
        <div class="flex flex-col gap-6">
            <small v-if="errorUsuarioNombre || errorUsuarioEmail || errorUsuarioRol || errorUsuarioPassword" class="text-red-500">Revisa los campos marcados antes de guardar.</small>

            <!-- Si el usuario existe, username ocupa todo el ancho. Si es nuevo, se muestran username y password en dos columnas -->
            <div class="grid" :class="{ 'grid-cols-1': user.id, 'grid-cols-2': !user.id, 'gap-4': !user.id }">
                <div :class="{ 'col-span-2': user.id }">
                    <label for="username" class="block font-bold mb-3">Usuario</label>
                    <InputText id="username" v-model.trim="user.username" :required="true" autofocus class="w-full" :maxlength="50" />
                    <small v-if="errorUsuarioNombre" class="text-red-500">{{ errorUsuarioNombre }}</small>
                </div>
                <div v-if="!user.id">
                    <label for="password" class="block font-bold mb-3">Contraseña</label>
                    <Password id="password" v-model="user.password" :required="true" :feedback="true" class="w-full" toggle-mask promptLabel="Elige contraseña" weakLabel="Débil" mediumLabel="Media" strongLabel="Fuerte" :maxlength="72" />
                    <small v-if="errorUsuarioPassword" class="text-red-500">{{ errorUsuarioPassword }}</small>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-8">
                    <label for="email" class="block font-bold mb-3">Email</label>
                    <InputText id="email" v-model.trim="user.email" :required="true" type="email" class="w-full" :maxlength="100" :class="{ 'p-invalid': errorUsuarioEmail }" />
                    <small v-if="errorUsuarioEmail" class="text-red-500">{{ errorUsuarioEmail }}</small>
                </div>
                <div class="col-span-4">
                    <label for="rol" class="block font-bold mb-3">Rol</label>
                    <Select id="rol" v-model="user.rol" :options="rolesArray" placeholder="Seleccione un rol" class="w-full" />
                    <small v-if="errorUsuarioRol" class="text-red-500">{{ errorUsuarioRol }}</small>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" text @click="hideDialog" />
            <Button label="Guardar" icon="pi pi-check" @click="saveUser" :disabled="isSaveDisabled" />
        </template>
    </Dialog>

    <!-- Diálogo para cambiar contraseña -->
    <Dialog v-model:visible="changePasswordDialog" :style="{ width: '450px' }" :header="`Cambiar contraseña (${passwordData.username})`" :modal="true">
        <div class="flex flex-col gap-6">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label for="newPassword" class="block font-bold mb-3">Nueva contraseña</label>
                    <Password id="newPassword" v-model="passwordData.password" :required="true" :feedback="true" class="w-full" toggle-mask promptLabel=" " weakLabel="Débil" mediumLabel="Media" strongLabel="Fuerte" :maxlength="72" />
                    <small v-if="errorPasswordCambio" class="text-red-500">{{ errorPasswordCambio }}</small>
                </div>
                <div>
                    <label for="confirmPassword" class="block font-bold mb-3">Confirmar contraseña</label>
                    <Password id="confirmPassword" v-model="passwordData.confirmPassword" :required="true" class="w-full" toggle-mask promptLabel=" " weakLabel="Débil" mediumLabel="Media" strongLabel="Fuerte" />
                    <small v-if="passwordData.password !== passwordData.confirmPassword" class="text-red-500">Las contraseñas no coinciden</small>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" text @click="hideDialog" />
            <Button label="Guardar" icon="pi pi-check" @click="changePassword" :disabled="isPasswordChangeDisabled" />
        </template>
    </Dialog>

    <!-- Diálogo para confirmar eliminación de un usuario -->
    <Dialog v-model:visible="deleteUserDialog" :style="{ width: '450px' }" header="Confirmar" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span v-if="user"
                >¿Seguro que quieres borrar el usuario <b>{{ user.username }}</b
                >?</span
            >
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="deleteUserDialog = false" />
            <Button label="Sí" icon="pi pi-check" @click="deleteUser" />
        </template>
    </Dialog>

    <!-- Diálogo para confirmar eliminación de varios usuarios -->
    <Dialog v-model:visible="deleteSelectedUsersDialog" :style="{ width: '450px' }" header="Confirmar" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span v-if="selectedUsers.length">¿Seguro que quieres borrar los usuarios seleccionados?</span>
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="deleteSelectedUsersDialog = false" />
            <Button label="Sí" icon="pi pi-check" text @click="deleteSelectedUsers" />
        </template>
    </Dialog>

    <!-- Diálogo para confirmar guardar configuración de BD -->
    <Dialog v-model:visible="saveDbConfigDialog" :style="{ width: '450px' }" header="Confirmar" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span
                >¿Seguro que quieres guardar la nueva configuración de la conexión con la base de datos? <br /><br />Si aceptas se comprobará la conexión con los nuevos valores, se guardará los nuevos ajustes y se hará copia de seguridad de la
                configuración actual por si decides recuperarla. Una vez restaurada el fichero de backup se eliminará.</span
            >
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="saveDbConfigDialog = false" />
            <Button label="Sí" icon="pi pi-check" @click="saveDbConfig" />
        </template>
    </Dialog>

    <!-- Diálogo para confirmar restaurar configuración de BD -->
    <Dialog v-model:visible="restoreDbConfigDialog" :style="{ width: '450px' }" header="Confirmar" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span
                >¿Seguro que quieres restaurar la configuración desde la copia de seguridad? <br /><br />Se puede restaurar únicamente la configuración previa a la última modificación. Esta no es comprobada antes de su restauración por lo que debes
                estar seguro que la configuración será funcional. El fichero de backup se eliminará después de su restauración.</span
            >
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="restoreDbConfigDialog = false" />
            <Button label="Sí" icon="pi pi-check" @click="restoreDbConfig" />
        </template>
    </Dialog>

    <!-- Diálogo para confirmar la restauración de la base de datos -->
    <Dialog v-model:visible="restoreDatabaseDialog" :style="{ width: '450px' }" header="Confirmar" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span
                >¿Seguro que quieres restaurar la base de datos desde el fichero <b>{{ fileToRestore?.name }}</b
                >? <br /><br /><b>¡Atención!</b> Esta acción es irreversible y sobrescribirá todos los datos actuales de la aplicación.</span
            >
        </div>
        <template #footer>
            <Button
                label="No"
                icon="pi pi-times"
                autofocus
                text
                @click="
                    restoreDatabaseDialog = false;
                    fileToRestore = null;
                "
            />
            <Button label="Sí" icon="pi pi-check" @click="restoreDatabase" severity="danger" />
        </template>
    </Dialog>
</template>
