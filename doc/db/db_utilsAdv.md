# Utilidades de Base de Datos para Anticipos

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con anticipos y pagos. Implementa la lógica de negocio para operaciones CRUD, así como algoritmos complejos para la gestión de planes de pago y recálculo de importes.

## Características Principales

- Gestión completa de operaciones CRUD para anticipos y sus pagos asociados
- Cálculo automático de planes de pago basados en periodicidad y monto total
- Recálculo dinámico de pagos pendientes tras modificaciones
- Manejo de diferentes periodicidades (mensual, bimestral, trimestral, anual)
- Las operaciones que escriben en varias filas se ejecutan en una transacción con el anticipo bloqueado: o se aplican enteras o no se aplica nada (F-27, DC-39)
- La capa de base de datos no actúa sobre un pago que no pertenezca al anticipo recibido: `pushPago` rechaza con 400 `PADRE_INCORRECTO` y las lecturas y escrituras de pagos se acotan con `anticipo_id` (S-26)
- Validación de datos y manejo de errores robusto

## Estructura de Datos

### Tabla `anticipos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `concepto` | VARCHAR | Descripción corta del anticipo |
| `importe_original` | DECIMAL | Principal del anticipo: lo prestado o adelantado. Lo escribe el usuario y no cambia al pagar. Sustituye a `importe_total` (migración 0005, DC-38) |
| *(pendiente)* | calculado | No es una columna: `importe_original` menos la suma de los pagos en estado `pagado`. Es el importe pendiente de pago; las consultas lo devuelven como `pendiente` |
| `pago_sugerido` | DECIMAL | Importe sugerido para cada pago |
| `fecha_inicio` | DATE | Fecha de inicio del anticipo |
| `fecha_fin_prevista` | DATE | Fecha estimada de finalización |
| `descripcion` | VARCHAR(255) | Descripción detallada (opcional) |
| `estado` | ENUM | Estado manual del anticipo. El ENUM del esquema admite 'activo', 'pausado', 'cancelado' y 'completado' (0001); la 0005 solo convierte a 'activo' los valores guardados. La aplicación no guarda 'completado': lo deduce del importe pendiente, lo devuelve en las consultas y normaliza a 'activo' el que recibe (DC-38). Sigue admitido en el esquema (D-39) |
| `cuenta_origen_id` | INT | ID de la cuenta de origen |
| `periodicidad` | ENUM | Frecuencia de pagos: 'mensual', 'bimestral', 'trimestral', 'anual' |
| `propietario_id` | INT | Usuario que creó el anticipo; obligatorio al crear |
| `es_privado` | TINYINT | 1 = solo lo ven su propietario y el admin; los pagos heredan la visibilidad del anticipo. El listado filtra con `filtrarVisibles` (S-01, DC-48). `pushAdvance` solo lo escribe si la ruta le pasa un valor (con `null` conserva el guardado) y el cambio lo autoriza DC-75 |

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
| `getAdvances()` | Obtiene todos los anticipos ordenados por fecha de inicio, con `importe_original`, el `pendiente` calculado y el `estado` efectivo (DC-38) |
| `pushAdvance(id, concepto, ...)` | Crea o actualiza un anticipo; el importe es el principal (`importe_original`, no negativo) y un estado `completado` recibido se guarda como `activo` (DC-38). Al crear exige el propietario. Genera o recalcula el plan solo si hay periodicidad y un pago sugerido mayor que 0; si no, lo anota en el log con el motivo. Todo en una transacción: si falla el plan, el anticipo no se crea ni se modifica (F-27, DC-39). Guarda el concepto sin espacios sobrantes y en minúsculas (DC-31, F-44) |
| `deleteAdvances(advances)` | Elimina uno o más anticipos y sus pagos asociados, en una transacción (F-27, DC-39). Acota el borrado de los pagos con la misma lista validada de identificadores (`anticipo_id IN (…)`) y rechaza con 400 la lista vacía o con identificadores que no sean enteros positivos, sin construir un `IN ()` inválido (S-26) |
| `getPeriodicidades()` | Obtiene las periodicidades definidas en el esquema |

