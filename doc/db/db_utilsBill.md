# Utilidades de Base de Datos para Recibos

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con recibos y sus fechas de cargo. Implementa operaciones CRUD básicas para la gestión completa de recibos en la aplicación Timon, permitiendo la administración de pagos periódicos con un seguimiento detallado de sus fechas de cargo.

## Características Principales

- Gestión completa de operaciones CRUD para recibos y sus fechas de cargo
- Soporte para múltiples periodicidades (mensual, bimestral, trimestral y anual)
- Filtrado avanzado por periodicidad, fecha, año, concepto, categoría y estado
- Validación exhaustiva de parámetros para garantizar la integridad de los datos
- Manejo eficiente de transacciones para operaciones complejas

## Estructura de Datos

### Tabla `recibos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `concepto` | VARCHAR | Descripción corta del recibo (máx. 30 caracteres) |
| `periodicidad` | ENUM | Frecuencia del recibo: 'mensual', 'bimestral', 'trimestral' o 'anual' |
| `importe` | DECIMAL | Cantidad del recibo |
| `categoria_id` | INT | Referencia a la categoría asociada |
| `cuenta_id` | INT | ID de la cuenta bancaria asociada al recibo |
| `propietario_id` | INT | ID del usuario propietario del recibo |
| `es_privado` | TINYINT | 1 si el recibo solo es visible para su propietario |
| `fecha_inicial` | DATE | Fecha desde la que se generan las fechas en modo automático; en modo manual se guarda la primera fecha de cargo. En un recibo creado por la migración 0003 o por el evento anual es la primera fecha de la secuencia en su año (DC-16, DC-23) |
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
| `comentario` | TEXT | Comentario opcional sobre el cargo |
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
| `pushRecibo(id, concepto, periodicidad, importe, categoria, cargo, propietarioId, cuenta_id, fecha_inicial, modoFechas, permitirFueraDeAnio = false)` | Crea o actualiza un recibo con sus fechas de cargo. En modo `auto` genera las fechas desde `fecha_inicial` hasta el 31 de diciembre de ese año (DC-16); al actualizar solo reescribe las pendientes. Al pasar un cargo a «cargado» guarda su importe (DC-15). Rechaza las fechas que no sean del año natural del recibo, salvo con `permitirFueraDeAnio` (DC-14, DC-29). Devuelve `{ fechasReescritas, fechasConservadas }` |
| `deleteRecibo(id, fecha, periodicidad, hoy, forzar)` | Elimina un recibo completo o solo una fecha de cargo específica. Si el recibo tiene cargos pagados, o la fecha indicada está pagada y es de un mes anterior al actual, o el recibo tiene sucesor, lanza un error con `status` 409 y no borra nada; una fecha pagada del mes en curso sí puede borrarse (para rectificar). Con `forzar` (la ruta lo activa solo para el administrador con `permitirPagados=1`, DC-21) se omite la comprobación de cargos pagados. Al borrar un recibo con origen, marca `replicar = 0` en el origen (DC-18) |
| `generarFechasDelAnio(fechaInicial, periodicidad)` | Devuelve las fechas de la secuencia anclada en `fechaInicial` que caen en su mismo año natural (DC-16). Si el día no existe en un mes, usa el último día |
| `fechasFaltantes(fechaInicial, periodicidad, fechasExistentes, anioActual, hoy)` | Devuelve los meses de la secuencia anclada en `fechaInicial` que no tienen cargo en el año en curso, nunca antes de `fechaInicial` ni en un ejercicio cerrado. Cada fecha lleva `generable`: verdadero si es posterior al último cargo o un hueco cuya fecha aún no ha llegado (DC-22) |
| `completarFechasAnio(reciboId, anioActual, hoy)` | Añade a un recibo las fechas generables de `fechasFaltantes` (botón «Generar nuevas fechas»). Devuelve cuántas añadió; error 404 si el recibo no existe y 409 si no tiene fechas o su ejercicio está cerrado. El año en curso se calcula en la zona horaria de los ajustes |
| `generarRecibosAnio(simular)` | Lanza el procedimiento que crea los recibos del año siguiente (vista previa si `simular`); lo usa la ruta de administración (DC-24) |
| `importeDelCargo(estado, cargoActual, cargoPeticion, importeRecibo)` | Importe que debe guardarse en un cargo: si está «cargado», el indicado, el que ya tuviera o el del recibo; si está pendiente, solo uno personalizado (si coincide con el del recibo queda vacío) (DC-15) |
| `getValidValues(column, table)` | Función interna (no se exporta): obtiene valores válidos para campos ENUM o categorías |
| `generarFechasFuturas(fechaInicial, periodicidad, cantidad)` | Función interna (no se exporta) que suma meses a la fecha inicial. La usa `pushRecibo`, al reescribir fechas en modo automático; no sigue la secuencia anclada de DC-16 y desborda con los días 29 a 31 (F-12) |

