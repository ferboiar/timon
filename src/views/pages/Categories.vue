<script setup>
import { CatsService } from '@/service/CatsService';
import { onMounted, ref } from 'vue';

const categories = ref([]);
const selectedCategories = ref([]);

const fetchCategories = async () => {
    try {
        const data = await CatsService.getCategorias();
        categories.value = data.map((cat) => ({
            ...cat,
            nombre: cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1)
        }));
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
};

const deleteSelectedCategories = async () => {
    try {
        const categoryNames = selectedCategories.value.map((cat) => cat.nombre);
        await CatsService.deleteCategorias(categoryNames);
        fetchCategories(); // Refresh the list after deletion
    } catch (error) {
        console.error('Error deleting categories:', error);
    }
};

onMounted(() => {
    fetchCategories();
});
</script>

<template>
    <div class="flex flex-col">
        <div class="card">
            <div class="font-semibold text-xl mb-4"></div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nuevo" icon="pi pi-plus" severity="secondary" class="mr-2" />
                    <Button label="Borrar" icon="pi pi-trash" severity="secondary" class="mr-2" @click="deleteSelectedCategories" />
                    <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" class="mr-2" @click="fetchCategories" />
                </template>
                <template #end>
                    <Button label="Exportar" icon="pi pi-upload" severity="secondary" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <div class="font-semibold text-xl mb-4">Categorías</div>
            <DataTable :value="categories" responsiveLayout="scroll" selectionMode="multiple" v-model:selection="selectedCategories">
                <Column field="nombre" header="Nombre"></Column>
                <Column field="descripcion" header="Descripción"></Column>
            </DataTable>
        </div>
    </div>
</template>
