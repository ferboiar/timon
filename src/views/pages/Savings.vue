<script setup>
import { SavService } from '@/service/SavService';
import { useToast } from 'primevue/usetoast';
import { computed, getCurrentInstance, onMounted, ref } from 'vue';

const savings = ref([]);
const selectedSavings = ref([]);
const toast = useToast();

const { appContext } = getCurrentInstance();
const formatDate = appContext.config.globalProperties.$formatDate; // Obtener la función global

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

const periodicidades = ref([{ label: '', value: '' }]); // Inicializar con una entrada vacía

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

const fetchPeriodicidades = async () => {
    try {
        const data = await SavService.getPeriodicidades();
        periodicidades.value = [
            { label: '', value: '' },
            ...data.map((periodicidad) => ({
                label: capitalizeFirstLetter(periodicidad),
                value: periodicidad
            }))
        ];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener las periodicidades: ${error.message}`, life: 5000 });
        console.error('Error al obtener las periodicidades:', error);
    }
};

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

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
            saving.value.fecha_objetivo = formatDate(fechaLocal, '-'); // Convertir fechaLocal al formato YYYY-MM-DD
        }

        // Verificar si periodicidad no está definida y asignarle null
        if (!saving.value.periodicidad) {
            saving.value.periodicidad = null;
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
        // Actualizar la tabla dt_ahorros
        const dtAhorros = getCurrentInstance().refs.dt_ahorros;
        if (dtAhorros) {
            dtAhorros.reset();
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar el ahorro: ${error.message}`, life: 5000 });
        console.error('Error al eliminar el ahorro:', error);
    }
}

const isFormValid = computed(() => {
    return saving.value.concepto.trim() !== '';
});

const expandedRows = ref({});
const showInactive = ref(false);
const savingMovimientoDialog = ref(false);
const movimiento = ref({
    id: null,
    ahorro_id: null,
    importe: 0,
    fecha: null,
    tipo: 'regular',
    descripcion: ''
});

const movimientos = ref({});

const fetchMovimientos = async (ahorroId) => {
    try {
        const data = await SavService.getMovimientos(ahorroId);
        movimientos.value[ahorroId] = data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener los movimientos: ${error.message}`, life: 5000 });
        console.error('Error al obtener los movimientos:', error);
        movimientos.value[ahorroId] = [];
    }
};

const fetchAllMovimientos = async () => {
    try {
        const ahorroIds = savings.value.map((saving) => saving.id);
        const movimientosPromises = ahorroIds.map((id) => SavService.getMovimientos(id));
        const movimientosResults = await Promise.all(movimientosPromises);
        ahorroIds.forEach((id, index) => {
            movimientos.value[id] = movimientosResults[index];
        });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener los movimientos: ${error.message}`, life: 5000 });
        console.error('Error al obtener los movimientos:', error);
    }
};

const isExpanded = ref(false);
const expandedCount = ref(0);
const savingsWithMovements = computed(() => savings.value.filter((s) => movimientos.value[s.id]?.length > 0).length);

const toggleExpandCollapseAll = () => {
    if (isExpanded.value) {
        expandedRows.value = {};
        expandedCount.value = 0;
    } else {
        expandedRows.value = savings.value.reduce((acc, s) => {
            acc[s.id] = true;
            return acc;
        }, {});
        expandedCount.value = savingsWithMovements.value;
    }
    isExpanded.value = !isExpanded.value;
};

const onRowExpand = async (event) => {
    await fetchMovimientos(event.data.id);
    expandedRows.value[event.data.id] = true;
    expandedCount.value++;
    checkGlobalExpandState();
};

const onRowCollapse = (event) => {
    delete expandedRows.value[event.data.id];
    expandedCount.value--;
    checkGlobalExpandState();
};

const checkGlobalExpandState = () => {
    isExpanded.value = expandedCount.value >= savingsWithMovements.value;
};

const toggleShowInactive = () => {
    showInactive.value = !showInactive.value;
};

const openNewMovimiento = (ahorroId) => {
    movimiento.value = {
        id: null,
        ahorro_id: ahorroId,
        importe: 0,
        fecha: null,
        tipo: 'regular',
        descripcion: ''
    };
    savingMovimientoDialog.value = true;
};

const editMovimiento = (mov) => {
    movimiento.value = { ...mov };
    savingMovimientoDialog.value = true;
};

