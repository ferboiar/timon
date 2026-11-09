# Conexión a la base de datos (`db_utilsConn`)

Archivo: `backend/src/db/db_utilsConn.mjs`. Gestiona el fichero de conexión `backend/src/db/.db_connection` y su copia `.db_connection.backup`.

| Función | Descripción |
|---------|-------------|
| `getDbConfig()` | Devuelve `{ config, backupExists }`: las claves del fichero sin `DB_PASSWORD` (o `{}` si no existe) y si hay copia |
| `getDbPassword()` | Devuelve solo `DB_PASSWORD` (cadena vacía si no hay fichero) |
| `testDbConnection(config)` | Abre y cierra una conexión de prueba con TLS (`rejectUnauthorized: false`); lanza un error con el motivo si falla |
| `saveDbConfig(config)` | Copia el fichero actual a `.db_connection.backup` y escribe el nuevo en formato `CLAVE=valor`, sin validar las claves |
| `restoreDbConfig()` | Copia `.db_connection.backup` sobre `.db_connection` y borra la copia; error si no existe |

El pool de conexiones de la aplicación (`db_connection.mjs`) trabaja en UTC (`timezone: 'Z'` y `SET time_zone = '+00:00'`, DC-25). Hallazgos abiertos: S-03 (claves sin validar, pool que no se recrea, TLS fijo, contraseña expuesta por la API). Desde F-13/DC-05 el pool usa también `dateStrings: ['DATE']`: las columnas `DATE` llegan como texto `YYYY-MM-DD` y `TIMESTAMP` y `DATETIME` siguen como `Date`. La configuración sale de `construirConfiguracionPool`, exportada para probarla sin base de datos (`backend/test/pool.test.mjs`).

## Errores (F-48)

Este módulo entra en F-48 porque era el último punto que devolvía al cliente el texto del motor (`API. Falló la prueba de conexión: …`). Ahora:

- `testDbConnection` traduce la causa con el [catálogo](../utils/catalogoErrores.md) y lanza un `ErrorDeNegocio` 400 con un mensaje de usuario; si la causa no se identifica, indica que consulte el registro del servidor. El detalle va al log.
- `getDbConfig`, `getDbPassword`, `saveDbConfig` y `restoreDbConfig` lanzan errores de negocio con un texto que dice qué comprobar: 500 para los fallos de lectura, escritura y restauración, y 409 `SIN_COPIA` cuando no hay copia que restaurar.
- Los mensajes `API. …` desaparecen: el log usa el formato «módulo - acción: datos» (DC-09) y no incluye contraseñas.

No cambia el uso de `mysql2` ni la configuración de TLS (S-03 sigue abierto).

## Referencias

- [API de conexión](../routes/conexionDB.md)
- [Configuración de entorno](../config/env.md)