### Gestión de Pagos

| Función | Descripción |
|---------|-------------|
| `getPagos(anticipoId)` | Obtiene los pagos asociados a un anticipo |
| `pushPago(id, anticipo_id, ...)` | Crea o actualiza un pago con todos sus atributos. No guarda ningún importe pendiente (se deriva de los pagos pagados) y rechaza pasar de pagado a cancelado (DC-38). En una transacción con el anticipo bloqueado; al editar usa el anticipo del propio pago, rechaza con 400 `PADRE_INCORRECTO` si la petición indica otro y acota la relectura y el `UPDATE` con `AND anticipo_id = ?`; devuelve el id del pago (F-27, DC-39, S-26) |
| `sustituirPago(pagoId, datos)` | Crea un pago nuevo (pendiente) y borra el antiguo, sin repartir, en una sola transacción; relee el pago con el anticipo bloqueado, borra con `AND anticipo_id = ?` y devuelve `pagoNuevoId`, `anticipoId` y `pendiente` (F-25, F-27, DC-39, S-26) |
| `handlePaymentDeletion(pagoId, redistribuir)` | Elimina un pago y devuelve `pendiente`, `anticipoId`, `redistribuido`, `pagosAjustados` y `pagosCreados`. La segunda lectura del pago y el `DELETE` se acotan con `AND anticipo_id = ?` (S-26). Con `redistribuir` verdadero completa el plan con su importe según DC-12 y exige pago sugerido y periodicidad. Todo en una transacción: si el reparto falla, el pago no se borra (F-27, DC-39) |

### Planes de Pago

| Función | Descripción |
|---------|-------------|
| `recalculatePaymentPlan(anticipoId, ...)` | Genera o actualiza un plan de pagos para un anticipo. Abre su transacción y bloquea el anticipo, o se une a la de quien la llame si recibe una conexión (DC-39) |
| `recalculatePostEditPayments(anticipo_id, ...)` | Recalcula los pagos pendientes después de editar un pago. Interna: recibe la conexión de pushPago y el id del pago editado, que excluye siempre del reparto y del ajuste final (F-62) |
| `recalculatePendingPayments(anticipoId)` | Redistribuye importes entre pagos pendientes a partes iguales. No la usa ninguna ruta |

## Algoritmos Clave

### Generación de Planes de Pago

El algoritmo para `recalculatePaymentPlan` implementa la siguiente lógica:

1. Obtiene todos los pagos existentes del anticipo
2. Calcula el importe que falta por planificar (el importe pendiente menos los pagos pendientes), redondeado a céntimos en cada paso para evitar residuos de coma flotante (F-36)
3. Determina la fecha del próximo pago basándose en la periodicidad
4. Si queda importe por planificar, convierte el sugerido a número, exige que sea finito y positivo y limita a 1.200 los pagos nuevos de la llamada, no el total histórico. Si falla no inserta pagos y, como va en la transacción de quien la llama, tampoco se guarda el anticipo ni cambia nada (F-02, F-24, F-27, DC-39)
5. Crea nuevos pagos hasta cubrir el importe total del anticipo
6. Actualiza la fecha fin prevista del anticipo

### Recálculo de Pagos tras Edición

La función `recalculatePostEditPayments` implementa un sofisticado algoritmo para redistribuir la diferencia de importe cuando un pago es modificado:

1. Calcula la diferencia y consulta solo pendientes con fecha estrictamente posterior a la fecha anterior del pago editado, excluyendo el propio pago editado por su `id` (F-62); sin posteriores o con diferencia menor de 0,01, termina
2. Si la diferencia es positiva (reducción del pago):
   - Primero, intenta llevar los pagos por debajo del importe sugerido hasta ese valor
   - Luego, distribuye equitativamente cualquier cantidad restante
