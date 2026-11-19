# Flujo de autenticación

Fuentes: Login.vue, useAuth.js, routes/auth.mjs, db_utilsUsers.mjs y router/index.js. Revisión estática: 2026-10-23.

## Inicio

Login recupera rememberedUser para autocompletar y dispone de verifySession para validar tokens existentes. Exige usuario y contraseña, llama con fetch a POST /api/auth/login y muestra los errores de respuesta. El backend busca por username, compara el hash mediante bcrypt y emite JWT con id, username, email, rol y `ver`, sin perm_*. La duración procede de JWT_EXPIRATION (respaldo 24h). S-04b limita los intentos fallidos por IP y usuario y responde 429 con `Retry-After` al superar el umbral configurado.

Con Recordarme guarda token/user en localStorage y nombre en rememberedUser, y limpia token/user de sessionStorage. Sin Recordarme usa sessionStorage, limpia token/user de localStorage y mantiene el recuerdo de nombre anterior. No persiste la contraseña. El éxito va siempre a /dashboard, no a una URL originalmente solicitada.

## Estado y preferencias

useAuth guarda el estado en el módulo (F-54): todas las invocaciones comparten el usuario y un único intervalo de verificación. Carga el usuario almacenado y preferencias visuales del servidor; aplica colorScheme con useLayout y los colores/preset con useTheme. colorScheme admite system/light/dark y tiene caché visual en timon.colorScheme; el servidor prevalece sobre ella.

Logout borra token/user de ambos almacenes, limpia el estado compartido, cancela el intervalo único, reinicia ajustes de sesión y redirige al login. Conserva rememberedUser. Después avisa al servidor con POST /api/auth/logout y el token capturado; si la llamada falla, el cierre local se mantiene (S-04a).

## Límites

La autorización administrativa comprueba el rol vigente y, desde el 2026-11-10, los endpoints de datos aplican la matriz DC-48 y el filtro de visibilidad (S-01, S-12). Desde S-04a los JWT se revocan con `users.token_version` y el rol se lee de la base en cada petición; los tokens sin `ver` se rechazan. Los nueve servicios usan `apiClient`, que ejecuta los interceptores (S-07); HTTPS depende del despliegue.

## Referencias

- [Login](../components/Login.md)
- [useAuth](../composables/useAuth.md)
- [Middleware](../middleware/auth.md)
- [Navegación](../router/routeGuards.md)
- [Caducidad](./TokenExpiration.md)
