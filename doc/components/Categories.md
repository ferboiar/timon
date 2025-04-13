# Componente Categories

## Descripción
El componente Categories proporciona una interfaz completa para administrar las categorías del sistema. Permite crear, editar, eliminar y visualizar todas las categorías disponibles.

## Características principales
- Listado de categorías con nombre y descripción
- Creación y edición de categorías mediante un diálogo modal
- Eliminación individual de categorías
- Eliminación múltiple de categorías seleccionadas
- Ordenación de datos por columnas
- Validación de formularios

## Estructura del componente
El componente está organizado en las siguientes secciones:
- Barra de herramientas con acciones principales
- Tabla de datos (DataTable) que muestra las categorías
- Diálogos modales para la gestión de categorías

## Dependencias
- PrimeVue para los componentes de UI (DataTable, Button, Dialog, etc.)
- CatsService para la comunicación con la API

## Métodos principales

### fetchCategories
```javascript
const fetchCategories = async () => {
    try {
        const data = await CatsService.getCategorias();
        categories.value = data.map((cat) => ({
            ...cat,
            nombre: cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1)
        }));
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al actualizar las categorias: ${error.message}`, life: 5000 });
    }
};
```

### saveCategory
```javascript
async function saveCategory() {
    try {
        await CatsService.saveCategoria(category.value);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Categoría guardada!', life: 5000 });
        fetchCategories();
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar la categoría: ${error.message}`, life: 5000 });
    }
}
```

### deleteSelectedCategories
```javascript
const deleteSelectedCategories = async () => {
    try {
        const categoriaIds = selectedCategories.value.map((cat) => Number(cat.id));
        await CatsService.deleteCategorias({ categoriaIds });
        fetchCategories();
        toast.add({ severity: 'success', summary: 'Borrada', detail: 'Categorías borradas con exito.', life: 3000 });
        deleteSelectedCategoriesDialog.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error al borrar las categorias: ${error.message}`, life: 5000 });
    }
};
```

## Validaciones
- El nombre de la categoría es obligatorio
- La descripción tiene un límite de 255 caracteres
