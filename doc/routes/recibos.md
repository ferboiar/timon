# API de Recibos

## Descripción General

Este módulo implementa las rutas de la API REST para la gestión de recibos y sus fechas de cargo asociadas. Sirve como capa intermedia entre la interfaz de usuario y las funciones de acceso a la base de datos.

## Rutas Implementadas

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/recibos` | Obtiene recibos con filtros opcionales |
| `POST` | `/api/recibos` | Crea o actualiza un recibo con sus fechas de cargo |
| `DELETE` | `/api/recibos/:id` | Elimina un recibo o una fecha de cargo específica |

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

La respuesta es un array de objetos con los datos de los recibos y sus fechas de cargo correspondientes.

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

Cada elemento del array `cargo` debe contener:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Number | ID de la fecha de cargo (solo para actualización) |
| `fecha` | String | Fecha del cargo (formato YYYY-MM-DD) |
| `estado` | String | Estado del cargo (pendiente, pagado, rechazado) |
| `comentario` | String | Comentario opcional |
| `activo` | Boolean/Number | Estado de actividad (1 activo, 0 inactivo) |

### Eliminar un recibo (DELETE /api/recibos/:id)

Esta ruta permite eliminar un recibo completo o solo una fecha de cargo específica, dependiendo de los parámetros proporcionados:

- Si se proporciona solo el ID, se elimina el recibo completo y todas sus fechas de cargo.
- Si se proporcionan el ID, la fecha y la periodicidad, el comportamiento depende de la periodicidad:
  - Para recibos mensuales, se elimina el recibo completo.
  - Para recibos bimestrales/trimestrales, se elimina solo la fecha de cargo específica. Si era la última fecha, se elimina también el recibo.

#### Parámetros de consulta para DELETE:

| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `fecha` | String | Fecha del cargo a eliminar | No |
| `periodicidad` | String | Periodicidad del recibo | No |

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
- El campo `cuenta_id` debe hacer referencia a una cuenta existente 
- El campo `propietario_id` se obtiene automáticamente del token JWT del usuario autenticado
- Validaciones adicionales de tipos y formatos se realizan en las funciones de base de datos

## Manejo de Errores

Todas las rutas implementan manejo de errores que:
1. Capturan excepciones que puedan ocurrir durante el procesamiento
2. Devuelven códigos de estado HTTP apropiados (200, 201, 400, 404, 500)
3. Proporcionan mensajes de error descriptivos y detalles adicionales cuando es necesario

## Dependencias

Este módulo depende directamente de las funciones de base de datos definidas en `db_utils.mjs`, que manejan todas las operaciones de base de datos relacionadas con recibos y sus fechas de cargo.

## Referencias

- [Documentación de BillService](../services/BillService.md) - Cliente que consume esta API
- [Utilidades de Base de Datos para Recibos](../db/db_utilsBill.md) - Implementación de las funciones de base de datos
- [Componente ListBills](../components/ListBills.md) - Interfaz de usuario que interactúa con esta API