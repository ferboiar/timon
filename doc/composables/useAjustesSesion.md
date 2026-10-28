# Composable useAjustesSesion

Archivo: `src/composables/useAjustesSesion.js`. Ajustes que solo duran mientras la sesión está abierta (DC-21, DC-29).

| Nombre | Descripción |
|--------|-------------|
| `permitirEditarPagados` | `ref(false)`. Interruptor «Permitir editar/borrar recibos pagados» de Ajustes › Administrar recibos. Activado, el administrador puede editar y borrar también los cargos pagados de meses cerrados |
| `permitirFechasFueraDeAnio` | `ref(false)`. Interruptor «Permitir declarar fechas fuera del año en curso» de Ajustes › Administrar recibos. Activado, la pantalla no avisa de las fechas fuera del año del recibo y `guardarRecibo` envía `permitirFueraDeAnio: true` (DC-14, DC-29) |
| `reiniciarAjustesSesion()` | Vuelve a desactivarlos. Se llama al cerrar sesión (`useAuth.logout`); también se desactivan al recargar la página |

El servidor solo acepta el borrado forzado si lo pide un administrador con `permitirPagados=1` en `DELETE /api/recibos/:id` (ver [API de Recibos](../routes/recibos.md)).

El servidor solo omite la comprobación del año del recibo si la petición lleva `permitirFueraDeAnio: true` y la hace un administrador (ver [API de Recibos](../routes/recibos.md)).

## Referencias

- [Componente ProfileSettings](../components/ProfileSettings.md)
- [Componente ListBills](../components/ListBills.md)
- [Composable useAuth](./useAuth.md)
