# Componente ListBills

Este documento proporciona documentación detallada sobre el componente `ListBills.vue`, encargado de gestionar los recibos periódicos y sus fechas de cargo en la aplicación Timon.

## Descripción General

El componente `ListBills` permite la administración completa de recibos periódicos, que representan pagos regulares con fechas de cargo asociadas. Proporciona funcionalidad para:
- Crear, editar y eliminar recibos
- Gestionar fechas de cargo asociadas a cada recibo
- Filtrar recibos por diferentes criterios (periodicidad, año, estado)
- Visualizar el estado de los recibos y sus fechas de cargo

## Características principales
- Listado de recibos organizados por periodicidad (anual, trimestral, bimestral, mensual)
- Creación y edición de recibos mediante diálogos modales específicos según periodicidad
- Eliminación individual de recibos completos o fechas de cargo específicas
- Visualización expandible de fechas de cargo asociadas a cada recibo trimestral o bimestral
- Filtrado por periodicidad y estado de actividad
- Gestión diferenciada según la periodicidad del recibo (anual, trimestral, bimestral, mensual)
- Exportación de datos a formato CSV

## Datos y Propiedades

### Estados Principales

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `annualBills` | `ref([])` | Lista de recibos anuales recuperados de la base de datos |
| `quarterlyBills` | `ref([])` | Lista de recibos trimestrales recuperados de la base de datos |
| `bimonthlyBills` | `ref([])` | Lista de recibos bimestrales recuperados de la base de datos |
| `monthlyBills` | `ref([])` | Lista de recibos mensuales recuperados de la base de datos |
| `inactiveBills` | `ref([])` | Lista de recibos inactivos recuperados de la base de datos |
| `bill` | `ref({})` | Objeto que almacena los datos del recibo en edición |
| `categorias` | `ref([])` | Lista de categorías disponibles para asignar a los recibos |

