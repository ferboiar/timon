# API de mantenimiento de la base de datos

Rutas montadas en `/api/db` (`backend/src/routes/mantenimientoDB.mjs`). Exigen administrador (`verifyAdmin`).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/db/backup` | Genera un volcado con `mysqldump` (con `--routines --events`) en el directorio temporal (`timon-backup-<uuid>.sql`), lo envía como `backup.sql` y lo borra después. 500 si falla |
| `POST` | `/api/db/restore` | Recibe un fichero `.sql` (campo `backupFile`, `multipart/form-data`), lo valida y restaura la base sobrescribiendo los datos actuales. 400 si no hay fichero o no parece un volcado; **413 si supera 100 MB**; 500 si falla |

## Límite de tamaño (S-02)

- `limits.fileSize` de multer usa **`MAX_BYTES_VOLCADO`**, la misma constante de 100 MB que comprueba `db_maintenance` al validar el volcado: una sola fuente.
- El error `LIMIT_FILE_SIZE` de multer se convierte en **413 JSON** (`VOLCADO_DEMASIADO_GRANDE`) con el texto «El fichero supera el límite de 100 MB. Reduce el tamaño o divide el volcado.». Sin ese envoltorio, Express respondería su página de error en HTML.
- El fichero subido se guarda en el directorio temporal del sistema y se borra al terminar.

## Trazas (DC-09)

- `mantenimientoDB - restore: fichero <nombre> (<tamaño> bytes)` antes de restaurar, con el nombre saneado (`nombreParaLog`: sin caracteres de control y acotado a 120).
- `mantenimientoDB - restore: completada` o `mantenimientoDB - restore: fallida` después.
- `mantenimientoDB - copia de seguridad: volcado generado` al generar la copia.

## Manejo de errores (F-48)

Rutas de administrador. La validación del volcado lanza errores de negocio con su propio estado: no se clasifica el fallo por el texto del mensaje. Los fallos de `mysqldump` o `mysql` se traducen con el [catálogo de causas](../utils/catalogoErrores.md) y el detalle va al log (DC-09).

| Situación | Clave | Estado | Código |
|---|---|---|---|
| No se ha subido ningún archivo | `message` | 400 | — |
| El archivo no es un volcado de MySQL o MariaDB | `message` | 400 | `VOLCADO_NO_VALIDO` |
| El volcado está incompleto | `message` | 400 | `VOLCADO_INCOMPLETO` |
| El fichero supera los 100 MB | `message` | **413** | `VOLCADO_DEMASIADO_GRANDE` |
| Configuración de la base de datos incompleta (indica qué dato falta) | `message` | 409 | `CONFIGURACION_INCOMPLETA` |
| La restauración falla | `message` | 500 | — |
| La copia contiene rutinas o eventos con el `DEFINER` de otra cuenta y falta `SET USER` | `message` | 409 | `RESTAURACION_SIN_SET_USER` |
| La copia no se puede generar o no se puede enviar | `error` | 500 | — |

## Referencias

- [db_maintenance](../db/db_maintenance.md) - Funciones `backupDb` y `restoreDb`
- [MaintenanceDBService](../services/MaintenanceDBService.md) - Cliente del frontend
- [Componente ProfileSettings](../components/ProfileSettings.md)
