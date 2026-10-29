# Componente Savings

Fuente: `src/views/pages/Savings.vue`. Revisión estática completa: 2026-10-23.

## Alcance real

Gestiona ahorros y movimientos individuales: crear, editar, borrar, expandir movimientos y exportarlos. Muestra concepto, descripción, ahorrado, fecha objetivo, periodicidad y ahorro sugerido. No calcula porcentaje de progreso ni genera una planificación automática de aportaciones.

## Estado

`savings`, `selectedSavings` y `saving` contienen la lista, selección y formulario. `movimientos` relaciona IDs de ahorro con sus movimientos; `movimiento` contiene el formulario individual. Los diálogos son `savingDialog`, `deleteSavingDialog`, `deleteSelectedSavingsDialog` y `savingMovimientoDialog`.

`isFormValid` exige concepto no vacío. `isMovimientoFormValid` exige fecha y tipo, no un importe positivo. Las descripciones de ambos formularios están limitadas a 255 caracteres en pantalla. `savingHasMovimientos` impide editar Ahorrado cuando el ahorro tiene movimientos precargados; el backend vuelve a comprobar la restricción (DC-10).

## Carga y operaciones

Al montar se ejecutan `fetchSavings`, `fetchPeriodicidades` y `fetchAllMovimientos`, secuencialmente. `fetchSavings` capitaliza el concepto y convierte fecha_objetivo a Date. La capitalización es solo de pantalla, pero `editSaving` reenvía el concepto capitalizado al guardar (F-44, DC-31). `fetchAllMovimientos` usa Promise.all; `fetchMovimientos(id)` carga un ahorro y se utiliza al expandirlo.

| Función | Comportamiento actual |
|---|---|
| `openNewSaving()` / `editSaving(sav)` | Preparan el formulario; el alta propone activo=1. `editSaving` guarda una copia (`savingOriginal`, calculada con `snapshotSaving`) para detectar «guardar sin cambios» (DC-30) |
| `saveSaving()` | Si se edita un ahorro y no se ha cambiado nada, avisa «No se ha cambiado nada.» y cierra sin enviar nada (DC-30). Si no, convierte fecha_objetivo del propio formulario a texto; periodicidad vacía pasa a NULL; guarda, recarga ahorros y cierra |
| `confirmDeleteSaving` / `deleteSaving()` | Piden confirmación y borran el ahorro; tras borrar recargan la lista y cierran el diálogo, sin acceder a `getCurrentInstance().refs` (F-07). Los errores de borrado muestran el mensaje del servidor con `getApiErrorMessage` (F-10) |
| `confirmDeleteSelectedSavings` / `deleteSelectedSavings()` | Confirman y envían IDs en lote |
| `updateSavings()` | Recarga solo la lista de ahorros, no todos sus movimientos |
| `openNewMovimiento(id)` / `editMovimiento(mov)` | Preparan el movimiento nuevo o copiado |
| `saveMovimiento()` | Si se edita un movimiento y no se ha cambiado nada, avisa «No se ha cambiado nada.» y cierra sin enviar nada (DC-30). Si no, normaliza la fecha, guarda el movimiento y lanza recargas de ahorros y movimientos |
| `deleteMovimiento(mov)` | Borra sin diálogo de confirmación y lanza recargas |

## Aportaciones periódicas o sin patrón

La periodicidad y el importe sugerido son campos descriptivos: no disparan movimientos automáticos. El selector obtiene opciones del servidor y añade una vacía; esta se guarda como NULL. Ya se pueden registrar manualmente movimientos con fechas e importes arbitrarios, positivos o negativos, sin elegir una periodicidad. Las etiquetas regular/extraordinario son seleccionadas por el usuario, no comprobadas contra un calendario.

El requisito del usuario permite ahorros diarios, semanales, otras cadencias o puntuales. El código no los trata como recibos: las opciones explícitas disponibles dependen del esquema que consulta getPeriodicidades (F-37). No deben inferirse reglas de negocio de los registros de prueba.

## Expansión, inactivos y CSV

`expandedRows`, `expandedCount`, `isExpanded` y `savingsWithMovements` controlan la expansión; `onRowExpand`, `onRowCollapse` y `toggleExpandCollapseAll` la actualizan.

`toggleShowInactive` alterna `showInactive`; `visibleSavings` (computed) muestra solo los ahorros con `activo = 1` salvo que `showInactive` sea verdadero, y la tabla se enlaza a `visibleSavings` (F-08). `hasInactiveSavings` habilita el botón solo cuando hay algún ahorro inactivo. El diálogo de edición incluye el interruptor «Ahorro activo / inactivo», que guarda `activo` como 1 o 0. Un `watch` sobre `visibleSavings` quita de `selectedSavings` las filas que dejan de verse (inactivos ocultos o ahorro recién desactivado), para que «Borrar» no actúe sobre ellas.

`exportCSV` genera `savings.csv`, UTF-8 con BOM, separador `;` y coma decimal. Produce una fila por movimiento, repitiendo los datos del ahorro, o una fila si no hay movimientos. No escapa separadores, saltos, comillas ni fórmulas (F-19).

## Limitaciones pendientes

- F-07 y F-08 corregidos el 2026-10-29 (PR #41).
- U-09 y U-10 resueltos el 2026-10-30: el diálogo de movimientos aplica DC-30 y el modelo de inactivos quedó acordado en DC-34 (Ahorros ya lo cumplía). U-12: la ayuda de la vista se muestra como tooltip de un `QuestionCircle` junto al título.
- F-16: saveSaving muta fecha_objetivo a texto antes del POST; el reintento sin reabrir puede fallar. No es una garantía de reintento seguro.
- F-28: los avisos de borrado usan `getApiErrorMessage`; el resto usa error.message.
- F-10: `ahorros_movimientos` tiene ON DELETE CASCADE en 0001 (comprobado en la migración): borrar un ahorro con movimientos también borra sus movimientos y no falla por FK. La traducción de ER_ROW_IS_REFERENCED_2 a «No se puede eliminar el ahorro porque tiene registros asociados» (409) es defensiva, por si una tabla futura referencia `ahorros` sin cascada; no se ha provocado.

Ver [SavService](../services/SavService.md), [acceso a datos](../db/db_utilsSav.md) y [registro de hallazgos](../mantenimiento/registro-hallazgos.md).