const saveMovimiento = async () => {
    try {
        // Ajustar la zona horaria para fecha si está definida
        if (movimiento.value.fecha) {
            // Asegurarse de que movimiento.value.fecha sea un objeto Date
            if (!(movimiento.value.fecha instanceof Date)) {
                movimiento.value.fecha = new Date(movimiento.value.fecha);
            }
            const fechaLocal = new Date(movimiento.value.fecha.getTime() - movimiento.value.fecha.getTimezoneOffset() * 60000);
            movimiento.value.fecha = formatDate(fechaLocal, '-'); // Convertir fechaLocal al formato YYYY-MM-DD
        }

        await SavService.saveMovimiento(movimiento.value);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Movimiento guardado!', life: 5000 });
        fetchSavings();
        fetchAllMovimientos();
        savingMovimientoDialog.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar el movimiento: ${error.message}`, life: 5000 });
        console.error('Error al guardar el movimiento:', error);
    }
};

const deleteMovimiento = async (mov) => {
    try {
        await SavService.deleteMovimiento(mov.id);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Movimiento eliminado', life: 3000 });
        fetchSavings();
        fetchAllMovimientos();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar el movimiento: ${error.message}`, life: 5000 });
        console.error('Error al eliminar el movimiento:', error);
    }
};

const hasInactiveSavings = computed(() => {
    return savings.value.some((saving) => saving.activo === 0);
});

const isMovimientoFormValid = computed(() => {
    return movimiento.value.fecha && movimiento.value.tipo;
});

