# API de Recibos

## Descripción General

Este módulo implementa las rutas de la API REST para la gestión de recibos y sus fechas de cargo asociadas. Sirve como capa intermedia entre la interfaz de usuario y las funciones de acceso a la base de datos.

## Rutas Implementadas

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/recibos` | Obtiene recibos con filtros opcionales |
| `POST` | `/api/recibos` | Crea o actualiza un recibo con sus fechas de cargo |
| `DELETE` | `/api/recibos/:id` | Elimina un recibo o una fecha de cargo específica; 409 si hay cargos pagados o el recibo tiene sucesor |
| `POST` | `/api/recibos/:id/generar-fechas` | Añade las fechas generables que faltan en el año en curso (las posteriores al último cargo y los huecos cuya fecha aún no ha llegado), siguiendo la secuencia del recibo (DC-22); responde 404 si el recibo no existe y 409 si no tiene fechas o su ejercicio está cerrado |
| `POST` | `/api/recibos/actualizar-fechas` | Aplica lo anterior a todos los recibos; solo administradores (403 en otro caso) |

## Características Principales

- Gestión completa de recibos y sus fechas de cargo asociadas
- Soporte para filtrado avanzado (periodicidad, fecha, año, concepto, estado)
- Validación de parámetros obligatorios
- Manejo detallado de errores con mensajes descriptivos
- Operaciones atómicas mediante transacciones

## Detalles de Implementación

### Obtener recibos (GET /api/recibos)

Esta ruta permite obtener todos los recibos o filtrarlos según diversos criterios mediante parámetros de consulta:

- `periodicidad`: Filtrar por la frecuencia del recibo (mensual, bimestral, trimestral)
- `fecha`: Filtrar por una fecha específica o un rango de fechas (formato: 'fecha_inicio a fecha_fin')
- `año`: Filtrar por el año de las fechas de cargo
- `concepto`: Filtrar por concepto del recibo
- `categoria`: Filtrar por categoría asociada
- `estado`: Filtrar por estado de los cargos
- `activo`: Filtrar por estado de actividad (1 activo, 0 inactivo)

La respuesta es un array de objetos con los datos de los recibos y sus fechas de cargo correspondientes. Cada objeto incluye `importe` (el del recibo) e `importe_cargo` (el real del cargo, vacío si está pendiente).

### Crear o actualizar un recibo (POST /api/recibos)

Esta ruta permite crear un nuevo recibo o actualizar uno existente si se proporciona un ID.

#### Campos del cuerpo de la solicitud:

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | Number | ID del recibo (solo para actualización) | No |
| `concepto` | String | Descripción corta del recibo | Sí |
| `periodicidad` | String | Frecuencia del recibo | Sí |
| `importe` | Number | Cantidad del recibo | Sí |
| `categoria` | String | Categoría a la que pertenece el recibo | Sí |
| `cuenta_id` | Number | ID de la cuenta bancaria asociada al recibo | Sí |
| `cargo` | Array | Lista de fechas de cargo con sus estados | Sí |
| `fecha_inicial` | String | Fecha desde la que se generan las fechas de cargo en modo automático (YYYY-MM-DD). Obligatoria con `modoFechas` = `auto` | No |
| `modoFechas` | String | `manual` o `auto`. Con `auto` el servidor genera las fechas; sin este campo solo las genera si no llega `cargo` | No |

Cada elemento del array `cargo` debe contener:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Number | ID de la fecha de cargo (solo para actualización) |
| `fecha` | String | Fecha del cargo (formato YYYY-MM-DD) |
| `estado` | String | Estado del cargo (pendiente o cargado) |
| `importe` | Number | Importe real del cargo. Al pasarlo a cargado siempre se guarda; en un cargo pendiente solo si difiere del importe del recibo (si coincide, el cargo sigue al recibo). Si no se indica, se conserva el que ya tuviera o, al pagar, el del recibo (DC-15) |
| `comentario` | String | Comentario opcional |
| `activo` | Boolean/Number | Estado de actividad (1 activo, 0 inactivo) |

#### Modo de fechas (`modoFechas`)

- `manual`: se guardan las fechas recibidas. Las que traen `id` se actualizan, las demás se insertan y las entradas sin fecha se ignoran.
- `auto` en un recibo nuevo: el servidor genera las fechas desde `fecha_inicial` hasta el 31 de diciembre de ese año (DC-16); en un año completo son 12 mensuales, 6 bimestrales, 4 trimestrales o 1 anual.
- `auto` al actualizar un recibo con fechas: se reescriben solo las fechas en estado `pendiente`, siguiendo la secuencia generada desde `fecha_inicial`. Las fechas con cualquier otro estado no se tocan (DC-11) y el log registra cada cambio.

La respuesta 201 incluye, además de `message`, `fechasReescritas` y `fechasConservadas`: ambos valen 0 salvo en modo automático sobre un recibo con fechas.

### Eliminar un recibo (DELETE /api/recibos/:id)

Esta ruta permite eliminar un recibo completo o solo una fecha de cargo específica, dependiendo de los parámetros proporcionados:

- Si se proporciona solo el ID, se elimina el recibo completo y todas sus fechas de cargo.
- Si se proporcionan el ID y la fecha (la periodicidad es opcional):
  - Con `fecha`, se elimina solo ese cargo, sea cual sea la periodicidad.
  - Si era la última fecha de cargo, se elimina también el recibo.
- Si el recibo (o la fecha indicada) tiene cargos pagados, responde 409 y no borra nada (DC-18), salvo que un administrador envíe `permitirPagados=1` (DC-21). También responde 409 si el recibo tiene recibos de años posteriores. Al borrar un recibo que procede de otro, el origen queda con `replicar = 0`.

#### Parámetros de consulta para DELETE:

| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `fecha` | String | Fecha del cargo a eliminar | No |
| `periodicidad` | String | Periodicidad del recibo | No |
| `permitirPagados` | String | `1` para permitir borrar cargos pagados de meses cerrados; solo se aplica si el usuario es administrador (opción de sesión de Ajustes, DC-21) | No |

## Sistema de Propiedad y Acceso

### Asignación Automática de Propietario

Cuando se crea un nuevo recibo a través del endpoint POST, el sistema:

1. Obtiene el ID del usuario desde el token JWT presente en la cabecera de autenticación
2. Asigna automáticamente este ID como `propietario_id` del recibo
3. No permite modificar manualmente el propietario, asegurando la integridad del sistema de permisos

```javascript
// Extracto del código que maneja la asignación del propietario
const propietarioId = req.user.id; // Obtenemos el ID del usuario del token JWT
await pushRecibo(id, concepto, periodicidad, importe, categoria, cargo, propietarioId, cuenta_id);
```

### Validación de Cuenta Bancaria

El endpoint POST valida que se proporcione un `cuenta_id` válido:

```javascript
if (!cuenta_id) {
    return res.status(400).json({ error: 'El campo cuenta_id es obligatorio.' });
}
```

Este campo asocia el recibo con una cuenta bancaria específica, lo que permite el seguimiento financiero adecuado de todos los cargos asociados.

## Validaciones

La API implementa las siguientes validaciones:
- El campo `cargo` debe ser un array
- Los campos concepto, periodicidad, importe, categoría, cuenta_id y cargo son obligatorios
- Si falta alguno de concepto, periodicidad, importe, categoría o cuenta, el error nombra exactamente los campos que faltan; un importe vacío o 0 cuenta como falta. El propietario no se envía: lo asigna el servidor desde el token
- El campo `cuenta_id` debe hacer referencia a una cuenta existente 
- El campo `propietario_id` se obtiene automáticamente del token JWT del usuario autenticado
- Validaciones adicionales de tipos y formatos se realizan en las funciones de base de datos

## Manejo de Errores

Todas las rutas implementan manejo de errores que:
1. Capturan excepciones que puedan ocurrir durante el procesamiento
2. Devuelven códigos de estado HTTP apropiados (200, 201, 400, 404, 409, 500)
3. Proporcionan mensajes de error descriptivos y detalles adicionales cuando es necesario

## Trazas en el log

Al guardar un recibo en modo automático, `pushRecibo` registra en el log cada fecha reescrita, conservada o sin cambios (DC-09); el detalle está en [db_utilsBill](../db/db_utilsBill.md#trazas-en-el-log).

## Dependencias

Este módulo depende directamente de las funciones de base de datos definidas en `db_utils.mjs`, que manejan todas las operaciones de base de datos relacionadas con recibos y sus fechas de cargo.

## Referencias

- [Documentación de BillService](../services/BillService.md) - Cliente que consume esta API
- [Utilidades de Base de Datos para Recibos](../db/db_utilsBill.md) - Implementación de las funciones de base de datos
- [Componente ListBills](../components/ListBills.md) - Interfaz de usuario que interactúa con esta API