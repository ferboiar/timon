# API de conexión a la base de datos

Rutas montadas en `/api/db-config` (`backend/src/routes/conexionDB.mjs`). Todas exigen administrador (`verifyAdmin`). Las usa la pestaña Base de Datos de Ajustes.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/db-config` | Devuelve `{ config, backupExists }`: la configuración de `backend/src/db/.db_connection` sin la contraseña y si existe la copia `.db_connection.backup` |
| `GET` | `/api/db-config/password` | Devuelve `{ password }`. Hallazgo abierto S-03 |
| `POST` | `/api/db-config/test` | Prueba una configuración (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`); 400 con el motivo si falla |
| `PUT` | `/api/db-config` | Prueba la configuración y, si conecta, la guarda; antes copia el fichero actual a `.db_connection.backup`. 400 si falla |
| `POST` | `/api/db-config/restore` | Restaura la configuración desde `.db_connection.backup` y borra la copia; 500 si no existe |

Guardar la configuración no recrea el pool de conexiones del servidor en marcha (S-03).

## Manejo de errores (F-48)

Todas las rutas exigen administrador (`verifyAdmin`), así que los mensajes pueden hablar del archivo de configuración, del servicio de la base de datos y de los permisos del servidor. Se usa la utilidad compartida con la clave `message` y el [catálogo de causas](../utils/catalogoErrores.md); el detalle del motor va solo al log (DC-09).

| Situación | Estado | Código |
|---|---|---|
| La prueba de conexión falla por una causa conocida (servicio caído o dirección incorrecta, credenciales rechazadas, base inexistente, tiempo agotado) | 400 | — |
| La prueba falla sin causa identificable | 400 | — |
| No se puede leer el archivo de configuración o la contraseña | 500 | — |
| No se puede guardar la configuración | **500** (antes 400) | — |
| No hay copia de la configuración que restaurar | **409** (antes 500) | `SIN_COPIA` |
| No se puede restaurar la copia | 500 | — |

«Probar» (`POST /api/db-config/test`) solo abre una conexión y la cierra: no escribe `.db_connection` ni crea `.db_connection.backup`. Los fallos de la prueba nunca muestran el código del sistema (`ECONNREFUSED`) ni el texto del motor.

## Referencias

- [db_utilsConn](../db/db_utilsConn.md) - Funciones que implementan estas rutas
- [DbConfigService](../services/DbConfigService.md) - Cliente del frontend
- [Componente ProfileSettings](../components/ProfileSettings.md)
