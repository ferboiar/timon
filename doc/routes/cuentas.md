# API de Cuentas

## Descripción General

Este módulo implementa las rutas de la API REST para la gestión de cuentas bancarias y financieras. Sirve como capa intermedia entre la interfaz de usuario y las funciones de acceso a la base de datos.

## Rutas Implementadas

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/cuentas` | Obtiene todas las cuentas |
| `POST` | `/api/cuentas` | Crea o actualiza una cuenta |
| `DELETE` | `/api/cuentas` | Elimina una o más cuentas |
| `GET` | `/api/cuentas/tipos` | Obtiene los tipos de cuentas válidos |

## Detalles de Implementación

### Obtener todas las cuentas (GET /api/cuentas)

Esta ruta devuelve un array con todas las cuentas registradas en el sistema. Los datos son obtenidos directamente desde la función `getAccounts()` del módulo de utilidades de base de datos.

### Crear o actualizar una cuenta (POST /api/cuentas)

Esta ruta permite crear una nueva cuenta o actualizar una existente. El comportamiento depende de si se proporciona un ID en el cuerpo de la petición:
- Si el ID es `null`, se creará una nueva cuenta
- Si se proporciona un ID válido, se actualizará la cuenta correspondiente

#### Campos del cuerpo de la solicitud:

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | Number | ID de la cuenta (null para crear nueva) | No |
| `nombre` | String | Nombre de la cuenta | Sí |
| `tipo` | String | Tipo de cuenta (corriente, ahorro, etc.) | Sí |
| `iban` | String | Código IBAN de la cuenta | No |
| `saldo_actual` | Number | Saldo actual de la cuenta | No |
| `descripcion` | String | Descripción detallada de la cuenta | No |
| `activa` | Number | Estado de la cuenta (1 activa, 0 inactiva) | No |

### Eliminar cuentas (DELETE /api/cuentas)

Esta ruta permite eliminar una o más cuentas basándose en sus IDs. Acepta un array de IDs en el cuerpo de la petición bajo la propiedad `accounts`.

### Obtener tipos de cuentas (GET /api/cuentas/tipos)

Devuelve un array con los tipos de cuentas definidos en el esquema de la base de datos. Estos tipos representan las opciones válidas para el campo `tipo` de una cuenta.

## Manejo de Errores

Todas las rutas implementan manejo de errores que:
1. Capturan excepciones que puedan ocurrir durante el procesamiento
2. Devuelven códigos de estado HTTP apropiados (200, 201, 400, 500)
3. Proporcionan mensajes de error descriptivos y detalles adicionales cuando es necesario

## Dependencias

Este módulo depende directamente de las funciones de base de datos definidas en [`db_utilsAcc.mjs`](../db/db_utilsAcc.md), que manejan todas las operaciones de base de datos relacionadas con cuentas.

## Referencias

- [Documentación de AccService](../services/AccService.md) - Cliente que consume esta API
- [Utilidades de Base de Datos para Cuentas](../db/db_utilsAcc.md) - Implementación de las funciones de base de datos
- [Componente Accounts](../components/Accounts.md) - Interfaz de usuario que interactúa con esta API
