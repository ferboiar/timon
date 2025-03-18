<script setup>
import { AccService } from '@/service/AccService';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const accounts = ref([]);
const selectedAccounts = ref([]);
const toast = useToast();

const account = ref({
    id: null,
    nombre: '',
    tipo: '',
    iban: '',
    saldo_actual: 0,
    descripcion: '',
    activa: 1
});

const accountDialog = ref(false);
const deleteAccountDialog = ref(false);
const deleteSelectedAccountsDialog = ref(false);

const tipos = ref([]); // Inicializar como un array vacío

const fetchAccounts = async () => {
    try {
        const data = await AccService.getAccounts();
        accounts.value = data.map((acc) => ({
            ...acc,
            nombre: acc.nombre.charAt(0).toUpperCase() + acc.nombre.slice(1)
        }));
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al actualizar las cuentas: ${error.message}`, life: 5000 });
        console.error('Error al actualizar las cuentas:', error);
    }
};

const fetchTipos = async () => {
    try {
        const data = await AccService.getTipos();
        tipos.value = data.map((tipo) => ({
            label: capitalizeFirstLetter(tipo),
            value: tipo
        }));
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener los tipos: ${error.message}`, life: 5000 });
        console.error('Error al obtener los tipos:', error);
    }
};

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function updateAccounts() {
    fetchAccounts();
    toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Cuentas actualizadas.', life: 3000 });
}

const confirmDeleteSelectedAccounts = () => {
    deleteSelectedAccountsDialog.value = true;
};

const deleteSelectedAccounts = async () => {
    try {
        const accountIds = selectedAccounts.value.map((acc) => acc.id);
        await AccService.deleteAccounts(accountIds);
        fetchAccounts(); // Refresh the list after deletion
        toast.add({ severity: 'success', summary: 'Borrada', detail: 'Cuentas borradas con exito.', life: 3000 });
        deleteSelectedAccountsDialog.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al borrar las cuentas: ${error.message}`, life: 5000 });
        console.error('Error al borrar las cuentas:', error);
    }
};

function openNewAccount() {
    account.value = {
        id: null,
        nombre: '',
        tipo: '',
        iban: '',
        saldo_actual: 0,
        descripcion: '',
        activa: 1
    };
    accountDialog.value = true;
}

function hideDialog() {
    accountDialog.value = false;
    deleteAccountDialog.value = false;
    deleteSelectedAccountsDialog.value = false;
}

async function saveAccount() {
    try {
        await AccService.saveAccount(account.value);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Cuenta guardada!', life: 5000 });
        fetchAccounts();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar la cuenta: ${error.message}`, life: 5000 });
        console.error('Error al guardar la cuenta:', error);
    }
}

function editAccount(acc) {
    console.log('editAccount(). Tipo de cuenta inicial:', acc.tipo);
    account.value = {
        id: acc.id,
        nombre: acc.nombre,
        tipo: acc.tipo,
        iban: acc.iban,
        saldo_actual: acc.saldo_actual,
        descripcion: acc.descripcion || '',
        activa: acc.activa
    };
    accountDialog.value = true;
    console.log('editAccount(). Tipo de cuenta final:', account.value.tipo);
}

function confirmDeleteAccount(acc) {
    account.value = acc;
    deleteAccountDialog.value = true;
}

