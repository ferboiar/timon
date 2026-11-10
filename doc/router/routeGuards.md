# Protección de rutas

Fuente: `src/router/index.js`. Revisión estática: 2026-10-23.

## Algoritmo real

beforeEach usa publicPages: /auth/login, /auth/access, /auth/error, /landing y /pages/notfound. Las demás páginas requieren token. Se lee primero localStorage y después sessionStorage; sin token redirige al login sin conservar la ruta destino.

En rutas protegidas valida el token con fetch contra /api/auth/verify. Ante rechazo limpia token/user de ambos almacenes y redirige al login; ante error de red permite continuar. Al entrar al login con token, verifica primero: válido redirige al dashboard; inválido limpia datos y deja entrar; fallo de red deja entrar.

Desde el 2026-11-10 `/documentation` y `/tech-docs` definen `meta.requiresAdmin` y redirigen a `/auth/access` (S-06); `/manual` queda libre. El guard lee el rol del usuario guardado, porque `useAuth()` no está montado fuera de un componente. Las pestañas administrativas de Ajustes se ocultan dentro del componente; los endpoints se protegen de forma independiente con `autorizar()`.

No existen las configuraciones meta.public, onlyWhenLoggedOut, roles, /unauthorized ni el parámetro redirect que describía el documento anterior.

## Referencias

- [useAuth](../composables/useAuth.md)
- [Autenticación](../routes/auth.md)
- [Caducidad](../auth/TokenExpiration.md)
