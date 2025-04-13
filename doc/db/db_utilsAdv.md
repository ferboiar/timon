# Utilidades de Base de Datos para Anticipos

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con anticipos y pagos. Implementa la lógica de negocio para operaciones CRUD, así como algoritmos complejos para la gestión de planes de pago y recálculo de importes.

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
| `pushAdvance(id, concepto, ...)` | Crea o actualiza un anticipo con todos sus atributos |
| `deleteAdvances(advances)` | Elimina uno o más anticipos y sus pagos asociados |
| `getPeriodicidades()` | Obtiene las periodicidades definidas en el esquema |

### Gestión de Pagos

| Función | Descripción |
|---------|-------------|
| `getPagos(anticipoId)` | Obtiene los pagos asociados a un anticipo |
| `pushPago(id, anticipo_id, ...)` | Crea o actualiza un pago con todos sus atributos |
| `deletePago(id)` | Elimina un pago específico |
| `handlePaymentDeletion(pagoId)` | Elimina un pago y proporciona información para siguientes acciones |

### Planes de Pago

| Función | Descripción |
|---------|-------------|
| `recalculatePaymentPlan(anticipoId, ...)` | Genera o actualiza un plan de pagos para un anticipo |
| `recalculatePostEditPayments(anticipo_id, ...)` | Recalcula los pagos pendientes después de editar un pago |
| `recalculatePendingPayments(anticipoId)` | Redistribuye importes entre pagos pendientes |

## Algoritmos Clave

### Generación de Planes de Pago

El algoritmo para `recalculatePaymentPlan` implementa la siguiente lógica:

1. Obtiene todos los pagos existentes del anticipo
2. Calcula el saldo restante después de considerar los pagos pendientes
3. Determina la fecha del próximo pago basándose en la periodicidad
4. Crea nuevos pagos hasta cubrir el importe total del anticipo
5. Actualiza la fecha fin prevista del anticipo

### Recálculo de Pagos tras Edición

La función `recalculatePostEditPayments` implementa un sofisticado algoritmo para redistribuir la diferencia de importe cuando un pago es modificado:

1. Calcula la diferencia entre el importe anterior y el nuevo
2. Si la diferencia es positiva (reducción del pago):
   - Primero, intenta llevar los pagos por debajo del importe sugerido hasta ese valor
   - Luego, distribuye equitativamente cualquier cantidad restante
3. Si la diferencia es negativa (aumento del pago):
   - Primero, reduce los pagos por encima del importe sugerido
   - Luego, reduce proporcionalmente los pagos restantes

## Consideraciones de Rendimiento

- Las operaciones de recálculo de pagos (`recalculatePostEditPayments`, `recalculatePaymentPlan`) pueden ser intensivas en recursos para anticipos con muchos pagos.
- En todas las operaciones de actualización, se utilizan transacciones para asegurar la integridad de los datos.

## Referencias

- [Documentación de la API de Anticipos](../routes/anticipos.md) - Rutas que utilizan estas funciones
- [Documentación de AdvService](../services/AdvService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Advances](../components/Advances.md) - Interfaz de usuario para anticipos y pagos