3. Si la diferencia es negativa (aumento del pago):
   - Primero, reduce los pagos por encima del importe sugerido
   - Luego, distribuye una reducción base y restos entre los pagos aún no ajustados; no es proporcional al importe de cada cuota

### Borrado de un pago con reparto

`handlePaymentDeletion(pagoId, redistribuir)` elimina el pago y devuelve `pendiente`, `anticipoId`, `redistribuido`, `pagosAjustados` y `pagosCreados`. Con `redistribuir` verdadero (DC-12) comprueba antes de borrar que el anticipo tenga pago sugerido mayor que 0 y periodicidad; si no, falla con un error 400 y no borra nada.

Después, `completarPlanTrasBorrado` calcula el importe que falta por colocar (el importe pendiente del anticipo menos la suma de los pagos pendientes), sube primero los pagos pendientes que estén por debajo del pago sugerido hasta ese tope y, si aún queda importe, llama a `recalculatePaymentPlan` para crear los pagos nuevos de hasta el pago sugerido, a continuación del último pago y según la periodicidad. Las cuotas ajustadas no se elevan por encima del sugerido y las nuevas tampoco lo superan; las que ya lo superaban no se reducen. La fecha fin se actualiza si se crean cuotas nuevas. `redistribuido` es falso solo si no había importe que colocar.

La edición de un pago (`recalculatePostEditPayments`) sigue repartiendo la diferencia a partes iguales (DC-08).

La sustitución («Añadirlo en uno nuevo») es una operación de la base de datos, sustituirPago: crea el pago nuevo y borra el antiguo, sin repartir, en una sola transacción (F-25, F-27, DC-39).

## Pertenencia padre-hijo de los pagos (S-26)

La ruta comprueba que el `anticipo_id` recibido coincide con el del pago (S-18), pero la capa de base de datos no se apoya solo en esa comprobación: cada consulta de un pago por su `id` se acota con el anticipo al que pertenece. El rechazo es un `ErrorDeNegocio` 400 con código `PADRE_INCORRECTO` que revierte la transacción entera, deja traza en el log (DC-09) y no escribe ni la fila ajena ni la propia.

| Función | Cómo acota cada consulta |
|---|---|
| `pushPago` | Edición: lee el `anticipo_id` del pago; si la petición trae otro, rechaza con 400 antes de bloquear o escribir. La relectura bajo el bloqueo y el `UPDATE` llevan `AND anticipo_id = ?`. Alta: inserta con el `anticipo_id` recibido y bloquea ese anticipo (404 si no existe). |
| `sustituirPago` | Localiza el anticipo del pago y lo bloquea; relee el pago con `AND anticipo_id = ?` antes de crear el sustituto y borra con `AND anticipo_id = ?`, comprobando que la baja alcanza una fila. Si no, 404 y no se crea el pago nuevo. |
| `handlePaymentDeletion` | Localiza el anticipo del pago y lo bloquea; la segunda lectura (importe y estado) y el `DELETE` llevan `AND anticipo_id = ?`. El reparto posterior ya filtraba por `anticipo_id`. |
| `deleteAdvances` | No recibe ids de pagos: borra con `anticipo_id IN (…)` usando la misma lista validada de anticipos que bloquea y elimina. Rechaza con 400 la lista vacía o con identificadores que no sean enteros positivos (la ruta ya la valida con `leerListaEnterosPositivos`). |
| `getPagos` | Filtra por `anticipo_id` desde el principio; el `id` del pago no se usa para localizarlo. |
| `generarPlanDePagos`, `recalculatePostEditPayments`, `completarPlanTrasBorrado`, `recalculatePaymentPlan`, `recalculatePendingPayments` | Todas sus consultas y escrituras de pagos filtran por `anticipo_id`; no reciben ids de pago sueltos. Sin cambios en S-26. |

