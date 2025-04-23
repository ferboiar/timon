# Composable useAuth

## Descripción General

El composable `useAuth` proporciona una solución completa para manejar el estado de autenticación del usuario, gestionar roles y permisos, y realizar operaciones relacionadas con la sesión en la aplicación Timon. Implementa un sistema de control de acceso basado en roles con persistencia de sesión mediante localStorage y sessionStorage.

## Funcionalidad Principal

- Gestión del estado de autenticación (login/logout)
- Persistencia de la sesión entre recargas de página
- Sistema de verificación de roles y permisos basado en jerarquía
- Métodos para comprobar permisos específicos (isAdmin, isUser, canRead)
- Gestión del cierre de sesión con redirección automática
- Manejo de preferencias de estilo del usuario

## Propiedades y Métodos Exportados

### Propiedades Reactivas

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `currentUser` | Ref\<Object\|null\> | Usuario actual con datos como id, username, email, rol y stylePreferences |
| `isAuthenticated` | ComputedRef\<boolean\> | Indica si hay un usuario autenticado actualmente |
| `userRole` | ComputedRef\<string\|null\> | Devuelve el rol del usuario actual o null si no hay usuario |
| `isAdmin` | ComputedRef\<boolean\> | Indica si el usuario actual tiene rol de administrador |
| `isUser` | ComputedRef\<boolean\> | Indica si el usuario tiene rol de usuario estándar o administrador |
| `canRead` | ComputedRef\<boolean\> | Indica si el usuario tiene al menos permisos de lectura |

### Constantes

| Constante | Descripción |
|-----------|-------------|
| `ROLES` | Objeto con los roles disponibles: ADMIN, USER, LIMITED_USER, READER |

### Métodos

| Método | Descripción |
|--------|-------------|
| `hasRole(role)` | Verifica si el usuario actual tiene exactamente el rol especificado |
| `hasAnyRole(roles)` | Verifica si el usuario tiene al menos uno de los roles en el array |
| `logout()` | Cierra la sesión del usuario actual y redirecciona a la página de login |
| `refreshUser()` | Actualiza los datos del usuario desde el almacenamiento local |
| `updateStylePreferences(stylePrefs)` | Actualiza las preferencias de estilo del usuario |
| `applyUserPreferences(prefs)` | Aplica las preferencias de estilo del usuario |

## Gestión de Persistencia

El composable implementa un sistema dual de persistencia:
- **localStorage**: Para sesiones persistentes (opción "Recordarme")
- **sessionStorage**: Para sesiones temporales (se eliminan al cerrar el navegador)

Al iniciar, el composable intenta cargar el usuario primero desde localStorage y luego desde sessionStorage. 
Si encuentra un usuario, actualiza el estado y carga las preferencias de estilo asociadas.

## Sistema de Roles

El sistema implementa una jerarquía de roles donde:
- **admin**: Acceso completo a todas las funcionalidades
- **user**: Usuario estándar con acceso a la mayoría de funcionalidades
- **limited_user**: Usuario con acceso limitado
- **reader**: Usuario con permisos solo de lectura

## Preferencias de Estilo

El composable gestiona las preferencias visuales del usuario:
1. Carga preferencias al iniciar la aplicación
2. Proporciona métodos para actualizar preferencias
3. Aplica los cambios visuales en tiempo real
4. Sincroniza preferencias con el servidor

## Integración con Directiva vRole

Este composable trabaja en conjunto con la directiva `vRole` para control de acceso declarativo en plantillas:

```html
<!-- Este elemento solo es visible para administradores -->
<button v-role="'admin'">Administrar Usuarios</button>

<!-- Este elemento es visible para usuarios estándar y administradores -->
<div v-role="['admin', 'user']">Contenido para usuarios</div>
```

## Referencias

- [API de Usuarios](../routes/users.md) - Endpoints para gestión de usuarios
- [API de Autenticación](../routes/auth.md) - Endpoints para autenticación
- [Servicio de Usuarios](../services/UsersService.md) - Servicio para operaciones con usuarios
- [Componente ProfileSettings](../components/ProfileSettings.md) - Interfaz de gestión de usuarios