<script setup>
import { AccService } from '@/service/AccService'; // Importar AccService
import { AdvService } from '@/service/AdvService';
import { useToast } from 'primevue/usetoast';
import { computed, getCurrentInstance, onMounted, ref } from 'vue';

const advances = ref([]);
const selectedAdvances = ref([]);
const toast = useToast();

const { appContext } = getCurrentInstance();
const formatDate = appContext.config.globalProperties.$formatDate;

const advance = ref({
    id: null,
    concepto: '',
    importe_total: 0,
    pago_sugerido: 0,
    fecha_inicio: null,
    fecha_fin_prevista: null,
    descripcion: '',
    estado: 'activo',
    cuenta_origen_id: null,
    periodicidad: ''
});

const advanceDialog = ref(false);
const deleteAdvanceDialog = ref(false);
const deleteSelectedAdvancesDialog = ref(false);
const periodicidades = ref([{ label: '', value: '' }]);
const cuentas = ref([]); // Lista de cuentas para el desplegable

const fetchAdvances = async () => {
    try {
        const data = await AdvService.getAdvances();
        advances.value = data.map((adv) => ({
            ...adv,
            concepto: adv.concepto.charAt(0).toUpperCase() + adv.concepto.slice(1),
            fecha_inicio: adv.fecha_inicio ? new Date(adv.fecha_inicio) : null,
            fecha_fin_prevista: adv.fecha_fin_prevista ? new Date(adv.fecha_fin_prevista) : null
        }));
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al actualizar los anticipos: ${error.message}`, life: 5000 });
        console.error('Error en fetchAdvances:', error);
    }
};

const fetchPeriodicidades = async () => {
    try {
        const data = await AdvService.getPeriodicidades();
        periodicidades.value = [
            { label: '', value: '' },
            ...data.map((p) => ({
                label: p.charAt(0).toUpperCase() + p.slice(1),
                value: p
            }))
        ];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener las periodicidades: ${error.message}`, life: 5000 });
        console.error('Error en fetchPeriodicidades:', error);
    }
};

const fetchCuentas = async () => {
    try {
        const data = await AccService.getAccounts();
        cuentas.value = data.map((cuenta) => ({
            label: cuenta.nombre,
            value: cuenta.id
        }));
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener las cuentas: ${error.message}`, life: 5000 });
        console.error('Error en fetchCuentas:', error);
    }
};

function updateAdvances() {
    fetchAdvances();
    toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Anticipos actualizados.', life: 3000 });
}

function openNewAdvance() {
    advance.value = {
        id: null,
        concepto: '',
        importe_total: 0,
        pago_sugerido: 0,
        fecha_inicio: new Date(), // Establecer la fecha de hoy por defecto
        fecha_fin_prevista: null,
        descripcion: '',
        estado: 'activo',
        cuenta_origen_id: null,
        periodicidad: ''
    };
    advanceDialog.value = true;
}

function hideDialog() {
    advanceDialog.value = false;
    deleteAdvanceDialog.value = false;
    deleteSelectedAdvancesDialog.value = false;
}

async function saveAdvance() {
    try {
        if (advance.value.fecha_inicio) {
            const localFecha = new Date(advance.value.fecha_inicio.getTime() - advance.value.fecha_inicio.getTimezoneOffset() * 60000);
            advance.value.fecha_inicio = formatDate(localFecha, '-');
        }
        if (advance.value.fecha_fin_prevista) {
            const localFecha = new Date(advance.value.fecha_fin_prevista.getTime() - advance.value.fecha_fin_prevista.getTimezoneOffset() * 60000);
            advance.value.fecha_fin_prevista = formatDate(localFecha, '-');
        }
        // Si no se seleccionó periodicidad, se asigna null
        if (!advance.value.periodicidad) {
            advance.value.periodicidad = null;
        }
        await AdvService.saveAdvance(advance.value);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Anticipo guardado!', life: 5000 });
        await fetchAdvances(); // Actualizar la lista de anticipos
        await fetchAllPagos(); // Actualizar los pagos relacionados
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar el anticipo: ${error.message}`, life: 5000 });
        console.error('Error en saveAdvance:', error);
    }
}

function editAdvance(adv) {
    advance.value = { ...adv };
    advanceDialog.value = true;
}

