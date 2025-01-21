<script setup>
import { BillService } from '@/service/BillService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

const annualBills = ref([]);
const quarterlyBills = ref([]);
const bimonthlyBills = ref([]);
const monthlyBills = ref([]);
const bill = ref({
    id: null, // Añadir el parámetro id
    concepto: '',
    categoria: '',
    importe: 0,
    periodicidad: '',
    cargo: [
        { id: null, fecha: null, estado: 'pendiente', comentario: '' }, // Primer cargo
        { id: null, fecha: null, estado: 'pendiente', comentario: '' }, // Segundo cargo
        { id: null, fecha: null, estado: 'pendiente', comentario: '' }, // Tercer cargo
        { id: null, fecha: null, estado: 'pendiente', comentario: '' }, // Cuarto cargo
        { id: null, fecha: null, estado: 'pendiente', comentario: '' }, // Quinto cargo
        { id: null, fecha: null, estado: 'pendiente', comentario: '' } // Sexto cargo
    ]
});

const billDialog = ref(false);
const billDialogTB = ref(false);
const billDialogTB_FC = ref(false);

const expandedRows = ref([]); // Filas expandidas en la tabla trimestral

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
        [annualBills.value, quarterlyBills.value, bimonthlyBills.value, monthlyBills.value] = await Promise.all([
            BillService.getBillsByPeriodicity('anual'),
            BillService.getBillsByPeriodicity('trimestral'),
            BillService.getBillsByPeriodicity('bimestral'),
            BillService.getBillsByPeriodicity('mensual')
        ]);

        console.log('onMounted. BillService. Recibos anuales:', annualBills.value);
        console.log('onMounted. BillService. Recibos trimestrales:', quarterlyBills.value);
        console.log('onMounted. BillService. Recibos bimestrales:', bimonthlyBills.value);
        console.log('onMounted. BillService. Recibos mensuales:', monthlyBills.value);
    } catch (error) {
        console.error('onMounted. BillService. Error al cargar los recibos:', error);
    }
});

const items = ref([
    { label: 'Save', icon: 'pi pi-check' },
    { label: 'Update', icon: 'pi pi-upload' },
    { label: 'Delete', icon: 'pi pi-trash' },
    { label: 'Home Page', icon: 'pi pi-home' }
]);

// >>>> Menú de la tarjeta
const cardMenu = ref([]);
const menuRef = ref(null);

function toggleCardMenu(event, periodicity) {
    cardMenu.value = [
        { label: 'Añadir', icon: 'pi pi-fw pi-plus', command: () => openNew(periodicity) },
        { label: 'Actualizar', icon: 'pi pi-fw pi-refresh', command: () => updateBills(periodicity) },
        { label: 'Multiselección', icon: 'pi pi-fw pi-check-square', command: () => showSelector() },
        { label: 'Exportar', icon: 'pi pi-fw pi-upload' }
    ];

    if (periodicity === 'trimestral' || periodicity === 'bimestral') {
        cardMenu.value.push(
            // eslint-disable-next-line prettier/prettier
            { separator: true },
            { label: 'Expandir todo', icon: 'pi pi-fw pi-chevron-down', command: () => expandirTodo() },
            { label: 'Contraer todo', icon: 'pi pi-fw pi-chevron-right', command: () => contraerTodo() }
        );
    }
    menuRef.value.toggle(event);
}

function expandirTodo() {
    if (dt_trimestral.value) {
        expandedRows.value = groupedQuarterlyBills.value.reduce((acc, p) => (acc[p.id] = true) && acc, {});
    } else if (dt_bimestral.value) {
        expandedRows.value = groupedBimonthlyBills.value.reduce((acc, p) => (acc[p.id] = true) && acc, {});
    }
}

function contraerTodo() {
    expandedRows.value = [];
}

