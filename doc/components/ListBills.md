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
- Visualización expandible de fechas de cargo asociadas a cada recibo trimestral, bimestral o mensual
- Filtrado por periodicidad y estado de actividad
- Selector de año en la barra superior: se muestran los cargos del año elegido (por defecto el actual) y, en el año en curso, los cargos pendientes de años anteriores marcados como «Atrasado» (DC-18)
- Importe propio en cada fecha de cargo, editable desde el lápiz de la fecha (DC-15)
- Ejercicio cerrado (año anterior al actual): no se puede añadir ni editar el recibo, y solo se pueden editar los cargos que siguen pendientes; los botones se ven deshabilitados (DC-20)
- Un cargo pagado solo se puede editar o borrar durante el mes en que vence; después queda cerrado, con el lápiz y la papelera deshabilitados (DC-21)
- Al añadir fechas, generarlas o actualizar la lista se conservan los recibos expandidos; solo el cambio de año los contrae
- «+» está activo si al recibo le falta cualquier fecha del año en curso (incluso una ya pasada, para añadirla a mano); «Generar nuevas fechas» solo si faltan fechas posteriores al último cargo o huecos cuya fecha aún no ha llegado (DC-22)
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
| `monthlyBills` | `ref([])` | Lista de cargos mensuales recuperados de la base de datos, agrupados por recibo en la tabla |
| `expandedRowsMensual` | `ref([])` | Filas expandidas de la tabla de mensuales |
| `selectedYear` | `ref(año actual)` | Año cuyos cargos se muestran; los atrasados solo aparecen si es el año en curso |
| `inactiveBills` | `ref([])` | Lista de recibos inactivos recuperados de la base de datos |
| `bill` | `ref({})` | Objeto que almacena los datos del recibo en edición |
| `categorias` | `ref([])` | Lista de categorías disponibles para asignar a los recibos |
| `cuentas` | `ref([])` | Lista de cuentas bancarias disponibles para asociar a los recibos |
| `modoFechas` | `ref('manual')` | Modo de programación de fechas del recibo en edición: `manual` (el usuario fija cada fecha) o `auto` (se generan desde `fecha_inicial`) |

### Estados de Diálogos

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `billDialog` | `ref(false)` | Controla la visibilidad del diálogo principal de edición de recibos |
| `billDialogTB` | `ref(false)` | Controla la visibilidad del diálogo del recibo trimestral, bimestral o mensual |
| `billDialogTB_FC` | `ref(false)` | Controla la visibilidad del diálogo de una fecha de cargo (fecha, estado, comentario e importe) de trimestrales, bimestrales y mensuales |
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
| `fecha_inicial` | Date | Fecha desde la que se generan las fechas de cargo en modo automático |

## Funciones Principales

### Gestión de Recibos

| Función | Descripción |
|---------|-------------|
| `updateBills(periodicity)` | Actualiza los recibos de la periodicidad especificada |
| `fetchBills(periodicity)` | Carga los cargos de una periodicidad para el año elegido y, en el año en curso, añade los atrasados marcados con `atrasado` |
| `reloadBills()` | Recarga en silencio todas las periodicidades (la usan los botones de año) |
| `changeYear(delta)` / `resetYear()` | Cambian el año mostrado o vuelven al año en curso |
| `puedeEditarCargo(cargo)` | Indica si el lápiz y la papelera de un cargo están activos: siempre si está pendiente; si está pagado, solo durante su mes (o con la opción de Ajustes, pendiente) |
| `puedeAnadirFecha(grupo)` / `puedeGenerarFechas(grupo)` | Activan el «+» (falta cualquier fecha) y «Generar nuevas fechas» (faltan fechas generables); replican `fechasFaltantes` del backend |
| `openNew(periodicity)` | Inicializa un nuevo objeto recibo para la periodicidad indicada, en modo manual y sin fecha inicial (F-18) |
| `guardarRecibo()` | Guarda un recibo nuevo o actualiza uno existente |
| `editBill(prod, openFCDialog)` | Carga los datos de un recibo existente para su edición, siempre en modo de fechas manual (F-04) |
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

## Modo de programación de fechas

Los diálogos de recibo ofrecen dos modos para las fechas de cargo (`modoFechas`):

- Manual: el usuario fija cada fecha. Es el modo de partida al crear un recibo y siempre al editar uno (DC-11); nunca se deduce de que el recibo tenga `fecha_inicial`.
- Automático: las fechas se generan desde `fecha_inicial` según la periodicidad. Solo se activa si el usuario lo elige. Al editar un recibo existente, el diálogo avisa de que se reescribirán las fechas pendientes; las ya pagadas (estado `cargado`) se conservan.

`guardarRecibo()` envía `modoFechas` al backend. El diálogo de una fecha individual (`billDialogTB_FC`) fuerza siempre el modo manual y envía solo esa fecha.

Si en modo automático se ha conservado alguna fecha pagada, el aviso de guardado pasa de «Éxito» a una advertencia que indica cuántas fechas pagadas no se han modificado y cuántas pendientes se han actualizado. Para corregir una fecha pagada hay que editarla en modo manual.

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

## Validaciones

Antes de enviar, `guardarRecibo()` comprueba concepto, periodicidad, importe (mayor que 0), categoría y cuenta, y muestra un aviso con los campos que faltan. El servidor repite la comprobación y también nombra los que faltan. El propietario no se introduce: lo asigna el servidor a partir del usuario autenticado.

## Referencias

- [BillService](../services/BillService.md) - Servicio que gestiona la comunicación con la API de recibos
- [API de Recibos](../routes/recibos.md) - Endpoints del backend para la gestión de recibos
- [Utilidades de Base de Datos](../db/db_utilsBill.md) - Funciones de acceso a datos de recibos