function confirmDeleteAdvance(adv) {
    // Verificar si el anticipo tiene un ID válido
    if (!adv || !adv.id) {
        console.error('El anticipo seleccionado no tiene un ID válido:', adv);
        re; // Convertir el objeto Proxy en un objeto plano
        turn;
    }
    // Convertir el objeto Proxy en un objeto plano
    advance.value = JSON.parse(JSON.stringify(adv));
    deleteAdvanceDialog.value = true;
}

async function deleteAdvance() {
    try {
        await AdvService.deleteAdvances([advance.value.id]);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Anticipo eliminado', life: 3000 });
        await fetchAdvances(); // Actualizar la lista de anticipos
        await fetchAllPagos(); // Actualizar los pagos relacionados
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar el anticipo: ${error.message}`, life: 5000 });
        console.error('deleteAdvance - Error al eliminar el anticipo:', error);
    }
}

// Gestión de pagos asociados al anticipo
const advancePagoDialog = ref(false);
const pago = ref({
    id: null,
    anticipo_id: null,
    importe: 0,
    fecha: null,
    tipo: 'regular',
    descripcion: '',
    estado: 'pendiente',
    cuenta_destino_id: null
});

const originalImporte = ref(0); // Almacenar el importe original para comparar

const isImporteModificado = computed(() => {
    return pago.value.id && Math.abs(pago.value.importe - originalImporte.value) > 0.001;
});

const pagos = ref({});

const fetchPagos = async (anticipoId) => {
    try {
        const data = await AdvService.getPagos(anticipoId);
        pagos.value[anticipoId] = data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener pagos: ${error.message}`, life: 5000 });
        console.error('Error en fetchPagos:', error);
        pagos.value[anticipoId] = [];
    }
};

const fetchAllPagos = async () => {
    try {
        const ids = advances.value.map((a) => a.id);
        const pagosPromises = ids.map((id) => AdvService.getPagos(id));
        const pagosResults = await Promise.all(pagosPromises);
        ids.forEach((id, index) => {
            pagos.value[id] = pagosResults[index];
        });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al obtener todos los pagos: ${error.message}`, life: 5000 });
        console.error('Error en fetchAllPagos:', error);
    }
};

async function createPaymentPlan(anticipoId) {
    try {
        // Obtener el anticipo relacionado
        const anticipo = advances.value.find((a) => a.id === anticipoId);
        if (!anticipo) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Anticipo no encontrado.', life: 5000 });
            return;
        }

        // Verificar si el pago sugerido es 0
        if (anticipo.pago_sugerido === 0) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Imposible generar plan de pagos mientras pago sugerido sea 0.', life: 5000 });
            return;
        }

        await AdvService.recalculatePaymentPlan(anticipoId);
        await fetchAdvances();
        await fetchAllPagos();
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Plan de pagos creado correctamente.', life: 3000 });
    } catch (error) {
        console.error('Error en createPaymentPlan:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al crear el plan de pagos: ${error.message}`, life: 5000 });
    }
}

function openNewPago(anticipoId) {
    // Obtener el anticipo relacionado
    const anticipo = advances.value.find((a) => a.id === anticipoId);
    if (!anticipo) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Anticipo no encontrado.', life: 5000 });
        return;
    }

    // Obtener los pagos existentes del anticipo
    const pagosAnticipo = pagos.value[anticipoId] || [];

    // Calcular la fecha del nuevo pago (siguiente a la última fecha de los pagos existentes)
    const ultimaFechaPago = pagosAnticipo.length > 0 ? new Date(Math.max(...pagosAnticipo.map((p) => new Date(p.fecha).getTime()))) : new Date();
    ultimaFechaPago.setMonth(ultimaFechaPago.getMonth() + 1);

    // Precargar los datos del nuevo pago
    pago.value = {
        id: null,
        anticipo_id: anticipoId,
        importe: anticipo.pago_sugerido,
        fecha: ultimaFechaPago,
        tipo: 'regular',
        descripcion: '',
        estado: 'pendiente',
        cuenta_destino_id: anticipo.cuenta_origen_id
    };

    advancePagoDialog.value = true; // Abrir el cuadro de diálogo para añadir el nuevo pago
}

function editPago(p) {
    pago.value = { ...p };
    originalImporte.value = parseFloat(p.importe); // Guardar el importe original
    advancePagoDialog.value = true;
}

const isReplacingPayment = ref(false); // Bandera para indicar si se está reemplazando un pago

