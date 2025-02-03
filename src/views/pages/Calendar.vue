<script setup>
import { ref } from 'vue';

const enero = ref(new Date(2025, 0, 1));
const febrero = ref(new Date(2025, 1, 1));
const marzo = ref(new Date(2025, 2, 1));
</script>
<template>
    <div className="card">
        <div class="font-semibold text-xl mb-4">Calendario</div>
        <DatePicker v-model="enero" inline showWeek dateFormat="dd/mm/yy" variant="filled" class="w-full sm:w-[30rem]">
            <template #date="slotProps">
                <strong v-if="slotProps.date.day > 10 && slotProps.date.day < 15" style="text-decoration: line-through">{{ slotProps.date.day }}</strong>
                <template v-else>{{ slotProps.date.day }}</template>
            </template>
        </DatePicker>
        <DatePicker v-model="febrero" inline showWeek dateFormat="dd/mm/yy" variant="filled" class="w-full sm:w-[30rem]">
            <template #date="slotProps">
                <strong v-if="slotProps.date.day > 10 && slotProps.date.day < 15" style="text-decoration: line-through">{{ slotProps.date.day }}</strong>
                <template v-else>{{ slotProps.date.day }}</template>
            </template>
        </DatePicker>
    </div>
</template>