Límites de la verificación: la prueba nueva reproduce el cruce con dos anticipos y comprueba el 400 y la ausencia de escrituras, y ejercita las operaciones válidas y las listas de borrado. La ventana de concurrencia entre la primera lectura y el bloqueo no se ha reproducido con dos sesiones simultáneas: el acotado de la segunda lectura y del `DELETE` es la garantía de que la operación no alcanza otra fila.

## Transacciones y bloqueo (F-27, DC-39)

Las operaciones que escriben en más de una fila se ejecutan con `enTransaccion` (en `db_connection.mjs`): o se aplican enteras (commit) o no se aplica nada (rollback). Antes, un fallo intermedio dejaba un plan a medias o un pago ya borrado sin su reparto.

| Operación | Qué incluye la transacción |
|---|---|
| `pushAdvance` | UPDATE o INSERT del anticipo y la generación o el completado de su plan |
| `pushPago` | UPDATE o INSERT del pago y el recálculo de los demás pagos (o la generación del plan si es extraordinario) |
| `handlePaymentDeletion` | Borrado del pago y, con reparto, el ajuste y la creación de pagos |
| `sustituirPago` | Alta del pago nuevo y baja del antiguo |
| `deleteAdvances` | Borrado de los pagos y de los anticipos |
| `recalculatePaymentPlan` y `recalculatePendingPayments` | Todos los pagos que crean o modifican |

Cómo funciona:

- `enTransaccion(conexionExterna, operacion)` abre una conexión, inicia la transacción, ejecuta la operación y confirma; si la operación lanza un error, deshace todo y relanza ese mismo error. Si recibe una conexión ya abierta, la operación se une a la transacción de quien la llama y no confirma ni deshace nada por su cuenta. Por eso las funciones internas (`generarPlanDePagos`, `completarPlanTrasBorrado` y `recalculatePostEditPayments`) reciben la conexión y no abren otra, y `recalculatePaymentPlan` y `recalculatePendingPayments` aceptan una conexión opcional para usarse sueltas o dentro de otra operación.
- Cada operación empieza con `bloquearAnticipo`: `SELECT id FROM anticipos WHERE id = ? FOR UPDATE`. El bloqueo dura hasta el final de la transacción y hace que dos peticiones sobre el mismo anticipo se ejecuten una detrás de otra, de modo que la segunda ve ya el resultado de la primera. Sin él, dos regeneraciones simultáneas del plan insertarían los mismos pagos dos veces.
- Orden de bloqueo: primero el anticipo y después sus pagos, siempre. Con un orden fijo, dos transacciones no pueden bloquearse entre sí (interbloqueo).
- Los pagos se leen otra vez ya con el anticipo bloqueado y acotados a él (`AND anticipo_id = ?`, S-26), porque mientras se esperaba otra petición pudo modificarlos o borrarlos. La base usa READ-COMMITTED, así que tras esperar el bloqueo se ve lo que la otra transacción confirmó.
- Errores con código: las funciones lanzan `errorHttp(404, …)` si el anticipo o el pago no existe y `errorHttp(400, …)` si los datos no son válidos (pago sugerido, límite de 1200 pagos, datos del pago nuevo, importe del anticipo). Las rutas los devuelven con su código; un error de clave foránea (por ejemplo, una cuenta inexistente) se traduce a 400 con `La cuenta indicada no existe`; los demás errores son fallos internos (500).
- Cada transacción deja una traza: `enTransaccion - Transacción confirmada` o `enTransaccion - Transacción deshecha: motivo`. Si el rollback falla, se registra `enTransaccion - Error al deshacer la transacción: …` y se conserva el error original.

## Trazas en el log

Cada paso deja trazas en el log del backend con el formato «módulo - acción: datos» (DC-09):

