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

Esta ruta devuelve un array con todas las cuentas registradas en el sistema. Los datos son obtenidos directamente desde la función `getAccounts()` del módulo de utilidades de base de datos. Desde la migración 0010, cada objeto incluye además `modificado_por` (id del autor de la última escritura directa), porque `getAccounts` usa `SELECT *`; no se muestra en la pantalla (F-53, DC-74).

### Crear o actualizar una cuenta (POST /api/cuentas)

Esta ruta permite crear una nueva cuenta o actualizar una existente. El comportamiento depende de si se proporciona un ID en el cuerpo de la petición:
- Si el ID es `null`, se creará una nueva cuenta
- Si se proporciona un ID válido, se actualizará la cuenta correspondiente

#### Campos del cuerpo de la solicitud:

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | Number | ID de la cuenta (null para crear nueva) | No |
| `nombre` | String | Nombre de la cuenta (el servidor lo guarda sin espacios sobrantes y en minúsculas, DC-31, F-44) | Sí |
| `tipo` | String | Tipo de cuenta (corriente, ahorro, etc.) | Sí |
| `iban` | String | Código IBAN de la cuenta. Opcional: vacío o solo espacios se guardan como NULL. No puede repetirse entre cuentas; un IBAN repetido responde 409 con un mensaje que indica la cuenta que ya lo tiene | No |
| `saldo_actual` | Number | Saldo actual de la cuenta | No |
| `descripcion` | String | Descripción detallada de la cuenta | No |
| `activa` | Number | Estado de la cuenta (1 activa, 0 inactiva) | No |

Al crear una cuenta, el propietario (`propietario_id`) se toma del usuario autenticado (`req.user.id`); no se acepta desde el cuerpo de la petición.

### Eliminar cuentas (DELETE /api/cuentas)

Esta ruta permite eliminar una o más cuentas basándose en sus IDs. Acepta un array de IDs en el cuerpo de la petición bajo la propiedad `accounts`.

### Obtener tipos de cuentas (GET /api/cuentas/tipos)

Devuelve un array con los tipos de cuentas definidos en el esquema de la base de datos. Estos tipos representan las opciones válidas para el campo `tipo` de una cuenta.

## Manejo de Errores

Las rutas usan la utilidad común `backend/src/utils/errorDeNegocio.mjs` (F-47):

1. **Error de negocio** (`ErrorDeNegocio` o una clase heredada): se devuelve su mensaje con el código HTTP que lleva (400, 404 o 409). El IBAN duplicado responde **409** con el mensaje «El IBAN … ya está asignado a la cuenta «…»» y `codigo: "IBAN_DUPLICADO"`.
2. **Error técnico**: se responde **500** con un texto genérico («No se pudieron obtener las cuentas.», «No se pudieron obtener los tipos.», «No se pudo guardar la cuenta.», «No se pudieron eliminar las cuentas.»), sin detalle interno ni traza. El detalle saneado queda en el log del servidor con el contexto de la operación (`cuentas - GET`, `cuentas - GET tipos`, `cuentas - POST`, …; F-60, DC-09). Las dos lecturas usan la utilidad común desde F-60; antes respondían 500 con texto propio.

## Dependencias

Este módulo depende directamente de las funciones de base de datos definidas en [`db_utilsAcc.mjs`](../db/db_utilsAcc.md), que manejan todas las operaciones de base de datos relacionadas con cuentas.

## Referencias

- [Documentación de AccService](../services/AccService.md) - Cliente que consume esta API
- [Utilidades de Base de Datos para Cuentas](../db/db_utilsAcc.md) - Implementación de las funciones de base de datos
- [Componente Accounts](../components/Accounts.md) - Interfaz de usuario que interactúa con esta API

## Autorización implementada

Las rutas usan `autorizar('cuentas', …)`: escritura y borrado según `perm_cuentas` y el rol (DC-48). Cuentas es compartida: no aplica propietario ni `es_privado`. La lectura está disponible con cualquier sesión válida (DC-49); por eso un usuario con `perm_recibos = escritura` y `perm_cuentas = no` sí carga el desplegable de cuentas en Recibos (U-18).

## Validación del borrado

DELETE /api/cuentas valida la lista accounts con leerListaEnterosPositivos antes de consultar la base: falta, no es array, está vacío o contiene un ID inválido responde 400 (F-43). Si la cuenta está en uso por recibos, anticipos, pagos o presupuestos, deleteAccounts traduce la clave foránea a un 409 con mensaje de negocio (F-10).
