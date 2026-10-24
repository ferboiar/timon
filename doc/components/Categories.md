# Componente Categories

Este documento proporciona documentación detallada sobre el componente `Categories.vue`, encargado de gestionar las categorías en la aplicación Timon.

## Descripción General

El componente `Categories` permite la administración completa de categorías en el sistema. Proporciona funcionalidad para:
- Crear, editar y eliminar categorías
- Visualizar la lista completa de categorías
- Seleccionar múltiples categorías para operaciones en lote
- Exportar datos de categorías

## Características principales
- Listado de categorías con nombre y descripción
- Creación y edición de categorías mediante un diálogo modal
- Eliminación individual de categorías
- Eliminación múltiple de categorías seleccionadas
- Ordenación de datos por columnas
- Validación de formularios

## Datos y Propiedades

### Estados Principales

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `categories` | `ref([])` | Lista de categorías recuperadas de la base de datos |
| `selectedCategories` | `ref([])` | Categorías seleccionadas en la tabla para operaciones en lote |
| `category` | `ref({})` | Objeto que almacena los datos de la categoría en edición |

### Estados de Diálogos

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `categoryDialog` | `ref(false)` | Controla la visibilidad del diálogo de edición de categorías |
| `deleteCategoryDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para eliminar una categoría |
| `deleteSelectedCategoriesDialog` | `ref(false)` | Controla la visibilidad del diálogo para eliminar múltiples categorías |

### Propiedades Computadas

| Propiedad | Descripción |
|-----------|-------------|
| `isSaveDisabled` | Deshabilita Guardar mientras el nombre esté vacío; no comprueba la descripción |

## Funciones Principales

### Gestión de Categorías

| Función | Descripción |
|---------|-------------|
| `fetchCategories()` | Recupera la lista de categorías desde el servidor |
| `openNewCategory()` | Inicializa un nuevo objeto categoría y abre el diálogo de creación |
| `editCategory(cat)` | Carga los datos de una categoría existente para su edición |
| `saveCategory()` | Guarda una categoría nueva o actualiza una existente |
| `deleteCategory()` | Elimina una categoría seleccionada |
| `deleteSelectedCategories()` | Elimina todas las categorías seleccionadas en la tabla |

### Otras Funciones

| Función | Descripción |
|---------|-------------|
| `updateCategories()` | Actualiza la lista de categorías y muestra un mensaje de confirmación |
| `hideDialog()` | Cierra cualquier diálogo abierto |

## Eventos y Estados

- **Selección multiple**: El componente permite seleccionar múltiples categorías para eliminarlas en grupo
- **Validaciones**: Se realizan validaciones en tiempo real para el formulario de categoría

## Ciclo de Vida

En el evento `onMounted`, el componente:
1. Carga la lista de categorías mediante `fetchCategories()`

## Estructura del Template

El template está estructurado en varias secciones:

1. **Barra de herramientas superior**: Con botones para crear, eliminar y actualizar categorías
2. **Tabla principal de categorías**: Muestra las categorías con sus datos principales
3. **Diálogos**:
   - Diálogo de edición de categorías
   - Diálogo de confirmación para eliminar una categoría
   - Diálogo de confirmación para eliminar múltiples categorías

## Características especiales

- **Ordenación**: La tabla permite ordenar por nombre y descripción
- **Capitalización**: El nombre de cada categoría se muestra con la primera letra en mayúscula
- **Exportación**: Incluye un botón para exportar los datos de categorías

## Validaciones

- El nombre de la categoría es obligatorio
- La descripción muestra un aviso por encima de 255 caracteres, pero el control admite hasta 260 y el aviso no impide guardar (F-41)

## Dependencias

El componente depende del servicio `CatsService` para realizar todas las operaciones CRUD relacionadas con las categorías.

## Límite de la edición

La pantalla transmite el ID al servicio, pero el backend identifica por nombre. Cambiarlo puede crear otra fila en vez de renombrar la existente (F-09). La validación del formulario no sustituye esta limitación; no se debe interpretar CRUD como renombrado correcto.

## Particularidades verificadas

- La validación del botón Guardar solo comprueba el nombre.
- El aviso de longitud de descripción y el máximo del control no coinciden (F-41).
- La pantalla pasa un objeto a CatsService.deleteCategorias; el servicio lo envuelve otra vez. La ruta admite y desenvuelve ese cuerpo anidado. Funciona, pero conviene normalizar el contrato a un array.
- El renombrado por ID no está implementado en el servidor: se busca por nombre (F-09).
