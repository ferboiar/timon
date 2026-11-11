# Caducidad de sesión

Fuentes: useAuth.js, AppLayout.vue, router/index.js, config/api.js y Login.vue. Revisión estática: 2026-10-23.

## Mecanismos activos

- useAuth configura verificación cada 5 minutos. verifySessionValidity llama con fetch a /api/auth/verify: una respuesta no satisfactoria cierra sesión, un error de red la mantiene. Cada instancia del composable tiene su propio intervalo (S-07).
- AppLayout llama a verifySessionValidity al montarse.
- El guardia comprueba al navegar por páginas protegidas y al entrar al login con token.
- Login también dispone de comprobación de una sesión existente.

## Interceptor activo en los nueve servicios

apiClient tiene un interceptor para 401/403 con mensajes Token inválido o expirado o Se requiere token de autenticación; desde S-16 el token inválido responde 401 y el 403 queda para la autorización (sin rol suficiente). Desde el 2026-11-10 los nueve servicios usan esa instancia y el interceptor se ejecuta de verdad (S-07); lo cubre la prueba E2E de sesión caducada.

## Limpieza y límites

Logout elimina token/user de los dos almacenes, cancela su intervalo, vacía el usuario de esa instancia y reinicia ajustes de sesión; conserva rememberedUser y redirige al login. El guard y el interceptor redirigen a `/auth/login?motivo=caducada` y el login muestra «Tu sesión ha caducado. Vuelve a iniciar sesión.» (U-16).

Recordarme cambia el almacenamiento, no prolonga el JWT. Su expiración sale de la configuración al emitirlo, por defecto 24h. No hay renovación automática ni revocación ni actualización del rol de tokens emitidos (S-04).

## Referencias

- [Flujo](./AuthenticationFlow.md)
- [useAuth](../composables/useAuth.md)
- [Guardia](../router/routeGuards.md)
- [Middleware](../middleware/auth.md)
