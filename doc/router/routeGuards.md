# Protección de Rutas en Timon

## Descripción General

El sistema de protección de rutas en Timon utiliza los guardias de navegación de Vue Router para controlar el acceso a diferentes partes de la aplicación en función del estado de autenticación y los roles del usuario. Esta capa de seguridad impide que usuarios no autorizados accedan a vistas protegidas y redirige a los usuarios según su estado de autenticación.

## Características Principales

- Verificación de autenticación antes de acceder a rutas protegidas
- Control de acceso basado en roles para rutas específicas
- Redirección automática a la página de inicio de sesión para usuarios no autenticados
- Redirección al dashboard para usuarios ya autenticados que intentan acceder a páginas de autenticación
- Soporte para meta-datos en rutas para configurar requisitos de autenticación
- Gestión centralizada de permisos a través del composable useAuth

## Estructura de Rutas

El router organiza las rutas en varias categorías:

### Rutas Públicas

Rutas accesibles sin autenticación, como login, registro y recuperación de contraseña:

```javascript
{
    path: '/auth/login',
    name: 'login',
    component: () => import('@/views/pages/auth/Login.vue'),
    meta: {
        public: true,
        onlyWhenLoggedOut: true
    }
}
```

### Rutas Protegidas Generales

Rutas que requieren autenticación pero no un rol específico:

```javascript
{
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
        requiresAuth: true
    }
}
```

### Rutas con Control de Acceso por Roles

Rutas que requieren autenticación y un rol específico:

```javascript
{
    path: '/admin/users',
    name: 'userManagement',
    component: () => import('@/views/pages/admin/UserManagement.vue'),
    meta: {
        requiresAuth: true,
        roles: ['admin']
    }
}
```

## Guardias de Navegación

### Guardia Global beforeEach

El sistema implementa un guardia global que se ejecuta antes de cada navegación:

```javascript
router.beforeEach((to, from, next) => {
    // Determinar si la ruta requiere autenticación
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const isPublic = to.matched.some(record => record.meta.public);
    const onlyWhenLoggedOut = to.matched.some(record => record.meta.onlyWhenLoggedOut);
    const requiredRoles = to.meta.roles;
    
    // Obtener el estado de autenticación
    const { isAuthenticated, hasAnyRole } = useAuth();
    
    // Lógica de navegación según el estado de autenticación y los requisitos de la ruta
    if (!isPublic && !isAuthenticated.value) {
        // Redireccionar a login si se intenta acceder a ruta protegida sin autenticación
        return next({
            path: '/auth/login',
            query: { redirect: to.fullPath }
        });
    }
    
    if (isAuthenticated.value && onlyWhenLoggedOut) {
        // Redireccionar a dashboard si un usuario autenticado intenta acceder a una ruta como login
        return next('/dashboard');
    }
    
    if (requiresAuth && requiredRoles && !hasAnyRole(requiredRoles)) {
        // Denegar acceso si el usuario no tiene los roles necesarios
        return next('/unauthorized');
    }
    
    // Permitir la navegación para todos los demás casos
    return next();
});
```

### Guardia para Preservar URL de Redirección

Cuando un usuario no autenticado intenta acceder a una ruta protegida, el sistema guarda la URL de destino para redirigirlo allí después de iniciar sesión:

```javascript
// En el componente Login.vue
const route = useRoute();
const redirectPath = computed(() => route.query.redirect || '/dashboard');

// Después de iniciar sesión exitosamente
router.push(redirectPath.value);
```

## Integración con el Sistema de Autenticación

El sistema de protección de rutas se integra con el composable `useAuth` para verificar el estado de autenticación y los roles del usuario:

```javascript
const { isAuthenticated, hasRole, hasAnyRole } = useAuth();

// Verificar autenticación
if (!isAuthenticated.value) {
    // Redireccionar a login
}

// Verificar roles para acceso a rutas específicas
if (requiredRoles && !hasAnyRole(requiredRoles)) {
    // Denegar acceso
}
```

## Flujo de Navegación Protegida

### Para Usuario No Autenticado

1. Usuario intenta acceder a ruta protegida (ej: `/dashboard`)
2. Guardia verifica que el usuario no está autenticado
3. Guarda la URL destino en el query parameter `redirect`
4. Redirecciona a `/auth/login?redirect=/dashboard`
5. Después de iniciar sesión exitosamente, redirecciona a la URL original (`/dashboard`)

### Para Usuario Autenticado con Rol Insuficiente

1. Usuario autenticado con rol "user" intenta acceder a ruta administrativa (ej: `/admin/settings`)
2. Guardia verifica que el usuario está autenticado pero no tiene rol "admin"
3. Redirecciona a página de acceso no autorizado (`/unauthorized`)

### Para Usuario Autenticado Intentando Acceder a Login

1. Usuario ya autenticado intenta acceder a página de login (`/auth/login`)
2. Guardia detecta que el usuario está autenticado y la ruta es `onlyWhenLoggedOut`
3. Redirecciona automáticamente al dashboard (`/dashboard`)

## Implementación de Seguridad

- La verificación se realiza tanto en el cliente como en el servidor
- El servidor implementa middleware adicional para verificar autenticación y permisos
- Los componentes usan directivas como `v-role` para ocultar elementos no autorizados
- Las redirecciones automáticas mejoran la experiencia de usuario sin comprometer seguridad

## Referencias

- [Composable useAuth](../composables/useAuth.md) - Lógica de autenticación utilizada por el router
- [API de Autenticación](../routes/auth.md) - Endpoints de autenticación del backend
- [Middleware de Autenticación](../middleware/auth.md) - Capa de seguridad del servidor
- [Componente Login](../components/Login.md) - Interfaz de inicio de sesión