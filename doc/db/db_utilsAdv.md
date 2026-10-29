# Utilidades de Base de Datos para Anticipos

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con anticipos y pagos. Implementa la lógica de negocio para operaciones CRUD, así como algoritmos complejos para la gestión de planes de pago y recálculo de importes.

## Características Principales

- Gestión completa de operaciones CRUD para anticipos y sus pagos asociados
- Cálculo automático de planes de pago basados en periodicidad y monto total
- Recálculo dinámico de pagos pendientes tras modificaciones
- Manejo de diferentes periodicidades (mensual, bimestral, trimestral, anual)
- Cada sentencia se confirma por separado: las operaciones de anticipos no usan transacciones (pendiente, hallazgo F-27 del registro de mantenimiento)
- Validación de datos y manejo de errores robusto

## Estructura de Datos

### Tabla `anticipos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `concepto` | VARCHAR | Descripción corta del anticipo |
| `importe_total` | DECIMAL | Saldo restante, no principal original; disminuye al pagar y se repone al volver a pendiente o borrar pagos pagados (F-14) |
| `pago_sugerido` | DECIMAL | Importe sugerido para cada pago |
| `fecha_inicio` | DATE | Fecha de inicio del anticipo |
| `fecha_fin_prevista` | DATE | Fecha estimada de finalización |
| `descripcion` | VARCHAR(255) | Descripción detallada (opcional) |
| `estado` | ENUM | Estado del anticipo: 'activo', 'pausado', 'cancelado', 'completado' |
| `cuenta_origen_id` | INT | ID de la cuenta de origen |
| `periodicidad` | ENUM | Frecuencia de pagos: 'mensual', 'bimestral', 'trimestral', 'anual' |
| `propietario_id` | INT | Usuario que creó el anticipo; obligatorio al crear |
| `es_privado` | TINYINT | Columna del esquema sin filtrado en los endpoints; en categorías no limita la visibilidad (S-01, DC-02) |

### Tabla `anticipos_pagos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `anticipo_id` | INT | Referencia al anticipo asociado |
| `importe` | DECIMAL | Cantidad del pago |
| `fecha` | DATE | Fecha programada del pago |
| `tipo` | ENUM | Tipo de pago: 'regular', 'extraordinario' |
| `descripcion` | VARCHAR(255) | Descripción del pago (opcional) |
| `estado` | ENUM | Estado del pago: 'pendiente', 'pagado', 'cancelado' |
| `cuenta_destino_id` | INT | ID de la cuenta destino |

## Funciones Principales

### Gestión de Anticipos

| Función | Descripción |
|---------|-------------|
| `getAdvances()` | Obtiene todos los anticipos ordenados por fecha de inicio |
| `pushAdvance(id, concepto, ...)` | Crea o actualiza un anticipo. Al crear exige el propietario. Genera o recalcula el plan solo si hay periodicidad y un pago sugerido mayor que 0; si no, lo anota en el log con el motivo |
| `deleteAdvances(advances)` | Elimina uno o más anticipos y sus pagos asociados |
| `getPeriodicidades()` | Obtiene las periodicidades definidas en el esquema |

### Gestión de Pagos

| Función | Descripción |
|---------|-------------|
| `getPagos(anticipoId)` | Obtiene los pagos asociados a un anticipo |
| `pushPago(id, anticipo_id, ...)` | Crea o actualiza un pago con todos sus atributos |
| `deletePago(id)` | Elimina un pago específico |
| `handlePaymentDeletion(pagoId, redistribuir)` | Elimina un pago y devuelve `saldoRestante`, `anticipoId`, `redistribuido`, `pagosAjustados` y `pagosCreados`. Con `redistribuir` verdadero completa el plan con su importe según DC-12 y exige pago sugerido y periodicidad |

### Planes de Pago

| Función | Descripción |
|---------|-------------|
| `recalculatePaymentPlan(anticipoId, ...)` | Genera o actualiza un plan de pagos para un anticipo |
| `recalculatePostEditPayments(anticipo_id, ...)` | Recalcula los pagos pendientes después de editar un pago |
| `recalculatePendingPayments(anticipoId)` | Redistribuye importes entre pagos pendientes a partes iguales. No la usa ninguna ruta |

## Algoritmos Clave

### Generación de Planes de Pago

El algoritmo para `recalculatePaymentPlan` implementa la siguiente lógica:

1. Obtiene todos los pagos existentes del anticipo
2. Calcula el saldo restante después de considerar los pagos pendientes, redondeado a céntimos en cada paso para evitar residuos de coma flotante (F-36)
3. Determina la fecha del próximo pago basándose en la periodicidad
4. Si queda saldo por planificar, convierte el sugerido a número, exige que sea finito y positivo y limita a 1.200 los pagos nuevos de la llamada, no el total histórico. Si falla no inserta pagos, pero pushAdvance puede haber guardado ya el anticipo (F-02, F-24, F-27)
5. Crea nuevos pagos hasta cubrir el importe total del anticipo
6. Actualiza la fecha fin prevista del anticipo

### Recálculo de Pagos tras Edición

La función `recalculatePostEditPayments` implementa un sofisticado algoritmo para redistribuir la diferencia de importe cuando un pago es modificado:

1. Calcula la diferencia y consulta solo pendientes con fecha estrictamente posterior a la fecha anterior del pago editado; sin posteriores o con diferencia menor de 0,01, termina
2. Si la diferencia es positiva (reducción del pago):
   - Primero, intenta llevar los pagos por debajo del importe sugerido hasta ese valor
   - Luego, distribuye equitativamente cualquier cantidad restante
