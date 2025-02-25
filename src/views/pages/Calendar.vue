<script setup>
import { useLayout } from '@/layout/composables/layout';
import { BillService } from '@/service/BillService';
import { computed, getCurrentInstance, ref } from 'vue';
import VueCal from 'vue-cal';
import 'vue-cal/dist/vuecal.css';

const { appContext } = getCurrentInstance();

const formatDate = appContext.config.globalProperties.$formatDate; // Obtener la función global

const selectedDate = ref(new Date()); // Initialize with a default date
const displayedYear = computed(() => selectedDate.value.getFullYear());

// cachear los resultados dado que estos no cambian con frecuencia para evitar llamadas repetidas al servidor
// esta cache es de memoria y se reinicia con cada recarga de la página
const cache = new Map();

const events = ref([]);

const updateEvents = (bills) => {
    const filteredBills = bills.filter((bill) => {
        return bill.activo === 1 && ['anual', 'trimestral', 'bimestral'].includes(bill.periodicidad);
    });

    events.value = filteredBills.map((bill) => ({
        start: formatDate(bill.fecha, '-'),
        end: formatDate(bill.fecha, '-'),
        title: bill.concepto
    }));
};

const fetchBillsByYear = async (year) => {
    console.log('fetchBillsByYear(). Año solicitado:', year);
    console.log('fetchBillsByYear(). Estado de la caché:', cache);

    if (cache.has(year)) {
        const bills = cache.get(year);
        updateEvents(bills);
        console.log(`Los recibos del año ${year} ya están cacheados:`, bills);
        return bills;
    }
    try {
        // si no están cacheados los descargamos de la BBDD
        const bills = await BillService.getBillsByYear(year);
        cache.set(year, bills);
        updateEvents(bills);
        console.log(`Recibos del año ${year}:`, bills);
        return bills;
    } catch (error) {
        console.error(`Error al obtener los recibos del año ${year}:`, error);
        throw error;
    }
};

// Llamar a fetchBillsByYear al cargar la página por primera vez
fetchBillsByYear(displayedYear.value);

const changeYear = (increment) => {
    selectedDate.value = new Date(selectedDate.value.getFullYear() + increment, selectedDate.value.getMonth(), selectedDate.value.getDate());
    fetchBillsByYear(displayedYear.value);
};

const getVueCalDate = (monthIndex) => {
    return new Date(displayedYear.value, monthIndex, 1);
};

const { isDarkTheme } = useLayout();
</script>

<template>
    <div :class="{ 'calendar-dark': isDarkTheme }" class="card">
        <div class="flex items-center justify-center gap-4 mb-4">
            <Button icon="pi pi-caret-left" severity="secondary" class="mr-2" @click="changeYear(-1)" />
            <div class="font-semibold text-xl">{{ displayedYear }}</div>
            <Button icon="pi pi-caret-right" severity="secondary" class="mr-2" @click="changeYear(1)" />
        </div>

        <div class="calendar-grid">
            <div class="month-container" v-for="monthNumber in 12" :key="monthNumber">
                <vue-cal
                    class="vuecal--blue-theme vuecal--rounded-theme"
                    xsmall
                    :selected-date="getVueCalDate(monthNumber - 1)"
                    :disable-views="['years', 'year', 'week', 'day']"
                    hide-view-selector
                    active-view="month"
                    locale="es"
                    :transitions="false"
                    :events="events"
                >
                    <template v-slot:title="{ title }">
                        {{ title.replace(/\s*\d{4}\s*/g, '') }}
                    </template>
                    <template v-slot:cell-content="{ cell, events }">
                        <div v-tooltip.top="events.length ? events[0].title : ''" :class="{ 'vuecal__cell-date': true }">
                            {{ cell.content }}
                        </div>
                    </template>
                </vue-cal>
            </div>
        </div>
    </div>
</template>

<style scoped>
.calendar-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}
.month-container {
    position: relative;
}
:deep(.vuecal__title-bar) {
    background-color: transparent !important;
    text-align: left !important;
    justify-content: flex-start !important;
}
:deep(.vuecal__title) {
    justify-content: flex-start !important;
    padding-left: 12px !important;
    text-align: left !important;
}
:deep(.vuecal__arrow) {
    display: none !important;
}
.vuecal {
    max-width: 300px;
    padding: 0.5rem;
    box-shadow: none;
    box-sizing: border-box;
    width: 100%;
    min-width: 200px;
    transition: all 0.3s ease;
    height: auto;
}
:deep(.vuecal__cell) {
    padding-top: 0.2rem;
    padding-bottom: 0.2rem;
}
.calendar-dark :deep(.vuecal__cell-date) {
    color: #fff !important;
}
:deep(.vuecal__cell--has-events) {
    background-color: transparent !important;
}
:deep(.vuecal__cell--has-events .vuecal__cell-date) {
    background-color: var(--primary-color) !important;
    color: #080808 !important;
    opacity: 0.7;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
}
/* Asegura que el tooltip no interfiera con el estilo del calendario */
:deep(.vuecal__cell--has-events .vuecal__cell-content) {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}
:deep(.vuecal__cell-events-count) {
    display: none;
}
:deep(.vuecal__cell--out-of-scope) {
    visibility: hidden !important;
    pointer-events: none !important;
}
:deep(.vuecal__cell--selected *),
:deep(.vuecal__cell--selected) {
    border: none !important;
}
</style>
