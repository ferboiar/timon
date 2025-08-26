<script setup>
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import { useLayout } from '@/layout/composables/layout';
import { DbConfigService } from '@/service/DbConfigService';
import { MtoDBService } from '@/service/MaintenanceDBService';
import { UsersService } from '@/service/UsersService';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

const { layoutConfig } = useLayout();
const { isAdmin, ROLES, currentUser, updateStylePreferences } = useAuth();
const { primaryColors, surfaces, presetOptions, menuModeOptions, defaultConfig, applyFullTheme } = useTheme();
const toast = useToast();

// Convertir el objeto ROLES a un array para el dropdown
const rolesArray = ref(Object.values(ROLES));

const preset = ref(layoutConfig.preset);
const menuMode = ref(layoutConfig.menuMode);

// Valores temporales para configuración (sin aplicar hasta guardar)
const tempLayoutConfig = ref({
    preset: layoutConfig.preset,
    menuMode: layoutConfig.menuMode,
    darkTheme: layoutConfig.darkTheme,
    primary: layoutConfig.primary,
    surface: layoutConfig.surface
});

// Bandera para detectar si hay cambios sin guardar
const hasUnsavedChanges = computed(() => {
    return (
        tempLayoutConfig.value.preset !== layoutConfig.preset ||
        tempLayoutConfig.value.menuMode !== layoutConfig.menuMode ||
        tempLayoutConfig.value.darkTheme !== layoutConfig.darkTheme ||
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

// Validación de email (comprueba si contiene @)
const isEmailValid = computed(() => {
    return !user.value.email || user.value.email.includes('@');
});

const isSaveDisabled = computed(() => !user.value.username || !user.value.email || !isEmailValid.value || (user.value.id === null && !user.value.password));

const isPasswordChangeDisabled = computed(() => !passwordData.value.password || passwordData.value.password !== passwordData.value.confirmPassword);

const isDbConfigChanged = computed(() => {
    return (
        dbConfig.value.DB_HOST !== dbConfigOriginal.value.DB_HOST ||
        dbConfig.value.DB_PORT !== dbConfigOriginal.value.DB_PORT ||
        dbConfig.value.DB_USER !== dbConfigOriginal.value.DB_USER ||
        dbConfig.value.DB_DATABASE !== dbConfigOriginal.value.DB_DATABASE ||
        !!dbConfig.value.DB_PASSWORD // Si se ha introducido una nueva contraseña
    );
});

// Guarda las preferencias de estilo actuales en el servidor
async function saveStylePreferences() {
    if (isInitializing.value) return;

    try {
        // Crear objeto con las preferencias actuales
        const stylePrefs = {
            preset: layoutConfig.preset,
            menuMode: layoutConfig.menuMode,
            darkTheme: layoutConfig.darkTheme,
            primary: layoutConfig.primary,
            surface: layoutConfig.surface
        };

        // Guardar en el servidor
        await updateStylePreferences(stylePrefs);

        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Preferencias de estilo guardadas correctamente', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `No se pudieron guardar las preferencias: ${error.message}`, life: 5000 });
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
    layoutConfig.darkTheme = tempLayoutConfig.value.darkTheme;

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
    DB_PASSWORD: '' // Solo para el formulario, no se recibe del servidor
});
const backupExists = ref(false);
const dbConfigOriginal = ref({});

// Función para mostrar la contraseña actual
const fetchAndShowPassword = async () => {
    try {
        const { password } = await DbConfigService.getDbPassword();
        dbConfig.value.DB_PASSWORD = password;
        toast.add({ severity: 'info', summary: 'Contraseña mostrada', detail: 'Se ha cargado la contraseña actual.', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener la contraseña.', life: 5000 });
    }
};

// DB Config Functions
const fetchDbConfig = async () => {
    try {
        const { config, backupExists: hasBackup } = await DbConfigService.getDbConfig();
        dbConfig.value = { ...config, DB_PASSWORD: '' };
        dbConfigOriginal.value = { ...config };
        backupExists.value = hasBackup;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la configuración de la base de datos.', life: 3000 });
        console.error('Error al cargar la configuración de la base de datos:', error);
    }
};

const testDbConnection = async () => {
    try {
        await DbConfigService.testDbConnection(dbConfig.value);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'La prueba de conexión fue bien.', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error en la conexión', detail: error.message || 'No se pudo conectar a la base de datos.', life: 5000 });
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
        await DbConfigService.saveDbConfig(dbConfig.value);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración de la conexión con base de datos guardada.', life: 3000 });
        await fetchDbConfig(); // Recargar la configuración
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error al guardar', detail: error.message || 'No se pudo guardar la configuración.', life: 5000 });
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
        toast.add({ severity: 'error', summary: 'Error al restaurar', detail: error.message || 'No se pudo restaurar la configuración.', life: 5000 });
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
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo descargar la copia de seguridad.', life: 5000 });
        console.error('Error al descargar la copia de seguridad:', error);
    }
};

// User management functions
const fetchUsers = async () => {
    try {
        const data = await UsersService.getUsers();
        users.value = data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener usuarios: ${error.message}`, life: 5000 });
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
        await UsersService.saveUser(user.value);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario guardado correctamente', life: 3000 });
        fetchUsers();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar usuario: ${error.message}`, life: 5000 });
        console.error('Error al guardar usuario:', error);
    }
}

async function changePassword() {
    try {
        await UsersService.changePassword({
            id: passwordData.value.id,
            password: passwordData.value.password
        });
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Contraseña actualizada correctamente', life: 3000 });
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al cambiar la contraseña: ${error.message}`, life: 5000 });
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
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar usuario: ${error.message}`, life: 5000 });
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
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar usuarios: ${error.message}`, life: 5000 });
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

// Obtener usuarios y aplicar preferencias al montar el componente
onMounted(() => {
    if (isAdmin.value) {
        fetchUsers();
        fetchDbConfig();
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
        <Tabs value="Estilo">
            <TabList>
                <Tab value="Estilo">Estilo</Tab>
                <Tab v-if="isAdmin" value="usuarios">Usuarios</Tab>
                <Tab v-if="isAdmin" value="db"> Conexión a BD</Tab>
                <Tab value="2">Header III</Tab>
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
                            <span class="text-sm text-muted-color font-semibold">Modo oscuro por defecto</span>
                            <ToggleSwitch v-model="tempLayoutConfig.darkTheme" />
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
                                <div class="mt-4" style="display: grid; grid-template-columns: 10rem 20rem; align-items: center; row-gap: 0.75rem">
                                    <label for="db-host" style="justify-self: end; padding-right: 0.75rem">Host</label>
                                    <InputText id="db-host" v-model="dbConfig.DB_HOST" class="w-full" />

                                    <label for="db-port" style="justify-self: end; padding-right: 0.75rem">Puerto</label>
                                    <InputText id="db-port" v-model="dbConfig.DB_PORT" class="w-full" />

                                    <label for="db-user" style="justify-self: end; padding-right: 0.75rem">Usuario</label>
                                    <InputText id="db-user" v-model="dbConfig.DB_USER" class="w-full" />

                                    <label for="db-password" style="justify-self: end; padding-right: 0.75rem">Contraseña</label>
                                    <div class="p-inputgroup">
                                        <Password id="db-password" v-model="dbConfig.DB_PASSWORD" :feedback="false" toggleMask placeholder="En blanco para no cambiarla" inputClass="w-full" />
                                        <Button icon="pi pi-refresh" severity="secondary" @click="fetchAndShowPassword" v-tooltip.bottom="'Mostrar contraseña actual'" />
                                    </div>

                                    <label for="db-database" style="justify-self: end; padding-right: 0.75rem">Base de Datos</label>
                                    <InputText id="db-database" v-model="dbConfig.DB_DATABASE" class="w-full" />
                                </div>
                                <div class="flex flex-wrap gap-2 mt-4 justify-content-end">
                                    <Button @click="testDbConnection" label="Probar" icon="pi pi-bolt" severity="secondary" v-tooltip="'Prueba la conexión con los valores introducidos'" />
                                    <Button @click="confirmSaveDbConfig" label="Guardar" icon="pi pi-save" v-tooltip="'Guarda los cambios'" :disabled="!isDbConfigChanged" />
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
                                    <Button label="Restaurar" icon="pi pi-upload" severity="secondary" @click="restoreDatabase" />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabPanel>
                <TabPanel value="2">
                    <p class="m-0">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                        consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </p>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>

    <!-- Diálogo para crear/editar usuario -->
    <Dialog v-model:visible="userDialog" :style="{ width: '450px' }" header="Detalle del usuario" :modal="true">
        <div class="flex flex-col gap-6">
            <small v-if="!user.username || !user.email || (!user.password && !user.id)" class="text-red-500">Todos los campos son obligatorios</small>

            <!-- Si el usuario existe, username ocupa todo el ancho. Si es nuevo, se muestran username y password en dos columnas -->
            <div class="grid" :class="{ 'grid-cols-1': user.id, 'grid-cols-2': !user.id, 'gap-4': !user.id }">
                <div :class="{ 'col-span-2': user.id }">
                    <label for="username" class="block font-bold mb-3">Usuario</label>
                    <InputText id="username" v-model.trim="user.username" :required="true" autofocus class="w-full" />
                </div>
                <div v-if="!user.id">
                    <label for="password" class="block font-bold mb-3">Contraseña</label>
                    <Password id="password" v-model="user.password" :required="true" :feedback="true" class="w-full" toggle-mask promptLabel="Elige contraseña" weakLabel="Débil" mediumLabel="Media" strongLabel="Fuerte" />
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-8">
                    <label for="email" class="block font-bold mb-3">Email</label>
                    <InputText id="email" v-model.trim="user.email" :required="true" type="email" class="w-full" :class="{ 'p-invalid': user.email && !isEmailValid }" />
                    <small v-if="user.email && !isEmailValid" class="text-red-500">Indica un e-mail válido</small>
                </div>
                <div class="col-span-4">
                    <label for="rol" class="block font-bold mb-3">Rol</label>
                    <Select id="rol" v-model="user.rol" :options="rolesArray" placeholder="Seleccione un rol" class="w-full" />
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
                    <Password id="newPassword" v-model="passwordData.password" :required="true" :feedback="true" class="w-full" toggle-mask promptLabel=" " weakLabel="Débil" mediumLabel="Media" strongLabel="Fuerte" />
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
</template>
