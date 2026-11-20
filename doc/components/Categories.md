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
- Vocabulario de interfaz (DC-72): pies de diálogo «Cancelar»/«Guardar» y «No»/«Sí», título de confirmación «Confirmar» y avisos con resumen «Éxito», «Aviso» o «Error»

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
| `isSaveDisabled` | Deshabilita Guardar si el nombre está vacío o supera 30 caracteres, o si la descripción supera 255 (F-41, F-55) |

## Funciones Principales

### Gestión de Categorías

| Función | Descripción |
|---------|-------------|
| `fetchCategories()` | Recupera la lista de categorías desde el servidor |
| `openNewCategory()` | Inicializa un nuevo objeto categoría y abre el diálogo de creación |
| `editCategory(cat)` | Carga los datos de una categoría existente para su edición |
| `saveCategory()` | Guarda una categoría nueva o actualiza una existente por ID. Si se edita y no se ha cambiado nada (nombre en minúsculas y descripción), avisa «No se ha cambiado nada.» y cierra sin enviar nada (DC-30) |
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
- **Capitalización**: El nombre de cada categoría se muestra con la primera letra en mayúscula; en la base de datos se guarda en minúsculas (DC-31)
- **Exportación**: Incluye un botón para exportar las categorías a `categories.csv` con la utilidad común ([utils/csv](../utils/csv.md)): BOM, separador `;`, escape de `;`, comillas y saltos de línea, y neutralización de fórmulas (F-19)

## Validaciones

- El nombre de la categoría es obligatorio
- El nombre admite como máximo 30 caracteres, el límite de la columna `categorias.nombre` (VARCHAR(30)): el control lo recorta, el contador lo muestra y el servidor responde 400 de negocio si se supera (F-55)
- El servidor rechaza (400) un nombre que ya tiene otra categoría y la pantalla muestra su mensaje (F-22)
- La descripción admite como máximo 255 caracteres en el control, en la validación del servidor y en la columna (F-41)

## Límites y unicidad (F-41, F-55, F-22)

El nombre usa maxlength 30 y su contador; la descripción, maxlength 255 y el suyo. El servidor valida las dos longitudes antes de escribir y responde 400 de negocio (antes, un nombre de 31 caracteres acababa en un 500 técnico). El índice único uq_categorias_nombre de la migración 0006 garantiza la unicidad del nombre.

## Dependencias

## Referencias

El componente depende del servicio `CatsService` para realizar todas las operaciones CRUD relacionadas con las categorías.

## Edición y renombrado

La pantalla transmite el ID y `pushCategoria` edita esa fila por ID, de modo que renombrar ya no crea otra categoría (F-09). El servidor guarda el nombre en minúsculas (DC-31) y rechaza duplicados (F-22) y el índice único `uq_categorias_nombre` (migración 0006) los impide también ante concurrencia. Guardar sin cambios no llama al servidor (DC-30).

## Particularidades verificadas

- La validación del botón Guardar comprueba el nombre (obligatorio y hasta 30 caracteres) y la descripción (hasta 255).
- El control y el servidor comparten los máximos de 30 caracteres del nombre y 255 de la descripción (F-41, F-55).
- La pantalla pasa un objeto a CatsService.deleteCategorias; el servicio lo envuelve otra vez. La ruta admite y desenvuelve ese cuerpo anidado. Funciona, pero conviene normalizar el contrato a un array.
- El renombrado se hace por ID en el servidor (F-09). Los avisos de guardar y borrar muestran el mensaje del servidor (F-10, F-22); borrar una categoría en uso responde 409.
