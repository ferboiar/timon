# API de mantenimiento de la base de datos

Rutas montadas en `/api/db` (`backend/src/routes/mantenimientoDB.mjs`). Exigen administrador (`verifyAdmin`).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/db/backup` | Genera un volcado con `mysqldump` en `backup.sql` (raíz del proyecto), lo envía como descarga y lo borra después. 500 si falla |
| `POST` | `/api/db/restore` | Recibe un fichero `.sql` (campo `backupFile`, `multipart/form-data`), lo valida y restaura la base sobrescribiendo los datos actuales. 400 si no hay fichero o no parece un volcado; 500 si falla |

El fichero subido se guarda en el directorio temporal del sistema y se borra al terminar. La implementación monta los comandos de `mysqldump` y `mysql` con la contraseña en la línea de comandos (hallazgo abierto S-02).

## Referencias

- [db_maintenance](../db/db_maintenance.md) - Funciones `backupDb` y `restoreDb`
- [MaintenanceDBService](../services/MaintenanceDBService.md) - Cliente del frontend
- [Componente ProfileSettings](../components/ProfileSettings.md)
