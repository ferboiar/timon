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
| `fecha_inicial` | DATE | Fecha desde la que se generan las fechas en modo automático; en modo manual se guarda la primera fecha de cargo |
| `recibo_origen_id` | INT | Recibo del año anterior del que procede; único, así que cada recibo tiene como mucho un sucesor (DC-14). `deleteRecibo` impide borrar un recibo con sucesor y lo usa para marcar `replicar = 0` en su origen |
| `replicar` | TINYINT | 1 por defecto; con 0 no se crea el recibo del año siguiente (DC-17). `deleteRecibo` lo pone a 0 en el origen del recibo que borra (DC-18) |

### Tabla `fechas_cargo`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `recibo_id` | INT | Referencia al recibo asociado |
| `fecha` | DATE | Fecha del cargo |
| `importe` | DECIMAL | Importe real del cargo: vacío mientras el cargo sigue el importe del recibo; fijado al pagarlo y, en un cargo pendiente, cuando se personaliza (DC-15); lo escribe `pushRecibo` |
| `estado` | ENUM | Estado del cargo: 'pendiente' o 'cargado' |
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
| `getRecibos(filters)` | Obtiene recibos aplicando filtros opcionales (periodicidad, fecha, año, etc.). Cada fila incluye `importe` (el del recibo) e `importe_cargo` (el real del cargo, vacío si está pendiente) |
| `pushRecibo(id, concepto, periodicidad, importe, categoria, cargo, propietarioId, cuenta_id, fecha_inicial, modoFechas)` | Crea o actualiza un recibo con sus fechas de cargo. En modo `auto` genera las fechas desde `fecha_inicial` hasta el 31 de diciembre de ese año (DC-16); al actualizar solo reescribe las pendientes. Al pasar un cargo a «cargado» guarda su importe (DC-15). Devuelve `{ fechasReescritas, fechasConservadas }` |
| `deleteRecibo(id, fecha, periodicidad)` | Elimina un recibo completo o solo una fecha de cargo específica. Si el recibo tiene cargos pagados, o la fecha indicada está pagada y es de un mes anterior al actual, o el recibo tiene sucesor, lanza un error con `status` 409 y no borra nada; una fecha pagada del mes en curso sí puede borrarse (para rectificar). Al borrar un recibo con origen, marca `replicar = 0` en el origen (DC-18) |
| `generarFechasDelAnio(fechaInicial, periodicidad)` | Devuelve las fechas de la secuencia anclada en `fechaInicial` que caen en su mismo año natural (DC-16). Si el día no existe en un mes, usa el último día |
| `fechasFaltantes(fechaInicial, periodicidad, fechasExistentes, anioActual, hoy)` | Devuelve los meses de la secuencia anclada en `fechaInicial` que no tienen cargo en el año en curso, nunca antes de `fechaInicial` ni en un ejercicio cerrado. Cada fecha lleva `generable`: verdadero si es posterior al último cargo o un hueco cuya fecha aún no ha llegado (DC-22) |
| `completarFechasAnio(reciboId)` | Añade a un recibo las fechas generables de `fechasFaltantes` (botón «Generar nuevas fechas»). Devuelve cuántas añadió; error 409 si el recibo no tiene fechas o su ejercicio está cerrado |
| `importeDelCargo(estado, cargoActual, cargoPeticion, importeRecibo)` | Importe que debe guardarse en un cargo: si está «cargado», el indicado, el que ya tuviera o el del recibo; si está pendiente, solo uno personalizado (si coincide con el del recibo queda vacío) (DC-15) |
| `generarNuevasFechasRecibo(reciboId)` | Genera un nuevo ciclo de fechas cuando no quedan fechas pendientes activas, a partir de la última fecha. Nunca modifica las existentes. Sin fechas previas parte de `fecha_inicial` y crea siempre 4 (F-32) |
| `actualizarFechasRecibos()` | Aplica `generarNuevasFechasRecibo` a todos los recibos con fechas activas y devuelve `total` y `actualizados` |
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

1. **Recibos mensuales**: Se dan de alta con las fechas del año que quedan desde la fecha inicial (hasta 12); como los bimestrales y trimestrales, cada fecha tiene su estado, comentario e importe
2. **Recibos bimestrales/trimestrales**: Pueden tener múltiples fechas de cargo, cada una con su propio estado y comentario
3. **Eliminación inteligente**: Al eliminar una fecha de cargo, el sistema determina automáticamente si debe eliminar también el recibo principal

### Fechas de cargo en modo automático

En un recibo nuevo, `pushRecibo` genera con `generarFechasDelAnio` las fechas desde `fecha_inicial` hasta el 31 de diciembre de ese año (DC-16): un mensual dado de alta en octubre tiene 3 y uno dado de alta en enero tiene 12 (6 bimestrales, 4 trimestrales y 1 anual en un año completo).

Al actualizar un recibo que ya tiene fechas, calcula la secuencia para el mismo número de fechas y aplica solo las posiciones cuya fecha está en estado `pendiente`. Las fechas con otro estado se conservan (DC-11, F-04). Si una fecha pendiente ya coincide con la calculada, no se toca.

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

- Verificación de presencia de campos obligatorios (concepto, periodicidad, importe, categoría, cuenta_id), con un mensaje que nombra los campos que faltan (un importe vacío o 0 cuenta como falta)
- Validación de tipos y rangos (importe positivo, longitud máxima para concepto)
- Comprobación de valores permitidos (categorías existentes, periodicidades válidas)
- Verificación de formato de fechas
- Manejo detallado de errores con mensajes descriptivos para facilitar la depuración

## Consideraciones de Rendimiento

- Uso de índices en las claves foráneas para optimizar las consultas JOIN
- Liberación inmediata de conexiones para maximizar la disponibilidad del pool
- Uso de transacciones para operaciones que afectan a múltiples tablas
- Consultas optimizadas con filtros aplicados directamente en la base de datos

## Trazas en el log

Al guardar en modo automático un recibo con fechas, `pushRecibo` deja trazas con el formato «módulo - acción: datos» (DC-09):

| Traza | Cuándo |
|-------|--------|
| `pushRecibo - Recibo …: fecha A -> B (fechas_cargo …)` | Una fecha pendiente se ha reescrito |
| `pushRecibo - Recibo …: fecha … conservada por estar …` | La fecha no está pendiente y no se toca |
| `pushRecibo - Recibo …: fecha … sin cambios` | La fecha pendiente ya coincidía con la calculada |
| `pushRecibo - Recibo …: modo automático, N fechas reescritas y M conservadas` | Resumen al terminar |

## Referencias

- [API de Recibos](../routes/recibos.md) - Rutas que utilizan estas funciones
- [Documentación de BillService](../services/BillService.md) - Cliente que eventualmente llama a estas funciones
- [Componente ListBills](../components/ListBills.md) - Interfaz de usuario para recibos