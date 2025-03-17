<script setup>
import { CatsService } from '@/service/CatsService';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const categories = ref([]);
const selectedCategories = ref([]);
const toast = useToast();

const category = ref({
    id: null,
    nombre: '',
    descripcion: ''
});

const categoryDialog = ref(false);
const deleteCategoryDialog = ref(false);
const deleteSelectedCategoriesDialog = ref(false);

const isSaveDisabled = computed(() => !category.value.nombre);

const fetchCategories = async () => {
    try {
        const data = await CatsService.getCategorias();
        categories.value = data.map((cat) => ({
            ...cat,
            nombre: cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1)
        }));
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al actualizar las categorias: ${error.message}`, life: 5000 });
        console.error('Error al actualizar las categorias:', error);
    }
};

function updateCategories() {
    fetchCategories();
    toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Categorias actualizadas.', life: 3000 });
}

const confirmDeleteSelectedCategories = () => {
    deleteSelectedCategoriesDialog.value = true;
};

const deleteSelectedCategories = async () => {
    try {
        const categoriaIds = selectedCategories.value.map((cat) => Number(cat.id));
        const categoriasInfo = selectedCategories.value.map((cat) => `${cat.nombre} (${cat.id})`).join(', ');
        console.log('VUE. Categorías a eliminar:', categoriasInfo);
        await CatsService.deleteCategorias({ categoriaIds });
        fetchCategories(); // Refresh the list after deletion
        toast.add({ severity: 'success', summary: 'Borrada', detail: 'Categorías borradas con exito.', life: 3000 });
        deleteSelectedCategoriesDialog.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al borrar las categorias: ${error.message}`, life: 5000 });
        console.error('Error al borrar las categorias:', error);
    }
};

function openNewCategory() {
    category.value = {
        id: null,
        nombre: '',
        descripcion: ''
    };
    categoryDialog.value = true;
}

function hideDialog() {
    categoryDialog.value = false;
    deleteCategoryDialog.value = false;
    deleteSelectedCategoriesDialog.value = false;
}

async function saveCategory() {
    try {
        await CatsService.saveCategoria(category.value);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Categoría guardada!', life: 5000 });
        fetchCategories();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar la categoría: ${error.message}`, life: 5000 });
        console.error('Error al guardar la categoría:', error);
    }
}

function editCategory(cat) {
    category.value = { ...cat, descripcion: cat.descripcion || '' };
    categoryDialog.value = true;
}

function confirmDeleteCategory(cat) {
    category.value = cat;
    deleteCategoryDialog.value = true;
}

async function deleteCategory() {
    try {
        await CatsService.deleteCategorias({ categoriaIds: [Number(category.value.id)] }); // Asegurarse de que el ID sea un número
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Categoría eliminada', life: 3000 });
        fetchCategories();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar la categoría: ${error.message}`, life: 5000 });
        console.error('Error al eliminar la categoría:', error);
    }
}

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
                    <Button label="Nueva" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNewCategory" />
                    <Button label="Borrar" icon="pi pi-trash" severity="secondary" class="mr-2" @click="confirmDeleteSelectedCategories" :disabled="!selectedCategories.length" />
                    <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" class="mr-2" @click="updateCategories" />
                </template>
                <template #end>
                    <Button label="Exportar" icon="pi pi-upload" severity="secondary" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <div class="font-semibold text-xl mb-4">Categorías</div>
            <DataTable ref="dt_categorias" v-model:selection="selectedCategories" :value="categories" dataKey="id" responsiveLayout="scroll" selectionMode="multiple" sortMode="multiple" removableSort stripedRows>
                <template #empty>
                    <div class="text-center p-4">No hay categorías a mostrar.</div>
                </template>
                <Column field="nombre" header="Nombre" sortable style="min-width: 4rem"></Column>
                <Column field="descripcion" header="Descripción" sortable style="min-width: 12rem"></Column>
                <Column :exportable="false">
                    <template #body="categoriesSlotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editCategory(categoriesSlotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteCategory(categoriesSlotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>

    <Dialog v-model:visible="categoryDialog" :style="{ width: '450px' }" header="Detalle de la categoría" :modal="true">
        <div class="flex flex-col gap-6">
            <div>
                <label for="nombre" class="block font-bold mb-3">Nombre</label>
                <InputText id="nombre" v-model.trim="category.nombre" required="true" autofocus fluid />
                <small v-if="!category.nombre" class="text-red-500">El nombre es obligatorio.</small>
            </div>
            <div>
                <label for="descripcion" class="block font-bold mb-3">Descripción</label>
                <Textarea id="descripcion" v-model="category.descripcion" rows="3" cols="20" :maxlength="260" fluid />
                <small v-if="category.descripcion.length > 255" class="text-red-500">La descripción no puede tener más de 255 caracteres.</small>
            </div>
        </div>

        <template #footer>
            <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
            <Button label="Save" icon="pi pi-check" @click="saveCategory" :disabled="isSaveDisabled" />
        </template>
    </Dialog>

    <Dialog v-model:visible="deleteCategoryDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span v-if="category"
                >¿Seguro que quieres borrar la categoría <b>{{ category.nombre }}</b
                >?</span
            >
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="deleteCategoryDialog = false" />
            <Button label="Yes" icon="pi pi-check" @click="deleteCategory" />
        </template>
    </Dialog>

    <Dialog v-model:visible="deleteSelectedCategoriesDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span v-if="selectedCategories.length">¿Seguro que quieres borrar las categorías seleccionadas?</span>
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" autofocus text @click="deleteSelectedCategoriesDialog = false" />
            <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedCategories" />
        </template>
    </Dialog>
</template>