3. Si la diferencia es negativa (aumento del pago):
   - Primero, reduce los pagos por encima del importe sugerido
   - Luego, distribuye una reducción base y restos entre los pagos aún no ajustados; no es proporcional al importe de cada cuota

### Borrado de un pago con reparto

`handlePaymentDeletion(pagoId, redistribuir)` elimina el pago y devuelve `saldoRestante`, `anticipoId`, `redistribuido`, `pagosAjustados` y `pagosCreados`. Con `redistribuir` verdadero (DC-12) comprueba antes de borrar que el anticipo tenga pago sugerido mayor que 0 y periodicidad; si no, falla con un error 400 y no borra nada.

Después, `completarPlanTrasBorrado` calcula el importe que falta por colocar (el saldo del anticipo menos la suma de los pagos pendientes), sube primero los pagos pendientes que estén por debajo del pago sugerido hasta ese tope y, si aún queda importe, llama a `recalculatePaymentPlan` para crear los pagos nuevos de hasta el pago sugerido, a continuación del último pago y según la periodicidad. Las cuotas ajustadas no se elevan por encima del sugerido y las nuevas tampoco lo superan; las que ya lo superaban no se reducen. La fecha fin se actualiza si se crean cuotas nuevas. `redistribuido` es falso solo si no había importe que colocar.

La edición de un pago (`recalculatePostEditPayments`) sigue repartiendo la diferencia a partes iguales (DC-08).

La sustitución («Añadirlo en uno nuevo») la orquesta la pantalla: guarda el pago nuevo y después borra el antiguo sin repartir (F-25).

## Trazas en el log

Cada paso deja trazas en el log del backend con el formato «módulo - acción: datos» (DC-09):

- `pushAdvance - Plan de pagos no generado …` o `… no recalculado …`, con el motivo, cuando no hay periodicidad o el pago sugerido no es mayor que 0.
- `pushAdvance - Concepto normalizado a minúsculas: …` Cuando el concepto llega con mayúsculas o espacios; se guarda en minúsculas y sin espacios sobrantes (F-44, DC-31).
- `handlePaymentDeletion - Eliminando el pago ID: … (anticipo …, importe …, estado …, redistribuir: …)` al borrar un pago.
- `completarPlanTrasBorrado - Anticipo …: saldo …, pendientes …, por colocar …` con el importe que falta por colocar, `… Pago ID … de A a B (+C)` por cada pago ajustado y un resumen `… N pagos ajustados y M pagos nuevos`. Los pagos nuevos dejan además las trazas habituales de `recalculatePaymentPlan`.
- Las líneas `recalculatePaymentPlan - …` y `recalculatePostEditPayments - …` describen cada importe y fecha calculados.

## Consideraciones de Rendimiento

- Las operaciones de recálculo de pagos (`recalculatePostEditPayments`, `recalculatePaymentPlan`) pueden ser intensivas en recursos para anticipos con muchos pagos.
- Las operaciones de anticipos y pagos no usan transacciones: un fallo intermedio puede dejar un plan a medias (hallazgo F-27 del registro de mantenimiento).

## Referencias

- [Documentación de la API de Anticipos](../routes/anticipos.md) - Rutas que utilizan estas funciones
- [Documentación de AdvService](../services/AdvService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Advances](../components/Advances.md) - Interfaz de usuario para anticipos y pagos

## Ejecución y límites comprobados

- recalculatePaymentPlan no elimina pagos existentes: resta del saldo la suma de pendientes y añade lo que falta. Sin pagos empieza en fecha_inicio; con pagos avanza desde el último de cualquier estado. Usa la cuenta origen como destino de las cuotas generadas.
- getPeriodicidades lee el ENUM del esquema. El algoritmo getMonthsFromPeriodicidad sí está codificado para mensual/bimestral/trimestral/anual y devuelve 0 para otros valores. Usa setMonth, no la secuencia anclada de recibos.
- pushPago descuenta al insertar pagado o pasar a pagado; repone el importe anterior al volver a pendiente. Cambiar importe manteniendo pagado no ajusta el saldo. Una nueva cuota extraordinaria llama a recalculatePaymentPlan. No deben confundirse estos caminos (F-14).
- recalculatePostEditPayments es interna, no exportada. Reparte entre posteriores; puede superar el sugerido y realiza un ajuste final en el último pendiente si la discrepancia supera un céntimo. Aplica mínimos de 0,01 en ciertas reducciones: no es una garantía incondicional de conciliación.
- completarPlanTrasBorrado es interna y completa todo el saldo no cubierto por pendientes, no solo el importe del último pago borrado. recalculatePendingPayments está exportada pero no la usa ninguna ruta.
- deletePago no retorna saldo; handlePaymentDeletion sí retorna los contadores documentados. Borrar un pagado repone saldo pero ninguno de esos borrados reactiva por sí solo un anticipo completado (F-14).
- deleteAdvances borra primero pagos y después anticipos, sin transacción; las demás operaciones compuestas tampoco usan beginTransaction/commit/rollback (F-27).

Las trazas arriba descritas existen en pushAdvance, recalculatePaymentPlan, recalculatePostEditPayments, handlePaymentDeletion y completarPlanTrasBorrado, incluidos los caminos sin generación o sin importe por colocar. Son registro de ejecución, no garantía de atomicidad. No se han ejecutado nuevas pruebas funcionales en esta auditoría.
