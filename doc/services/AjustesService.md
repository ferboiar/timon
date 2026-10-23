# AjustesService

Cliente de la API de ajustes del sistema (DC-24, DC-25).

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getGeneral()` | Zona horaria y hora del servidor | `GET /api/ajustes/general` |
| `saveZonaHoraria(zona)` | Cambia la zona horaria (administrador) | `PUT /api/ajustes/general` |
| `getRecibos()` | Interruptor de la creación automática (administrador) | `GET /api/ajustes/recibos` |
| `saveCrearRecibosAutomaticamente(activo)` | Activa o desactiva la creación automática (administrador) | `PUT /api/ajustes/recibos` |
| `generarRecibosAnio(simular)` | Vista previa o ejecución del procedimiento anual (administrador) | `POST /api/ajustes/recibos/generar-anio` |

Los errores se relanzan con el mensaje que devuelve el servidor.

## Referencias

- [API de Ajustes](../routes/ajustes.md)
- [Composable useZonaHoraria](../composables/useZonaHoraria.md)
