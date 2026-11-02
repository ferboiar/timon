# API de Ajustes

## Rutas

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/api/ajustes/general` | Usuario autenticado | Devuelve `zona_horaria` y `ahora_utc` |
| `PUT` | `/api/ajustes/general` | Administrador | Cambia la zona horaria (`{ "zona_horaria": "Europe/Madrid" }`); 400 si no es válida |
| `GET` | `/api/ajustes/recibos` | Administrador | Devuelve `crear_recibos_automaticamente` |
| `PUT` | `/api/ajustes/recibos` | Administrador | Activa o desactiva la creación automática (`{ "crear_recibos_automaticamente": true }`) |
| `POST` | `/api/ajustes/recibos/generar-anio` | Administrador | Con `{ "simular": true }` (por defecto) devuelve la vista previa; con `false` ejecuta el procedimiento. Acepta `proximoDiciembre` (booleano, por defecto false) solo con simulación; el servidor calcula el próximo 1 de diciembre en la zona de Ajustes. No admite fecha libre. Devuelve `{ simulacion, fecha_simulada, filas, avisos }` |

`filas` contiene exclusivamente recibos; `avisos` contiene mensajes generales del procedimiento. `fecha_simulada` es null para hoy o el día simulado. Las columnas de cada recibo son: `origen_id`, `nuevo_id`, `concepto`, `anio_nuevo`, `fechas`, `primera`, `ultima` y `aviso`.

## Validación y respuestas (U-13/DC-36)

La ruta sigue reservada a administradores. `simular` y `proximoDiciembre` deben ser booleanos; si faltan, sus valores son true y false. El código actual trata también null como ausencia mediante `??`. Devuelve 400 para opciones no booleanas, para ejecución real con `proximoDiciembre: true` o si se envían `fecha` o `ahora`: no hay fecha libre.

El servidor calcula diciembre desde hoy en la zona de Ajustes: antes del día 1 usa este año, ese día usa hoy y después usa el siguiente año. `fecha_simulada` devuelve ese día como texto YYYY-MM-DD, o null para el reloj real. `avisos` es una lista de mensajes generales; el aviso de cadencia de un recibo permanece en `filas[].aviso`.

Una respuesta sin candidatos devuelve `filas: []`; no implica un error. La simulación nunca crea recibos. En ejecución real se recalculan los candidatos: pueden no coincidir con una vista previa anterior.

## Referencias

- [Ajustes del sistema (db_ajustes)](../db/db_ajustes.md)
- [Procedimiento de recibos del año](../db/generar_recibos_anio.md)
