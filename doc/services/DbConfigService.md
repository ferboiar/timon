# DbConfigService

Archivo: `src/service/DbConfigService.js`. Cliente de la [API de conexión](../routes/conexionDB.md) para la pestaña Base de Datos de Ajustes.

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getDbConfig()` | Configuración actual **sin contraseñas** y si existe copia de seguridad | `GET /api/db-config` |
| `testDbConnection(config)` | Prueba una configuración; si no se envía contraseña, el servidor usa la guardada | `POST /api/db-config/test` |
| `saveDbConfig(config)` | Guarda una configuración | `PUT /api/db-config` |
| `restoreDbConfig()` | Restaura la configuración desde la copia | `POST /api/db-config/restore` |

**`getDbPassword()` se retiró (S-03)** junto con `GET /api/db-config/password`: la pantalla ya no pide la contraseña y la muestra vacía.

Usa `apiClient`: el interceptor añade el token y centraliza el cierre de sesión ante un 401. El cuerpo de la petición lo compone `configuracionParaEnviar()` de `src/utils/configuracionBd.js`, que no envía contraseñas vacías.

## Referencias

- [Componente ProfileSettings](../components/ProfileSettings.md)
