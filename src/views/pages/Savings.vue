<script setup>
import { SavService } from '@/service/SavService';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const savings = ref([]);
const selectedSavings = ref([]);
const toast = useToast();

const saving = ref({
    id: null,
    concepto: '',
    descripcion: '',
    ahorrado: 0,
    fecha_objetivo: null,
    periodicidad: '',
    importe_periodico: 0,
    activo: 1
});

const savingDialog = ref(false);
const deleteSavingDialog = ref(false);
const deleteSelectedSavingsDialog = ref(false);

const fetchSavings = async () => {
    try {
        const data = await SavService.getSavings();
        savings.value = data.map((sav) => ({
            ...sav,
            concepto: sav.concepto.charAt(0).toUpperCase() + sav.concepto.slice(1),
            fecha_objetivo: sav.fecha_objetivo ? new Date(sav.fecha_objetivo) : null // Convertir fecha_objetivo a objeto Date
        }));
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al actualizar los ahorros: ${error.message}`, life: 5000 });
        console.error('Error al actualizar los ahorros:', error);
    }
};

function updateSavings() {
    fetchSavings();
    toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Ahorros actualizados.', life: 3000 });
}

const confirmDeleteSelectedSavings = () => {
    deleteSelectedSavingsDialog.value = true;
};

const deleteSelectedSavings = async () => {
    try {
        const savingIds = selectedSavings.value.map((sav) => sav.id);
        await SavService.deleteSavings(savingIds);
        fetchSavings(); // Refresh the list after deletion
        toast.add({ severity: 'success', summary: 'Borrado', detail: 'Ahorros borrados con éxito.', life: 3000 });
        deleteSelectedSavingsDialog.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al borrar los ahorros: ${error.message}`, life: 5000 });
        console.error('Error al borrar los ahorros:', error);
    }
};

function openNewSaving() {
    saving.value = {
        id: null,
        concepto: '',
        descripcion: '',
        ahorrado: 0,
        fecha_objetivo: null,
        periodicidad: '',
        importe_periodico: 0,
        activo: 1
    };
    savingDialog.value = true;
}

function hideDialog() {
    savingDialog.value = false;
    deleteSavingDialog.value = false;
    deleteSelectedSavingsDialog.value = false;
}

async function saveSaving() {
    try {
        // Ajustar la zona horaria para fecha_objetivo si está definida
        if (saving.value.fecha_objetivo) {
            const fechaLocal = new Date(saving.value.fecha_objetivo.getTime() - saving.value.fecha_objetivo.getTimezoneOffset() * 60000);
            saving.value.fecha_objetivo = fechaLocal;
        }

        await SavService.saveSaving(saving.value);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Ahorro guardado!', life: 5000 });
        fetchSavings();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar el ahorro: ${error.message}`, life: 5000 });
        console.error('Error al guardar el ahorro:', error);
    }
}

function editSaving(sav) {
    saving.value = {
        id: sav.id,
        concepto: sav.concepto,
        descripcion: sav.descripcion,
        ahorrado: sav.ahorrado,
        fecha_objetivo: sav.fecha_objetivo ? new Date(sav.fecha_objetivo) : null, // Convertir fecha_objetivo a objeto Date
        periodicidad: sav.periodicidad,
        importe_periodico: sav.importe_periodico,
        activo: sav.activo
    };
    savingDialog.value = true;
}

function confirmDeleteSaving(sav) {
    saving.value = sav;
    deleteSavingDialog.value = true;
}

async function deleteSaving() {
    try {
        await SavService.deleteSavings([saving.value.id]);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Ahorro eliminado', life: 3000 });
        fetchSavings();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar el ahorro: ${error.message}`, life: 5000 });
        console.error('Error al eliminar el ahorro:', error);
    }
}

const isFormValid = computed(() => {
    return saving.value.concepto.trim() !== '' && saving.value.importe_periodico > 0;
});

onMounted(() => {
    fetchSavings();
});
</script>

