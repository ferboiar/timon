<script setup>
import { onMounted, ref } from 'vue';

const date = ref(null);
const highlightedDates = ref([]);

onMounted(async () => {
    try {
        //const response = await BillService.getBillDates(); // Supongamos que esta función obtiene las fechas de los recibos
        //highlightedDates.value = response.map(bill => new Date(bill.fecha)); // Convierte las fechas a objetos Date
        highlightedDates.value = [
            new Date('2025-01-01'),
            new Date('2025-01-15'),
            new Date('2025-02-01'),
            new Date('2025-02-15'),
            new Date('2025-03-01'),
            new Date('2025-03-15'),
            new Date('2025-04-01'),
            new Date('2025-04-15'),
            new Date('2025-05-01'),
            new Date('2025-05-15'),
            new Date('2025-06-01'),
            new Date('2025-06-15'),
            new Date('2025-07-01'),
            new Date('2025-07-15'),
            new Date('2025-08-01'),
            new Date('2025-08-15'),
            new Date('2025-09-01'),
            new Date('2025-09-15'),
            new Date('2025-10-01'),
            new Date('2025-10-15'),
            new Date('2025-11-01'),
            new Date('2025-11-15'),
            new Date('2025-12-01'),
            new Date('2025-12-15')
        ];
    } catch (error) {
        console.error('Error al obtener las fechas de los recibos:', error);
    }
});
</script>
<template>
    <div className="card">
        <div class="font-semibold text-xl mb-4">Calendario</div>
        <DatePicker v-model="date" inline showWeek :highlightedDates="highlightedDates" />
    </div>
</template>