async function savePago() {
    try {
        if (pago.value.fecha) {
            if (!(pago.value.fecha instanceof Date)) {
                pago.value.fecha = new Date(pago.value.fecha); //Convierte la fecha a un objeto Date
            }
            const localFecha = new Date(pago.value.fecha.getTime() - pago.value.fecha.getTimezoneOffset() * 60000);
            pago.value.fecha = formatDate(localFecha, '-');
        }

        // Verificar si se está editando un pago existente
        if (pago.value.id) {
            await AdvService.savePago(pago.value);
            toast.add({ severity: 'success', summary: 'Pago actualizado', detail: 'El pago ha sido actualizado correctamente.', life: 3000 });

            // Actualizar los anticipos y pagos relacionados
            await fetchAdvances();
            await fetchAllPagos();
            advancePagoDialog.value = false; // Cerrar el cuadro de diálogo y salir
            return;
        }

        // Obtener el anticipo relacionado
        const anticipo = advances.value.find((a) => a.id === pago.value.anticipo_id);
        if (!anticipo) {
            console.error('savePago - Anticipo no encontrado para el ID:', pago.value.anticipo_id);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Anticipo no encontrado.', life: 5000 });
            return;
        }

        console.log('savePago - Anticipo relacionado encontrado:', anticipo);

        // Calcular la suma de los pagos pendientes
        const pagosPendientes = pagos.value[pago.value.anticipo_id]?.filter((p) => p.estado === 'pendiente') || [];
        const sumaPagosPendientes = pagosPendientes.reduce((total, p) => total + parseFloat(p.importe || 0), 0);

        console.log('savePago - Suma de pagos pendientes:', sumaPagosPendientes);

        // Verificar si los pagos pendientes ya cubren el anticipo
        if (sumaPagosPendientes >= anticipo.importe_total) {
            console.warn('savePago - Los pagos pendientes ya cubren el anticipo');
            toast.add({ severity: 'error', summary: 'Error', detail: 'Los pagos pendientes incluidos ya cubren el anticipo.', life: 5000 });
            advancePagoDialog.value = false; // Cerrar el cuadro de diálogo
            return;
        }

        // Ajustar el importe del nuevo pago si excede el importe pendiente
        const importePendiente = anticipo.importe_total - sumaPagosPendientes;
        if (pago.value.importe > importePendiente) {
            console.warn('savePago - Ajustando el importe del pago a:', importePendiente);
            toast.add({ severity: 'warn', summary: 'Ajuste de Importe', detail: `El importe del pago se ajustó a ${importePendiente.toFixed(2)}€ para cubrir el anticipo.`, life: 5000 });
            pago.value.importe = importePendiente;
        }

        // Guardar el nuevo pago
        console.log('savePago - Guardando el nuevo pago');
        await AdvService.savePago(pago.value);
        toast.add({ severity: 'success', summary: 'Pago guardado', detail: 'El pago ha sido guardado correctamente.', life: 3000 });

        // Actualizar los anticipos y pagos relacionados
        console.log('savePago - Actualizando anticipos y pagos relacionados después de guardar el nuevo pago');
        await fetchAdvances();
        await fetchAllPagos();

        // Cerrar el cuadro de diálogo
        console.log('savePago - Cerrando el cuadro de diálogo');
        advancePagoDialog.value = false;
        isReplacingPayment.value = false; // Restablecer la bandera
    } catch (error) {
        console.error('savePago - Error:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar el pago: ${error.message}`, life: 5000 });
    }
}

const deletePaymentDialog = ref(false);
const selectedPayment = ref(null);
const saldoRestante = ref(0);
const pagosPendientesCount = ref(0); // Contador de pagos pendientes
const dialogMessage = ref(''); // Mensaje dinámico para el cuadro de diálogo

const deletePago = (pago) => {
    selectedPayment.value = pago;

    // Obtener el anticipo relacionado
    const anticipo = advances.value.find((a) => a.id === pago.anticipo_id);
    console.log('deletePago - Anticipo relacionado:', anticipo);

    // Obtener todos los pagos del anticipo
    const pagosAnticipo = pagos.value[pago.anticipo_id] || [];

    // Excluir el pago que se está eliminando de los cálculos
    const pagosPendientes = pagosAnticipo.filter((p) => p.estado === 'pendiente' && p.id !== pago.id);
    const pagosPagados = pagosAnticipo.filter((p) => p.estado === 'pagado');

    // Calcular suma de pagos pagados y pendientes (excluyendo el pago a eliminar)
    const sumaPagosPagados = pagosPagados.reduce((total, p) => total + parseFloat(p.importe || 0), 0);
    const sumaPagosPendientes = pagosPendientes.reduce((total, p) => total + parseFloat(p.importe || 0), 0);

    // Calcular el importe inicial del anticipo
    const importeTotal = parseFloat(anticipo?.importe_total || 0); // Convertir a número
    const importeInicial = (importeTotal + sumaPagosPagados).toFixed(2); // Redondear a 2 decimales
    console.log('deletePago - Importe inicial del anticipo:', importeInicial);

    // Calcular el importe pendiente de planificar
    const importePendientePlanificar = Math.max((importeInicial - sumaPagosPagados - sumaPagosPendientes).toFixed(2), 0);
    console.log('deletePago - Importe pendiente de planificar:', importePendientePlanificar);

    // Actualizar el mensaje del cuadro de diálogo
    dialogMessage.value = `Si se borra este pago habrá únicamente ${sumaPagosPendientes.toFixed(2)}€ en el plan de pagos y ${importePendientePlanificar.toFixed(2)}€ pendientes de planificar. ¿Qué deseas hacer con este importe?`;

    // Actualizar contador de pagos pendientes
    pagosPendientesCount.value = pagosPendientes.length;
    console.log('deletePago - Número de pagos pendientes (excluyendo el pago a eliminar):', pagosPendientesCount.value);

    // Mostrar el cuadro de diálogo
    deletePaymentDialog.value = true;
};

const confirmDeletePago = async () => {
    try {
        // Eliminar el pago sin realizar ninguna acción adicional
        await AdvService.handlePaymentDeletion(selectedPayment.value.id);
        toast.add({ severity: 'success', summary: 'Pago eliminado', detail: 'El pago ha sido eliminado.', life: 3000 });

        await fetchAdvances(); // Actualizar la lista de anticipos
        await fetchAllPagos(); // Actualizar los pagos relacionados
        deletePaymentDialog.value = false; // Cerrar el cuadro de diálogo
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar el pago: ${error.message}`, life: 5000 });
    }
};

const recalculatePayments = async () => {
    try {
        // Eliminar el pago y recalcular los pagos restantes
        await AdvService.handlePaymentDeletion(selectedPayment.value.id);
        await AdvService.recalculatePaymentPlan(selectedPayment.value.anticipo_id);

        toast.add({ severity: 'success', summary: 'Successful', detail: 'Pagos pendientes recalculados.', life: 3000 });
        await fetchAdvances(); // Actualizar la lista de anticipos
        await fetchAllPagos(); // Actualizar los pagos relacionados
        deletePaymentDialog.value = false; // Cerrar el cuadro de diálogo
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al recalcular los pagos: ${error.message}`, life: 5000 });
    }
};

