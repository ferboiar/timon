<script setup>
import { BillService } from '@/service/BillService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue';

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
    cargo: Array(6)
        .fill()
        .map(() => ({
            id: null,
            fecha: null,
            estado: 'pendiente',
            comentario: ''
        }))
});

const billDialog = ref(false);
const billDialogTB = ref(false);
const billDialogTB_FC = ref(false);

const expandedRowsTrimestral = ref([]);
const expandedRowsBimestral = ref([]);

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
        /*
        console.log('onMounted. BillService. Recibos anuales:', annualBills.value);
        console.log('onMounted. BillService. Recibos trimestrales:', quarterlyBills.value);
        console.log('onMounted. BillService. Recibos bimestrales:', bimonthlyBills.value);
        console.log('onMounted. BillService. Recibos mensuales:', monthlyBills.value);
*/
    } catch (error) {
        console.error('onMounted. BillService. Error al cargar los recibos:', error);
    }
});

// >>>> Menú de la tarjeta
const cardMenu = ref([]);
const menuRef = ref(null);

function toggleCardMenu(event, periodicity) {
    cardMenu.value = [
        { label: 'Añadir', icon: 'pi pi-fw pi-plus', command: () => openNew(periodicity) },
        { label: 'Actualizar', icon: 'pi pi-fw pi-refresh', command: () => updateBills(periodicity) },
        { label: 'Multiselección', icon: 'pi pi-fw pi-check-square', command: () => showSelector(periodicity) },
        { label: 'Exportar', icon: 'pi pi-fw pi-upload', command: () => exportCSV(periodicity) }
    ];

    if (periodicity === 'trimestral' || periodicity === 'bimestral') {
        cardMenu.value.push(
            // eslint-disable-next-line prettier/prettier
            { separator: true },
            { label: 'Expandir todo', icon: 'pi pi-fw pi-chevron-down', command: () => expandirTodo(periodicity) },
            { label: 'Contraer todo', icon: 'pi pi-fw pi-chevron-right', command: () => contraerTodo(periodicity) }
        );
    }
    menuRef.value.toggle(event);
}

function expandirTodo(periodicity) {
    if (periodicity === 'trimestral') {
        expandedRowsTrimestral.value = groupedQuarterlyBills.value.reduce((acc, p) => (acc[p.id] = true) && acc, {});
    } else if (periodicity === 'bimestral') {
        expandedRowsBimestral.value = groupedBimonthlyBills.value.reduce((acc, p) => (acc[p.id] = true) && acc, {});
    }
}

function contraerTodo(periodicity) {
    if (periodicity === 'trimestral') {
        expandedRowsTrimestral.value = [];
    } else if (periodicity === 'bimestral') {
        expandedRowsBimestral.value = [];
    }
}

