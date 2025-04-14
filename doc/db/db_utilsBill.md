# Utilidades de Base de Datos para Recibos

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con recibos y sus fechas de cargo. Implementa operaciones CRUD básicas para la gestión completa de recibos en la aplicación Timon, permitiendo la administración de pagos periódicos con un seguimiento detallado de sus fechas de cargo.

## Características Principales

- Gestión completa de operaciones CRUD para recibos y sus fechas de cargo
- Soporte para múltiples periodicidades (mensual, bimestral, trimestral)
- Filtrado avanzado por periodicidad, fecha, año, concepto, categoría y estado
- Validación exhaustiva de parámetros para garantizar la integridad de los datos
- Manejo eficiente de transacciones para operaciones complejas

## Estructura de Datos

### Tabla `recibos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `concepto` | VARCHAR | Descripción corta del recibo (máx. 30 caracteres) |
| `periodicidad` | ENUM | Frecuencia del recibo: 'mensual', 'bimestral', 'trimestral' |
| `importe` | DECIMAL | Cantidad del recibo |
| `categoria_id` | INT | Referencia a la categoría asociada |

### Tabla `fechas_cargo`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `recibo_id` | INT | Referencia al recibo asociado |
| `fecha` | DATE | Fecha del cargo |
| `estado` | ENUM | Estado del cargo: 'pendiente', 'pagado', 'rechazado' |
| `comentario` | VARCHAR | Comentario opcional sobre el cargo |
| `activo` | TINYINT | Estado del cargo (1 activo, 0 inactivo) |

## Funciones Principales

### Gestión de Recibos

| Función | Descripción |
|---------|-------------|
| `getRecibos(filters)` | Obtiene recibos aplicando filtros opcionales (periodicidad, fecha, año, etc.) |
| `pushRecibo(id, concepto, periodicidad, importe, categoria, cargo)` | Crea o actualiza un recibo con sus fechas de cargo |
| `deleteRecibo(id, fecha, periodicidad)` | Elimina un recibo completo o solo una fecha de cargo específica |
| `getValidValues(column, table)` | Obtiene valores válidos para campos ENUM o categorías |

## Algoritmos Clave

### Filtrado Avanzado

La función `getRecibos()` implementa un sistema de filtrado flexible que permite:

1. Filtrar por una fecha específica o un rango de fechas (formato: 'fecha_inicio a fecha_fin')
2. Filtrar por año, extrayendo automáticamente el año de las fechas de cargo
3. Filtrar por estado de actividad, con conversión automática de diferentes formatos (booleano, string, número)
4. Combinar múltiples filtros simultáneamente para búsquedas precisas

### Gestión de Periodicidades

El sistema maneja de forma diferenciada los recibos según su periodicidad:

1. **Recibos mensuales**: Mantienen una sola fecha de cargo asociada
2. **Recibos bimestrales/trimestrales**: Pueden tener múltiples fechas de cargo, cada una con su propio estado y comentario
3. **Eliminación inteligente**: Al eliminar fechas de cargo de recibos no mensuales, el sistema determina automáticamente si debe eliminar también el recibo principal

## Características Especiales

### Validación Contextual

El sistema implementa validaciones específicas según el contexto:

- Verificación de categorías válidas contra la base de datos
- Comprobación de periodicidades permitidas
- Validación de estados conforme a los valores definidos en el esquema
- Validación de formato de fechas (YYYY-MM-DD)

### Transacciones Atómicas

Las operaciones de eliminación utilizan transacciones para garantizar que:
- La eliminación de fechas de cargo y recibos se realice de manera atómica
- Se revierte automáticamente cualquier operación parcial en caso de error

## Validaciones y Manejo de Errores

- Verificación de presencia de campos obligatorios (concepto, periodicidad, importe, categoría)
- Validación de tipos y rangos (importe positivo, longitud máxima para concepto)
- Comprobación de valores permitidos (categorías existentes, periodicidades válidas)
- Verificación de formato de fechas
- Manejo detallado de errores con mensajes descriptivos para facilitar la depuración

## Consideraciones de Rendimiento

- Uso de índices en las claves foráneas para optimizar las consultas JOIN
- Liberación inmediata de conexiones para maximizar la disponibilidad del pool
- Uso de transacciones para operaciones que afectan a múltiples tablas
- Consultas optimizadas con filtros aplicados directamente en la base de datos

## Referencias

- [API de Recibos](../routes/recibos.md) - Rutas que utilizan estas funciones
- [Documentación de BillService](../services/BillService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Recibos](../components/Recibos.md) - Interfaz de usuario para recibos