const addNewPayment = async () => {
    try {
        // Obtener el anticipo relacionado
        const anticipoId = selectedPayment.value.anticipo_id;
        const pagosAnticipo = pagos.value[anticipoId] || [];

        // Filtrar el último pago registrado distinto al que se borra
        const ultimoPago = pagosAnticipo.filter((p) => p.id !== selectedPayment.value.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];

        // Calcular la fecha del nuevo pago (mes siguiente al último pago)
        const nuevaFecha = ultimoPago ? new Date(ultimoPago.fecha) : new Date();
        nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);

        // Precargar los datos del nuevo pago
        pago.value = {
            id: null,
            anticipo_id: anticipoId,
            importe: selectedPayment.value.importe,
            fecha: nuevaFecha,
            tipo: selectedPayment.value.tipo,
            descripcion: selectedPayment.value.descripcion,
            estado: 'pendiente',
            cuenta_destino_id: selectedPayment.value.cuenta_destino_id
        };

        deletePaymentDialog.value = false; // Cerrar el cuadro de diálogo de borrar
        advancePagoDialog.value = true; // Abrir el cuadro de diálogo para añadir el nuevo pago
        isReplacingPayment.value = true; // Activar la bandera de reemplazo
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar el pago: ${error.message}`, life: 5000 });
    }
};

const expandedRows = ref({});
const isExpanded = ref(false);
const expandedCount = ref(0);
const advancesWithPayments = computed(() => advances.value.filter((a) => pagos.value[a.id] && pagos.value[a.id].length > 0).length);

const toggleExpandCollapseAll = () => {
    if (isExpanded.value) {
        expandedRows.value = {};
        expandedCount.value = 0;
    } else {
        expandedRows.value = advances.value.reduce((acc, a) => {
            acc[a.id] = true;
            return acc;
        }, {});
        expandedCount.value = advancesWithPayments.value;
    }
    isExpanded.value = !isExpanded.value;
};

const onRowExpand = async (event) => {
    await fetchPagos(event.data.id);
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
    isExpanded.value = expandedCount.value >= advancesWithPayments.value;
};

const isPagoFormValid = computed(() => {
    return pago.value.fecha && pago.value.tipo;
});

onMounted(async () => {
    await fetchAdvances();
    await fetchPeriodicidades();
    await fetchAllPagos();
    await fetchCuentas(); // Cargar las cuentas al montar el componente
});

const exportCSV = () => {
    const csvContent = [
        ['Concepto', 'Descripción', 'Importe Total', 'Fecha Inicio', 'Fecha Fin Prevista', 'Estado', 'Cuenta Origen', 'Periodicidad', 'Pago Sugerido'],
        ...advances.value.map((adv) => [
            adv.concepto,
            adv.descripcion || '',
            parseFloat(adv.importe_total).toFixed(2).replace('.', ','), // Convertir a número con 2 decimales y reemplazar el punto por una coma
            formatDate(adv.fecha_inicio),
            formatDate(adv.fecha_fin_prevista),
            adv.estado,
            cuentas.value.find((cuenta) => cuenta.value === adv.cuenta_origen_id)?.label || '',
            adv.periodicidad || '',
            parseFloat(adv.pago_sugerido).toFixed(2).replace('.', ',') // Convertir a número con 2 decimales y reemplazar el punto por una coma
        ])
    ]
        .map((row) => row.map((field) => `"${field}"`).join(';')) // Separador de campos: punto y coma
        .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'anticipos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const confirmPaymentPlanDialog = ref(false); // Estado del cuadro de diálogo de confirmación
const selectedAdvanceId = ref(null); // ID del anticipo seleccionado para generar el plan de pagos

function confirmCreatePaymentPlan(anticipoId) {
    selectedAdvanceId.value = anticipoId;
    confirmPaymentPlanDialog.value = true;
}

async function handleCreatePaymentPlan() {
    if (selectedAdvanceId.value) {
        await createPaymentPlan(selectedAdvanceId.value);
    }
    confirmPaymentPlanDialog.value = false;
}
</script>

<template>
    <div class="flex flex-col">
        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nuevo" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNewAdvance" />
                    <Button label="Borrar" icon="pi pi-trash" severity="secondary" class="mr-2" @click="deleteSelectedAdvancesDialog = true" :disabled="!selectedAdvances.length" />
                    <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" class="mr-2" @click="updateAdvances" />
                    <Button :label="isExpanded ? 'Contraer todo' : 'Expandir todo'" :icon="isExpanded ? 'pi pi-chevron-right' : 'pi pi-chevron-down'" severity="secondary" class="mr-2" @click="toggleExpandCollapseAll" />
                </template>
                <template #end>
                    <Button label="Exportar" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <div class="font-semibold text-xl mb-4">
                Anticipos <small class="text-gray-500">(dinero adelantado que ha de ser devuelto poco a poco, normalmente por gastos grandes no asumibles desde la cuenta principal (veterinario, ropa niños, dentista))</small>
            </div>
            <DataTable
                ref="dt_anticipos"
                v-model:selection="selectedAdvances"
                :value="advances"
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
                    <div class="text-center p-4">No hay anticipos a mostrar.</div>
                </template>
                <Column expander style="width: 5rem" />
                <Column field="concepto" header="Concepto" sortable style="min-width: 4rem" />
                <Column field="descripcion" header="Descripción" sortable style="min-width: 12rem" />
                <Column field="importe_total" header="Importe Total" sortable style="min-width: 4rem">
                    <template #body="slotProps">
                        <span :class="{ 'text-green-500': slotProps.data.importe_total >= 0, 'text-red-500': slotProps.data.importe_total < 0 }">
                            {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(slotProps.data.importe_total) }}
                        </span>
                    </template>
                </Column>
                <Column field="cuenta_origen_id" header="Cuenta Origen" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ cuentas.find((cuenta) => cuenta.value === slotProps.data.cuenta_origen_id)?.label || '' }}
                    </template>
                </Column>
                <Column field="fecha_inicio" header="Fecha Inicio" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ slotProps.data.fecha_inicio ? $formatDate(slotProps.data.fecha_inicio) : '' }}
                    </template>
                </Column>
                <Column field="fecha_fin_prevista" header="Fecha Fin Prevista" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ slotProps.data.fecha_fin_prevista ? $formatDate(slotProps.data.fecha_fin_prevista) : '' }}
                    </template>
                </Column>
                <Column field="pago_sugerido" header="Pago Sugerido" sortable style="min-width: 4rem">
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(slotProps.data.pago_sugerido) }}
                    </template>
                </Column>
                <Column field="periodicidad" header="Periodicidad" sortable style="min-width: 4rem">
                    <template #body="slotProps">
                        {{ slotProps.data.periodicidad || '' }}
                    </template>
                </Column>
                <Column field="estado" header="Estado" sortable style="min-width: 6rem">
                    <template #body="slotProps">
                        <i
                            v-tooltip="{
                                value: slotProps.data.estado.charAt(0).toUpperCase() + slotProps.data.estado.slice(1),
                                class: 'tooltip-class'
                            }"
                            :class="{
                                'pi pi-play-circle text-cyan-500': slotProps.data.estado === 'activo',
                                'pi pi-pause-circle text-orange-500': slotProps.data.estado === 'pausado',
                                'pi pi-times-circle text-red-500': slotProps.data.estado === 'cancelado',
                                'pi pi-check-circle text-green-500': slotProps.data.estado === 'completado'
                            }"
                            class="text-xl"
                        ></i>
                    </template>
                </Column>
                <Column :exportable="false">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" v-tooltip="'Editar el anticipo'" @click="editAdvance(slotProps.data)" />
                        <Button icon="pi pi-plus" outlined rounded class="mr-2" v-tooltip="'Añadir un pago'" @click="openNewPago(slotProps.data.id)" />
                        <Button icon="pi pi-calendar" outlined rounded class="mr-2" v-tooltip="'Añadir o completar el plan de pagos'" @click="confirmCreatePaymentPlan(slotProps.data.id)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteAdvance(slotProps.data)" />
                    </template>
                </Column>
                <template #expansion="slotProps">
                    <div class="p-4">
                        <h5>Pagos del anticipo {{ slotProps.data.concepto }}</h5>
                        <DataTable :value="pagos[slotProps.data.id]" sortField="fecha" :sortOrder="1" removableSort>
                            <Column field="fecha" header="Fecha" sortable style="min-width: 8rem">
                                <template #body="pagoProps">
                                    {{ new Date(pagoProps.data.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }) }}
                                </template>
                            </Column>
                            <Column field="tipo" header="Tipo" sortable style="min-width: 4rem" />
                            <Column field="importe" header="Importe" sortable style="min-width: 4rem">
                                <template #body="pagoProps">
                                    <span :class="{ 'text-green-500': pagoProps.data.importe >= 0, 'text-red-500': pagoProps.data.importe < 0 }">
                                        {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(pagoProps.data.importe) }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="descripcion" header="Descripción" sortable style="min-width: 12rem" />
                            <Column field="cuenta_destino_id" header="Cuenta Destino" sortable style="min-width: 8rem">
                                <template #body="pagoProps">
                                    {{ cuentas.find((cuenta) => cuenta.value === pagoProps.data.cuenta_destino_id)?.label || '' }}
                                </template>
                            </Column>
                            <Column field="estado" header="Estado" sortable style="min-width: 6rem">
                                <template #body="pagoProps">
                                    <i
                                        v-tooltip="{
                                            value: pagoProps.data.estado.charAt(0).toUpperCase() + pagoProps.data.estado.slice(1),
                                            class: 'tooltip-class'
                                        }"
                                        :class="{
                                            'pi pi-clock text-orange-500': pagoProps.data.estado === 'pendiente',
                                            'pi pi-check-circle text-green-500': pagoProps.data.estado === 'pagado',
                                            'pi pi-times-circle text-red-500': pagoProps.data.estado === 'cancelado'
                                        }"
                                        class="text-xl"
                                    ></i>
                                </template>
                            </Column>
                            <Column :exportable="false" style="min-width: 12rem">
                                <template #body="pagoProps">
                                    <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editPago(pagoProps.data)" />
                                    <Button icon="pi pi-trash" outlined rounded severity="danger" @click="deletePago(pagoProps.data)" />
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </template>
            </DataTable>
        </div>

        <Dialog v-model:visible="advanceDialog" :style="{ width: '450px' }" header="Detalle del anticipo" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="concepto" class="block font-bold mb-3">Concepto</label>
                    <InputText id="concepto" v-model.trim="advance.concepto" required autofocus fluid />
                    <small v-if="advance.concepto.trim() === ''" class="text-red-500">El concepto es obligatorio</small>
                </div>
                <div>
                    <label for="descripcion" class="block font-bold mb-3">Descripción</label>
                    <Textarea id="descripcion" v-model="advance.descripcion" rows="3" cols="20" maxlength="255" fluid />
                    <small v-if="advance.descripcion.length > 255" class="text-red-500">La descripción no puede tener más de 255 caracteres.</small>
                </div>
                <div class="flex gap-6">
                    <div class="flex-1">
                        <label for="cuenta_origen_id" class="block font-bold mb-3">Cuenta Origen</label>
                        <Select id="cuenta_origen_id" v-model="advance.cuenta_origen_id" :options="cuentas" optionValue="value" optionLabel="label" fluid />
                        <small v-if="!advance.cuenta_origen_id" class="text-red-500">La cuenta es obligatoria</small>
                    </div>
                    <div class="flex-1">
                        <label for="importe_total" class="block font-bold mb-3">Importe Total</label>
                        <InputNumber id="importe_total" v-model="advance.importe_total" mode="currency" currency="EUR" locale="es-ES" fluid />
                    </div>
                    <div class="flex-1">
                        <label for="pago_sugerido" class="block font-bold mb-3">Pago Sugerido</label>
                        <InputNumber id="pago_sugerido" v-model="advance.pago_sugerido" mode="currency" currency="EUR" locale="es-ES" fluid />
                        <small v-if="advance.periodicidad && (!advance.pago_sugerido || advance.pago_sugerido <= 0)" class="text-red-500"> Obligatorio si se especifica periodicidad </small>
                    </div>
                </div>
                <div class="flex gap-6">
                    <div class="flex-1">
                        <label for="fecha_inicio" class="block font-bold mb-3">Fecha Inicio</label>
                        <DatePicker id="fecha_inicio" v-model="advance.fecha_inicio" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar fluid />
                        <small v-if="!advance.fecha_inicio" class="text-red-500">La fecha es obligatoria</small>
                    </div>
                    <div class="flex-1">
                        <label for="fecha_fin_prevista" class="block font-bold mb-3">Fecha Fin Prevista</label>
                        <DatePicker id="fecha_fin_prevista" v-model="advance.fecha_fin_prevista" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar fluid />
                    </div>
                </div>
                <div class="flex gap-6">
                    <div class="flex-1">
                        <label for="periodicidad" class="block font-bold mb-3">Periodicidad</label>
                        <Select id="periodicidad" v-model="advance.periodicidad" :options="periodicidades" optionValue="value" optionLabel="label" fluid />
                        <small v-if="advance.pago_sugerido > 0 && !advance.periodicidad" class="text-red-500"> Obligatoria si se especifica un pago sugerido </small>
                    </div>
                    <div class="flex-1">
                        <label for="estado" class="block font-bold mb-3">Estado</label>
                        <Select
                            id="estado"
                            v-model="advance.estado"
                            :options="[
                                { label: 'Activo', value: 'activo' },
                                { label: 'Pausado', value: 'pausado' },
                                { label: 'Cancelado', value: 'cancelado' },
                                { label: 'Completado', value: 'completado' }
                            ]"
                            optionValue="value"
                            optionLabel="label"
                            fluid
                        />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button
                    label="Save"
                    icon="pi pi-check"
                    @click="saveAdvance"
                    :disabled="
                        advance.concepto.trim() === '' || !advance.cuenta_origen_id || !advance.fecha_inicio || (advance.periodicidad && (!advance.pago_sugerido || advance.pago_sugerido <= 0)) || (advance.pago_sugerido > 0 && !advance.periodicidad)
                    "
                />
            </template>
        </Dialog>

        <Dialog v-model:visible="advancePagoDialog" :style="{ width: '450px' }" header="Detalle del pago" :modal="true">
            <div class="flex flex-col gap-6">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-3">
                        <label for="pago_importe" class="block font-bold mb-3">Importe</label>
                        <InputNumber id="pago_importe" v-model="pago.importe" mode="currency" currency="EUR" locale="es-ES" autofocus fluid />
                    </div>
                    <div class="col-span-5">
                        <label for="pago_fecha" class="block font-bold mb-3">Fecha</label>
                        <DatePicker id="pago_fecha" v-model="pago.fecha" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar fluid />
                    </div>
                    <div class="col-span-4">
                        <label for="pago_estado" class="block font-bold mb-3">Estado</label>
                        <Select
                            id="pago_estado"
                            v-model="pago.estado"
                            :options="[
                                { label: 'Pendiente', value: 'pendiente' },
                                { label: 'Pagado', value: 'pagado' },
                                { label: 'Cancelado', value: 'cancelado' }
                            ]"
                            optionValue="value"
                            optionLabel="label"
                            fluid
                        />
                    </div>
                </div>
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-6">
                        <label for="pago_tipo" class="block font-bold mb-3">Tipo</label>
                        <Select
                            id="pago_tipo"
                            v-model="pago.tipo"
                            :options="[
                                { label: 'Regular', value: 'regular' },
                                { label: 'Extraordinario', value: 'extraordinario' }
                            ]"
                            optionValue="value"
                            optionLabel="label"
                            fluid
                        />
                    </div>
                    <div class="col-span-6">
                        <label for="cuenta_destino_id" class="block font-bold mb-3">Cuenta Destino</label>
                        <Select id="cuenta_destino_id" v-model="pago.cuenta_destino_id" :options="cuentas" optionValue="value" optionLabel="label" fluid />
                        <small v-if="!pago.cuenta_destino_id" class="text-red-500">La cuenta destino es obligatoria</small>
                    </div>
                </div>
                <div>
                    <label for="pago_descripcion" class="block font-bold mb-3">Descripción</label>
                    <Textarea id="pago_descripcion" v-model="pago.descripcion" rows="3" cols="20" maxlength="255" fluid />
                </div>
            </div>
            <template #footer>
                <div class="w-full">
                    <p v-if="isImporteModificado" class="text-red-500 mb-2 font-bold text-sm">¡Atención! Al modificar el importe del pago, el resto de pagos pendientes será recalculado en función del nuevo valor.</p>
                    <div class="flex justify-end">
                        <Button label="Cancel" icon="pi pi-times" text @click="advancePagoDialog = false" />
                        <Button label="Save" icon="pi pi-check" @click="savePago" :disabled="!isPagoFormValid || !pago.cuenta_destino_id" />
                    </div>
                </div>
            </template>
        </Dialog>
        <Dialog v-model:visible="deleteAdvanceDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="advance"
                    >¿Seguro que quieres borrar el anticipo <b>{{ advance.concepto }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" autofocus text @click="deleteAdvanceDialog = false" />
                <Button label="Yes" icon="pi pi-check" @click="deleteAdvance" />
            </template>
        </Dialog>
        <Dialog v-model:visible="deletePaymentDialog" :style="{ width: '450px' }" header="Eliminar Pago" :modal="true">
            <div class="flex flex-col gap-4">
                <p>{{ dialogMessage }}</p>
                <div class="flex gap-4">
                    <Button label="Recalcular pagos" class="flex-1" v-tooltip="'Reparte el importe entre los pagos ya definidos'" icon="pi pi-refresh" @click="recalculatePayments" :disabled="pagosPendientesCount <= 1" autofocus />
                    <Button label="Añadirlo en un nuevo" class="flex-1" v-tooltip="'Crea un nuevo pago con el total del importe pendiente'" icon="pi pi-plus" @click="addNewPayment" />
                </div>
                <div class="flex justify-center">
                    <Button label="Nada. Confirmar eliminación" icon="pi pi-trash" severity="danger" class="w-full" @click="confirmDeletePago" />
                </div>
            </div>
        </Dialog>

        <!-- Diálogo de confirmación para generar el plan de pagos -->
        <Dialog v-model:visible="confirmPaymentPlanDialog" :style="{ width: '450px' }" header="Confirmar" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>¿Seguro que quieres generar o completar el plan de pagos para el anticipo '{{ advances.find((a) => a.id === selectedAdvanceId)?.concepto || '' }}'?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="confirmPaymentPlanDialog = false" autofocus />
                <Button label="Sí" icon="pi pi-check" @click="handleCreatePaymentPlan" />
            </template>
        </Dialog>
    </div>
</template>
