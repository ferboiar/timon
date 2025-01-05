<script setup>
import { BillService } from '@/service/BillService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const annualBills = ref([]);
const bill = ref({}); // UN recibo
const comment = ref(null);
const billDialog = ref(false);

const estados = ref([
    { label: 'Cargado', value: 'cargado' },
    { label: 'Pendiente', value: 'nocargado' }
]);

const categorias = ref([
    { label: 'Ahorros', value: 'ahorros' },
    { label: 'Comida', value: 'comida' },
    { label: 'Educación', value: 'educacion' },
    { label: 'Entretenimiento', value: 'entretenimiento' },
    { label: 'Seguros', value: 'seguros' },
    { label: 'Servicios', value: 'servicios' },
    { label: 'Transporte', value: 'transporte' },
    { label: 'Vivienda', value: 'vivienda' },
    { label: 'Otros gastos', value: 'otros' }
]);

const periodicidad = ref([
    { label: 'Anual', value: 'anual' },
    { label: 'Trimestral', value: 'trimestral' },
    { label: 'Bimestral', value: 'bimestral' },
    { label: 'Mensual', value: 'mensual' }
]);

onMounted(async () => {
    try {
        const response = await BillService.getBillsByPeriodicity('anual');
        console.log('onMounted. BillService. Recibos anuales:', response);
        annualBills.value = response;
    } catch (error) {
        console.error('onMounted. BillService. Error al cargar los recibos anuales:', error);
    }
});

const items = ref([
    {
        label: 'Save',
        icon: 'pi pi-check'
    },
    {
        label: 'Update',
        icon: 'pi pi-upload'
    },
    {
        label: 'Delete',
        icon: 'pi pi-trash'
    },
    {
        label: 'Home Page',
        icon: 'pi pi-home'
    }
]);

// >>>> Menú de la tarjeta
const cardMenu = ref([
    { label: 'Add', icon: 'pi pi-fw pi-plus' },
    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
    { label: 'Export', icon: 'pi pi-fw pi-upload' }
]);

const menuRef = ref(null);

function toggleCardMenu(event, periodicity) {
    menuRef.value.toggle(event);
    const updateItem = cardMenu.value.find(item => item.label === 'Update');
    if (updateItem) {
        updateItem.command = () => updateBills(periodicity);
    }
}
// <<<<

function toggleComment(event) {
    comment.value.toggle(event);
}

// crud.vue:
const toast = useToast();
const dt_anual = ref();
const dt_trimestral = ref();
const dt_bimestral = ref();
const dt_mensual = ref();
const products = ref();

const deleteProductDialog = ref(false);
const deleteProductsDialog = ref(false);

const selectedAnualBills = ref();
const selectedQuarterlyBills = ref();
const selectedBimonthlyBills = ref();
const selectedMonthlyBills = ref();

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

function openNew() {
    bill.value = {};
    submitted.value = false;
    billDialog.value = true;
}

function hideDialog() {
    billDialog.value = false;
    submitted.value = false;
}

function saveProduct() {
    submitted.value = true;

    if (bill?.value.name?.trim()) {
        if (bill.value.id) {
            bill.value.inventoryStatus = bill.value.inventoryStatus.value ? bill.value.inventoryStatus.value : bill.value.inventoryStatus;
            products.value[findIndexById(bill.value.id)] = bill.value;
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Recibo actualizado', life: 3000 });
        } else {
            bill.value.id = createId();
            bill.value.code = createId();
            bill.value.image = 'product-placeholder.svg';
            bill.value.inventoryStatus = bill.value.inventoryStatus ? bill.value.inventoryStatus.value : 'INSTOCK';
            products.value.push(bill.value);
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Product Created', life: 3000 });
        }

        billDialog.value = false;
        bill.value = {};
    }
}

function editBill(prod) {
    bill.value = { ...prod };
    billDialog.value = true;
}

function confirmDeleteProduct(prod) {
    bill.value = prod;
    deleteProductDialog.value = true;
}

function deleteProduct() {
    products.value = products.value.filter((val) => val.id !== bill.value.id);
    deleteProductDialog.value = false;
    bill.value = {};
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Product Deleted', life: 3000 });
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < products.value.length; i++) {
        if (products.value[i].id === id) {
            index = i;
            break;
        }
    }

    return index;
}

