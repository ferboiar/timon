# Composable useAjustesSesion

Archivo: `src/composables/useAjustesSesion.js`. Ajustes que solo duran mientras la sesión está abierta (DC-21).

| Nombre | Descripción |
|--------|-------------|
| `permitirEditarPagados` | `ref(false)`. Interruptor «Permitir editar/borrar recibos pagados» de Ajustes › Administrar recibos. Activado, el administrador puede editar y borrar también los cargos pagados de meses cerrados |
| `reiniciarAjustesSesion()` | Vuelve a desactivarlo. Se llama al cerrar sesión (`useAuth.logout`); también se desactiva al recargar la página |

El servidor solo acepta el borrado forzado si lo pide un administrador con `permitirPagados=1` en `DELETE /api/recibos/:id` (ver [API de Recibos](../routes/recibos.md)).

## Referencias

- [Componente ProfileSettings](../components/ProfileSettings.md)
- [Componente ListBills](../components/ListBills.md)
- [Composable useAuth](./useAuth.md)
