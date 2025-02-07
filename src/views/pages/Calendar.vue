<script setup>
import { ref } from 'vue';
import VueCal from 'vue-cal';
import 'vue-cal/dist/vuecal.css';

const events = [
    { start: '2025-01-01', end: '2025-01-01', title: 'Evento 1' },
    { start: '2025-02-14', end: '2025-02-14', title: 'Evento 2' }
    // ...otros eventos...
];

const currentYear = ref(2025);

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const changeYear = (increment) => {
    currentYear.value += increment;
};
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-4">
            <button @click="changeYear(-1)">&#9664;</button>
            <div class="font-semibold text-xl">{{ currentYear }}</div>
            <button @click="changeYear(1)">&#9654;</button>
        </div>
        <div class="calendar-grid">
            <div v-for="(month, index) in months" :key="index" class="month-container">
                <div>{{ month }}</div>
                <vue-cal
                    class="vuecal--rounded-theme vuecal--blue-theme"
                    :events="events"
                    xsmall
                    show-week-numbers
                    locale="es"
                    hide-view-selector
                    :time="false"
                    active-view="month"
                    :disable-views="['years', 'year', 'week', 'day']"
                    :transitions="false"
                    :default-date="`${currentYear}-${String(index + 1).padStart(2, '0')}-01`"
                    style="width: 100%; height: 300px"
                >
                </vue-cal>
            </div>
        </div>
    </div>
</template>

<style scoped>
.calendar-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
}
.month-container {
    position: relative;
}
.vuecal__header {
    display: none;
}
</style>