function createId() {
    let id = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

//modificar esta función más adelante para que me permita exportar los recibos de todas las
//periodicidades en un único fichero CSV
function exportCSV() {
    dt_anual.value.exportCSV();
}

function confirmDeleteSelected() {
    deleteProductsDialog.value = true;
}

function deleteSelectedProducts() {
    products.value = products.value.filter((val) => !selectedAnualBills.value.includes(val));
    deleteProductsDialog.value = false;
    selectedAnualBills.value = null;
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Products Deleted', life: 3000 });
}

function updateBills(periodicity) {
    BillService.getBillsByPeriodicity(periodicity)
        .then((response) => {
            if (periodicity === 'anual') {
                annualBills.value = response;
            } else if (periodicity === 'trimestral') {
                // Actualizar los datos de la tabla trimestral
                // dt_trimestral.value = response;
            } else if (periodicity === 'bimestral') {
                // Actualizar los datos de la tabla bimestral
                // dt_bimestral.value = response;
            } else if (periodicity === 'mensual') {
                // Actualizar los datos de la tabla mensual
                // dt_mensual.value = response;
            }
        })
        .catch((error) => {
            console.error(`Error al actualizar la lista de recibos ${periodicity}:`, error);
        });
}
</script>

<template>
    <div class="flex flex-col">
        <div class="card">
            <div class="font-semibold text-xl mb-4">Toolbar</div>
            <Toolbar>
                <template #start>
                    <Button icon="pi pi-plus" class="mr-2" severity="secondary" text />
                    <Button icon="pi pi-print" class="mr-2" severity="secondary" text />
                    <Button icon="pi pi-upload" severity="secondary" text />
                </template>

                <template #center>
                    <IconField>
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText placeholder="Search" />
                    </IconField>
                </template>

                <template #end> <SplitButton label="Save" :model="items"></SplitButton></template>
            </Toolbar>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedAnualBills || !selectedAnualBills.length" />
                </template>

                <template #end>
                    <Button label="Export" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>
        </div>

        <div class="flex flex-col md:flex-row gap-8">
            <div class="md:w-1/2">
                <div class="card">
                    <div class="flex items-center justify-between mb-0">
                        <div class="font-semibold text-xl mb-4">Anuales</div>
                        <div class="flex flex-wrap gap-2 items-center justify-between">
                            <IconField>
                                <InputIcon>
                                    <i class="pi pi-search" />
                                </InputIcon>
                                <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                            </IconField>
                            <Button icon="pi pi-ellipsis-v" class="p-button-text" @click="(event) => toggleCardMenu(event, 'anual')" />
                            <Menu id="config_menu" ref="menuRef" :model="cardMenu" :popup="true" />
                        </div>
                    </div>
                    <DataTable
                        ref="dt_anual"
                        v-model:selection="selectedAnualBills"
                        :value="annualBills"
                        dataKey="id"
                        :paginator="true"
                        :rows="10"
                        :filters="filters"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        :rowsPerPageOptions="[5, 10, 15, 20]"
                        currentPageReportTemplate="Mostrando {first} de {last} de {totalRecords} recibos"
                    >
                        <!-- Columna que añade un checkbox para seleccionar los recibos 
                        <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
-->
                        <Column field="concepto" header="Concepto" sortable style="min-width: 10rem"></Column>
                        <Column field="importe" header="Importe" sortable style="min-width: 3rem">
                            <template #body="slotProps">
                                {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(slotProps.data.importe) }}
                            </template>
                        </Column>
                        <Column field="fecha" header="Fecha" sortable style="min-width: 8rem">
                            <template #body="slotProps">
                                {{ $formatDate(slotProps.data.fecha) }}
                            </template>
                        </Column>
                        <Column field="estado" header="Estado" sortable style="min-width: 2rem">
                            <template #body="slotProps">
                                <i
                                    :class="slotProps.data.estado === 'cargado' ? 'pi pi-fw pi-check-circle text-green-500' : slotProps.data.estado === 'nocargado' ? 'pi pi-fw pi-times-circle text-red-500' : ''"
                                    v-tooltip="slotProps.data.estado === 'cargado' ? 'Cargado' : slotProps.data.estado === 'nocargado' ? 'Pendiente' : ''"
                                />
                            </template>
                        </Column>
                        <Column field="comentario" header="Comentario" sortable style="min-width: 2rem">
                            <template #body="slotProps">
                                <template v-if="slotProps.data.comentario">
                                    <Button icon="pi pi-fw pi-plus" class="p-button-text" @click="toggleComment($event)" v-tooltip="slotProps.data.comentario" />
                                    <Popover ref="comment" id="overlay_panel" style="width: 450px">
                                        <p>{{ slotProps.data.comentario }}</p>
                                    </Popover>
                                </template>
                            </template>
                        </Column>
                        <Column :exportable="false" style="min-width: 12rem">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editBill(slotProps.data)" />
                                <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteProduct(slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </div>
                <div class="card">
                    <div class="flex items-center justify-between mb-0">
                        <div class="font-semibold text-xl mb-4">Trimestrales</div>
                        <Button icon="pi pi-plus" class="p-button-text" @click="toggleCardMenu" />
                    </div>
                    <Menu id="config_menu" ref="menuRef" :model="cardMenu" :popup="true" />
                    <p class="leading-normal m-0">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                        consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </p>
                </div>
            </div>
            <div class="md:w-1/2 mt-6 md:mt-0">
                <div class="card">
                    <div class="flex items-center justify-between mb-0">
                        <div class="font-semibold text-xl mb-4">Bimestrales</div>
                        <Button icon="pi pi-plus" class="p-button-text" @click="toggleCardMenu" />
                    </div>
                    <Menu id="config_menu" ref="menuRef" :model="cardMenu" :popup="true" />
                    <p class="leading-normal m-0">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                        consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </p>
                </div>
                <div class="card">
                    <div class="flex items-center justify-between mb-0">
                        <div class="font-semibold text-xl mb-4">Mensuales</div>
                        <Button icon="pi pi-plus" class="p-button-text" @click="toggleCardMenu" />
                    </div>
                    <Menu id="config_menu" ref="menuRef" :model="cardMenu" :popup="true" />
                    <p class="leading-normal m-0">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                        consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </p>
                </div>
            </div>
        </div>

        <Dialog v-model:visible="billDialog" :style="{ width: '450px' }" header="Detalle del recibo" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="concepto" class="block font-bold mb-3">Concepto</label>
                    <InputText id="concepto" v-model.trim="bill.concepto" required="true" autofocus :invalid="submitted && !bill.concepto" fluid />
                    <small v-if="submitted && !bill.concepto" class="text-red-500">El concepto es obligatorio.</small>
                </div>
                <div>
                    <label for="comentario" class="block font-bold mb-3">Comentario</label>
                    <Textarea id="comentario" v-model="bill.comentario" required="true" rows="3" cols="20" fluid />
                </div>
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-6">
                        <label for="estado" class="block font-bold mb-3">Estado</label>
                        <Select id="estado" v-model="bill.estado" :options="estados" optionValue="value" optionLabel="label" placeholder="Selecciona el estado" fluid />
                    </div>
                    <div class="col-span-6">
                        <label for="categoria" class="block font-bold mb-3">Categoría</label>
                        <Select id="categoria" v-model="bill.categoria" :options="categorias" optionValue="value" optionLabel="label" placeholder="Selecciona la categoría" fluid />
                    </div>
                </div>
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-3">
                        <label for="importe" class="block font-bold mb-3">Importe</label>
                        <InputNumber id="importe" v-model="bill.importe" mode="currency" currency="EUR" locale="es-ES" fluid />
                    </div>
                    <div class="col-span-5">
                        <label for="fecha" class="block font-bold mb-3">Fecha</label>
                        <Calendar id="fecha" v-model="bill.fecha" dateFormat="dd/mm/yy" showIcon showButtonBar />
                    </div>
                    <div class="col-span-4">
                        <label for="periodicidad" class="block font-bold mb-3">Periodicidad</label>
                        <Select id="periodicidad" v-model="bill.periodicidad" :options="periodicidad" optionValue="value" optionLabel="label" placeholder="Selecciona" fluid />
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="saveProduct" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProductDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="bill"
                    >¿Seguro que quieres borrar el recibo <b>{{ bill.name }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteProductDialog = false" />
                <Button label="Yes" icon="pi pi-check" @click="deleteProduct" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProductsDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="bill">¿Seguro que quieres borrar los recibos seleccionados?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteProductsDialog = false" />
                <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedProducts" />
            </template>
        </Dialog>
    </div>
</template>
