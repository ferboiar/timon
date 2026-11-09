# Middleware de autenticación

Fuente: `backend/src/middleware/auth.mjs`. Revisión estática: 2026-10-23.

| Función | Implementación |
|---|---|
| verifyToken | Extrae el token de Authorization, verifica firma y expiración con config.jwt.secret, asigna el payload a req.user y llama a next |
| verifyAdmin | Ejecuta verifyToken y exige rol admin; ya incluye autenticación |
| checkRole(roles = []) | Ejecuta verifyToken y comprueba roles.includes(req.user.rol); se debe usar un array. Ninguna ruta actual lo utiliza |

## Respuestas de error

Todas llevan `{ success: false, message }`:

- Sin token: 401, `Se requiere token de autenticación`.
- Inválido o caducado: **401**, `Token inválido o expirado` (S-16; antes 403).
- Sin rol administrador: 403, `Acceso restringido a administradores`.
- Fuera de checkRole: 403, `No tienes permisos para realizar esta acción`.

No hay comprobación de perm_*, es_privado, cambios posteriores del rol ni revocación (S-01, S-04). El módulo no establece HTTPS. La ruta /api/auth/verify valida directamente JWT y responde 401 al fallar, el mismo criterio que verifyToken desde S-16.

## Referencias

- [Autenticación](../routes/auth.md)
- [Entorno](../config/env.md)
- [Guardia de rutas](../router/routeGuards.md)