function updateBills(periodicity) {
    if (periodicity === 'all') {
        ['anual', 'trimestral', 'bimestral', 'mensual'].forEach((period) => {
            BillService.getBillsByPeriodicity(period)
                .then((response) => {
                    if (period === 'anual') {
                        annualBills.value = response;
                    } else if (period === 'trimestral') {
                        quarterlyBills.value = response;
                    } else if (period === 'bimestral') {
                        bimonthlyBills.value = response;
                    } else if (period === 'mensual') {
                        monthlyBills.value = response;
                    }
                })
                .catch((error) => {
                    toast.add({ severity: 'error', summary: 'Error', detail: `Error al actualizar la lista de recibos ${period}: ${error.message}`, life: 5000 });
                    console.error(`Error al actualizar la lista de recibos ${period}:`, error);
                });
        });
        toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Todos los recibos actualizados.', life: 3000 });
    } else {
        BillService.getBillsByPeriodicity(periodicity)
            .then((response) => {
                if (periodicity === 'anual') {
                    annualBills.value = response;
                } else if (periodicity === 'trimestral') {
                    quarterlyBills.value = response;
                } else if (periodicity === 'bimestral') {
                    bimonthlyBills.value = response;
                } else if (periodicity === 'mensual') {
                    monthlyBills.value = response;
                }
                toast.add({ severity: 'success', summary: 'Actualizado', detail: `Listado de recibos ${periodicity}es actualizado.`, life: 3000 });
            })
            .catch((error) => {
                toast.add({ severity: 'error', summary: 'Error', detail: `Error al actualizar la lista de recibos ${periodicity}es: ${error.message}`, life: 5000 });
                console.error(`Error al actualizar la lista de recibos ${periodicity}:`, error);
            });
    }
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

const deleteBillDialog = ref(false);
const deleteSelectedBillsDialog = ref(false);

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

const filtersBimestral = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const filtersMensual = ref({
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
        cargo: Array(6)
            .fill()
            .map(() => ({
                id: null,
                fecha: null,
                estado: 'pendiente',
                comentario: ''
            }))
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

    // Ajustar la zona horaria para todos los cargos donde haya fecha
    bill.value.cargo.forEach((c, index) => {
        if (c.fecha) {
            const fechaLocal = new Date(c.fecha.getTime() - c.fecha.getTimezoneOffset() * 60000);
            bill.value.cargo[index].fecha = fechaLocal;
        }
    });

    // Comprobar fechas de cargo duplicadas para recibos trimestrales o bimestrales
    if (bill.value.periodicidad === 'trimestral' || bill.value.periodicidad === 'bimestral') {
        const fechas = bill.value.cargo.map((c) => (c.fecha ? c.fecha.toISOString().split('T')[0] : null)).filter((f) => f !== null);
        const fechasUnicas = new Set(fechas);
        if (fechas.length !== fechasUnicas.size) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Hay fechas de cargo duplicadas. Por favor, rectifique.', life: 5000 });
            return;
        }
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
            // Primer elemento con datos existentes
            {
                id: prod.fc_id ?? null,
                fecha: prod.fecha ? new Date(prod.fecha) : null,
                estado: prod.estado ?? 'pendiente',
                comentario: prod.comentario ?? ''
            },
            // Resto de elementos (5 elementos adicionales)
            ...Array(5)
                .fill()
                .map(() => ({
                    id: null,
                    fecha: null,
                    estado: 'pendiente',
                    comentario: ''
                }))
        ]
    };

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

const { appContext } = getCurrentInstance();

function exportCSV(periodicity) {
    const exportData = (bills, filename, formatDate) => {
        const csvContent = [
            ['Periodicidad', 'Concepto', 'Importe', 'Fecha', 'Estado', 'Comentario'],
            ...bills.map((bill) => [
                bill.periodicidad,
                bill.concepto,
                parseFloat(bill.importe).toFixed(2).replace('.', ','), // Convertir a número con 2 decimales y reemplazar el punto por una coma
                formatDate(bill.fecha), // Usar la función pasada como argumento
                bill.estado,
                bill.comentario
            ])
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

    const formatDate = appContext.config.globalProperties.$formatDate; // Obtener la función global

    if (periodicity === 'all') {
        const allBills = [...annualBills.value, ...quarterlyBills.value, ...bimonthlyBills.value, ...monthlyBills.value];
        exportData(allBills, 'allBills.csv', formatDate);
    } else {
        if (periodicity === 'anual') {
            exportData(annualBills.value, 'recibosAnuales.csv', formatDate);
        } else if (periodicity === 'trimestral') {
            exportData(quarterlyBills.value, 'recibosTrimestrales.csv', formatDate);
        } else if (periodicity === 'bimestral') {
            exportData(bimonthlyBills.value, 'recibosBimestrales.csv', formatDate);
        } else if (periodicity === 'mensual') {
            exportData(monthlyBills.value, 'recibosMensuales.csv', formatDate);
        }
    }
}

function confirmDeleteSelected() {
    deleteSelectedBillsDialog.value = true;
}

async function deleteSelectedBills() {
    try {
        const selectedBills = [...(selectedAnualBills.value || []), ...(selectedQuarterlyBills.value || []), ...(selectedBimonthlyBills.value || []), ...(selectedMonthlyBills.value || [])];

        if (selectedBills.length === 0) {
            toast.add({ severity: 'warn', summary: 'Warning', detail: 'No hay recibos seleccionados para eliminar', life: 3000 });
            return;
        }

        const deletePromises = selectedBills.map((bill) => BillService.deleteBill(bill.id, bill.fecha, bill.periodicidad));

        await Promise.all(deletePromises);

        deleteSelectedBillsDialog.value = false;
        selectedAnualBills.value = null;
        selectedQuarterlyBills.value = null;
        selectedBimonthlyBills.value = null;
        selectedMonthlyBills.value = null;

        toast.add({ severity: 'success', summary: 'Successful', detail: 'Recibos eliminados', life: 3000 });

        // Actualizar las listas de recibos según la periodicidad
        const periodicitiesToUpdate = new Set(selectedBills.map((bill) => bill.periodicidad));
        for (const periodicity of periodicitiesToUpdate) {
            updateBills(periodicity);
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar los recibos: ${error.message}`, life: 5000 });
        console.error('deleteSelectedBills(). Error al eliminar los recibos: ', error.response?.data || error.message);
    }
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

const groupedBimonthlyBills = computed(() => {
    const grouped = {};
    bimonthlyBills.value.forEach((bill) => {
        if (!grouped[bill.concepto]) {
            grouped[bill.concepto] = { id: bill.id, concepto: bill.concepto, importe: bill.importe, categoria: bill.categoria, periodicidad: bill.periodicidad, bills: [] };
        }
        grouped[bill.concepto].bills.push(bill);
    });
    return Object.values(grouped);
});

// muestra/oculta la columna de selección
const showSelectionColumn = ref({
    anual: false,
    bimestral: false,
    trimestral: false,
    mensual: false
});

const showSelector = (periodicity) => {
    showSelectionColumn.value[periodicity] = !showSelectionColumn.value[periodicity];
};
</script>

<template>
    <div class="flex flex-col">
        <div class="card">
            <div class="font-semibold text-xl mb-4"></div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nuevo" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button
                        label="Borrar"
                        icon="pi pi-trash"
                        severity="secondary"
                        class="mr-2"
                        @click="confirmDeleteSelected"
                        :disabled="!selectedAnualBills?.length && !selectedQuarterlyBills?.length && !selectedBimonthlyBills?.length && !selectedMonthlyBills?.length"
                    />
                    <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" class="mr-2" @click="updateBills('all')" />
                </template>
                <template #end>
                    <!--
                    <Button label="Cargar" icon="pi pi-download" severity="secondary" class="mr-2" @click="exportCSV('all')" />
-->
                    <Button label="Exportar" icon="pi pi-upload" severity="secondary" @click="exportCSV('all')" />
                </template>
            </Toolbar>
        </div>

        <div class="flex flex-col md:flex-row gap-8">
            <div class="md:w-1/2">
                <div class="card">
                    <div class="flex items-center justify-between mb-0">
                        <OverlayBadge value="2">
                            <div class="font-semibold text-xl mb-4">Anuales</div>
                        </OverlayBadge>
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
                        :paginator="annualBills.length > 8"
                        :rows="8"
                        :filters="filtersAnual"
                        sortField="fecha"
                        :sortOrder="1"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        :rowsPerPageOptions="[5, 10, 15, 20]"
                        currentPageReportTemplate="Mostrando {first} de {last} de {totalRecords} recibos"
                    >
                        <Column v-if="showSelectionColumn.anual" selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
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
                        v-model:selection="selectedBimonthlyBills"
                        v-model:expandedRows="expandedRowsTrimestral"
                        :value="groupedQuarterlyBills"
                        dataKey="id"
                        :paginator="groupedQuarterlyBills.length > 8"
                        :rows="8"
                        :filters="filtersTrimestral"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        :rowsPerPageOptions="[5, 10, 15, 20]"
                        currentPageReportTemplate="Mostrando {first} de {last} de {totalRecords} recibos"
                        rowGroupMode="subheader"
                        groupField="concepto"
                    >
                        <Column v-if="showSelectionColumn.trimestral" selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
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
                                <Button v-if="trimestralSlotProps.data.bills.length <= 3" icon="pi pi-plus" outlined rounded class="ml-2" @click="editBill(trimestralSlotProps.data, true)" />
                            </template>
                        </Column>

                        <template #expansion="trimestralSlotProps">
                            <DataTable :value="trimestralSlotProps.data.bills" sortField="fecha" :sortOrder="1">
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
                        <div class="flex flex-wrap gap-2 items-center justify-between">
                            <IconField>
                                <InputIcon>
                                    <i class="pi pi-search" />
                                </InputIcon>
                                <InputText v-model="filtersBimestral['global'].value" placeholder="Buscar..." />
                            </IconField>
                            <Button icon="pi pi-ellipsis-v" class="p-button-text" @click="(event) => toggleCardMenu(event, 'bimestral')" />
                            <Menu id="config_menu" ref="menuRef" :model="cardMenu" :popup="true" />
                        </div>
                    </div>

                    <DataTable
                        ref="dt_bimestral"
                        v-model:selection="selectedBimonthlyBills"
                        v-model:expandedRows="expandedRowsBimestral"
                        :value="groupedBimonthlyBills"
                        dataKey="id"
                        :paginator="groupedBimonthlyBills.length > 8"
                        :rows="8"
                        :filters="filtersBimestral"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        :rowsPerPageOptions="[5, 10, 15, 20]"
                        currentPageReportTemplate="Mostrando {first} de {last} de {totalRecords} recibos"
                        rowGroupMode="subheader"
                        groupField="concepto"
                    >
                        <Column v-if="showSelectionColumn.bimestral" selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                        <Column expander style="width: 5rem" />
                        <Column field="concepto" header="Concepto" sortable style="min-width: 10rem"></Column>
                        <Column field="importe" header="Importe" sortable style="min-width: 3rem">
                            <template #body="bimestralSlotProps">
                                {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(bimestralSlotProps.data.importe) }}
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 12rem">
                            <template #body="bimestralSlotProps">
                                <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editBill(bimestralSlotProps.data)" />
                                <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteBill(bimestralSlotProps.data)" />
                                <Button v-if="bimestralSlotProps.data.bills.length <= 3" icon="pi pi-plus" outlined rounded class="ml-2" @click="editBill(bimestralSlotProps.data, true)" />
                            </template>
                        </Column>

                        <template #expansion="bimestralSlotProps">
                            <DataTable :value="bimestralSlotProps.data.bills" sortField="fecha" :sortOrder="1">
                                <Column field="fecha" header="Fecha" sortable style="min-width: 8rem">
                                    <template #body="bimestralSlotProps">
                                        {{ $formatDate(bimestralSlotProps.data.fecha) }}
                                    </template>
                                </Column>
                                <Column field="estado" header="Estado" sortable style="min-width: 2rem">
                                    <template #body="bimestralSlotProps">
                                        <i
                                            :class="bimestralSlotProps.data.estado === 'cargado' ? 'pi pi-fw pi-check-circle text-green-500' : bimestralSlotProps.data.estado === 'pendiente' ? 'pi pi-fw pi-times-circle text-red-500' : ''"
                                            v-tooltip="bimestralSlotProps.data.estado === 'cargado' ? 'Cargado' : bimestralSlotProps.data.estado === 'pendiente' ? 'Pendiente' : ''"
                                        />
                                    </template>
                                </Column>
                                <Column field="comentario" header="Comentario" sortable style="min-width: 2rem">
                                    <template #body="bimestralSlotProps">
                                        <template v-if="bimestralSlotProps.data.comentario">
                                            <Button icon="pi pi-fw pi-plus" class="p-button-text" @click="(event) => toggleComment(event, bimestralSlotProps.data.comentario, 'comment')" v-tooltip="bimestralSlotProps.data.comentario" />
                                        </template>
                                    </template>
                                </Column>
                                <Column :exportable="false" style="min-width: 12rem">
                                    <template #body="bimestralSlotProps">
                                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editBill(bimestralSlotProps.data, true)" />
                                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteBill(bimestralSlotProps.data)" />
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </DataTable>
                </div>

                <div class="card">
                    <div class="flex items-center justify-between mb-0">
                        <div class="font-semibold text-xl mb-4">Mensuales</div>
                        <div class="flex flex-wrap gap-2 items-center justify-between">
                            <IconField>
                                <InputIcon>
                                    <i class="pi pi-search" />
                                </InputIcon>
                                <InputText v-model="filtersMensual['global'].value" placeholder="Buscar..." />
                            </IconField>
                            <Button icon="pi pi-ellipsis-v" class="p-button-text" @click="(event) => toggleCardMenu(event, 'mensual')" />
                            <Menu id="config_menu" ref="menuRef" :model="cardMenu" :popup="true" />
                        </div>
                    </div>

                    <DataTable
                        ref="dt_mensual"
                        v-model:selection="selectedMonthlyBills"
                        :value="monthlyBills"
                        dataKey="id"
                        :paginator="monthlyBills.length > 8"
                        :rows="8"
                        :filters="filtersMensual"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        :rowsPerPageOptions="[5, 10, 15, 20]"
                        currentPageReportTemplate="Mostrando {first} de {last} de {totalRecords} recibos"
                    >
                        <Column v-if="showSelectionColumn.mensual" selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                        <Column field="concepto" header="Concepto" sortable style="min-width: 10rem"></Column>
                        <Column field="importe" header="Importe" sortable style="min-width: 3rem">
                            <template #body="mensualSlotProps">
                                {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(mensualSlotProps.data.importe) }}
                            </template>
                        </Column>
                        <Column field="estado" header="Estado" sortable style="min-width: 2rem">
                            <template #body="mensualSlotProps">
                                <i
                                    :class="mensualSlotProps.data.estado === 'cargado' ? 'pi pi-fw pi-check-circle text-green-500' : mensualSlotProps.data.estado === 'pendiente' ? 'pi pi-fw pi-times-circle text-red-500' : ''"
                                    v-tooltip="mensualSlotProps.data.estado === 'cargado' ? 'Cargado' : mensualSlotProps.data.estado === 'pendiente' ? 'Pendiente' : ''"
                                />
                            </template>
                        </Column>
                        <Column field="comentario" header="Comentario" sortable style="min-width: 2rem">
                            <template #body="mensualSlotProps">
                                <template v-if="mensualSlotProps.data.comentario">
                                    <Button icon="pi pi-fw pi-plus" class="p-button-text" @click="(event) => toggleComment(event, mensualSlotProps.data.comentario, 'comment')" v-tooltip="mensualSlotProps.data.comentario" />
                                </template>
                            </template>
                        </Column>
                        <Column :exportable="false" style="min-width: 12rem">
                            <template #body="mensualSlotProps">
                                <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editBill(mensualSlotProps.data)" />
                                <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteBill(mensualSlotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
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

        <Dialog v-model:visible="deleteSelectedBillsDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="bill">¿Seguro que quieres borrar los recibos seleccionados?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" autofocus text @click="deleteSelectedBillsDialog = false" />
                <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedBills" />
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
