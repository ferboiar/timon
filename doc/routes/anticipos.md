# API de Anticipos

## Descripción General

Este módulo implementa las rutas de la API REST para la gestión de anticipos y pagos asociados. Sirve como capa intermedia entre la interfaz de usuario y las funciones de acceso a la base de datos.

## Rutas Implementadas

### Gestión de Anticipos

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/anticipos` | Obtiene todos los anticipos, con `importe_original`, el `pendiente` calculado y el `estado` efectivo (DC-38) |
| `POST` | `/api/anticipos` | Crea o actualiza un anticipo |
| `DELETE` | `/api/anticipos` | Elimina uno o más anticipos |
| `GET` | `/api/anticipos/periodicidades` | Obtiene las periodicidades válidas |

### Gestión de Pagos

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/anticipos/:anticipoId/pagos` | Obtiene los pagos de un anticipo específico |
| `POST` | `/api/anticipos/pagos` | Crea o actualiza un pago; al cambiar su importe reparte la diferencia entre los pendientes posteriores (DC-08, DC-40); responde 400 si se intenta pasar de pagado a cancelado (DC-38) y 404 si el pago o el anticipo no existen (DC-39) |
| `DELETE` | `/api/anticipos/pagos/:id` | Elimina un pago; con `?redistribuir=true` completa además el plan de pagos con su importe (DC-12). Una sola ruta para los dos casos (DC-39) |
| `POST` | `/api/anticipos/pagos/:id/sustituir` | Sustituye un pago por uno nuevo en una sola transacción (F-25, F-27, DC-39) |
| `POST` | `/api/anticipos/recalculate-payment-plan` | Recalcula el plan de pagos para un anticipo |

## Detalles de Implementación

### Manejo de Anticipos

La ruta principal para anticipos maneja operaciones CRUD básicas:
- **GET**: Recupera todos los anticipos almacenados
- **POST**: Crea un nuevo anticipo o actualiza uno existente si se proporciona un ID
- **DELETE**: Elimina uno o más anticipos basándose en un array de IDs

### Manejo de Pagos

Las rutas de pagos permiten:
- Recuperar pagos asociados a un anticipo específico
- Crear, actualizar y eliminar pagos individuales; el importe pendiente del anticipo no se guarda: se deriva de los pagos pagados (DC-38)
- Recalcular el plan de pagos cuando sea necesario

### Transacciones, bloqueo y códigos de error (F-27, DC-39)

Las operaciones que escriben en varias filas (alta o edición de un anticipo con su plan, alta o edición de un pago con su recálculo, borrado de un pago con o sin reparto, sustitución de un pago, borrado de anticipos y regeneración del plan) son transaccionales: si responden con error, no han cambiado nada. Cada una bloquea antes la fila del anticipo, de modo que dos peticiones simultáneas sobre el mismo anticipo se ejecutan una detrás de otra. Detalles en [db_utilsAdv](../db/db_utilsAdv.md).

Códigos: 400 para datos no válidos, 404 para un anticipo o un pago que no existe y 500 para fallos internos. El campo `error` de la respuesta es un texto breve pensado para mostrarse tal cual al usuario (la pantalla lo muestra con `getApiErrorMessage`); en los fallos internos solo se devuelve un texto genérico («No se pudo guardar el pago», por ejemplo) y el detalle queda en el log del servidor, con la traza `anticipos - Respuesta de error …`. Una cuenta inexistente se responde con 400 y «La cuenta indicada no existe».

### Validación de parámetros (F-43, DC-39)

`utils/parametros.mjs` lee los valores sin tipo de la URL, la consulta y el cuerpo antes de llegar a la base de datos: `leerEnteroPositivo` para ids (rechaza decimales, signos, ceros a la izquierda, texto añadido y enteros que JavaScript no puede representar con exactitud), `leerListaEnterosPositivos` para la lista de anticipos a borrar y `leerBooleano`, estricto, para `redistribuir` (solo `true` o `false`; una errata como `ture` da 400 en lugar de interpretarse como «no»). Todas lanzan un error con `status = 400` y un mensaje claro.

### Formato de fechas (F-13, DC-05)

Las columnas `DATE` (`fecha_inicio`, `fecha_fin_prevista` y la `fecha` de cada pago) se devuelven como texto `YYYY-MM-DD`. `created_at` y `updated_at`, donde existen, siguen siendo instantes ISO en UTC.

### Alta de anticipos y plan de pagos

Al crear un anticipo, el propietario (`propietario_id`) se toma del usuario autenticado (`req.user.id`). El servidor guarda el `concepto` sin espacios sobrantes y en minúsculas, al crear y al editar (DC-31, F-44). El plan de pagos solo se genera si hay periodicidad y un pago sugerido mayor que 0. Si el plan superaría los 1.200 pagos, la petición falla con 400 y no se guarda nada: el anticipo y su plan se escriben en una sola transacción (F-27, DC-39).

