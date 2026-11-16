# Middleware de autenticación

Fuente: `backend/src/middleware/auth.mjs`. Revisión estática: 2026-10-23.

| Función | Implementación |
|---|---|
| verifyToken | Extrae el token Bearer, verifica firma y caducidad, exige `ver` y comprueba que coincide con `users.token_version`; carga el usuario vigente con `getUserById` y lo deja en `req.user`. Es asíncrono: los errores de sesión responden 401 y los técnicos se entregan con `next(err)` |
| verifyAdmin | Valida la sesión con el mismo criterio y exige rol `admin` vigente; ya incluye autenticación |
| checkRole(roles = []) | Valida la sesión y comprueba `roles.includes(req.user.rol)`; se debe usar un array |
| autorizar(modulo, accion) | Valida la sesión una sola vez, carga el usuario vigente (rol y `perm_*`), aplica la matriz DC-48 y deja el usuario en `req.usuario` para que la ruta compruebe la propiedad. Si el usuario del token ya no existe o la versión no coincide, responde 401 (F-51, S-04a) |

## Respuestas de error

Todas llevan `{ success: false, message }`:

- Sin token: 401, `Se requiere token de autenticación`.
- Inválido o caducado: **401**, `Token inválido o expirado` (S-16; antes 403).
- Usuario del token ya no existe: **401**, `Token inválido o expirado` (F-51; antes 404).
- Sin rol administrador: 403, `Acceso restringido a administradores`.
- Fuera de checkRole: 403, `No tienes permisos para realizar esta acción`.

Desde el 2026-11-10 las rutas de datos usan `autorizar()`: la matriz DC-48 se aplica con el rol y los `perm_*` vigentes, y las rutas comprueban la propiedad y la visibilidad con `utils/propiedad.mjs` (S-01, S-12). Desde S-04a (2026-11-15) el middleware es asíncrono y valida la versión de token: el logout y el cambio de contraseña la incrementan y revocan los tokens anteriores; los tokens sin `ver` se rechazan. `manejarErrores` responde en JSON los errores técnicos entregados con `next(err)`. El módulo no establece HTTPS. `/api/auth/verify` usa la misma comprobación de sesión y responde 401 al fallar, el mismo criterio que verifyToken desde S-16.

## Referencias

- [Autenticación](../routes/auth.md)
- [Entorno](../config/env.md)
- [Guardia de rutas](../router/routeGuards.md)