const exportCSV = () => {
    const exportData = (savings, movimientos, filename, formatDate) => {
        const csvContent = [
            ['Concepto', 'Descripción', 'Ahorrado', 'Fecha Objetivo', 'Periodicidad', 'Importe Periódico', 'Fecha Movimiento', 'Tipo Movimiento', 'Importe Movimiento', 'Descripción Movimiento'],
            ...savings.flatMap((saving) => {
                const savingData = [
                    saving.concepto,
                    saving.descripcion,
                    parseFloat(saving.ahorrado).toFixed(2).replace('.', ','), // Convertir a número con 2 decimales y reemplazar el punto por una coma
                    saving.fecha_objetivo ? formatDate(saving.fecha_objetivo) : '',
                    saving.periodicidad,
                    parseFloat(saving.importe_periodico).toFixed(2).replace('.', ',')
                ];
                if (movimientos[saving.id] && movimientos[saving.id].length > 0) {
                    return movimientos[saving.id].map((mov) => [...savingData, formatDate(mov.fecha), mov.tipo, parseFloat(mov.importe).toFixed(2).replace('.', ','), mov.descripcion]);
                } else {
                    return [savingData];
                }
            })
        ]
            .map((e) => e.map((field) => `${field}`).join(';'))
            .join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    exportData(savings.value, movimientos.value, 'savings.csv', formatDate);
};

onMounted(async () => {
    await fetchSavings();
    await fetchPeriodicidades(); // Llamar a fetchPeriodicidades para cargar las opciones de periodicidad
    await fetchAllMovimientos(); // Precargar todos los movimientos
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
                    <Button :label="isExpanded ? 'Contraer todo' : 'Expandir todo'" :icon="isExpanded ? 'pi pi-chevron-right' : 'pi pi-chevron-down'" severity="secondary" class="mr-2" @click="toggleExpandCollapseAll" />
                    <Button :label="showInactive ? 'Ocultar inactivos' : 'Mostrar inactivos'" :icon="showInactive ? 'pi pi-eye-slash' : 'pi pi-eye'" severity="secondary" class="mr-2" @click="toggleShowInactive" :disabled="!hasInactiveSavings" />
                </template>
                <template #end>
                    <Button label="Exportar" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <div class="font-semibold text-xl mb-4">Ahorros <small class="text-gray-500">(partidas de dinero que se guardan para un fin concreto)</small></div>
            <DataTable
                ref="dt_ahorros"
                v-model:selection="selectedSavings"
                :value="savings"
                dataKey="id"
                responsiveLayout="scroll"
                selectionMode="multiple"
                sortMode="multiple"
                removableSort
                stripedRows
                v-model:expandedRows="expandedRows"
                @row-expand="onRowExpand"
                @row-collapse="onRowCollapse"
            >
                <template #empty>
                    <div class="text-center p-4">No hay ahorros a mostrar.</div>
                </template>
                <Column expander style="width: 5rem" />
                <Column field="concepto" header="Concepto" sortable style="min-width: 4rem"> </Column>
                <Column field="descripcion" header="Descripción" sortable style="min-width: 12rem"> </Column>
                <Column field="ahorrado" header="Ahorrado" sortable style="min-width: 4rem">
                    <template #body="savingsSlotProps">
                        <span :class="{ 'text-green-500': savingsSlotProps.data.ahorrado >= 0, 'text-red-500': savingsSlotProps.data.ahorrado < 0 }">
                            {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(savingsSlotProps.data.ahorrado) }}
                        </span>
                    </template>
                </Column>
                <Column field="fecha_objetivo" header="Fecha Objetivo" sortable style="min-width: 8rem">
                    <template #body="savingsSlotProps">
                        {{ savingsSlotProps.data.fecha_objetivo ? $formatDate(savingsSlotProps.data.fecha_objetivo) : '' }}
                    </template>
                </Column>
                <Column field="periodicidad" header="Periodicidad" sortable style="min-width: 4rem">
                    <template #body="savingsSlotProps">
                        {{ savingsSlotProps.data.periodicidad ? capitalizeFirstLetter(savingsSlotProps.data.periodicidad) : '' }}
                    </template>
                </Column>
                <Column field="importe_periodico" header="Importe Periódico" sortable style="min-width: 4rem">
                    <template #body="savingsSlotProps">
                        {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(savingsSlotProps.data.importe_periodico) }}
                    </template>
                </Column>
                <Column :exportable="false">
                    <template #body="savingsSlotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editSaving(savingsSlotProps.data)" />
                        <Button icon="pi pi-plus" outlined rounded class="mr-2" @click="openNewMovimiento(savingsSlotProps.data.id)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteSaving(savingsSlotProps.data)" />
                    </template>
                </Column>
                <template #expansion="savingsSlotProps">
                    <div class="p-4">
                        <h5>Movimientos del ahorro {{ savingsSlotProps.data.concepto }}</h5>
                        <DataTable :value="movimientos[savingsSlotProps.data.id]" sortField="fecha" :sortOrder="1" removableSort>
                            <Column field="fecha" header="Fecha" sortable style="min-width: 8rem">
                                <template #body="movimientoSlotProps">
                                    {{ $formatDate(movimientoSlotProps.data.fecha) }}
                                </template>
                            </Column>
                            <Column field="tipo" header="Tipo" sortable style="min-width: 4rem"></Column>
                            <Column field="importe" header="Importe" sortable style="min-width: 4rem">
                                <template #body="movimientoSlotProps">
                                    <span :class="{ 'text-green-500': movimientoSlotProps.data.importe >= 0, 'text-red-500': movimientoSlotProps.data.importe < 0 }">
                                        {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(movimientoSlotProps.data.importe) }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="descripcion" header="Descripción" sortable style="min-width: 12rem"></Column>
                            <Column :exportable="false" style="min-width: 12rem">
                                <template #body="movimientoSlotProps">
                                    <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editMovimiento(movimientoSlotProps.data)" />
                                    <Button icon="pi pi-trash" outlined rounded severity="danger" @click="deleteMovimiento(movimientoSlotProps.data)" />
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </template>
            </DataTable>
        </div>
    </div>

    <Dialog v-model:visible="savingMovimientoDialog" :style="{ width: '450px' }" header="Detalle del movimiento" :modal="true">
        <div class="flex flex-col gap-6">
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-3">
                    <label for="importe" class="block font-bold mb-3">Importe</label>
                    <InputNumber id="importe" ref="importe" v-model="movimiento.importe" mode="currency" currency="EUR" locale="es-ES" autofocus fluid />
                </div>
                <div class="col-span-5">
                    <label for="fecha" class="block font-bold mb-3">Fecha</label>
                    <DatePicker id="fecha" v-model="movimiento.fecha" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar fluid />
                </div>
                <div class="col-span-4">
                    <label for="tipo" class="block font-bold mb-3">Tipo</label>
                    <Select
                        id="tipo"
                        v-model="movimiento.tipo"
                        :options="[
                            { label: 'Regular', value: 'regular' },
                            { label: 'Extraordinario', value: 'extraordinario' }
                        ]"
                        optionValue="value"
                        optionLabel="label"
                        fluid
                    />
                </div>
            </div>
            <div>
                <label for="descripcion" class="block font-bold mb-3">Descripción</label>
                <Textarea id="descripcion" v-model="movimiento.descripcion" rows="3" cols="20" :maxlength="255" fluid />
            </div>
        </div>

        <template #footer>
            <Button label="Cancel" icon="pi pi-times" text @click="savingMovimientoDialog = false" />
            <Button label="Save" icon="pi pi-check" @click="saveMovimiento" :disabled="!isMovimientoFormValid" />
        </template>
    </Dialog>

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
                    <label for="fecha_objetivo" class="block font-bold mb-3">Fecha objetivo</label>
                    <DatePicker id="fecha_objetivo" v-model="saving.fecha_objetivo" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar fluid />
                </div>
            </div>
            <div class="flex gap-6">
                <div class="flex-1">
                    <label for="periodicidad" class="block font-bold mb-3">Periodicidad</label>
                    <Select id="periodicidad" v-model="saving.periodicidad" :options="periodicidades" optionValue="value" optionLabel="label" fluid />
                </div>
                <div class="flex-1">
                    <label for="importe_periodico" class="block font-bold mb-3">Importe periódico</label>
                    <InputNumber id="importe_periodico" v-model="saving.importe_periodico" mode="currency" currency="EUR" locale="es-ES" fluid />
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

<style scoped>
.expander-green {
    background-color: green !important;
}
</style>
