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
- Selección de cuenta bancaria asociada al recibo
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
| `cuentas` | `ref([])` | Lista de cuentas bancarias disponibles para asociar a los recibos |

### Estados de Diálogos

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `billDialog` | `ref(false)` | Controla la visibilidad del diálogo principal de edición de recibos |
| `billDialogTB` | `ref(false)` | Controla la visibilidad del diálogo para recibos trimestrales/bimestrales |
| `billDialogTB_FC` | `ref(false)` | Controla la visibilidad del diálogo para fechas de cargo trimestrales/bimestrales |
| `deleteBillDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para eliminar recibos |
| `deleteSelectedBillsDialog` | `ref(false)` | Controla la visibilidad del diálogo para eliminar recibos seleccionados |

### Propiedades Principales del Objeto Recibo

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `concepto` | String | Nombre o descripción del recibo |
| `periodicidad` | String | Frecuencia del recibo (mensual, bimestral, trimestral) |
| `importe` | Number | Importe del recibo |
| `categoria_id` | Number | ID de la categoría asignada al recibo |
| `cuenta_id` | Number | ID de la cuenta bancaria asociada al recibo |
| `cargo` | Array | Lista de fechas de cargo asociadas al recibo |

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

### Carga de Datos Relacionados

| Función | Descripción |
|---------|-------------|
| `fetchCategories()` | Obtiene la lista de categorías disponibles |
| `fetchAccounts()` | Obtiene la lista de cuentas bancarias disponibles |

## Asociación con Cuentas Bancarias

El componente permite asociar cada recibo a una cuenta bancaria específica mediante el campo `cuenta_id`:

1. **Selección de cuenta**: En los formularios de creación y edición de recibos, se muestra un desplegable que permite seleccionar una cuenta de la lista de cuentas disponibles.

2. **Carga de cuentas**: Al montar el componente, se ejecuta `fetchAccounts()` para obtener todas las cuentas bancarias disponibles del usuario.

3. **Persistencia**: El campo `cuenta_id` se incluye al guardar recibos nuevos o actualizarlos:

```javascript
// Extracto de la función guardarRecibo()
await BillService.saveBill({
  id: this.bill.id || null,
  concepto: this.bill.concepto,
  periodicidad: this.bill.periodicidad,
  importe: this.bill.importe,
  categoria: this.bill.categoria_id,
  cuenta_id: this.bill.cuenta_id, // Campo cuenta_id enviado al backend
  cargo: this.bill.cargo
});
```

## Gestión de Propiedad de Recibos

La propiedad de los recibos se maneja automáticamente a través del sistema de autenticación:

1. **Asignación automática**: El campo `propietario_id` no se maneja explícitamente en el frontend, sino que se asigna automáticamente en el backend basándose en el token JWT del usuario autenticado.

2. **Filtrado automático**: El componente solo muestra los recibos que pertenecen al usuario actual o que están marcados como no privados y el usuario tiene permisos para verlos.

3. **Transparencia para el usuario**: El sistema de propiedad funciona de manera transparente para el usuario final, quien solo ve y gestiona los recibos a los que tiene acceso.

## Eventos y Estados

- **Expansión/contracción**: El componente permite expandir filas individuales o todas las filas para mostrar las fechas de cargo
- **Filtrado**: Implementa filtrado dinámico por periodicidad y estado de actividad
- **Selección**: Permite seleccionar múltiples recibos para operaciones en lote

## Ciclo de vida

En el evento `onMounted`, el componente:
1. Carga los recibos de todas las periodicidades
2. Obtiene la lista de categorías disponibles 
3. Carga la lista de cuentas bancarias disponibles
4. Configura el estado inicial de filtros y expansión

## Estructura del Template

El template está estructurado en varias secciones:

1. **Pestañas de periodicidad**: Permiten cambiar entre las diferentes vistas de recibos (mensuales, bimestrales, trimestrales, anuales)
2. **Tarjetas por periodicidad**: Cada periodicidad se muestra en una tarjeta independiente con su propia barra de herramientas
3. **Tablas de recibos**: Muestran los recibos con sus datos principales, con la opción de expandir para ver las fechas de cargo
4. **Diálogos de edición**: Varios diálogos específicos según la periodicidad y operación (crear, editar, eliminar)
5. **Selectores de cuenta**: En los diálogos de creación/edición para asociar el recibo a una cuenta bancaria

## Referencias

- [BillService](../services/BillService.md) - Servicio que gestiona la comunicación con la API de recibos
- [API de Recibos](../routes/recibos.md) - Endpoints del backend para la gestión de recibos
- [Utilidades de Base de Datos](../db/db_utilsBill.md) - Funciones de acceso a datos de recibos