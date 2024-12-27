<template>
  <div>
    <h1>Timon - Contabilidad Doméstica</h1>
    <ul>
      <li v-for="movimiento in movimientos" :key="movimiento.id">
        {{ movimiento.nombre }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const movimientos = ref([]);
const backendURL = 'http://localhost:3000'; // URL del backend (incluyendo el puerto)

onMounted(async () => {
  try {
    const response = await fetch(`${backendURL}/movimientos`);
    const data = await response.json();
    movimientos.value = data;
  } catch (error) {
    console.error('Error al obtener los movimientos:', error);
  }
});
</script>