# Catálogo de causas de error (`utils/catalogoErrores`)

Archivo: `backend/src/utils/catalogoErrores.mjs`. Traduce el error de la base de datos o del sistema operativo a una frase que una persona pueda entender: qué ha pasado y qué puede hacer. Se aplica en F-48 al conjunto de rutas y módulos de datos del backend.

Nunca devuelve códigos del motor (`ER_*`), nombres de tabla o columna, rutas de fichero, trazas ni códigos de `errno`. El detalle completo, saneado, queda en el log del servidor (DC-09).

## Audiencias

El texto lo decide la **audiencia de la ruta**, no el rol de quien llama en ese momento:

| Audiencia | Rutas | Tono del mensaje |
|---|---|---|
| `AUDIENCIA_ADMIN` | usuarios (gestión), conexión y mantenimiento de la base de datos | Puede hablar del servicio de la base de datos, del disco, de los permisos y de las herramientas del servidor |
| `AUDIENCIA_GENERAL` | ajustes, anticipos y preferencias de estilo | Se entiende sin conocimientos técnicos y remite al administrador |

## Catálogo

| Causa | Detección | Mensaje |
|---|---|---|
| Base no accesible | `ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`, `EHOSTUNREACH`, `ETIMEDOUT`, `PROTOCOL_CONNECTION_LOST`, `ECONNRESET`, `EPIPE` | No se puede acceder a la base de datos. Comprueba que el servicio esté en marcha y que la dirección y el puerto sean correctos. |
| Credenciales rechazadas | `ER_ACCESS_DENIED_ERROR`, `ER_ACCESS_DENIED_NO_PASSWORD_ERROR`, `ER_NOT_SUPPORTED_AUTH_MODE` | El servidor de la base de datos ha rechazado el usuario o la contraseña de la configuración. |
| Base inexistente | `ER_BAD_DB_ERROR` | El servidor no tiene ninguna base de datos con ese nombre. |
| Dato referenciado | `ER_ROW_IS_REFERENCED_2`, `ER_ROW_IS_REFERENCED` | No se puede eliminar porque tiene datos asociados. |
| Dato demasiado largo | `ER_DATA_TOO_LONG` | El valor de «campo» es demasiado largo. |
| Base ocupada | `ER_LOCK_WAIT_TIMEOUT`, `ER_LOCK_DEADLOCK` | La base de datos está ocupada. Inténtalo de nuevo en unos segundos. |
| Disco o permisos | `ENOSPC`, `EACCES`, `EPERM` | No hay espacio en disco o falta permiso de escritura en el servidor. |
| Herramienta ausente | `ENOENT` y el código `127` o `126` de `exec` | La herramienta de copia de seguridad no está instalada en el servidor. |
| No identificada | cualquier otro error | admin: «La causa no se ha podido identificar; consulta el registro del servidor.» · general: «Inténtalo de nuevo y, si persiste, avisa al administrador.» |

El **duplicado** (`ER_DUP_ENTRY`) no tiene texto propio: se resuelve por campo en el módulo que conoce el dato afectado, leyendo el **nombre del índice único** que informa el motor (`username_UNIQUE`, `email`…), nunca por una subcadena del mensaje.

El nombre de la columna de un «demasiado largo» se traduce con un diccionario (`username` → «nombre de usuario», `descripcion` → «descripción»…); si la columna no está en el diccionario, el mensaje dice «Uno de los datos es demasiado largo.».

## Exportaciones

| Exportación | Descripción |
|---|---|
| `AUDIENCIA_ADMIN`, `AUDIENCIA_GENERAL` | Audiencias admitidas |
| `codigoDeError(error)` | Código del error, mirando también la causa encadenada (`error.cause.code`) |
| `avisoDesconocido(audiencia)` | Cierre del mensaje cuando la causa no se identifica |
| `mensajeDeCausa(error)` | Texto de la causa, o `null` si no se identifica o si es un duplicado |
| `mensajeTecnico(mensajePropio, error, { audiencia, aviso })` | Compone el mensaje visible de un error técnico |
| `nombreDeIndiceDuplicado(error)` | Nombre del índice único que ha provocado el duplicado |
| `campoDuplicado(error)` | Nombre legible del campo duplicado, o `null` |
| `campoDemasiadoLargo(error)` | Columna que ha desbordado su longitud, o `null` |

Todas son funciones puras: se prueban sin base de datos ni servidor (`backend/test/catalogoErrores.test.mjs`).

## Composición del mensaje

El mensaje visible de un error técnico es el **texto propio de la operación** seguido de la causa o del aviso por audiencia:

```text
No se ha podido crear el usuario. No se puede acceder a la base de datos. Comprueba que el servicio esté en marcha y que la dirección y el puerto sean correctos.
```

## Referencias

- [Utilidad de errores de negocio](./errorDeNegocio.md) - La usa para responder al cliente
- [Utilidad de mensajes del frontend](./apiError.md) - Muestra el mensaje en pantalla
- [API de conexión a la base de datos](../routes/conexionDB.md)
- [API de mantenimiento de la base de datos](../routes/mantenimientoDB.md)
