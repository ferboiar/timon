<script>
import { fetchRecibos } from '../api/recibos';

export default {
    data() {
        return {
            recibos: []
        };
    },
    async created() {
        this.recibos = await fetchRecibos();
    }
};
</script>

<template>
    <div>
        <h1>Recibos</h1>
        <ul>
            <li v-for="recibo in recibos" :key="recibo.id">{{ recibo.nombre }}</li>
        </ul>
    </div>
</template>
