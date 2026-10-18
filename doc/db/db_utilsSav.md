# Utilidades de Base de Datos para Ahorros

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con ahorros y sus movimientos. Implementa operaciones CRUD básicas para la gestión completa de ahorros y los movimientos asociados en la aplicación Timon.

## Características Principales

- Gestión completa de ahorros y sus movimientos asociados
- Actualización automática de saldos de ahorro al crear, editar o eliminar movimientos
- Crear, editar o eliminar un movimiento, y editar un ahorro, se ejecutan en una transacción: se guarda todo o no se guarda nada
- Soporte para diferentes periodicidades de ahorro
- Validación de parámetros obligatorios

## Estructura de Datos

### Tabla `ahorros`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `concepto` | VARCHAR | Nombre o concepto del ahorro |
| `descripcion` | VARCHAR | Descripción detallada (opcional) |
| `ahorrado` | DECIMAL | Valor inicial más la suma de los movimientos. Se edita a mano solo mientras el ahorro no tiene movimientos (DC-10) |
| `fecha_objetivo` | DATE | Fecha objetivo para completar el ahorro (opcional) |
| `periodicidad` | ENUM | Frecuencia de ahorro (diario, semanal, mensual, etc.) |
| `importe_periodico` | DECIMAL | Cantidad sugerida a ahorrar por periodo |
| `activo` | TINYINT | Estado del ahorro (1 activo, 0 inactivo) |
| `propietario_id` | INT | Usuario que creó el ahorro; obligatorio al crear |

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
| `pushSaving(id, concepto, ...)` | Crea o actualiza un ahorro. Al crear exige el propietario y guarda el valor inicial de `ahorrado`; al actualizar, solo permite cambiar `ahorrado` si no hay movimientos |
| `deleteSavings(savings)` | Elimina uno o más ahorros |
| `getPeriodicidades()` | Obtiene las periodicidades definidas en el esquema |

### Gestión de Movimientos

| Función | Descripción |
|---------|-------------|
| `getMovimientos(ahorroId)` | Obtiene los movimientos asociados a un ahorro específico |
| `pushMovimiento(id, ahorro_id, ...)` | Crea o actualiza un movimiento y ajusta `ahorrado` con la diferencia respecto al importe anterior, en una transacción |
| `deleteMovimiento(id)` | Elimina un movimiento y resta su importe de `ahorrado`, en una transacción |

## Algoritmos Clave

### Actualización Automática de Saldos

El sistema implementa un mecanismo automático para actualizar los saldos de los ahorros cuando se realizan las siguientes operaciones:

1. Al añadir un movimiento: el saldo del ahorro aumenta con su importe (un importe negativo es una retirada)
2. Al eliminar un movimiento: el saldo del ahorro disminuye con el importe del movimiento eliminado
3. Al editar un movimiento: solo se aplica la diferencia entre el importe nuevo y el anterior; si cambia solo la fecha o la descripción, el saldo no varía. El ahorro afectado se toma de la base de datos, no de lo que envíe el cliente

Este enfoque garantiza que los saldos siempre estén sincronizados con los movimientos asociados.

### Saldo inicial y bloqueo de `ahorrado`

`ahorrado` es el valor inicial del ahorro más la suma de sus movimientos (DC-10 del registro de mantenimiento). `pushSaving` aplica esta regla al actualizar un ahorro:

- Sin movimientos: `ahorrado` se puede cambiar a mano, por ejemplo para corregir un valor inicial erróneo.
- Con movimientos: `ahorrado` queda bloqueado. Si la petición trae un valor distinto del guardado, se rechaza con un error y no se modifica nada; el valor se corrige añadiendo un movimiento positivo o negativo.
- Un `ahorrado` nulo en la base de datos se trata como 0 al sumar o restar movimientos.

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
- Comprobar que el importe del movimiento es numérico
- Exigir el propietario (`propietario_id`) al crear un ahorro
- Rechazar el cambio de `ahorrado` en un ahorro con movimientos
- Revertir la transacción completa si falla cualquier sentencia al guardar o eliminar un movimiento
- Validar la existencia de registros antes de realizar operaciones de actualización
- Capturar y relanzar errores con mensajes descriptivos para facilitar la depuración

## Consideraciones de Rendimiento

- Todas las consultas utilizan índices apropiados para optimizar el rendimiento
- La actualización de saldos se realiza en la misma transacción que la operación de movimiento, reduciendo el número de conexiones necesarias
- Se implementa manejo eficiente de conexiones mediante un pool de conexiones

## Trazas en el log

Cada operación deja trazas en el log del backend con el formato «módulo - acción: datos» (DC-09):

| Traza | Cuándo |
|-------|--------|
| `pushMovimiento - Nuevo movimiento del ahorro …` | Al crear un movimiento |
| `pushMovimiento - Editando el movimiento ID … : importe A -> B (diferencia D)` | Al editar un movimiento |
| `Update realizado correctamente en tabla ahorros. Filas afectadas: … (ahorrado +D)` | Tras ajustar el saldo |
| `pushMovimiento - Transacción confirmada …` o `… revertida …` | Al terminar o fallar |
| `deleteMovimiento - Eliminando el movimiento ID …` y las de transacción | Al eliminar un movimiento |
| `pushSaving - Nuevo ahorro: …` | Al crear un ahorro |
| `pushSaving - Ahorro … sin movimientos: valor inicial de ahorrado A -> B` | Al corregir el valor inicial |
| `pushSaving - Rechazado: …` | Al intentar cambiar `ahorrado` con movimientos |

## Referencias

- [API de Ahorros](../routes/ahorros.md) - Rutas que utilizan estas funciones
- [Documentación de SavService](../services/SavService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Savings](../components/Savings.md) - Interfaz de usuario para ahorros y movimientos