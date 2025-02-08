<script setup>
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
</script>

<template>
    <div class="card">
        <div class="flex items-center justify-center gap-4 mb-4">
            <Button icon="pi pi-caret-left" class="mr-2" @click="previous" v-tooltip="'Año anterior'" />
            <div class="font-semibold text-xl">{{ displayedYear }}</div>
            <Button aria-label="Año siguiente" icon="pi pi-caret-right" severity="secondary" class="mr-2" @click="next" />
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
</style>