<template>
    <div class="flex flex-col">
        <div class="card">
            <div class="font-semibold text-xl mb-4"></div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nuevo" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNewSaving" />
                    <Button label="Borrar" icon="pi pi-trash" severity="secondary" class="mr-2" @click="confirmDeleteSelectedSavings" :disabled="!selectedSavings.length" />
                    <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" class="mr-2" @click="updateSavings" />
                </template>
                <template #end>
                    <Button label="Exportar" icon="pi pi-upload" severity="secondary" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <div class="font-semibold text-xl mb-4">Ahorros <small class="text-gray-500">(partidas de dinero que se guardan para un fin concreto)</small></div>
            <DataTable ref="dt_ahorros" v-model:selection="selectedSavings" :value="savings" dataKey="id" responsiveLayout="scroll" selectionMode="multiple" sortMode="multiple" removableSort stripedRows>
                <template #empty>
                    <div class="text-center p-4">No hay ahorros a mostrar.</div>
                </template>
                <Column field="concepto" header="Concepto" sortable style="min-width: 4rem"></Column>
                <Column field="descripcion" header="Descripción" sortable style="min-width: 12rem"></Column>
                <Column field="ahorrado" header="Ahorrado" sortable style="min-width: 4rem"></Column>
                <Column field="fecha_objetivo" header="Fecha Objetivo" sortable style="min-width: 8rem">
                    <template #body="savingsSlotProps">
                        {{ savingsSlotProps.data.fecha_objetivo ? $formatDate(savingsSlotProps.data.fecha_objetivo) : '' }}
                    </template>
                </Column>
                <Column field="periodicidad" header="Periodicidad" sortable style="min-width: 4rem"></Column>
                <Column field="importe_periodico" header="Importe Periódico" sortable style="min-width: 4rem"></Column>
                <Column :exportable="false">
                    <template #body="savingsSlotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editSaving(savingsSlotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteSaving(savingsSlotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>

    <Dialog v-model:visible="savingDialog" :style="{ width: '450px' }" header="Detalle del ahorro" :modal="true">
        <div class="flex flex-col gap-6">
            <div>
                <label for="concepto" class="block font-bold mb-3">Concepto</label>
                <InputText id="concepto" v-model.trim="saving.concepto" required="true" autofocus fluid />
                <small v-if="saving.concepto.trim() === ''" class="text-red-500">El concepto es obligatorio</small>
            </div>
            <div>
                <label for="descripcion" class="block font-bold mb-3">Descripción</label>
                <Textarea id="descripcion" v-model="saving.descripcion" rows="3" cols="20" :maxlength="255" fluid />
                <small v-if="saving.descripcion.length > 255" class="text-red-500">La descripción no puede tener más de 255 caracteres.</small>
            </div>
            <div class="flex gap-6">
                <div class="flex-1">
                    <label for="ahorrado" class="block font-bold mb-3">Ahorrado</label>
                    <InputNumber id="ahorrado" v-model="saving.ahorrado" mode="currency" currency="EUR" locale="es-ES" fluid />
                </div>
                <div class="flex-1">
                    <label for="fecha_objetivo" class="block font-bold mb-3">Fecha Objetivo</label>
                    <Calendar id="fecha_objetivo" v-model="saving.fecha_objetivo" dateFormat="dd/mm/yy" fluid />
                </div>
            </div>
            <div class="flex gap-6">
                <div class="flex-1">
                    <label for="periodicidad" class="block font-bold mb-3">Periodicidad</label>
                    <Select id="periodicidad" v-model="saving.periodicidad" :options="['mensual', 'bimestral', 'trimestral', 'anual']" fluid />
                </div>
                <div class="flex-1">
                    <label for="importe_periodico" class="block font-bold mb-3">Importe Periódico</label>
                    <InputNumber id="importe_periodico" v-model="saving.importe_periodico" mode="currency" currency="EUR" locale="es-ES" fluid />
                    <small v-if="saving.importe_periodico <= 0" class="text-red-500">El importe periódico debe ser mayor que 0</small>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
            <Button label="Save" icon="pi pi-check" @click="saveSaving" :disabled="!isFormValid" />
        </template>
    </Dialog>

    <Dialog v-model:visible="deleteSavingDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span v-if="saving"
                >¿Seguro que quieres borrar el ahorro <b>{{ saving.concepto }}</b
                >?</span
            >
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="deleteSavingDialog = false" />
            <Button label="Yes" icon="pi pi-check" @click="deleteSaving" />
        </template>
    </Dialog>

    <Dialog v-model:visible="deleteSelectedSavingsDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span v-if="selectedSavings.length">¿Seguro que quieres borrar los ahorros seleccionados?</span>
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="deleteSelectedSavingsDialog = false" />
            <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedSavings" />
        </template>
    </Dialog>
</template>
