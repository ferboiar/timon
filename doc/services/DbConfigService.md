# DbConfigService

Archivo: `src/service/DbConfigService.js`. Cliente de la [API de conexión](../routes/conexionDB.md) para la pestaña Base de Datos de Ajustes.

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getDbConfig()` | Configuración actual sin contraseña y si existe copia de seguridad | `GET /api/db-config` |
| `getDbPassword()` | Solo la contraseña | `GET /api/db-config/password` |
| `testDbConnection(config)` | Prueba una configuración | `POST /api/db-config/test` |
| `saveDbConfig(config)` | Guarda una configuración | `PUT /api/db-config` |
| `restoreDbConfig()` | Restaura la configuración desde la copia | `POST /api/db-config/restore` |

## Referencias

- [Componente ProfileSettings](../components/ProfileSettings.md)
