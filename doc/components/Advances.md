# Componente Advances

Fuente: `src/views/pages/Advances.vue`. Revisión estática completa: 2026-10-23.

## Alcance

Gestiona anticipos y sus pagos: alta, edición, borrado individual, generación o ampliación del plan, edición de pagos y borrado con tres alternativas. «Importe total» muestra el saldo restante (`importe_total`), no el principal original (F-14). Exporta anticipos, no sus pagos, a CSV.

## Estado y carga

`advances`, `selectedAdvances` y `advance` contienen la lista, la selección y el formulario. `pagos` relaciona cada ID de anticipo con sus pagos; `pago` es el formulario de pago. `originalImporte` e `isImporteModificado` detectan cambios de importe. `selectedPayment`, `isReplacingPayment`, `puedeRecalcular`, `dialogMessage` y `pagosPendientesCount` controlan el diálogo de borrado. `saldoRestante` se retiró por no usarse (F-17 ampliado).

Los diálogos son `advanceDialog`, `advancePagoDialog`, `deleteAdvanceDialog`, `deletePaymentDialog` y `confirmPaymentPlanDialog`. Existe también `deleteSelectedAdvancesDialog`, pero no hay un diálogo correspondiente en el template (F-39).

Al montar: `cargarZonaHoraria`, `fetchAdvances`, `fetchPeriodicidades`, `fetchAllPagos` y `fetchCuentas`, en ese orden. Las periodicidades proceden del servidor; la lista añade una opción vacía. Las fechas de anticipos y pagos se convierten con `fechaDeCalendario`; «Nuevo» usa `hoyEnZona` (DC-25). `updateAdvances` solo recarga los anticipos.

## Operaciones de anticipos

| Función | Comportamiento actual |
|---|---|
| `openNewAdvance()` | Inicializa el formulario con fecha de hoy y valores vacíos o cero |
| `editAdvance(adv)` | Copia el anticipo al formulario |
| `saveAdvance()` | Convierte las fechas del formulario a texto, convierte periodicidad vacía a NULL y llama a `AdvService.saveAdvance`; después recarga anticipos y pagos |
| `confirmDeleteAdvance(adv)` / `deleteAdvance()` | Preparan y ejecutan el borrado individual; si el anticipo no tiene ID válido, `confirmDeleteAdvance` registra el error en consola y termina con `return` sin abrir el diálogo (F-17 corregido) |
| `confirmCreatePaymentPlan(id)` / `handleCreatePaymentPlan()` | Piden confirmación y llaman a `createPaymentPlan` |
| `createPaymentPlan(id)` | Exige anticipo existente y pago sugerido numérico mayor que cero, llama a `recalculatePaymentPlan` del servicio y recarga listas |

El botón Guardar exige concepto, cuenta y fecha inicial; pago sugerido y periodicidad deben acompañarse. Las descripciones se limitan a 255 caracteres en los controles. Las fechas se mutan antes del POST, por lo que un reintento tras fallo puede fallar por tipo (F-16).

## Operaciones de pagos

| Función | Comportamiento actual |
|---|---|
| `fetchPagos(id)` / `fetchAllPagos()` | Cargan uno o todos los conjuntos de pagos; la segunda usa Promise.all |
| `openNewPago(id)` | Propone el sugerido, la cuenta origen como destino y un mes después del último pago; sin pagos, un mes después de hoy |
| `editPago(p)` | Copia los datos, normaliza la fecha y guarda el importe original |
| `savePago()` | Para nuevos pagos limita el importe al saldo no cubierto por pendientes; al editar envía directamente el formulario |
| `deletePago(p)` | Prepara el diálogo, excluye el pago elegido de los pendientes y calcula el aviso de saldo no planificado |
| `confirmDeletePago()` | Borra con `handlePaymentDeletion(id)` sin reparto |
| `recalculatePayments()` | Borra con `handlePaymentDeletion(id, true)` y muestra los contadores de cuotas ajustadas y nuevas; usa `getApiErrorMessage` en su error |
| `addNewPayment()` | Prepara un pago sustituto pendiente, de igual importe y con fecha un mes después del último pago restante |

`isPagoFormValid` comprueba fecha y tipo; Guardar exige además cuenta destino, pero no valida importe positivo en ese computed. El botón Recalcular pagos solo se deshabilita si faltan sugerido positivo o periodicidad.

La sustitución excluye el pago antiguo del cálculo de pendientes, guarda el nuevo y después borra el antiguo: son dos peticiones independientes (F-25 corregido en su flujo, atomicidad pendiente). Al editar no se aplica el límite de saldo que se aplica a las altas. La advertencia de recálculo aparece para cualquier pago con importe cambiado, pero el servidor solo redistribuye si queda pendiente (F-14).

## Tabla, expansión y exportación

`expandedRows`, `expandedCount`, `isExpanded` y `advancesWithPayments` controlan la expansión. `onRowExpand` carga los pagos del anticipo; `onRowCollapse` actualiza el estado; `toggleExpandCollapseAll` alterna el conjunto completo.

`exportCSV` genera `anticipos.csv` con BOM UTF-8, separador `;`, coma decimal y campos entre comillas. No incluye filas de pagos, no escapa comillas interiores ni neutraliza fórmulas (F-19).

## Fallos y límites documentados, no corregidos aquí

- F-14: saldo restante y edición del importe manteniendo pagado; no se debe prometer conciliación automática en todos los caminos.
- F-16: las fechas del formulario se mutan antes de confirmar el éxito, y un reintento tras fallo puede fallar por tipo.
- F-27: operaciones del backend sin transacción; la sustitución también son dos peticiones.
- F-28: salvo el error de recalcular, los avisos siguen usando `error.message`.
- F-39: botón de borrado múltiple sin diálogo/ejecución completos.
- F-40: propuestas de fechas manuales incrementan un mes fijo, no la periodicidad del anticipo.

Las trazas `savePago` y `recalculatePayments` se escriben en consola; no acreditan atomicidad. Ver [acceso a datos](../db/db_utilsAdv.md), [AdvService](../services/AdvService.md), [AccService](../services/AccService.md) y [zona horaria](../composables/useZonaHoraria.md).
