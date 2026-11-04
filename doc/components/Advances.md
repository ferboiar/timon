# Componente Advances

Fuente: `src/views/pages/Advances.vue`. Revisión estática completa: 2026-10-23.

## Alcance

Gestiona anticipos y sus pagos: alta, edición, borrado individual, generación o ampliación del plan, edición de pagos y borrado con tres alternativas. La tabla muestra «Importe» (el principal, `importe_original`) y «Pendiente» (el importe pendiente, calculado por el servidor); el formulario edita el importe (DC-38). El estado «completado» se deduce del importe pendiente y no se elige. Exporta anticipos, no sus pagos, a CSV.

## Estado y carga

`advances`, `selectedAdvances` y `advance` contienen la lista, la selección y el formulario. `pagos` relaciona cada ID de anticipo con sus pagos; `pago` es el formulario de pago. `originalImporte` e `isImporteModificado` detectan cambios de importe. `selectedPayment`, `isReplacingPayment`, `puedeRecalcular`, `dialogMessage` y `pagosPendientesCount` controlan el diálogo de borrado. `saldoRestante` se retiró por no usarse (F-17 ampliado).

Los diálogos son `advanceDialog`, `advancePagoDialog`, `deleteAdvanceDialog`, `deletePaymentDialog` y `confirmPaymentPlanDialog`. Existe también `deleteSelectedAdvancesDialog`, pero no hay un diálogo correspondiente en el template (F-39).

Al montar: `cargarZonaHoraria`, `fetchAdvances`, `fetchPeriodicidades`, `fetchAllPagos` y `fetchCuentas`, en ese orden. Las periodicidades proceden del servidor; la lista añade una opción vacía. Las fechas de anticipos y pagos se convierten con `fechaDeCalendario`; «Nuevo» usa `hoyEnZona` (DC-25). `updateAdvances` solo recarga los anticipos.

## Operaciones de anticipos

| Función | Comportamiento actual |
|---|---|
| `openNewAdvance()` | Inicializa el formulario con fecha de hoy y valores vacíos o cero |
| `editAdvance(adv)` | Copia el anticipo al formulario y guarda una copia (`advanceOriginal`, con `snapshotAdvance`) para detectar «guardar sin cambios» (DC-30) |
| `saveAdvance()` | Si se edita un anticipo y no se ha cambiado nada, avisa «No se ha cambiado nada.» y cierra sin enviar nada (DC-30). Si no, convierte las fechas del formulario a texto, convierte periodicidad vacía a NULL y llama a `AdvService.saveAdvance`; después recarga anticipos y pagos. El servidor guarda el concepto en minúsculas (DC-31) y la pantalla lo capitaliza al mostrarlo |
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
| `savePago()` | Para nuevos pagos limita el importe al importe pendiente no cubierto por los pagos pendientes; al editar envía directamente el formulario; si es una sustitución llama a `AdvService.replacePago`, una sola petición atómica (F-27, DC-39) |
| `deletePago(p)` | Prepara el diálogo, excluye el pago elegido de los pendientes y calcula el aviso de importe no planificado |
| `confirmDeletePago()` | Borra con `handlePaymentDeletion(id)` sin reparto |
| `recalculatePayments()` | Borra con `handlePaymentDeletion(id, true)` y muestra los contadores de cuotas ajustadas y nuevas; usa `getApiErrorMessage` en su error |
| `addNewPayment()` | Prepara un pago sustituto pendiente, de igual importe y con fecha un mes después del último pago restante |

`isPagoFormValid` comprueba fecha y tipo; Guardar exige además cuenta destino, pero no valida importe positivo en ese computed. El botón Recalcular pagos solo se deshabilita si faltan sugerido positivo o periodicidad.

