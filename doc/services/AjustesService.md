# AjustesService

Cliente de la API de ajustes del sistema (DC-24, DC-25).

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getGeneral()` | Zona horaria y hora del servidor | `GET /api/ajustes/general` |
| `saveZonaHoraria(zona)` | Cambia la zona horaria (administrador) | `PUT /api/ajustes/general` |
| `getRecibos()` | Interruptor de la creación automática (administrador) | `GET /api/ajustes/recibos` |
| `saveCrearRecibosAutomaticamente(activo)` | Activa o desactiva la creación automática (administrador) | `PUT /api/ajustes/recibos` |
| `generarRecibosAnio(simular, proximoDiciembre = false)` | Vista previa o ejecución del procedimiento anual (administrador) | `POST /api/ajustes/recibos/generar-anio` |

Los errores se relanzan con el mensaje que devuelve el servidor. Usa `apiClient`: el interceptor añade el token y centraliza el cierre de sesión ante un 401 (S-07).

## Referencias

- [API de Ajustes](../routes/ajustes.md)
- [Composable useZonaHoraria](../composables/useZonaHoraria.md)

## Contrato del proceso anual (U-13/DC-36)

- `generarRecibosAnio(true)`: vista previa de hoy.
- `generarRecibosAnio(true, true)`: simulación del próximo 1 de diciembre, calculado por el servidor en la zona de Ajustes.
- `generarRecibosAnio(false)`: ejecución real con el reloj actual, independiente del interruptor automático.
- El servicio envía `{ simular, proximoDiciembre }` y devuelve la respuesta sin transformarla: `{ simulacion, fecha_simulada, filas, avisos }`.
- `fecha_simulada` es null para hoy; `filas` contiene recibos; `avisos` contiene mensajes generales, no altas. El aviso de cadencia queda dentro de su recibo.
- La combinación false/true se rechaza con 400. Los errores se relanzan con el mensaje del servidor. No se admite fecha libre.
