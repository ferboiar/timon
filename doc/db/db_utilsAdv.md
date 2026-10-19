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
| `importe_total` | DECIMAL | Cantidad total del anticipo |
| `pago_sugerido` | DECIMAL | Importe sugerido para cada pago |
| `fecha_inicio` | DATE | Fecha de inicio del anticipo |
| `fecha_fin_prevista` | DATE | Fecha estimada de finalización |
| `descripcion` | TEXT | Descripción detallada (opcional) |
| `estado` | ENUM | Estado del anticipo: 'activo', 'pausado', 'cancelado', 'completado' |
| `cuenta_origen_id` | INT | ID de la cuenta de origen |
| `periodicidad` | ENUM | Frecuencia de pagos: 'mensual', 'bimestral', 'trimestral', 'anual' |
| `propietario_id` | INT | Usuario que creó el anticipo; obligatorio al crear |

### Tabla `anticipos_pagos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `anticipo_id` | INT | Referencia al anticipo asociado |
| `importe` | DECIMAL | Cantidad del pago |
| `fecha` | DATE | Fecha programada del pago |
| `tipo` | ENUM | Tipo de pago: 'regular', 'extraordinario' |
| `descripcion` | TEXT | Descripción del pago (opcional) |
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
4. Convierte el pago sugerido a número y lo valida antes de crear ningún pago: debe ser mayor que 0 y el plan no puede superar los 1.200 pagos; si no se cumple, falla con un error y no crea nada (F-02, F-24)
5. Crea nuevos pagos hasta cubrir el importe total del anticipo
6. Actualiza la fecha fin prevista del anticipo

### Recálculo de Pagos tras Edición

La función `recalculatePostEditPayments` implementa un sofisticado algoritmo para redistribuir la diferencia de importe cuando un pago es modificado:

1. Calcula la diferencia entre el importe anterior y el nuevo
2. Si la diferencia es positiva (reducción del pago):
   - Primero, intenta llevar los pagos por debajo del importe sugerido hasta ese valor
   - Luego, distribuye equitativamente cualquier cantidad restante
3. Si la diferencia es negativa (aumento del pago):
   - Primero, reduce los pagos por encima del importe sugerido
   - Luego, reduce proporcionalmente los pagos restantes

### Borrado de un pago con reparto

`handlePaymentDeletion(pagoId, redistribuir)` elimina el pago y devuelve `saldoRestante`, `anticipoId`, `redistribuido`, `pagosAjustados` y `pagosCreados`. Con `redistribuir` verdadero (DC-12) comprueba antes de borrar que el anticipo tenga pago sugerido mayor que 0 y periodicidad; si no, falla con un error 400 y no borra nada.

Después, `completarPlanTrasBorrado` calcula el importe que falta por colocar (el saldo del anticipo menos la suma de los pagos pendientes), sube primero los pagos pendientes que estén por debajo del pago sugerido hasta ese tope y, si aún queda importe, llama a `recalculatePaymentPlan` para crear los pagos nuevos de hasta el pago sugerido, a continuación del último pago y según la periodicidad. Ningún pago supera el pago sugerido y la fecha fin prevista se desplaza si hace falta. `redistribuido` es falso solo si no había importe que colocar.

La edición de un pago (`recalculatePostEditPayments`) sigue repartiendo la diferencia a partes iguales (DC-08).

La sustitución («Añadirlo en uno nuevo») la orquesta la pantalla: guarda el pago nuevo y después borra el antiguo sin repartir (F-25).

## Trazas en el log

Cada paso deja trazas en el log del backend con el formato «módulo - acción: datos» (DC-09):

- `pushAdvance - Plan de pagos no generado …` o `… no recalculado …`, con el motivo, cuando no hay periodicidad o el pago sugerido no es mayor que 0.
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
