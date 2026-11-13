# Conexión a la base de datos (`db_utilsConn`)

Archivo: `backend/src/db/db_utilsConn.mjs`. Gestiona el fichero de configuración de la conexión y su copia, valida lo que se va a guardar y prepara la conexión de prueba.

## Ruta del fichero y aislamiento (S-03)

Por defecto: `backend/src/db/.db_connection` y su copia `.db_connection.backup`.

La variable de entorno **`DB_CONFIG_PATH`** permite apuntar a otro fichero; en ese caso la copia de seguridad se guarda a su lado, como `<ruta>.backup`. Si no está definida, todo sigue igual que antes. La usan las pruebas E2E para no tocar nunca el fichero real: ver [e2e/README.md](../../e2e/README.md).

## Claves y serialización

- `CLAVES_PERMITIDAS`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `DB_SSL_CA`, `DB_MAINT_USER` y `DB_MAINT_PASSWORD`. `validarClaves()` lanza **400 `CLAVES_NO_ADMITIDAS`** con cualquier otra.
- `serializarValor(clave, valor)` prepara cada valor para el fichero: los valores sencillos se escriben tal cual; si contienen `#`, comillas o espacios en los extremos se entrecomillan (con `"`, o con `'` si ya hay comillas dobles); los saltos de línea reales se guardan como la secuencia `\n` (dos caracteres) y **no se tocan las barras invertidas**. Da **400** si el valor contiene esa secuencia de escape (`VALOR_AMBIGUO`), un salto de línea en un campo que no sea `DB_SSL_CA` (`VALOR_CON_SALTO`) o comillas simples y dobles a la vez (`VALOR_CON_COMILLAS`).
- Hay una prueba de ida y vuelta con `dotenv.parse`: 12 valores especiales y un certificado PEM que deben releerse idénticos.

## Estado final que se guarda

`calcularConfiguracionFinal(config, { actual })` devuelve lo que se escribiría, partiendo de lo recibido y de lo que ya hay:

- Los campos obligatorios se guardan sin espacios sobrantes.
- `DB_SSL_CA` y `DB_MAINT_USER` son opcionales y no secretos: **si llegan vacíos se elimina la clave**; si la clave no llega, se conserva.
- Las contraseñas no se tocan si llegan vacías o no llegan.
- Al quitar el usuario de mantenimiento se quita también su contraseña.
- Una contraseña de mantenimiento sin usuario es **400 `MANTENIMIENTO_SIN_USUARIO`**, y cambiar el usuario sin contraseña nueva es **400 `MANTENIMIENTO_SIN_CONTRASENA`** (la anterior no sirve para otro usuario).

`validarCamposObligatorios(config)` exige host, puerto, usuario y base de datos (sin contar espacios) y un puerto entero entre 1 y 65535: **400 `CAMPOS_OBLIGATORIOS`** o **400 `PUERTO_NO_VALIDO`**.

## Funciones

| Función | Descripción |
|---------|-------------|
| `getDbConfig()` | Devuelve `{ config, backupExists }`: las claves del fichero **sin `DB_PASSWORD` ni `DB_MAINT_PASSWORD`** y si hay copia |
| `getDbPassword()` | Devuelve solo `DB_PASSWORD`. **Uso interno** (copia de seguridad y restauración); no se devuelve al cliente |
| `getDbMaintPassword()` | Devuelve `DB_MAINT_PASSWORD` (el entorno manda; si no, el fichero). **Uso interno** |
| `testDbConnection(config)` | Abre y cierra una conexión de prueba; si hay `DB_SSL_CA` usa `{ ca, rejectUnauthorized: true }` y, si no, `{ rejectUnauthorized: false }` con un aviso en el log |
| `saveDbConfig(config)` | Valida las claves, calcula el estado final, deja traza si se elimina la CA o el usuario de mantenimiento, copia el fichero anterior y escribe con modo `600` |
| `restoreDbConfig()` | Copia `.db_connection.backup` sobre el fichero y borra la copia; **409 `SIN_COPIA`** si no existe |

## El pool de conexiones (`db_connection.mjs`)

- `configuracionEfectiva()` toma cada clave de `process.env` y, si no está definida, del fichero (`process.env.DB_X ?? fichero.DB_X`). **No se usa `dotenv.config`**: el fichero no contamina el entorno y se puede releer sin reiniciar.
- `construirConfiguracionPool(entorno, { ca })` aplica el TLS de la misma forma que la prueba de conexión.
- `initPool()` está memoizado: las llamadas concurrentes comparten la promesa en curso (no se crean dos pools).
- `recrearPool()` se llama tras guardar: crea el pool nuevo, intercambia la referencia y cierra el anterior en segundo plano, sin cortar las peticiones en curso. Si la conexión viene del entorno, avisa y no hace nada.

## Errores (F-48)

Los mensajes visibles explican qué comprobar y el detalle del motor queda en el log con el formato «módulo - acción: datos» (DC-09), sin contraseñas.

## Referencias

- [API de conexión](../routes/conexionDB.md)
- [Configuración de entorno](../config/env.md)
