<script setup>
import { useLayout } from '@/layout/composables/layout';
import { computed, ref } from 'vue';
import VueCal from 'vue-cal';
import 'vue-cal/dist/vuecal.css';

const selectedDate = ref(new Date()); // Initialize with a default date
const displayedYear = computed(() => selectedDate.value.getFullYear());

const previous = () => {
    selectedDate.value = new Date(selectedDate.value.getFullYear() - 1, selectedDate.value.getMonth(), selectedDate.value.getDate());
};
const next = () => {
    selectedDate.value = new Date(selectedDate.value.getFullYear() + 1, selectedDate.value.getMonth(), selectedDate.value.getDate());
};

const getVueCalDate = (monthIndex) => {
    return new Date(displayedYear.value, monthIndex, 1);
};

const { isDarkTheme } = useLayout();

const events = ref([
    { start: '2025-01-15', end: '2025-01-15', title: 'Evento 1' },
    { start: '2025-02-20', end: '2025-02-20', title: 'Evento 2' },
    { start: '2025-03-05', end: '2025-03-05', title: 'Evento 3' }
]);
</script>

<template>
    <div :class="{ 'calendar-dark': isDarkTheme }" class="card">
        <div class="flex items-center justify-center gap-4 mb-4">
            <Button icon="pi pi-caret-left" severity="secondary" class="mr-2" @click="previous" />
            <div class="font-semibold text-xl">{{ displayedYear }}</div>
            <Button icon="pi pi-caret-right" severity="secondary" class="mr-2" @click="next" />
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
                        {{ title.replace(/\d+/g, '') }}
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
}
:deep(.vuecal__arrow) {
    display: none !important;
}
:deep(.vuecal__title) {
    justify-content: start;
    padding-left: 12px;
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
</style>
