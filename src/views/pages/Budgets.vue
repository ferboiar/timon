<script setup>
import { computed, ref } from 'vue';

// U-11: preparado para mostrar/ocultar inactivos cuando se desarrolle la vista
const showInactive = ref(false);
const hasInactive = computed(() => false);
const toggleShowInactive = () => {
    showInactive.value = !showInactive.value;
};
</script>

<template>
    <div class="flex flex-col">
        <div class="card">
            <div class="font-semibold text-xl mb-4"></div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nuevo" icon="pi pi-plus" severity="secondary" class="mr-2" />
                    <Button label="Borrar" icon="pi pi-trash" severity="secondary" class="mr-2" />
                    <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" class="mr-2" />
                    <Button :label="showInactive ? 'Ocultar inactivos' : 'Mostrar inactivos'" :icon="showInactive ? 'pi pi-eye-slash' : 'pi pi-eye'" severity="secondary" class="mr-2" @click="toggleShowInactive" :disabled="!hasInactive" />
                </template>
                <template #end>
                    <Button label="Exportar" icon="pi pi-upload" severity="secondary" />
                </template>
            </Toolbar>
        </div>

        <div className="card">
            <div class="font-semibold text-xl mb-4">Presupuestos</div>
            <p></p>
        </div>
    </div>
</template>
