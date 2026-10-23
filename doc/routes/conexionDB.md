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

## Referencias

- [db_utilsConn](../db/db_utilsConn.md) - Funciones que implementan estas rutas
- [DbConfigService](../services/DbConfigService.md) - Cliente del frontend
- [Componente ProfileSettings](../components/ProfileSettings.md)
