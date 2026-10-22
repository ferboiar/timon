# API de Ajustes

## Rutas

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/api/ajustes/general` | Usuario autenticado | Devuelve `zona_horaria` y `ahora_utc` |
| `PUT` | `/api/ajustes/general` | Administrador | Cambia la zona horaria (`{ "zona_horaria": "Europe/Madrid" }`); 400 si no es válida |
| `GET` | `/api/ajustes/recibos` | Administrador | Devuelve `crear_recibos_automaticamente` |
| `PUT` | `/api/ajustes/recibos` | Administrador | Activa o desactiva la creación automática (`{ "crear_recibos_automaticamente": true }`) |
| `POST` | `/api/ajustes/recibos/generar-anio` | Administrador | Con `{ "simular": true }` (por defecto) devuelve la vista previa; con `false` ejecuta el procedimiento. Devuelve `{ simulacion, filas }` |

Las filas de la vista previa son las del procedimiento: `origen_id`, `nuevo_id`, `concepto`, `anio_nuevo`, `fechas`, `primera`, `ultima` y `aviso`.

## Referencias

- [Ajustes del sistema (db_ajustes)](../db/db_ajustes.md)
- [Procedimiento de recibos del año](../db/generar_recibos_anio.md)
