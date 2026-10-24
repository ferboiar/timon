# Protección de rutas

Fuente: `src/router/index.js`. Revisión estática: 2026-10-23.

## Algoritmo real

beforeEach usa publicPages: /auth/login, /auth/access, /auth/error, /landing y /pages/notfound. Las demás páginas requieren token. Se lee primero localStorage y después sessionStorage; sin token redirige al login sin conservar la ruta destino.

En rutas protegidas valida el token con fetch contra /api/auth/verify. Ante rechazo limpia token/user de ambos almacenes y redirige al login; ante error de red permite continuar. Al entrar al login con token, verifica primero: válido redirige al dashboard; inválido limpia datos y deja entrar; fallo de red deja entrar.

Contempla to.meta.requiresAdmin y useAuth().isAdmin, con redirección a /auth/access. Sin embargo ninguna ruta define meta, de modo que esta restricción no está activada (S-06). Las pestañas administrativas de Ajustes se ocultan dentro del componente; los endpoints deben protegerse de forma independiente.

No existen las configuraciones meta.public, onlyWhenLoggedOut, roles, /unauthorized ni el parámetro redirect que describía el documento anterior.

## Referencias

- [useAuth](../composables/useAuth.md)
- [Autenticación](../routes/auth.md)
- [Caducidad](../auth/TokenExpiration.md)
