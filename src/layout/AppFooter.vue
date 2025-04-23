<script setup>
import { useAuth } from '@/composables/useAuth';
import { ref } from 'vue';
import packageJson from '../../package.json';

const version = ref(packageJson.version);
const { currentUser } = useAuth();
</script>

<template>
    <div class="layout-footer">
        Timón v{{ version }} by
        <a href="https://primevue.org" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">PrimeVue</a>
        <span v-if="currentUser"
            >(logged in as <i>{{ currentUser.username }}</i
            >)</span
        >
    </div>
</template>