- `pushAdvance - Plan de pagos no generado …` o `… no recalculado …`, con el motivo, cuando no hay periodicidad o el pago sugerido no es mayor que 0.
- `pushAdvance - Concepto normalizado a minúsculas: …` Cuando el concepto llega con mayúsculas o espacios; se guarda en minúsculas y sin espacios sobrantes (F-44, DC-31).
- `handlePaymentDeletion - Eliminando el pago ID: … (anticipo …, importe …, estado …, redistribuir: …)` al borrar un pago.
- `completarPlanTrasBorrado - Anticipo …: pendiente …, pagos pendientes …, por colocar …` con el importe que falta por colocar, `… Pago ID … de A a B (+C)` por cada pago ajustado y un resumen `… N pagos ajustados y M pagos nuevos`. Los pagos nuevos dejan además las trazas habituales de `recalculatePaymentPlan`.
- `recalculatePaymentPlan - Plan de pagos recalculado exitosamente para el anticipo …` y `recalculatePostEditPayments - Recálculo completado para anticipo …` resumen el resultado del recálculo; los pasos intermedios (importes y fechas calculados) ya no se registran (S-05).
- `sustituirPago - Pago … sustituido por el pago … en el anticipo … (filas borradas: …)` al sustituir un pago y `sustituirPago - Pago … del anticipo …: importe …, estado …, autor …` con los datos releídos bajo el bloqueo; `pushPago - Pago … del anticipo …: estado A -> B, importe A -> B, fecha A -> B` al editar un pago, para comprobar en el log qué cambió; `enTransaccion - Transacción confirmada` o `enTransaccion - Transacción deshecha: motivo` al terminar cada operación, y `enTransaccion - Error al deshacer la transacción: …` si falla un rollback. Los errores con código (400 y 404) se registran solo con su mensaje, sin la pila; los fallos internos, con la traza completa.
- `pushPago - Rechazado: el pago … pertenece al anticipo …, no al …` cuando la petición indica un anticipo distinto del dueño del pago (S-26); el rechazo revierte la transacción y no deja ninguna escritura.

## Consideraciones de Rendimiento

- Las operaciones de recálculo de pagos (`recalculatePostEditPayments`, `recalculatePaymentPlan`) pueden ser intensivas en recursos para anticipos con muchos pagos.
- Las operaciones compuestas se serializan por anticipo con SELECT … FOR UPDATE: dos peticiones sobre el mismo anticipo esperan una a la otra, y un fallo intermedio deshace la operación entera (F-27, DC-39).

## Errores (F-48)

`errorHttp(estado, mensaje, codigo)` devuelve un `ErrorDeNegocio`: los errores de negocio (400, 404 y 409) conservan estado, mensaje y código, y la ruta los devuelve tal cual. El propietario ausente al crear un anticipo pasa a **401** `SESION_NO_IDENTIFICADA` (antes 400). Los errores del motor no se envuelven: la ruta los compone con el [catálogo de causas](../utils/catalogoErrores.md) y el detalle va al log (DC-09).

## Trazabilidad y borrado (F-50, F-10, F-53, DC-74)

pushAdvance, pushPago, handlePaymentDeletion, sustituirPago y recalculatePaymentPlan actualizan anticipos.modificado_por y updated_at dentro de la transacción que bloquea el anticipo. Desde la migración 0010, anticipos_pagos.modificado_por guarda el autor de la fila: pushPago y sustituirPago lo escriben en el alta y en la edición directa. Por DC-74, las filas derivadas quedan a NULL: las que crea generarPlanDePagos y las que ajustan recalculatePostEditPayments, completarPlanTrasBorrado y recalculatePendingPayments, que lo fijan explícitamente a NULL porque la fila pudo tener antes otro autor. Las filas anteriores a la 0010 quedan a NULL. deleteAdvances traduce defensivamente una referencia FK a 409 EN_USO; hoy anticipos_pagos tiene ON DELETE CASCADE.

## Referencias

- [Documentación de la API de Anticipos](../routes/anticipos.md) - Rutas que utilizan estas funciones
- [Documentación de AdvService](../services/AdvService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Advances](../components/Advances.md) - Interfaz de usuario para anticipos y pagos

