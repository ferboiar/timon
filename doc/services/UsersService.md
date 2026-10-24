# UsersService

## Descripción General

El servicio `UsersService` actúa como intermediario entre la interfaz de usuario (componentes Vue) y el backend de la aplicación para todo lo relacionado con la gestión de usuarios. Este servicio encapsula las llamadas API necesarias para administrar el ciclo de vida completo de los usuarios, incluyendo creación, modificación, eliminación y gestión de preferencias de estilo personales.

## Métodos Principales

### Gestión de Usuarios

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getUsers()` | Obtiene todos los usuarios registrados | `GET /api/users` |
| `saveUser(userData)` | Crea o actualiza un usuario | `POST /api/users` o `PUT /api/users` |
| `deleteUsers(params)` | Elimina uno o más usuarios por ID | `DELETE /api/users` |
| `changePassword(params)` | Actualiza la contraseña de un usuario | `PUT /api/users/password` |

### Gestión de Preferencias de Estilo

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `saveStylePreferences(stylePrefs)` | Guarda las preferencias de estilo del usuario | `PUT /api/users/style-preferences` |
| `getStylePreferences()` | Obtiene las preferencias de estilo del usuario actual | `GET /api/users/style-preferences` |

## Características Principales

- Gestión completa de operaciones CRUD para usuarios
- getUsers y los métodos de preferencias consultan localStorage y sessionStorage; saveUser, deleteUsers y changePassword consultan solo localStorage (F-38)
- Soporte para roles de usuario (admin, user, limited_user, reader)
- Personalización de la interfaz mediante preferencias de estilo
- Manejo de errores con mensajes descriptivos

## Uso Común

Este servicio es utilizado principalmente por el componente [ProfileSettings.vue](../components/ProfileSettings.md) para la administración de usuarios y la personalización de la interfaz de usuario.

### Ejemplo de uso para obtener usuarios:

```javascript
import { UsersService } from '@/service/UsersService';

// En un componente Vue
async function cargarUsuarios() {
    try {
        const usuarios = await UsersService.getUsers();
        // Procesar los usuarios...
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
    }
}
```

### Manejo de errores

Usa fetch. Comprueba response.ok y, ante respuesta no satisfactoria, lee JSON y lanza Error(error.message o un texto de respaldo). No implementa bloques catch ni registro propio de todos los errores. Los errores de red y de JSON se propagan directamente.

## Estructura de datos

### Usuario (User)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `id` | Number | Identificador único del usuario |
| `username` | String | Nombre de usuario para inicio de sesión |
| `email` | String | Correo electrónico del usuario |
| `rol` | String | Rol del usuario: 'admin', 'user', 'limited_user' o 'reader' |
| `password` | String | Contraseña (solo requerida al crear un nuevo usuario) |

### Preferencias de Estilo (StylePreferences)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `preset` | String | Tema preestablecido ('Aura', 'Lara') |
| `menuMode` | String | Modo de visualización del menú ('static', 'overlay') |
| `colorScheme` | String | Apariencia general: `system` (sigue el modo del navegador), `light` o `dark` |
| `darkTheme` | Boolean | Si el modo oscuro estaba activo al guardar; los datos antiguos solo tienen este campo y se interpretan como `dark` o `light` |
| `primary` | String | Color primario seleccionado (ej. 'emerald', 'blue') |
| `surface` | String | Color de superficie seleccionado (ej. 'zinc', 'slate') |

## Referencias

- [API de Usuarios](../routes/users.md) - Detalles sobre los endpoints del backend
- [Utilidades de Base de Datos para Usuarios](../db/db_utilsUsers.md) - Funciones de base de datos utilizadas por el backend
- [Componente de Gestión de Usuarios](../components/ProfileSettings.md) - Interfaz de usuario que utiliza este servicio
- [Composable useAuth](../composables/useAuth.md) - Hook de Vue para gestión de autenticación y autorización

## Argumentos y autorización

saveUser elige PUT si userData.id es verdadero; en otro caso POST. deleteUsers transmite el objeto de parámetros: la ruta espera `{ userIds: [...] }`; changePassword espera `{ id, password }`. La gestión de usuarios exige administrador. Las preferencias solo exigen sesión y se aplican al usuario del token. saveStylePreferences sustituye todo el JSON, no fusiona campos. El servicio no amplía la vigencia del token ni valida los datos completos de usuario.
