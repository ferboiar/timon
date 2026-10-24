# Flujo de autenticación

Fuentes: Login.vue, useAuth.js, routes/auth.mjs, db_utilsUsers.mjs y router/index.js. Revisión estática: 2026-10-23.

## Inicio

Login recupera rememberedUser para autocompletar y dispone de verifySession para validar tokens existentes. Exige usuario y contraseña, llama con fetch a POST /api/auth/login y muestra los errores de respuesta. El backend busca por username, compara el hash mediante bcrypt y emite JWT con id, username, email y rol, sin perm_*. La duración procede de JWT_EXPIRATION (respaldo 24h).

Con Recordarme guarda token/user en localStorage y nombre en rememberedUser, y limpia token/user de sessionStorage. Sin Recordarme usa sessionStorage, limpia token/user de localStorage y mantiene el recuerdo de nombre anterior. No persiste la contraseña. El éxito va siempre a /dashboard, no a una URL originalmente solicitada.

## Estado y preferencias

Cada invocación de useAuth crea su propio estado e intervalo (S-07). Carga el usuario almacenado y preferencias visuales del servidor; aplica colorScheme con useLayout y los colores/preset con useTheme. colorScheme admite system/light/dark y tiene caché visual en timon.colorScheme; el servidor prevalece sobre ella.

Logout borra token/user de ambos almacenes, limpia el estado de esa instancia, cancela su intervalo, reinicia ajustes de sesión y redirige al login. Conserva rememberedUser.

## Límites

La autorización administrativa comprueba el rol del token. Los endpoints de datos no aplican perm_* ni filtros privados (S-01). Los JWT no se revocan ni actualizan al cambiar un rol (S-04). apiClient define interceptores, pero los servicios usan axios directo o fetch (S-07); HTTPS depende del despliegue.

## Referencias

- [Login](../components/Login.md)
- [useAuth](../composables/useAuth.md)
- [Middleware](../middleware/auth.md)
- [Navegación](../router/routeGuards.md)
- [Caducidad](./TokenExpiration.md)