### Estados de Diálogos

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `billDialog` | `ref(false)` | Controla la visibilidad del diálogo principal de edición de recibos |
| `billDialogTB` | `ref(false)` | Controla la visibilidad del diálogo para recibos trimestrales/bimestrales |
| `billDialogTB_FC` | `ref(false)` | Controla la visibilidad del diálogo para fechas de cargo trimestrales/bimestrales |
| `deleteBillDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para eliminar recibos |
| `deleteSelectedBillsDialog` | `ref(false)` | Controla la visibilidad del diálogo para eliminar recibos seleccionados |

### Estados de Expansión y Selección

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `expandedRowsTrimestral` | `ref([])` | Controla qué filas de recibos trimestrales están expandidas |
| `expandedRowsBimestral` | `ref([])` | Controla qué filas de recibos bimestrales están expandidas |
| `isExpanded` | `ref(false)` | Estado global de expansión para todas las tablas |
| `selectedAnualBills` | `ref()` | Recibos anuales seleccionados |
| `selectedQuarterlyBills` | `ref()` | Recibos trimestrales seleccionados |
| `selectedBimonthlyBills` | `ref()` | Recibos bimestrales seleccionados |
| `selectedMonthlyBills` | `ref()` | Recibos mensuales seleccionados |

### Propiedades Computadas

| Propiedad | Descripción |
|-----------|-------------|
| `groupedQuarterlyBills` | Agrupa los recibos trimestrales por concepto para visualización en tabla |
| `groupedBimonthlyBills` | Agrupa los recibos bimestrales por concepto para visualización en tabla |
| `groupedInactiveBills` | Agrupa los recibos inactivos para visualización en tabla |

## Funciones Principales

### Gestión de Recibos

| Función | Descripción |
|---------|-------------|
| `updateBills(periodicity)` | Actualiza los recibos de la periodicidad especificada |
| `openNew(periodicity)` | Inicializa un nuevo objeto recibo para la periodicidad indicada |
| `guardarRecibo()` | Guarda un recibo nuevo o actualiza uno existente |
| `editBill(prod, openFCDialog)` | Carga los datos de un recibo existente para su edición |
| `confirmDeleteBill(prod)` | Prepara la eliminación de un recibo |
| `deleteBill()` | Elimina un recibo seleccionado |
| `confirmDeleteSelected()` | Prepara la eliminación de recibos seleccionados |
| `deleteSelectedBills()` | Elimina los recibos seleccionados |

### Gestión de Expansión de Filas

| Función | Descripción |
|---------|-------------|
| `toggleExpandCollapseAll()` | Expande o contrae todas las filas de recibos |
| `expandir(periodicity)` | Expande las filas de la periodicidad especificada |
| `contraer(periodicity)` | Contrae las filas de la periodicidad especificada |
| `checkGlobalExpandState()` | Verifica el estado global de expansión de las tablas |
| `onRowExpand(event, type)` | Maneja la expansión de una fila |
| `onRowCollapse(event, type)` | Maneja el colapso de una fila |

### Gestión de Comentarios

| Función | Descripción |
|---------|-------------|
| `toggleComment(event, specificComment, index, popoverType)` | Muestra/oculta el popover de comentarios |
| `saveComment()` | Guarda el comentario editado |
| `hideComment()` | Oculta los popovers de comentarios |

### Otras Funciones

| Función | Descripción |
|---------|-------------|
| `toggleShowInactive()` | Muestra u oculta los recibos inactivos |
| `toggleCardMenu(event, periodicity)` | Controla el menú contextual de la tarjeta |
| `showSelector(periodicity)` | Muestra/oculta la columna de selección |
| `inactiveBillsCount(periodicity)` | Calcula el número de recibos inactivos por periodicidad |
| `exportCSV(periodicity)` | Exporta los recibos a formato CSV |

## Eventos y Estados

- **Expansión/contracción**: El componente permite expandir filas individuales o todas las filas para mostrar las fechas de cargo
- **Filtrado**: Implementa filtrado dinámico por periodicidad y estado de actividad
- **Selección**: Permite seleccionar múltiples recibos para operaciones en lote
- **Comentarios**: Sistema de visualización y edición de comentarios mediante popovers
- **Menú contextual**: Menú específico por periodicidad con opciones adapadas

## Ciclo de Vida

En el evento `onMounted`, el componente:
1. Carga la lista de recibos por periodicidad mediante llamadas paralelas a `BillService`
2. Carga la lista de categorías mediante `CatsService`

## Estructura del Template

El template está estructurado en varias secciones:

1. **Barra de herramientas superior**: Con botones para crear, filtrar, actualizar y exportar recibos
2. **Sección de tarjetas**: Distribución en columnas con tarjetas separadas para cada periodicidad
3. **Tablas específicas por periodicidad**: Cada tipo de recibo se muestra en su propia tabla
4. **Diálogos**:
   - Diálogo principal para recibos (billDialog)
   - Diálogo para recibos trimestrales/bimestrales (billDialogTB)
   - Diálogo para fechas de cargo (billDialogTB_FC)
   - Diálogos de confirmación para eliminar recibos
5. **Popovers para comentarios**: Para visualizar y editar comentarios de recibos

## Características especiales

- **Gestión por periodicidad**: El componente adapta su comportamiento según la periodicidad del recibo:
  - Recibos anuales: Una única fecha de cargo anual
  - Recibos trimestrales: Cuatro fechas de cargo anuales
  - Recibos bimestrales: Seis fechas de cargo anuales
  - Recibos mensuales: Una fecha de cargo mensual
- **Agrupación inteligente**: Los recibos trimestrales y bimestrales se agrupan por concepto para facilitar su visualización
- **Estados visuales**: Diferentes estados (pendiente, pagado, rechazado) se representan con colores distintivos
- **Interfaz adaptativa**: Los campos y opciones mostradas se adaptan según la periodicidad del recibo

## Validaciones

- Validación de campos obligatorios en formularios de recibos
- Validación de fechas de cargo duplicadas para recibos trimestrales o bimestrales
- Validación de formatos de fecha
- Validación de importes positivos

## Dependencias

El componente depende de:
- `BillService`: Para realizar operaciones CRUD con recibos
- `CatsService`: Para obtener las categorías disponibles
- Componentes de PrimeVue para la interfaz de usuario