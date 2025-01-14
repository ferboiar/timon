<script setup>
import { ref } from 'vue';
import packageJson from '../../package.json';

const version = ref(packageJson.version);
</script>

<template>
    <div class="layout-footer">
        Timón v{{ version }} by
        <a href="https://primevue.org" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">PrimeVue</a>
    </div>
</template>