La sustitución excluye el pago antiguo del cálculo de pendientes y llama a `AdvService.replacePago`: el servidor crea el pago nuevo y borra el antiguo en una sola transacción (F-25, F-27, DC-39). Los borrados usan `DELETE …/pagos/:id?redistribuir=…` a través de `AdvService.handlePaymentDeletion`. Al editar no se aplica el límite del importe pendiente que se aplica a las altas. El aviso del diálogo depende del caso (DC-40): al editar un pago pendiente anuncia que el resto de pagos pendientes se recalculará; con un pago pagado anuncia que se recalculará en proporción si el plan cuadra (`planCuadrado`, suma de pendientes igual al importe pendiente) y, si no cuadra, que no se recalculará y que hay que ajustarlos a mano o completar el plan. El desplegable de estado no permite cancelar un pago que estaba pagado.

## Tabla, expansión y exportación

`expandedRows`, `expandedCount`, `isExpanded` y `advancesWithPayments` controlan la expansión. `onRowExpand` carga los pagos del anticipo; `onRowCollapse` actualiza el estado; `toggleExpandCollapseAll` alterna el conjunto completo.

U-11: `showInactive` alterna entre ver solo los anticipos con `estado = 'activo'` (`visibleAdvances`) y verlos todos; `hasInactiveAdvances` deshabilita el botón cuando no hay pausados, cancelados ni completados; un `watch` sobre `visibleAdvances` retira de `selectedAdvances` las filas que dejan de verse. U-12: la ayuda de la vista es un tooltip (`QuestionCircle`) junto al título. DC-30: `editAdvance` guarda `advanceOriginal` y `saveAdvance` avisa «No se ha cambiado nada.» si no hay cambios.

`exportCSV` genera `anticipos.csv` con BOM UTF-8, separador `;`, coma decimal y campos entre comillas. No incluye filas de pagos, no escapa comillas interiores ni neutraliza fórmulas (F-19).

## Fallos y límites documentados, no corregidos aquí

- F-14 / DC-38: el importe pendiente se deriva y es coherente; al editar un pago pagado los pagos pendientes se recalculan solo si el plan cuadraba (DC-40); del paso c siguen pendientes el modo automático o manual por anticipo y la vista previa. No se debe prometer conciliación automática del plan pendiente.
- F-16: las fechas del formulario se mutan antes de confirmar el éxito, y un reintento tras fallo puede fallar por tipo.
- F-27 (resuelto en el servidor, DC-39): las operaciones compuestas del backend son transaccionales y la sustitución es una sola petición.
- F-28: los avisos de guardar y borrar anticipos y pagos, generar el plan y recalcular muestran el mensaje del servidor con `getApiErrorMessage` (DC-39); el resto siguen usando `error.message`.
- F-39: botón de borrado múltiple sin diálogo/ejecución completos.
- F-40: propuestas de fechas manuales incrementan un mes fijo, no la periodicidad del anticipo.
- F-46 (DC-41, preparado en su rama): las propuestas de fecha de un pago nuevo y de la sustitución usan sumarMesAnclado (`src/utils/fechasAnticipos.js`) con el día de fecha_inicio del anticipo, así que el 31 no desborda al mes siguiente; el plan automático del servidor usa la misma secuencia anclada. Esas propuestas siguen sumando un mes fijo (F-40) y no tienen prueba automática de pantalla.

Las trazas `savePago` y `recalculatePayments` se escriben en consola; no acreditan atomicidad. Ver [acceso a datos](../db/db_utilsAdv.md), [AdvService](../services/AdvService.md), [AccService](../services/AccService.md) y [zona horaria](../composables/useZonaHoraria.md).

## F-16: payloads de fechas

`saveAdvance` y `savePago` preparan un payload nuevo con las fechas convertidas mediante `fechaIsoDeCalendario`; no mutan `advance.value` ni `pago.value` antes de que el servidor confirme el guardado. En una alta de pago, el importe ajustado se calcula en el payload, no en el formulario. Tras un error, el formulario conserva su estado y el reintento envía un payload válido.