## Un recibo por año (DC-14, DC-23)

Cada recibo es el recibo de un año natural: todas sus fechas de cargo caen dentro del mismo año. Al cambiar de año no se modifica el recibo, sino que se crea otro enlazado con el anterior mediante `recibo_origen_id` (cada recibo tiene como mucho un sucesor). Los recibos de años pasados no se modifican nunca. Por eso la tabla `recibos_historico` ya no existe: los cargos pagados están en `fechas_cargo`.

La migración `0003_partir_recibos_por_anio.sql` parte los recibos que tenían fechas en más de un año en un recibo por año, enlazados entre sí. Cada trozo conserva solo las fechas que ya tenía y su `fecha_inicial` es la primera fecha de la secuencia en ese año, anclada en la del recibo original. Es repetible: si ya no quedan recibos con fechas en dos años, no modifica nada.

El procedimiento `generar_recibos_anio` y el evento diario que crean los recibos del año siguiente existen (DC-17, DC-24); ver [generar_recibos_anio](./generar_recibos_anio.md).

## Validación del año al guardar (DC-14, DC-29)

`pushRecibo` rechaza (lanza un error que la ruta devuelve como 400) cualquier fecha que caiga fuera del año natural del recibo. El año del recibo es:

- En un recibo nuevo: el de `fecha_inicial` o, en modo manual sin ella, el de la primera fecha de cargo.
- En un recibo existente: el de su `fecha_inicial` guardada (si no la tiene, el de su primer cargo).

Se comprueban las fechas de cargo recibidas en modo manual, la `fecha_inicial` recibida al editar y, al editar en modo automático, las fechas pendientes que se reescribirían (una `fecha_inicial` que desplace la secuencia al año siguiente se rechaza). Los cargos sin fecha (solo estado o comentario) no se comprueban. El error nombra el año y las fechas que sobran, y el recibo no se modifica. Para trabajar en otro año se usa otro recibo (lo crea el evento anual, DC-17).

Con `permitirFueraDeAnio = true` la comprobación se omite y se deja una traza con las fechas admitidas. La ruta solo lo activa si el cuerpo trae `permitirFueraDeAnio: true` y quien guarda es administrador (interruptor de sesión «Permitir declarar fechas fuera del año en curso» de Ajustes, DC-29).

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
2. **Recibos bimestrales/trimestrales**: Pueden tener múltiples fechas de cargo, cada una con su propio estado, comentario e importe
3. **Eliminación inteligente**: Al eliminar una fecha de cargo, el sistema determina automáticamente si debe eliminar también el recibo principal
4. **Recibos anuales**: Una fecha de cargo por año

### Fechas de cargo en modo automático

En un recibo nuevo, `pushRecibo` genera con `generarFechasDelAnio` las fechas desde `fecha_inicial` hasta el 31 de diciembre de ese año (DC-16): un mensual dado de alta en octubre tiene 3 y uno dado de alta en enero tiene 12 (6 bimestrales, 4 trimestrales y 1 anual en un año completo).

Al actualizar un recibo que ya tiene fechas, calcula la secuencia para el mismo número de fechas y aplica solo las posiciones cuya fecha está en estado `pendiente`. Las fechas con otro estado se conservan (DC-11, F-04). Si una fecha pendiente ya coincide con la calculada, no se toca.

### Importe de cada cargo (DC-15)

Cada fecha de cargo puede tener su importe en `fechas_cargo.importe` (por ejemplo, la factura de la luz cambia cada mes). Vacío significa que el cargo sigue el importe del recibo. Al pasar un cargo a «cargado», `pushRecibo` fija su importe: el indicado en la petición, el que ya tuviera o el del recibo; un cargo pagado lo conserva aunque después cambie el del recibo. En un cargo pendiente solo se guarda un importe si es distinto del importe del recibo; si coincide, queda vacío y lo sigue. Al volver de «cargado» a «pendiente» sin indicar importe, se vacía. `getRecibos` devuelve ese valor como `importe_cargo`, sin tocar `importe`, que sigue siendo el del recibo.