## Ejecución y límites comprobados

- recalculatePaymentPlan(anticipoId) lee siempre los datos del anticipo de la base de datos (DC-38) y no elimina pagos existentes: resta del importe pendiente la suma de los pagos pendientes y añade lo que falta. Sin pagos empieza en fecha_inicio; con pagos avanza desde el último de cualquier estado. Usa la cuenta origen como destino de las cuotas generadas.
- getPeriodicidades lee el ENUM del esquema. El algoritmo getMonthsFromPeriodicidad sí está codificado para mensual/bimestral/trimestral/anual y devuelve 0 para otros valores. Las fechas del plan se calculan con la secuencia anclada de DC-41 (F-46, PR #55): la primera cuota nueva es la primera fecha anclada posterior al último pago existente (o fecha_inicio si no hay pagos) y las siguientes suman la periodicidad conservando el día de fecha_inicio, con el último día del mes si el día no existe. El cálculo usa texto YYYY-MM-DD y enteros (backend/src/utils/fechasAnticipos.mjs: fechaISO, fechaAnclada, siguienteFechaAnclada y sumarMesesAnclado), sin Date ni zona horaria. Una periodicidad sin meses definidos da un 400 al generar el plan, incluso si no hay nada que planificar.
- pushPago ya no guarda ningún importe pendiente: este se deriva de los pagos pagados (DC-38), así que insertar como pagado, pasar a pagado, volver a pendiente o cambiar el importe de un pago pagado lo cambian por sí solos. Un pago pagado no puede pasar a cancelado (400). Al cambiar el importe de un pago, la diferencia se reparte entre los pendientes posteriores (DC-08): siempre si el pago queda pendiente y, si queda pagado, solo cuando el plan cuadraba antes de la edición (suma de pendientes igual al importe pendiente, función planCuadra); si no cuadraba no toca nada y lo anota en el log (DC-40). Una nueva cuota extraordinaria llama a recalculatePaymentPlan.
- recalculatePostEditPayments es interna, no exportada. Reparte entre posteriores; puede superar el sugerido y realiza un ajuste final en el último pendiente si la discrepancia supera un céntimo. Aplica mínimos de 0,01 en ciertas reducciones: no es una garantía incondicional de conciliación.
- completarPlanTrasBorrado es interna y completa todo el importe pendiente no cubierto por los pagos pendientes, no solo el importe del último pago borrado. recalculatePendingPayments está exportada pero no la usa ninguna ruta.
- handlePaymentDeletion devuelve el importe pendiente derivado y los contadores documentados (deletePago se retiró en DC-39). Borrar un pagado sube el importe pendiente y el anticipo deja de estar completado por sí solo, porque ese estado se deduce (F-14, DC-38).
- deleteAdvances bloquea los anticipos, borra primero sus pagos y después los anticipos en una sola transacción; el resto de operaciones compuestas también son transaccionales y recalculatePendingPayments (exportada, sin ruta) se une a la transacción que se le pase (F-27, DC-39).
- `recalculatePostEditPayments` excluye el propio pago editado de los «posteriores» y del ajuste residual final (`AND id <> ?` en la consulta de pendientes posteriores y en la selección del último pendiente), con el id recibido como parámetro obligatorio validado al entrar; sin esa exclusión, cambiar fecha e importe en la misma petición metía el pago en su propio reparto y el ajuste final podía devolverle el pendiente total del anticipo. Corregido el 2026-11-26 (F-62, [#200](https://github.com/ferboiar/timon/issues/200)) con la prueba de regresión `backend/test/repartoPagoEditado.test.mjs`.

Las trazas arriba descritas existen en pushAdvance, recalculatePaymentPlan, recalculatePostEditPayments, handlePaymentDeletion y completarPlanTrasBorrado, incluidos los caminos sin generación o sin importe por colocar. Son registro de ejecución, no garantía de atomicidad. No se han ejecutado nuevas pruebas funcionales en esta auditoría.