async function deleteAccount() {
    try {
        await AccService.deleteAccounts([account.value.id]);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Cuenta eliminada', life: 3000 });
        fetchAccounts();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar la cuenta: ${error.message}`, life: 5000 });
        console.error('Error al eliminar la cuenta:', error);
    }
}

const isFormValid = computed(() => {
    return account.value.nombre.trim() !== '' && account.value.tipo !== '';
});

onMounted(() => {
    fetchAccounts();
    fetchTipos(); // Llamar a fetchTipos para cargar las opciones de tipo
});
</script>

<template>
    <div class="flex flex-col">
        <div class="card">
            <div class="font-semibold text-xl mb-4"></div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nueva" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNewAccount" />
                    <Button label="Borrar" icon="pi pi-trash" severity="secondary" class="mr-2" @click="confirmDeleteSelectedAccounts" :disabled="!selectedAccounts.length" />
                    <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" class="mr-2" @click="updateAccounts" />
                </template>
                <template #end>
                    <Button label="Exportar" icon="pi pi-upload" severity="secondary" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <div class="font-semibold text-xl mb-4">Cuentas</div>
            <DataTable ref="dt_cuentas" v-model:selection="selectedAccounts" :value="accounts" dataKey="id" responsiveLayout="scroll" selectionMode="multiple" sortMode="multiple" removableSort stripedRows>
                <template #empty>
                    <div class="text-center p-4">No hay cuentas a mostrar.</div>
                </template>
                <Column field="nombre" header="Nombre" sortable style="min-width: 4rem"></Column>
                <Column field="tipo" header="Tipo" sortable style="min-width: 4rem">
                    <template #body="slotProps">
                        {{ capitalizeFirstLetter(slotProps.data.tipo) }}
                    </template>
                </Column>
                <Column field="iban" header="IBAN" sortable style="min-width: 12rem"></Column>
                <Column field="saldo_actual" header="Saldo actual" sortable style="min-width: 4rem"></Column>
                <Column field="descripcion" header="Descripción" sortable style="min-width: 12rem"></Column>
                <Column :exportable="false">
                    <template #body="accountsSlotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editAccount(accountsSlotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteAccount(accountsSlotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>

    <Dialog v-model:visible="accountDialog" :style="{ width: '450px' }" header="Detalle de la cuenta" :modal="true">
        <div class="flex flex-col gap-6">
            <div>
                <label for="nombre" class="block font-bold mb-3">Nombre</label>
                <InputText id="nombre" v-model.trim="account.nombre" required="true" autofocus fluid />
                <small v-if="account.nombre.trim() === ''" class="text-red-500">El nombre es obligatorio</small>
            </div>
            <div>
                <label for="iban" class="block font-bold mb-3">IBAN</label>
                <InputText id="iban" v-model.trim="account.iban" fluid />
            </div>
            <div class="flex gap-6">
                <div class="flex-1">
                    <label for="tipo" class="block font-bold mb-3">Tipo</label>
                    <Select id="tipo" v-model="account.tipo" :options="tipos" optionValue="value" optionLabel="label" fluid />
                    <small v-if="account.tipo === ''" class="text-red-500">El tipo es obligatorio</small>
                </div>
                <div class="flex-1">
                    <label for="saldo_actual" class="block font-bold mb-3">Saldo Actual</label>
                    <InputNumber id="saldo_actual" v-model="account.saldo_actual" mode="currency" currency="EUR" locale="es-ES" fluid />
                </div>
            </div>
            <div>
                <label for="descripcion" class="block font-bold mb-3">Descripción</label>
                <Textarea id="descripcion" v-model="account.descripcion" rows="3" cols="20" :maxlength="255" fluid />
                <small v-if="account.descripcion.length > 255" class="text-red-500">La descripción no puede tener más de 255 caracteres.</small>
                <small v-else-if="account.descripcion.length >= 254" class="text-red-500">La descripción no puede tener más de 255 caracteres</small>
            </div>
        </div>

        <template #footer>
            <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
            <Button label="Save" icon="pi pi-check" @click="saveAccount" :disabled="!isFormValid" />
        </template>
    </Dialog>

    <Dialog v-model:visible="deleteAccountDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span v-if="account"
                >¿Seguro que quieres borrar la cuenta <b>{{ account.nombre }}</b
                >?</span
            >
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="deleteAccountDialog = false" />
            <Button label="Yes" icon="pi pi-check" @click="deleteAccount" />
        </template>
    </Dialog>

    <Dialog v-model:visible="deleteSelectedAccountsDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span v-if="selectedAccounts.length">¿Seguro que quieres borrar las cuentas seleccionadas?</span>
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="deleteSelectedAccountsDialog = false" />
            <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedAccounts" />
        </template>
    </Dialog>
</template>
