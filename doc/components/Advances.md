# Componente Advances

Este documento proporciona documentación detallada sobre el componente `Advances.vue`, encargado de gestionar los anticipos y sus planes de pago en la aplicación Timon.

## Descripción General

El componente `Advances` permite la administración completa de anticipos financieros, que representan préstamos o adelantos que se devuelven gradualmente a través de un plan de pagos. Proporciona funcionalidad para:
- Crear, editar y eliminar anticipos
- Gestionar pagos asociados a cada anticipo
- Generar planes de pago automáticamente
- Visualizar el estado de los anticipos y sus pagos asociados

## Datos y Propiedades

### Estados Principales

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `advances` | `ref([])` | Lista de anticipos recuperados de la base de datos |
| `selectedAdvances` | `ref([])` | Anticipos seleccionados en la tabla para operaciones en lote |
| `advance` | `ref({})` | Objeto que almacena los datos del anticipo en edición |
| `pago` | `ref({})` | Objeto que almacena los datos del pago en edición |
| `pagos` | `ref({})` | Objeto que mapea IDs de anticipo a sus pagos asociados |
| `originalImporte` | `ref(0)` | Almacena el importe original de un pago para detectar modificaciones |

### Estados de Diálogos

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `advanceDialog` | `ref(false)` | Controla la visibilidad del diálogo de edición de anticipos |
| `deleteAdvanceDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para eliminar anticipos |
| `advancePagoDialog` | `ref(false)` | Controla la visibilidad del diálogo de edición de pagos |
| `deletePaymentDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para eliminar pagos |
| `confirmPaymentPlanDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para generar planes de pago |

### Propiedades Computadas

| Propiedad | Descripción |
|-----------|-------------|
| `isImporteModificado` | Detecta si el importe de un pago ha sido modificado respecto al original |
| `isPagoFormValid` | Valida si el formulario de pago tiene todos los campos requeridos |
| `advancesWithPayments` | Calcula el número de anticipos que tienen pagos asociados |

## Funciones Principales

### Gestión de Anticipos

| Función | Descripción |
|---------|-------------|
| `fetchAdvances()` | Recupera la lista de anticipos desde el servidor |
| `openNewAdvance()` | Inicializa un nuevo objeto anticipo y abre el diálogo de creación |
| `editAdvance(adv)` | Carga los datos de un anticipo existente para su edición |
| `saveAdvance()` | Guarda un anticipo nuevo o actualiza uno existente |
| `deleteAdvance()` | Elimina un anticipo seleccionado |
| `confirmCreatePaymentPlan(anticipoId)` | Confirma la generación del plan de pagos para un anticipo |
| `createPaymentPlan(anticipoId)` | Genera el plan de pagos para un anticipo específico |

### Gestión de Pagos

| Función | Descripción |
|---------|-------------|
| `fetchPagos(anticipoId)` | Recupera los pagos asociados a un anticipo específico |
| `fetchAllPagos()` | Recupera todos los pagos de todos los anticipos |
| `openNewPago(anticipoId)` | Inicializa un nuevo pago para un anticipo y abre el diálogo de creación |
| `editPago(p)` | Carga los datos de un pago existente para su edición |
| `savePago()` | Guarda un pago nuevo o actualiza uno existente |
| `deletePago(pago)` | Prepara la eliminación de un pago mostrando opciones |
| `confirmDeletePago()` | Elimina un pago sin recalcular el plan |
| `recalculatePayments()` | Elimina un pago y recalcula los pagos restantes |
| `addNewPayment()` | Crea un nuevo pago después de eliminar uno existente |

### Otras Funciones

| Función | Descripción |
|---------|-------------|
| `toggleExpandCollapseAll()` | Expande o contrae todas las filas de anticipos |
| `exportCSV()` | Exporta los datos de anticipos a formato CSV |
| `onRowExpand(event)` | Maneja la expansión de una fila para mostrar pagos |
| `onRowCollapse(event)` | Maneja el colapso de una fila para ocultar pagos |

## Eventos y Estados

- **Expansión de filas**: El componente mantiene un seguimiento de las filas expandidas a través de `expandedRows`, `expandedCount` e `isExpanded`
- **Advertencia de modificación**: La propiedad computada `isImporteModificado` detecta cambios en el importe de un pago para mostrar una advertencia
- **Validaciones**: Se realizan validaciones en tiempo real para los formularios de anticipos y pagos

## Ciclo de Vida

En el evento `onMounted`, el componente:
1. Carga la lista de anticipos
2. Recupera las periodicidades permitidas
3. Carga todos los pagos asociados a los anticipos
4. Obtiene la lista de cuentas disponibles

## Estructura del Template

El template está estructurado en varias secciones:

1. **Barra de herramientas superior**: Con botones para crear, eliminar y actualizar anticipos
2. **Tabla principal de anticipos**: Muestra los anticipos con sus datos principales y permite expandir cada fila
3. **Subtabla de pagos**: Se muestra al expandir un anticipo, mostrando sus pagos asociados
4. **Diálogos**:
   - Diálogo de edición de anticipos
   - Diálogo de edición de pagos
   - Diálogos de confirmación para eliminar anticipos
   - Diálogo especial para eliminar pagos con opciones adicionales
   - Diálogo para confirmar la generación de planes de pago

## Características especiales

- **Advertencia de recálculo**: Al modificar el importe de un pago existente, se muestra una advertencia al usuario informando que los demás pagos serán recalculados
- **Exportación a CSV**: Permite exportar los datos de anticipos a un archivo CSV
- **Opciones de eliminación de pagos**: Al eliminar un pago, ofrece tres opciones: eliminar sin más, recalcular los pagos restantes, o crear un nuevo pago

## Dependencias

El componente depende de los siguientes servicios:
- `AccService`: Para gestionar las cuentas asociadas a anticipos y pagos
- `AdvService`: Para todas las operaciones CRUD relacionadas con anticipos y pagos
