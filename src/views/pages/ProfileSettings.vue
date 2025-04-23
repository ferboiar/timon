<script setup>
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import { useLayout } from '@/layout/composables/layout';
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

const isSaveDisabled = computed(() => !user.value.username || !user.value.email || (user.value.id === null && !user.value.password));
const isPasswordChangeDisabled = computed(() => !passwordData.value.password || passwordData.value.password !== passwordData.value.confirmPassword);

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
                <Tab v-if="isAdmin" value="admin">Admin</Tab>
                <Tab value="2">Header III</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="Estilo">
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
                <TabPanel v-if="isAdmin" value="admin">
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
                    <InputText id="email" v-model.trim="user.email" :required="true" type="email" class="w-full" />
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
</template>
