# Componente Savings

Este documento proporciona documentación detallada sobre el componente `Savings.vue`, encargado de gestionar los ahorros y sus movimientos asociados en la aplicación Timon.

## Descripción General

El componente `Savings` permite la administración completa de ahorros financieros, que representan objetivos de ahorro con sus correspondientes movimientos. Proporciona funcionalidad para:
- Crear, editar y eliminar ahorros
- Gestionar movimientos asociados a cada ahorro
- Visualizar el progreso hacia objetivos de ahorro
- Exportar datos a formato CSV

## Características principales
- Listado de ahorros con concepto, descripción, monto y fecha objetivo
- Creación y edición de ahorros mediante un diálogo modal
- Eliminación individual y múltiple de ahorros
- Visualización expandible de movimientos asociados a cada ahorro
- Creación, edición y eliminación de movimientos
- Filtrado para mostrar/ocultar ahorros inactivos
- Exportación de datos a CSV
- Soporte para periodicidades configurables

## Datos y Propiedades

### Estados Principales

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `savings` | `ref([])` | Lista de ahorros recuperados de la base de datos |
| `selectedSavings` | `ref([])` | Ahorros seleccionados en la tabla para operaciones en lote |
| `saving` | `ref({})` | Objeto que almacena los datos del ahorro en edición |
| `movimiento` | `ref({})` | Objeto que almacena los datos del movimiento en edición |
| `movimientos` | `ref({})` | Objeto que mapea IDs de ahorro a sus movimientos asociados |
| `periodicidades` | `ref([])` | Lista de periodicidades permitidas para los ahorros |

### Estados de Diálogos

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `savingDialog` | `ref(false)` | Controla la visibilidad del diálogo de edición de ahorros |
| `deleteSavingDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para eliminar un ahorro |
| `deleteSelectedSavingsDialog` | `ref(false)` | Controla la visibilidad del diálogo para eliminar múltiples ahorros |
| `savingMovimientoDialog` | `ref(false)` | Controla la visibilidad del diálogo de edición de movimientos |

### Propiedades Computadas

| Propiedad | Descripción |
|-----------|-------------|
| `isFormValid` | Valida si el formulario de ahorro tiene todos los campos requeridos completados |
| `isMovimientoFormValid` | Valida si el formulario de movimiento tiene los campos obligatorios |
| `hasInactiveSavings` | Detecta si existen ahorros inactivos en el sistema |
| `savingsWithMovements` | Calcula el número de ahorros que tienen movimientos asociados |

## Funciones Principales

### Gestión de Ahorros

| Función | Descripción |
|---------|-------------|
| `fetchSavings()` | Recupera la lista de ahorros desde el servidor |
| `fetchPeriodicidades()` | Obtiene las periodicidades permitidas para los ahorros |
| `openNewSaving()` | Inicializa un nuevo objeto ahorro y abre el diálogo de creación |
| `editSaving(sav)` | Carga los datos de un ahorro existente para su edición |
| `saveSaving()` | Guarda un ahorro nuevo o actualiza uno existente |
| `deleteSaving()` | Elimina un ahorro seleccionado |
| `deleteSelectedSavings()` | Elimina todos los ahorros seleccionados en la tabla |

### Gestión de Movimientos

| Función | Descripción |
|---------|-------------|
| `fetchMovimientos(ahorroId)` | Recupera los movimientos asociados a un ahorro específico |
| `fetchAllMovimientos()` | Recupera todos los movimientos de todos los ahorros |
| `openNewMovimiento(ahorroId)` | Inicializa un nuevo movimiento para un ahorro y abre el diálogo |
| `editMovimiento(mov)` | Carga los datos de un movimiento existente para su edición |
| `saveMovimiento()` | Guarda un movimiento nuevo o actualiza uno existente |
| `deleteMovimiento(mov)` | Elimina un movimiento específico |

### Otras Funciones

| Función | Descripción |
|---------|-------------|
| `toggleExpandCollapseAll()` | Expande o contrae todas las filas de ahorros |
| `toggleShowInactive()` | Muestra u oculta los ahorros inactivos |
| `exportCSV()` | Exporta los datos de ahorros y sus movimientos a formato CSV |
| `onRowExpand(event)` | Maneja la expansión de una fila para mostrar movimientos |
| `onRowCollapse(event)` | Maneja el colapso de una fila para ocultar movimientos |
| `capitalizeFirstLetter(string)` | Convierte la primera letra de un texto a mayúscula |

## Eventos y Estados

- **Expansión de filas**: El componente mantiene un seguimiento de las filas expandidas a través de `expandedRows`, `expandedCount` e `isExpanded`
- **Filtrado de inactivos**: La propiedad `showInactive` controla la visibilidad de los ahorros marcados como inactivos
- **Validaciones**: Se realizan validaciones en tiempo real para los formularios de ahorros y movimientos

## Ciclo de Vida

En el evento `onMounted`, el componente:
1. Carga la lista de ahorros mediante `fetchSavings()`
2. Recupera las periodicidades permitidas mediante `fetchPeriodicidades()`
3. Carga todos los movimientos asociados a los ahorros mediante `fetchAllMovimientos()`

## Estructura del Template

El template está estructurado en varias secciones:

1. **Barra de herramientas superior**: Con botones para crear, eliminar y actualizar ahorros
2. **Tabla principal de ahorros**: Muestra los ahorros con sus datos principales y permite expandir cada fila
3. **Subtabla de movimientos**: Se muestra al expandir un ahorro, mostrando sus movimientos asociados
4. **Diálogos**:
   - Diálogo de edición de ahorros
   - Diálogo de edición de movimientos
   - Diálogos de confirmación para eliminar ahorros individuales o seleccionados

## Características especiales

- **Sistema de expansión**: Permite expandir/contraer todas las filas para ver/ocultar los movimientos
- **Filtrado de inactivos**: Botón específico para mostrar/ocultar ahorros marcados como inactivos
- **Exportación a CSV**: Incluye datos tanto de los ahorros como de sus movimientos asociados
- **Formateo de fechas**: Utiliza funciones globales para formatear fechas y valores monetarios

## Validaciones

- El concepto del ahorro es obligatorio
- La fecha del movimiento y su tipo son obligatorios
- La descripción tiene un límite de 255 caracteres

## Dependencias

El componente depende del servicio `SavService` para realizar todas las operaciones CRUD relacionadas con ahorros y movimientos.