function updateBills(periodicity) {
    BillService.getBillsByPeriodicity(periodicity)
        .then((response) => {
            if (periodicity === 'anual') {
                annualBills.value = response;
            } else if (periodicity === 'trimestral') {
                // Actualizar los datos de la tabla trimestral
                quarterlyBills.value = response;
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
// <<<<

// >>>> Gestiona el "bocadillo" (popover) que muestra el comentario del recibo
const activeComment = ref(null);
const activeCommentIndex = ref(null);
const commentPopover = ref(null);
const editCommentPopover = ref(null);

function toggleComment(event, specificComment, index, popoverType = 'comment') {
    activeComment.value = specificComment;
    activeCommentIndex.value = index;
    if (popoverType == 'comment' && commentPopover.value) {
        commentPopover.value.toggle(event);
    } else if (popoverType == 'editComment' && editCommentPopover.value) {
        editCommentPopover.value.toggle(event);
    }
}
function saveComment() {
    bill.value.cargo[activeCommentIndex.value].comentario = activeComment.value;
    editCommentPopover.value.hide();
}

function hideComment() {
    commentPopover.value.hide();
    editCommentPopover.value.hide();
}
// <<<<

// crud.vue:
const toast = useToast();
const dt_anual = ref();
const dt_trimestral = ref();
const dt_bimestral = ref();
const dt_mensual = ref();
const products = ref();

const deleteBillDialog = ref(false);
const deleteBillDialogTB = ref(false);
const deleteProductsDialog = ref(false);

const selectedAnualBills = ref();
const selectedQuarterlyBills = ref();
const selectedBimonthlyBills = ref();
const selectedMonthlyBills = ref();

const filtersAnual = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const filtersTrimestral = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const submitted = ref(false);

function openNew(periodicity) {
    bill.value = {
        id: null, // Inicializar id a null
        concepto: '',
        categoria: '',
        importe: 0,
        periodicidad: periodicity,
        cargo: [
            { id: null, fecha: null, estado: 'pendiente', comentario: '' },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' }
        ]
    };
    submitted.value = false;
    billDialog.value = true;
}

function hideDialog() {
    billDialog.value = false;
    billDialogTB.value = false;
    billDialogTB_FC.value = false;
    submitted.value = false;
}

async function guardarRecibo() {
    submitted.value = true;

    // Asegurarse de que todos los campos de la estructura bill estén definidos
    bill.value = {
        id: bill.value.id || null,
        concepto: bill.value.concepto || '',
        periodicidad: bill.value.periodicidad || '',
        importe: parseFloat(bill.value.importe) || 0, // Asegura que importe sea número y no string
        categoria: bill.value.categoria || '',
        cargo: bill.value.cargo.map((c) => ({
            id: c.id ?? null,
            fecha: c.fecha ? new Date(c.fecha) : null,
            estado: c.estado ?? 'pendiente',
            comentario: c.comentario ?? ''
        }))
    };

    // Ajustar la zona horaria si hay fecha
    if (bill.value.cargo[0].fecha) {
        const fechaLocal = new Date(bill.value.cargo[0].fecha.getTime() - bill.value.cargo[0].fecha.getTimezoneOffset() * 60000);
        bill.value.cargo[0].fecha = fechaLocal;
    }

    console.log('guardarRecibo(). Recibo a guardar:', bill.value);

    if (bill.value.concepto.trim() && Array.isArray(bill.value.cargo)) {
        try {
            await BillService.saveBill(bill.value);
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Recibo guardado!', life: 5000 });

            // Actualizar la lista de recibos según la periodicidad
            updateBills(bill.value.periodicidad);

            billDialog.value = false;
            billDialogTB.value = false;
            billDialogTB_FC.value = false;
            bill.value = {
                id: null, // Reiniciar id a null
                concepto: '',
                categoria: '',
                importe: 0,
                periodicidad: '',
                cargo: bill.value.cargo.map(() => ({
                    id: null,
                    fecha: null,
                    estado: 'pendiente',
                    comentario: ''
                }))
            };
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar el recibo: ${error.message}`, life: 5000 });
            console.error('guardarRecibo(). Error al guardar el recibo: ', error.response?.data || error.message);
        }
    } else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Todos los campos son obligatorios y cargo debe ser un array con id, fecha, estado y comentario.', life: 5000 });
    }
}

function editBill(prod, openFCDialog = false) {
    // Precargar los datos existentes de prod en bill.value
    bill.value = {
        id: prod.id, // Capturar la id proveniente de la base de datos
        concepto: prod.concepto,
        categoria: prod.categoria,
        importe: prod.importe,
        periodicidad: prod.periodicidad,
        cargo: [
            {
                id: prod.fc_id || null,
                fecha: prod.fecha || null,
                estado: prod.estado || '',
                comentario: prod.comentario || ''
            },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' },
            { id: null, fecha: null, estado: 'pendiente', comentario: '' }
        ]
    };

    // Asegurarse de que siempre haya 6 cargos sin sobrescribir los existentes
    while (bill.value.cargo.length < 6) {
        bill.value.cargo.push({ id: null, fecha: null, estado: 'pendiente', comentario: '' });
    }

    console.log('Recibo a editar: ', bill.value);

    if (openFCDialog) {
        billDialogTB_FC.value = true;
    } else if (bill.value.periodicidad === 'anual' || bill.value.periodicidad === 'mensual') {
        billDialog.value = true;
    } else {
        billDialogTB.value = true;
    }
}

function confirmDeleteBill(prod) {
    // Renombrar confirmDeleteProduct a confirmDeleteBill
    bill.value = prod;
    deleteBillDialog.value = true;
}

async function deleteBill() {
    try {
        const periodicidad = bill.value.periodicidad;
        await BillService.deleteBill(bill.value.id, bill.value.fecha, bill.value.periodicidad);
        updateBills(periodicidad);
        deleteBillDialog.value = false;
        bill.value = {};
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Recibo eliminado', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar el recibo: ${error.message}`, life: 5000 });
        console.error('deleteBill(). Error al eliminar el recibo: ', error.response?.data || error.message);
    }
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

const showFields = ref({
    commentBox: false,
    estadoCheck: false,
    fechaCargo: false,
    fechaCargo2: false,
    fechaCargo3: false,
    fechaCargo4: false,
    fechaCargo5: false,
    fechaCargo6: false
});

watch(
    // Watch for changes in bill.value.periodicidad
    () => bill.value.periodicidad,
    (newVal) => {
        if (newVal === 'anual') {
            showFields.value = { commentBox: true, fechaCargo: true, fechaCargo2: false, fechaCargo3: false, fechaCargo4: false, fechaCargo5: false, fechaCargo6: false };
        } else if (newVal === 'bimestral') {
            showFields.value = { commentBox: false, fechaCargo: true, fechaCargo2: true, fechaCargo3: true, fechaCargo4: true, fechaCargo5: true, fechaCargo6: true };
        } else if (newVal === 'trimestral') {
            showFields.value = { commentBox: false, fechaCargo: true, fechaCargo2: true, fechaCargo3: true, fechaCargo4: true, fechaCargo5: false, fechaCargo6: false };
        } else if (newVal === 'mensual' || !newVal) {
            showFields.value = { commentBox: true, estadoCheck: true, fechaCargo: false, fechaCargo2: false, fechaCargo3: false, fechaCargo4: false, fechaCargo5: false, fechaCargo6: false };
        }
    },
    { immediate: true }
);

const groupedQuarterlyBills = computed(() => {
    const grouped = {};
    quarterlyBills.value.forEach((bill) => {
        if (!grouped[bill.concepto]) {
            grouped[bill.concepto] = { id: bill.id, concepto: bill.concepto, importe: bill.importe, categoria: bill.categoria, periodicidad: bill.periodicidad, bills: [] };
        }
        grouped[bill.concepto].bills.push(bill);
    });
    return Object.values(grouped);
});
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
                                <InputText v-model="filtersAnual['global'].value" placeholder="Buscar..." />
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
                        :filters="filtersAnual"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        :rowsPerPageOptions="[5, 10, 15, 20]"
                        currentPageReportTemplate="Mostrando {first} de {last} de {totalRecords} recibos"
                    >
                        <!-- Columna que añade un checkbox para seleccionar los recibos 
                        <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
-->
                        <Column field="concepto" header="Concepto" sortable style="min-width: 10rem"></Column>
                        <Column field="importe" header="Importe" sortable style="min-width: 3rem">
                            <template #body="anualSlotProps">
                                {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(anualSlotProps.data.importe) }}
                            </template>
                        </Column>
                        <Column field="fecha" header="Fecha" sortable style="min-width: 8rem">
                            <template #body="anualSlotProps">
                                {{ $formatDate(anualSlotProps.data.fecha) }}
                            </template>
                        </Column>
                        <Column field="estado" header="Estado" sortable style="min-width: 2rem">
                            <template #body="anualSlotProps">
                                <i
                                    :class="anualSlotProps.data.estado === 'cargado' ? 'pi pi-fw pi-check-circle text-green-500' : anualSlotProps.data.estado === 'pendiente' ? 'pi pi-fw pi-times-circle text-red-500' : ''"
                                    v-tooltip="anualSlotProps.data.estado === 'cargado' ? 'Cargado' : anualSlotProps.data.estado === 'pendiente' ? 'Pendiente' : ''"
                                />
                            </template>
                        </Column>
                        <Column field="comentario" header="Comentario" sortable style="min-width: 2rem">
                            <template #body="anualSlotProps">
                                <template v-if="anualSlotProps.data.comentario">
                                    <Button icon="pi pi-fw pi-plus" class="p-button-text" @click="(event) => toggleComment(event, anualSlotProps.data.comentario, 'comment')" v-tooltip="anualSlotProps.data.comentario" />
                                </template>
                            </template>
                        </Column>
                        <Column :exportable="false" style="min-width: 12rem">
                            <template #body="anualSlotProps">
                                <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editBill(anualSlotProps.data)" />
                                <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteBill(anualSlotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </div>
                <div class="card">
                    <div class="flex items-center justify-between mb-0">
                        <div class="font-semibold text-xl mb-4">Trimestrales</div>
                        <div class="flex flex-wrap gap-2 items-center justify-between">
                            <IconField>
                                <InputIcon>
                                    <i class="pi pi-search" />
                                </InputIcon>
                                <InputText v-model="filtersTrimestral['global'].value" placeholder="Buscar..." />
                            </IconField>
                            <Button icon="pi pi-ellipsis-v" class="p-button-text" @click="(event) => toggleCardMenu(event, 'trimestral')" />
                            <Menu id="config_menu" ref="menuRef" :model="cardMenu" :popup="true" />
                        </div>
                    </div>
                    <DataTable
                        ref="dt_trimestral"
                        v-model:expandedRows="expandedRows"
                        :value="groupedQuarterlyBills"
                        dataKey="id"
                        :paginator="true"
                        :rows="10"
                        :filters="filtersTrimestral"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        :rowsPerPageOptions="[5, 10, 15, 20]"
                        currentPageReportTemplate="Mostrando {first} de {last} de {totalRecords} recibos"
                        rowGroupMode="subheader"
                        groupField="concepto"
                    >
                        <Column expander style="width: 5rem" />
                        <Column field="concepto" header="Concepto" sortable style="min-width: 10rem"></Column>
                        <Column field="importe" header="Importe" sortable style="min-width: 3rem">
                            <template #body="trimestralSlotProps">
                                {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(trimestralSlotProps.data.importe) }}
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 12rem">
                            <template #body="trimestralSlotProps">
                                <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editBill(trimestralSlotProps.data)" />
                                <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteBill(trimestralSlotProps.data)" />
                            </template>
                        </Column>

                        <template #expansion="trimestralSlotProps">
                            <DataTable :value="trimestralSlotProps.data.bills">
                                <Column field="fecha" header="Fecha" sortable style="min-width: 8rem">
                                    <template #body="trimestralSlotProps">
                                        {{ $formatDate(trimestralSlotProps.data.fecha) }}
                                    </template>
                                </Column>
                                <Column field="estado" header="Estado" sortable style="min-width: 2rem">
                                    <template #body="trimestralSlotProps">
                                        <i
                                            :class="trimestralSlotProps.data.estado === 'cargado' ? 'pi pi-fw pi-check-circle text-green-500' : trimestralSlotProps.data.estado === 'pendiente' ? 'pi pi-fw pi-times-circle text-red-500' : ''"
                                            v-tooltip="trimestralSlotProps.data.estado === 'cargado' ? 'Cargado' : trimestralSlotProps.data.estado === 'pendiente' ? 'Pendiente' : ''"
                                        />
                                    </template>
                                </Column>
                                <Column field="comentario" header="Comentario" sortable style="min-width: 2rem">
                                    <template #body="trimestralSlotProps">
                                        <template v-if="trimestralSlotProps.data.comentario">
                                            <Button icon="pi pi-fw pi-plus" class="p-button-text" @click="(event) => toggleComment(event, trimestralSlotProps.data.comentario, 'comment')" v-tooltip="trimestralSlotProps.data.comentario" />
                                        </template>
                                    </template>
                                </Column>
                                <Column :exportable="false" style="min-width: 12rem">
                                    <template #body="trimestralSlotProps">
                                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editBill(trimestralSlotProps.data, true)" />
                                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteBill(trimestralSlotProps.data)" />
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </DataTable>
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
                    <label for="concepto" class="block font-bold mb-3">Concepto (ID recibos: {{ bill.id }}, ID fechas_cargo: {{ bill.cargo[0].id }})</label>
                    <InputText id="concepto" v-model.trim="bill.concepto" required="true" autofocus :invalid="submitted && !bill.concepto" fluid />
                    <small v-if="submitted && !bill.concepto" class="text-red-500">El concepto es obligatorio.</small>
                </div>
                <div v-if="showFields.commentBox">
                    <label for="comentario" class="block font-bold mb-3">Comentario</label>
                    <Textarea id="comentario" v-model="bill.cargo[0].comentario" required="true" rows="3" cols="20" fluid />
                </div>
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-5">
                        <label for="categoria" class="block font-bold mb-3">Categoría</label>
                        <Select id="categoria" v-model="bill.categoria" :options="categorias" optionValue="value" optionLabel="label" fluid />
                    </div>
                    <div class="col-span-3">
                        <label for="importe" class="block font-bold mb-3">Importe</label>
                        <InputNumber id="importe" v-model="bill.importe" mode="currency" currency="EUR" locale="es-ES" fluid />
                    </div>
                    <div class="col-span-4">
                        <label for="periodicidad" class="block font-bold mb-3">Periodicidad</label>
                        <Select id="periodicidad" v-model="bill.periodicidad" :options="periodicidad" optionValue="value" optionLabel="label" fluid />
                    </div>
                </div>

                <div class="grid grid-cols-12 gap-2">
                    <div v-if="showFields.fechaCargo" class="col-span-4">
                        <label for="fecha" class="block font-bold mb-3 flex justify-between items-center relative">
                            <span>Fecha cargo</span>
                            <div class="flex items-center absolute right-2">
                                <div v-if="!showFields.commentBox">
                                    <Button icon="pi pi-comment" class="p-button-text" @click="(event) => toggleComment(event, bill.cargo[0].comentario, 0, 'editComment')" v-tooltip="bill.cargo[0].comentario" />
                                </div>
                                <Checkbox
                                    :modelValue="(bill.cargo[0].estado || 'pendiente') === 'cargado'"
                                    @update:modelValue="(value) => (bill.cargo[0].estado = value ? 'cargado' : 'pendiente')"
                                    v-tooltip="(bill.cargo[0].estado || 'pendiente') === 'cargado' ? 'Pagado' : 'Pendiente de pago'"
                                    :binary="true"
                                />
                            </div>
                        </label>
                        <DatePicker id="fecha" v-model="bill.cargo[0].fecha" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar />
                    </div>
                    <div v-if="showFields.estadoCheck" class="col-span-4">
                        <label for="estado" class="block font-bold mb-3"
                            >Estado&nbsp;&nbsp;&nbsp;&nbsp;
                            <Checkbox
                                :modelValue="(bill.cargo[0].estado || 'pendiente') === 'cargado'"
                                @update:modelValue="(value) => (bill.cargo[0].estado = value ? 'cargado' : 'pendiente')"
                                v-tooltip="(bill.cargo[0].estado || 'pendiente') === 'cargado' ? 'Pagado' : 'Pendiente de pago'"
                                :binary="true"
                        /></label>
                    </div>
                    <div v-if="showFields.fechaCargo2" class="col-span-4">
                        <label for="fecha2" class="block font-bold mb-3 flex justify-between items-center relative">
                            <span>2º cargo</span>
                            <div class="flex items-center absolute right-2">
                                <Button icon="pi pi-comment" class="p-button-text" @click="(event) => toggleComment(event, bill.cargo[1].comentario, 1, 'editComment')" v-tooltip="bill.cargo[1].comentario" />
                                <Checkbox
                                    :modelValue="(bill.cargo[1].estado || 'pendiente') === 'cargado'"
                                    @update:modelValue="(value) => (bill.cargo[1].estado = value ? 'cargado' : 'pendiente')"
                                    v-tooltip="(bill.cargo[1].estado || 'pendiente') === 'cargado' ? 'Pagado' : 'Pendiente de pago'"
                                    :binary="true"
                                />
                            </div>
                        </label>
                        <DatePicker id="fecha2" v-model="bill.cargo[1].fecha" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar />
                    </div>
                    <div v-if="showFields.fechaCargo3" class="col-span-4">
                        <label for="fecha3" class="block font-bold mb-3 flex justify-between items-center relative">
                            <span>3<sup>er</sup> cargo</span>
                            <div class="flex items-center absolute right-2">
                                <Button icon="pi pi-comment" class="p-button-text" @click="(event) => toggleComment(event, bill.cargo[2].comentario, 2, 'editComment')" v-tooltip="bill.cargo[2].comentario" />
                                <Checkbox
                                    :modelValue="(bill.cargo[2].estado || 'pendiente') === 'cargado'"
                                    @update:modelValue="(value) => (bill.cargo[2].estado = value ? 'cargado' : 'pendiente')"
                                    v-tooltip="(bill.cargo[2].estado || 'pendiente') === 'cargado' ? 'Pagado' : 'Pendiente de pago'"
                                    :binary="true"
                                />
                            </div>
                        </label>
                        <DatePicker id="fecha3" v-model="bill.cargo[2].fecha" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar />
                    </div>
                </div>

                <div class="grid grid-cols-12 gap-2">
                    <div v-if="showFields.fechaCargo4" class="col-span-4">
                        <label for="fecha4" class="block font-bold mb-3 flex justify-between items-center relative">
                            <span>4º cargo</span>
                            <div class="flex items-center absolute right-7">
                                <Button icon="pi pi-comment" class="p-button-text" @click="(event) => toggleComment(event, bill.cargo[3].comentario, 3, 'editComment')" v-tooltip="bill.cargo[3].comentario" />
                            </div>
                            <Checkbox
                                :modelValue="(bill.cargo[3].estado || 'pendiente') === 'cargado'"
                                @update:modelValue="(value) => (bill.cargo[3].estado = value ? 'cargado' : 'pendiente')"
                                v-tooltip="(bill.cargo[3].estado || 'pendiente') === 'cargado' ? 'Pagado' : 'Pendiente de pago'"
                                :binary="true"
                                class="absolute right-2"
                            />
                        </label>
                        <DatePicker id="fecha4" v-model="bill.cargo[3].fecha" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar />
                    </div>

                    <div v-if="showFields.fechaCargo5" class="col-span-4">
                        <label for="fecha5" class="block font-bold mb-3 flex justify-between items-center relative">
                            <span>5º cargo</span>
                            <div class="flex items-center absolute right-7">
                                <Button icon="pi pi-comment" class="p-button-text" @click="(event) => toggleComment(event, bill.cargo[4].comentario, 4, 'editComment')" v-tooltip="bill.cargo[4].comentario" />
                            </div>
                            <Checkbox
                                :modelValue="(bill.cargo[4].estado || 'pendiente') === 'cargado'"
                                @update:modelValue="(value) => (bill.cargo[4].estado = value ? 'cargado' : 'pendiente')"
                                v-tooltip="(bill.cargo[4].estado || 'pendiente') === 'cargado' ? 'Pagado' : 'Pendiente de pago'"
                                :binary="true"
                                class="absolute right-2"
                            />
                        </label>
                        <DatePicker id="fecha5" v-model="bill.cargo[4].fecha" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar />
                    </div>

                    <div v-if="showFields.fechaCargo6" class="col-span-4">
                        <label for="fecha5" class="block font-bold mb-3 flex justify-between items-center relative">
                            <span>6º cargo</span>
                            <div class="flex items-center absolute right-7">
                                <Button icon="pi pi-comment" class="p-button-text" @click="(event) => toggleComment(event, bill.cargo[5].comentario, 5, 'editComment')" v-tooltip="bill.cargo[5].comentario" />
                            </div>
                            <Checkbox
                                :modelValue="(bill.cargo[5].estado || 'pendiente') === 'cargado'"
                                @update:modelValue="(value) => (bill.cargo[5].estado = value ? 'cargado' : 'pendiente')"
                                v-tooltip="(bill.cargo[5].estado || 'pendiente') === 'cargado' ? 'Pagado' : 'Pendiente de pago'"
                                :binary="true"
                                class="absolute right-2"
                            />
                        </label>
                        <DatePicker id="fecha6" v-model="bill.cargo[5].fecha" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar />
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="guardarRecibo" />
            </template>
        </Dialog>

        <Dialog v-model:visible="billDialogTB" :style="{ width: '450px' }" header="Detalle del recibo" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="concepto" class="block font-bold mb-3">Concepto (ID recibos: {{ bill.id }}, ID fechas_cargo: {{ bill.cargo[0].id }})</label>
                    <InputText id="concepto" v-model.trim="bill.concepto" required="true" autofocus :invalid="submitted && !bill.concepto" fluid />
                    <small v-if="submitted && !bill.concepto" class="text-red-500">El concepto es obligatorio.</small>
                </div>
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-5">
                        <label for="categoria" class="block font-bold mb-3">Categoría</label>
                        <Select id="categoria" v-model="bill.categoria" :options="categorias" optionValue="value" optionLabel="label" fluid />
                    </div>
                    <div class="col-span-3">
                        <label for="importe" class="block font-bold mb-3">Importe</label>
                        <InputNumber id="importe" v-model="bill.importe" mode="currency" currency="EUR" locale="es-ES" fluid />
                    </div>
                    <div class="col-span-4">
                        <label for="periodicidad" class="block font-bold mb-3">Periodicidad</label>
                        <Select id="periodicidad" v-model="bill.periodicidad" :options="periodicidad" optionValue="value" optionLabel="label" fluid />
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="guardarRecibo" />
            </template>
        </Dialog>

        <Dialog v-model:visible="billDialogTB_FC" :style="{ width: '450px' }" header="Detalle del recibo" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="comentario" class="block font-bold mb-3">Comentario (ID recibos: {{ bill.id }}, ID fechas_cargo: {{ bill.cargo[0].id }})</label>
                    <Textarea id="comentario" v-model="bill.cargo[0].comentario" required="true" autofocus rows="3" cols="20" fluid />
                </div>

                <div class="grid grid-cols-12 gap-2">
                    <div class="col-span-4">
                        <label for="fecha" class="block font-bold mb-3 flex justify-between items-center relative">
                            <span>Fecha cargo</span>
                            <Checkbox
                                :modelValue="(bill.cargo[0].estado || 'pendiente') === 'cargado'"
                                @update:modelValue="(value) => (bill.cargo[0].estado = value ? 'cargado' : 'pendiente')"
                                v-tooltip="(bill.cargo[0].estado || 'pendiente') === 'cargado' ? 'Pagado' : 'Pendiente de pago'"
                                :binary="true"
                                class="absolute right-2"
                            />
                        </label>
                        <DatePicker id="fecha" v-model="bill.cargo[0].fecha" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar />
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="guardarRecibo" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteBillDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="bill"
                    >¿Seguro que quieres borrar el recibo <b>{{ bill.name }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" autofocus text @click="deleteBillDialog = false" />
                <Button label="Yes" icon="pi pi-check" @click="deleteBill" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProductsDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="bill">¿Seguro que quieres borrar los recibos seleccionados?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" autofocus text @click="deleteProductsDialog = false" />
                <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedProducts" />
            </template>
        </Dialog>
    </div>

    <Popover ref="commentPopover" id="overlay_panel" style="width: 450px">
        <p>{{ activeComment }}</p>
    </Popover>
    <Popover ref="editCommentPopover" id="overlay_panel" style="width: 450px">
        <label for="comentario" class="block font-bold mb-3">Comentario para esta fecha de cargo</label>
        <Textarea id="comentario" v-model="activeComment" required="true" rows="3" cols="20" fluid />
        <div class="flex justify-end mt-2">
            <Button icon="pi pi-times" class="p-button-text" text @click="hideComment" />
            <Button icon="pi pi-check" class="p-button-text" @click="saveComment" />
        </div>
    </Popover>
</template>
