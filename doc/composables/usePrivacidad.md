# Composable usePrivacidad

Fuente: `src/composables/usePrivacidad.js`. Revisión estática completa: 2026-11-22.

## Qué decide

Si la interfaz renderiza el control de privacidad de un registro (DC-75). **No autoriza**: el
servidor sigue siendo la autoridad y responde 403 `PRIVACIDAD_NO_PERMITIDA` si llega un cambio sin
permiso.

| Regla | Resultado |
|---|---|
| Administrador | siempre ve el control |
| `user` o `limited_user` en un registro suyo | ve el control |
| `user` o `limited_user` en un registro ajeno | no se renderiza |
| `reader` | nunca, ni en un registro suyo |
| Alta (`esAlta: true`) | administrador, `user` y `limited_user`: el creador es el propietario |

Usa `currentUser.id` y `currentUser.rol`, que llegan del login ([useAuth](./useAuth.md)). **No usa
`perm_*`** porque el cliente no los recibe: un usuario con permiso de solo lectura verá el control en
sus registros y el servidor responderá 403 al guardar, igual que ocurre hoy con cualquier otro campo.
Es una limitación conocida y aceptada en DC-75.

## API

| Función | Qué devuelve |
|---|---|
| `puedeCambiarPrivacidad(registro, { esAlta })` | `true` si hay que renderizar el control |
| `esPropio(registro)` | `true` si `propietario_id` es el usuario actual; solo cambia el texto de la etiqueta |

## Dónde se usa

`ListBills.vue`, `Advances.vue` y `Savings.vue`, con `v-if` y el componente
[PrivacidadToggle](../components/PrivacidadToggle.md).

## Límites

- En el alta la regla es por rol (ver arriba).
- La regla no distingue el módulo: el permiso lo comprueba el servidor.