### Fechas que faltan y «Generar nuevas fechas» (DC-22)

`fechasFaltantes` calcula qué meses de la secuencia, anclada en `fecha_inicial`, no tienen ningún cargo del recibo en el año en curso. Nunca propone fechas anteriores a `fecha_inicial` ni de un ejercicio cerrado (un recibo cuya última fecha es de un año anterior). Cada fecha lleva `generable`: verdadero si es posterior al último cargo del recibo, o si es un hueco intermedio cuya fecha aún no ha llegado. `completarFechasAnio` (botón «Generar nuevas fechas») añade solo las generables; los huecos de fechas ya pasadas solo se pueden añadir a mano con el «+». Los cargos nuevos nacen pendientes y con el mismo `activo` que el último cargo del recibo.

### Ejercicio cerrado y cargos pagados (DC-18, DC-20, DC-21)

No se puede borrar un recibo con cargos pagados ni uno que tenga sucesor. Un cargo pagado suelto solo se puede borrar durante el mes en que vence (para rectificar). La pantalla aplica la misma regla para editar: un cargo pagado solo se edita durante su mes. Los recibos de un año anterior al actual son un ejercicio cerrado: no se les añaden ni generan fechas. La opción de sesión de Ajustes › Administrar recibos «Permitir editar/borrar recibos pagados» permite al administrador saltarse esta regla: el servidor solo la acepta de un administrador (`permitirPagados=1`) y, con ella, `deleteRecibo` omite la comprobación de cargos pagados (cargos sueltos de meses cerrados y recibos completos); el 409 por recibos de años posteriores se mantiene (DC-21, DC-25).

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

- Las consultas actuales no aplican permisos por usuario (S-01)
- No existe filtro por propietario en getRecibos; autenticar no equivale a limitar filas
- es_privado no se aplica en estas consultas (S-01)

## Validaciones y Manejo de Errores

- Verificación de presencia de campos obligatorios (concepto, periodicidad, importe, categoría, cuenta_id), con un mensaje que nombra los campos que faltan (un importe vacío o 0 cuenta como falta)
- Validación de tipos y rangos (importe positivo, longitud máxima para concepto)
- Comprobación de valores permitidos (categorías existentes, periodicidades válidas)
- Verificación de formato de fechas
- Verificación de que las fechas caen en el año natural del recibo (DC-14), salvo `permitirFueraDeAnio` (DC-29)
- Manejo detallado de errores con mensajes descriptivos para facilitar la depuración

## Consideraciones de Rendimiento

- Uso de índices en las claves foráneas para optimizar las consultas JOIN
- Liberación inmediata de conexiones para maximizar la disponibilidad del pool
- Uso de transacciones para operaciones que afectan a múltiples tablas
- Consultas optimizadas con filtros aplicados directamente en la base de datos

## Trazas en el log

`pushRecibo` deja trazas con el formato «módulo - acción: datos» (DC-09): en modo automático para las fechas de un recibo con fechas y, siempre, al rechazar o admitir fechas fuera de año:

| Traza | Cuándo |
|-------|--------|
| `pushRecibo - Recibo …: fecha A -> B (fechas_cargo …)` | Una fecha pendiente se ha reescrito |
| `pushRecibo - Recibo …: fecha … conservada por estar …` | La fecha no está pendiente y no se toca |
| `pushRecibo - Recibo …: fecha … sin cambios` | La fecha pendiente ya coincidía con la calculada |
| `pushRecibo - Recibo …: modo automático, N fechas reescritas y M conservadas` | Resumen al terminar |
| `pushRecibo - Recibo …: fechas fuera del año …` | Se rechazan fechas fuera del año del recibo (DC-14) |
| `pushRecibo - Recibo …: fechas fuera del año … admitidas por permitirFueraDeAnio` | Un administrador las admitió con el interruptor de sesión (DC-29) |
| `pushRecibo - Concepto normalizado a minúsculas: …` | Cuando el concepto llega con mayúsculas o espacios; se guarda en minúsculas y sin espacios sobrantes (F-44, DC-31) |

## Referencias

- [API de Recibos](../routes/recibos.md) - Rutas que utilizan estas funciones
- [Documentación de BillService](../services/BillService.md) - Cliente que eventualmente llama a estas funciones
- [Componente ListBills](../components/ListBills.md) - Interfaz de usuario para recibos
