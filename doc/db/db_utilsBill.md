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
| `cuenta_id` | INT | ID de la cuenta bancaria asociada al recibo |
| `propietario_id` | INT | ID del usuario propietario del recibo |

### Tabla `fechas_cargo`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `recibo_id` | INT | Referencia al recibo asociado |
| `fecha` | DATE | Fecha del cargo |
| `estado` | ENUM | Estado del cargo: 'pendiente', 'pagado', 'rechazado' |
| `comentario` | VARCHAR | Comentario opcional sobre el cargo |
| `activo` | TINYINT | Estado del cargo (1 activo, 0 inactivo) |

## Relaciones Estructurales

### Asociación con Cuentas

- Cada recibo está asociado a una única cuenta bancaria a través del campo `cuenta_id`
- La asociación a nivel de recibo (no de fecha de cargo) garantiza coherencia en todos los pagos
- Este diseño permite gestionar eficientemente qué cuenta se utiliza para cada recibo
- La relación se implementa como una clave foránea de `recibos.cuenta_id` hacia `cuentas.id`

### Sistema de Propiedad

- Cada recibo pertenece a un usuario específico indicado por `propietario_id`
- El campo `propietario_id` se asigna automáticamente a partir del token JWT del usuario autenticado
- Esta relación permite implementar control de acceso a nivel de registro
- Se utiliza una clave foránea de `recibos.propietario_id` hacia `users.id`

## Funciones Principales

### Gestión de Recibos

| Función | Descripción |
|---------|-------------|
| `getRecibos(filters)` | Obtiene recibos aplicando filtros opcionales (periodicidad, fecha, año, etc.) |
| `pushRecibo(id, concepto, periodicidad, importe, categoria, cargo, propietarioId, cuenta_id)` | Crea o actualiza un recibo con sus fechas de cargo |
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
- Verificación de que la cuenta bancaria (`cuenta_id`) exista y sea válida

### Transacciones Atómicas

Las operaciones de eliminación utilizan transacciones para garantizar que:
- La eliminación de fechas de cargo y recibos se realice de manera atómica
- Se revierte automáticamente cualquier operación parcial en caso de error

## Control de Acceso

### Asignación automática de propietario

- Al crear un nuevo recibo, el sistema asigna automáticamente el `propietario_id` a partir del token JWT
- El usuario no necesita especificar manualmente el propietario, garantizando integridad y seguridad
- El frontend no necesita manejar este campo, siendo responsabilidad completa del backend

### Filtrado por propietario

- Las consultas de recibos respetan automáticamente los permisos del usuario
- El sistema filtra los recibos según el propietario cuando corresponde
- Se aplican reglas adicionales de visibilidad según el campo `es_privado` cuando está presente

## Validaciones y Manejo de Errores

- Verificación de presencia de campos obligatorios (concepto, periodicidad, importe, categoría, cuenta_id)
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
- [Componente ListBills](../components/ListBills.md) - Interfaz de usuario para recibos