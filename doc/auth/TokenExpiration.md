# Caducidad de sesión

Fuentes: useAuth.js, AppLayout.vue, router/index.js, config/api.js y Login.vue. Revisión estática: 2026-10-23.

## Mecanismos activos

- useAuth configura verificación cada 5 minutos. verifySessionValidity llama con fetch a /api/auth/verify: una respuesta no satisfactoria cierra sesión, un error de red la mantiene. Cada instancia del composable tiene su propio intervalo (S-07).
- AppLayout llama a verifySessionValidity al montarse.
- El guardia comprueba al navegar por páginas protegidas y al entrar al login con token.
- Login también dispone de comprobación de una sesión existente.

## Interceptor que no cubre los servicios actuales

apiClient tiene un interceptor para 401/403 con mensajes Token inválido o expirado o Se requiere token de autenticación. Ningún servicio usa esa instancia: axios directo y fetch no ejecutan sus interceptores (S-07). No se debe presentar como detección activa de todas las llamadas.

## Limpieza y límites

Logout elimina token/user de los dos almacenes, cancela su intervalo, vacía el usuario de esa instancia y reinicia ajustes de sesión; conserva rememberedUser y redirige al login. Los avisos de verificación se escriben en consola: no existe un aviso visual universal de caducidad.

Recordarme cambia el almacenamiento, no prolonga el JWT. Su expiración sale de la configuración al emitirlo, por defecto 24h. No hay renovación automática ni revocación ni actualización del rol de tokens emitidos (S-04).

## Referencias

- [Flujo](./AuthenticationFlow.md)
- [useAuth](../composables/useAuth.md)
- [Guardia](../router/routeGuards.md)
- [Middleware](../middleware/auth.md)
