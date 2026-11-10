# MaintenanceDBService

Archivo: `src/service/MaintenanceDBService.js`. Exporta la clase `MtoDBService`, cliente de la [API de mantenimiento](../routes/mantenimientoDB.md).

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `backupDatabase()` | Descarga la copia de seguridad (respuesta `blob`) | `GET /api/db/backup` |
| `restoreDatabase(formData)` | Envía el volcado `.sql` en un `FormData` y devuelve la respuesta; ante un error propaga el mensaje del servidor | `POST /api/db/restore` |

Ambos métodos usan `apiClient`; el interceptor añade el token JWT desde `localStorage` o `sessionStorage`. La restauración conserva la cabecera `Content-Type: multipart/form-data`.

## Referencias

- [Componente ProfileSettings](../components/ProfileSettings.md)
