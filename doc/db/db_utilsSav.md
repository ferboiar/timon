# Utilidades de Base de Datos para Ahorros

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con ahorros y sus movimientos. Implementa operaciones CRUD básicas para la gestión completa de ahorros y los movimientos asociados en la aplicación Timon.

## Características Principales

- Gestión completa de ahorros y sus movimientos asociados
- Actualización automática de saldos de ahorro al crear o eliminar movimientos
- Manejo de transacciones para garantizar la integridad de datos
- Soporte para diferentes periodicidades de ahorro
- Validación de parámetros obligatorios

## Estructura de Datos

### Tabla `ahorros`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `concepto` | VARCHAR | Nombre o concepto del ahorro |
| `descripcion` | VARCHAR | Descripción detallada (opcional) |
| `ahorrado` | DECIMAL | Cantidad total ahorrada hasta el momento |
| `fecha_objetivo` | DATE | Fecha objetivo para completar el ahorro (opcional) |
| `periodicidad` | ENUM | Frecuencia de ahorro (diario, semanal, mensual, etc.) |
| `importe_periodico` | DECIMAL | Cantidad sugerida a ahorrar por periodo |
| `activo` | TINYINT | Estado del ahorro (1 activo, 0 inactivo) |

### Tabla `ahorros_movimientos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `ahorro_id` | INT | Referencia al ahorro asociado |
| `importe` | DECIMAL | Cantidad del movimiento |
| `fecha` | DATE | Fecha del movimiento |
| `tipo` | ENUM | Tipo de movimiento: 'regular', 'extraordinario' |
| `descripcion` | VARCHAR | Descripción del movimiento (opcional) |

## Funciones Principales

### Gestión de Ahorros

| Función | Descripción |
|---------|-------------|
| `getSavings()` | Obtiene todos los ahorros ordenados alfabéticamente por concepto |
| `pushSaving(id, concepto, ...)` | Crea o actualiza un ahorro con todos sus atributos |
| `deleteSavings(savings)` | Elimina uno o más ahorros |
| `getPeriodicidades()` | Obtiene las periodicidades definidas en el esquema |

### Gestión de Movimientos

| Función | Descripción |
|---------|-------------|
| `getMovimientos(ahorroId)` | Obtiene los movimientos asociados a un ahorro específico |
| `pushMovimiento(id, ahorro_id, ...)` | Crea o actualiza un movimiento y actualiza el saldo del ahorro |
| `deleteMovimiento(id)` | Elimina un movimiento y actualiza el saldo del ahorro |

## Algoritmos Clave

### Actualización Automática de Saldos

El sistema implementa un mecanismo automático para actualizar los saldos de los ahorros cuando se realizan las siguientes operaciones:

1. Al añadir un movimiento: El saldo del ahorro se incrementa con el importe del movimiento
2. Al eliminar un movimiento: El saldo del ahorro se decrementa con el importe del movimiento eliminado

Este enfoque garantiza que los saldos siempre estén sincronizados con los movimientos asociados.

## Características Especiales

### Gestión de Movimientos Regular y Extraordinarios

El sistema permite diferenciar entre movimientos regulares (aquellos que siguen el plan periódico de ahorro) y extraordinarios (aportaciones adicionales no programadas), lo que facilita:

- El análisis del comportamiento de ahorro del usuario
- La planificación financiera basada en ingresos regulares vs. extraordinarios

### Ordenamiento Cronológico

Todos los movimientos son recuperados en orden cronológico, facilitando la visualización de la evolución del ahorro a lo largo del tiempo.

## Validaciones y Manejo de Errores

Las funciones implementan validaciones para:
- Verificar la presencia de campos obligatorios (fecha y tipo en movimientos)
- Validar la existencia de registros antes de realizar operaciones de actualización
- Capturar y relanzar errores con mensajes descriptivos para facilitar la depuración

## Consideraciones de Rendimiento

- Todas las consultas utilizan índices apropiados para optimizar el rendimiento
- La actualización de saldos se realiza en la misma transacción que la operación de movimiento, reduciendo el número de conexiones necesarias
- Se implementa manejo eficiente de conexiones mediante un pool de conexiones

## Referencias

- [API de Ahorros](../routes/ahorros.md) - Rutas que utilizan estas funciones
- [Documentación de SavService](../services/SavService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Savings](../components/Savings.md) - Interfaz de usuario para ahorros y movimientos