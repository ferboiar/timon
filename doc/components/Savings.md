# Componente Savings

Fuente: `src/views/pages/Savings.vue`. Revisión estática completa: 2026-10-23.

## Alcance real

Gestiona ahorros y movimientos individuales: crear, editar, borrar, expandir movimientos y exportarlos. Muestra concepto, descripción, ahorrado, fecha objetivo, periodicidad y ahorro sugerido. No calcula porcentaje de progreso ni genera una planificación automática de aportaciones.

## Estado

`savings`, `selectedSavings` y `saving` contienen la lista, selección y formulario. `movimientos` relaciona IDs de ahorro con sus movimientos; `movimiento` contiene el formulario individual. Los diálogos son `savingDialog`, `deleteSavingDialog`, `deleteSelectedSavingsDialog` y `savingMovimientoDialog`.

`isFormValid` exige concepto no vacío. `isMovimientoFormValid` exige fecha y tipo, no un importe positivo. Las descripciones de ambos formularios están limitadas a 255 caracteres en pantalla. `savingHasMovimientos` impide editar Ahorrado cuando el ahorro tiene movimientos precargados; el backend vuelve a comprobar la restricción (DC-10).

## Carga y operaciones

Al montar se ejecutan `fetchSavings`, `fetchPeriodicidades` y `fetchAllMovimientos`, secuencialmente. `fetchSavings` capitaliza el concepto y convierte fecha_objetivo a Date. `fetchAllMovimientos` usa Promise.all; `fetchMovimientos(id)` carga un ahorro y se utiliza al expandirlo.

| Función | Comportamiento actual |
|---|---|
| `openNewSaving()` / `editSaving(sav)` | Preparan el formulario; el alta propone activo=1 |
| `saveSaving()` | Convierte fecha_objetivo del propio formulario a texto; periodicidad vacía pasa a NULL; guarda, recarga ahorros y cierra |
| `confirmDeleteSaving` / `deleteSaving()` | Piden confirmación y borran el ahorro; después del await se usa getCurrentInstance().refs, que puede fallar aunque el borrado haya funcionado (F-07) |
| `confirmDeleteSelectedSavings` / `deleteSelectedSavings()` | Confirman y envían IDs en lote |
| `updateSavings()` | Recarga solo la lista de ahorros, no todos sus movimientos |
| `openNewMovimiento(id)` / `editMovimiento(mov)` | Preparan el movimiento nuevo o copiado |
| `saveMovimiento()` | Normaliza la fecha, guarda un movimiento y lanza recargas de ahorros y movimientos |
| `deleteMovimiento(mov)` | Borra sin diálogo de confirmación y lanza recargas |

## Aportaciones periódicas o sin patrón

La periodicidad y el importe sugerido son campos descriptivos: no disparan movimientos automáticos. El selector obtiene opciones del servidor y añade una vacía; esta se guarda como NULL. Ya se pueden registrar manualmente movimientos con fechas e importes arbitrarios, positivos o negativos, sin elegir una periodicidad. Las etiquetas regular/extraordinario son seleccionadas por el usuario, no comprobadas contra un calendario.

El requisito del usuario permite ahorros diarios, semanales, otras cadencias o puntuales. El código no los trata como recibos: las opciones explícitas disponibles dependen del esquema que consulta getPeriodicidades (F-37). No deben inferirse reglas de negocio de los registros de prueba.

## Expansión, inactivos y CSV

`expandedRows`, `expandedCount`, `isExpanded` y `savingsWithMovements` controlan la expansión; `onRowExpand`, `onRowCollapse` y `toggleExpandCollapseAll` la actualizan.

`toggleShowInactive` solo alterna `showInactive` y la etiqueta del botón. La tabla sigue enlazada a `savings`, sin filtrar. `hasInactiveSavings` solo habilita el botón; el formulario no ofrece un control para cambiar activo (F-08).

`exportCSV` genera `savings.csv`, UTF-8 con BOM, separador `;` y coma decimal. Produce una fila por movimiento, repitiendo los datos del ahorro, o una fila si no hay movimientos. No escapa separadores, saltos, comillas ni fórmulas (F-19).

## Limitaciones pendientes

- F-07 y F-08: borrado individual con error posterior y controles de inactivos incompletos.
- F-16: saveSaving muta fecha_objetivo a texto antes del POST; el reintento sin reabrir puede fallar. No es una garantía de reintento seguro.
- F-28: los avisos usan error.message.
- Borrar un padre con movimientos puede fallar por FK (F-10); no se afirma cascada.

Ver [SavService](../services/SavService.md), [acceso a datos](../db/db_utilsSav.md) y [registro de hallazgos](../mantenimiento/registro-hallazgos.md).
