# API de mantenimiento de la base de datos

Rutas montadas en `/api/db` (`backend/src/routes/mantenimientoDB.mjs`). Exigen administrador (`verifyAdmin`).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/db/backup` | Genera un volcado con `mysqldump` en `backup.sql` (raíz del proyecto), lo envía como descarga y lo borra después. 500 si falla |
| `POST` | `/api/db/restore` | Recibe un fichero `.sql` (campo `backupFile`, `multipart/form-data`), lo valida y restaura la base sobrescribiendo los datos actuales. 400 si no hay fichero o no parece un volcado; 500 si falla |

El fichero subido se guarda en el directorio temporal del sistema y se borra al terminar. La implementación monta los comandos de `mysqldump` y `mysql` con la contraseña en la línea de comandos (hallazgo abierto S-02).

## Manejo de errores (F-48)

Rutas de administrador. La validación del volcado lanza errores de negocio con su propio estado: ya no se clasifica el fallo por el texto del mensaje. Los fallos de `mysqldump` o `mysql` se traducen con el [catálogo de causas](../utils/catalogoErrores.md) (herramienta ausente, disco o permisos, base no accesible) y el detalle va al log (DC-09).

| Situación | Clave | Estado | Código |
|---|---|---|---|
| No se ha subido ningún archivo | `message` | 400 | — |
| El archivo no es un volcado de MySQL o MariaDB | `message` | 400 | `VOLCADO_NO_VALIDO` |
| El volcado está incompleto | `message` | 400 | `VOLCADO_INCOMPLETO` |
| Configuración de la base de datos incompleta (indica qué dato falta) | `message` | **409** (antes 500) | `CONFIGURACION_INCOMPLETA` |
| La restauración falla | `message` | 500 | — |
| La copia no se puede generar | `error` | 500 | — |
| La copia se genera pero no se puede enviar | `error` | 500 | — |

## Referencias

- [db_maintenance](../db/db_maintenance.md) - Funciones `backupDb` y `restoreDb`
- [MaintenanceDBService](../services/MaintenanceDBService.md) - Cliente del frontend
- [Componente ProfileSettings](../components/ProfileSettings.md)
