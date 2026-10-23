# Conexión a la base de datos (`db_utilsConn`)

Archivo: `backend/src/db/db_utilsConn.mjs`. Gestiona el fichero de conexión `backend/src/db/.db_connection` y su copia `.db_connection.backup`.

| Función | Descripción |
|---------|-------------|
| `getDbConfig()` | Devuelve `{ config, backupExists }`: las claves del fichero sin `DB_PASSWORD` (o `{}` si no existe) y si hay copia |
| `getDbPassword()` | Devuelve solo `DB_PASSWORD` (cadena vacía si no hay fichero) |
| `testDbConnection(config)` | Abre y cierra una conexión de prueba con TLS (`rejectUnauthorized: false`); lanza un error con el motivo si falla |
| `saveDbConfig(config)` | Copia el fichero actual a `.db_connection.backup` y escribe el nuevo en formato `CLAVE=valor`, sin validar las claves |
| `restoreDbConfig()` | Copia `.db_connection.backup` sobre `.db_connection` y borra la copia; error si no existe |

El pool de conexiones de la aplicación (`db_connection.mjs`) trabaja en UTC (`timezone: 'Z'` y `SET time_zone = '+00:00'`, DC-25). Hallazgos abiertos: S-03 (claves sin validar, pool que no se recrea, TLS fijo, contraseña expuesta por la API).

## Referencias

- [API de conexión](../routes/conexionDB.md)
- [Configuración de entorno](../config/env.md)