### Eliminar un pago (DELETE /api/anticipos/pagos/:id)

Una sola ruta para borrar un pago, con o sin reparto de su importe (DC-39). Sustituye a `POST /api/anticipos/delete-payment` y a la antigua `DELETE /api/anticipos/pagos/:id`, que se retiraron.

| Parámetro | Dónde | Tipo | Descripción | Requerido |
|-----------|-------|------|-------------|-----------|
| `id` | Ruta | Entero positivo | ID del pago a eliminar | Sí |
| `redistribuir` | Consulta | `true` o `false` | Solo `true` activa el recálculo: completa los pagos pendientes hasta el pago sugerido y crea los pagos nuevos que hagan falta (DC-12); exige pago sugerido y periodicidad | No (por defecto `false`) |

Ejemplo: `DELETE /api/anticipos/pagos/42?redistribuir=true`.

Respuesta 200: `message`, `pendiente` (importe pendiente del anticipo tras el borrado, antes del reparto), `anticipoId`, `redistribuido`, `pagosAjustados` y `pagosCreados`.

Códigos de error: 400 si `id` no es un entero positivo, si `redistribuir` no es `true` ni `false`, o si se pide repartir y el anticipo no tiene pago sugerido mayor que 0 y periodicidad; 404 si el pago no existe; 500 ante cualquier otro fallo. El borrado y el reparto van en una transacción: si cualquiera de los dos falla, el pago no se borra.

### Sustituir un pago (POST /api/anticipos/pagos/:id/sustituir)

Crea un pago nuevo y borra el antiguo, sin repartir su importe, en una sola transacción (F-25, F-27, DC-39). Es lo que hace «Añadirlo en un nuevo» en la pantalla.

| Campo del cuerpo | Tipo | Descripción | Requerido |
|---|---|---|---|
| `importe` | Number | Importe del pago nuevo, mayor que 0 | Sí |
| `fecha` | String | Fecha del pago nuevo, `AAAA-MM-DD` | Sí |
| `cuenta_destino_id` | Number | Cuenta destino; debe existir | Sí |
| `tipo` | String | `regular` (por defecto) o `extraordinario` | No |
| `descripcion` | String | Descripción opcional | No |

El pago nuevo siempre queda en estado `pendiente`. Respuesta 201: `message`, `pagoNuevoId`, `anticipoId` y `pendiente`. Códigos de error: 400 si algún dato no es válido o la cuenta no existe, 404 si el pago a sustituir no existe, 500 ante cualquier otro fallo. Si falla, el pago antiguo se conserva.

### Recalcular el plan (POST /api/anticipos/recalculate-payment-plan)

Recibe `anticipoId` (obligatorio, 400 si falta). Si el pago sugerido no es válido o el plan superaría los 1.200 pagos, responde 400 con el motivo en `error`; si el anticipo no existe, 404 (DC-39).

### Ejemplo de Cuerpo de Solicitud para POST /api/anticipos

```json
{
  "id": null, // null para crear, ID para actualizar
  "concepto": "Reparación coche",
  "importe_original": 1000,
  "pago_sugerido": 200,
  "fecha_inicio": "2023-01-15",
  "fecha_fin_prevista": "2023-06-15",
  "descripcion": "Reparación del motor del coche",
  "estado": "activo",
  "cuenta_origen_id": 1,
  "periodicidad": "mensual"
}
```

## Trazas en el log

Las rutas de pagos escriben su actividad en el log del backend (DC-09):

- `DELETE /pagos/:id - Procesando pago ID: … (redistribuir: …)` al recibir la petición y `DELETE /pagos/:id - Pago … eliminado del anticipo … (pendiente …, redistribuido: …, pagos ajustados: …, pagos nuevos: …)` al terminar.
- `sustituir-pago - Procesando pago ID: …` al sustituir un pago.
- `recalculate-payment-plan - Procesando anticipo ID: …` al regenerar el plan.
- Los errores de validación del plan salen como `Error en recalculatePaymentPlan: …`.

## Dependencias

Este módulo depende directamente de las funciones de base de datos definidas en [`db_utilsAdv.mjs`](../db/db_utilsAdv.md), que manejan todas las operaciones de base de datos relacionadas con anticipos y pagos. La lectura y validación de ids y booleanos la hace `utils/parametros.mjs` (F-43, DC-39).

## Referencias

- [Documentación de AdvService](../services/AdvService.md) - Cliente que consume esta API
- [Utilidades de Base de Datos para Anticipos](../db/db_utilsAdv.md) - Implementación de las funciones de base de datos
- [Componente Advances](../components/Advances.md) - Interfaz de usuario que interactúa con esta API

## Autorización implementada

Las rutas exigen sesión (verifyToken), pero no aplican filtros de propietario, privacidad ni permisos por módulo (S-01). Tener columnas propietario_id, es_privado o perm_* no equivale a aplicar esos permisos.
