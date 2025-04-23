# Componente ProfileSettings

## Descripción General

El componente `ProfileSettings` ofrece una interfaz completa para la gestión de usuarios y personalización de la interfaz en la aplicación Timon. Este componente tiene dos funcionalidades principales:

1. **Configuración de estilo**: Permite a cualquier usuario personalizar la apariencia visual de la aplicación
2. **Gestión de usuarios**: Disponible solo para administradores, permite crear, editar y eliminar usuarios del sistema

## Características principales

### Configuración de Estilo

- Selección de colores primarios mediante una paleta visual
- Selección de colores de superficie para la interfaz
- Cambio entre temas preestablecidos (Aura, Lara)
- Configuración del modo de menú (estático o superpuesto)
- Activación/desactivación del tema oscuro
- Vista previa en tiempo real de los cambios de estilo
- Guardado de preferencias asociadas al perfil del usuario
- Opción para restaurar valores por defecto

### Gestión de Usuarios (solo administradores)

- Listado paginado de todos los usuarios del sistema
- Creación de nuevos usuarios con asignación de roles
- Edición de usuarios existentes (nombre, correo, rol)
- Cambio de contraseñas de usuario
- Eliminación de usuarios individuales o en lote
- Validación de campos para garantizar datos correctos
- Notificaciones de éxito/error mediante sistema de mensajes

## Estados y Propiedades

### Estados para Configuración de Estilo

| Estado | Tipo | Descripción |
|--------|------|-------------|
| `tempLayoutConfig` | Object | Configuración temporal para vista previa |
| `hasUnsavedChanges` | Computed | Indica si hay cambios sin guardar |
| `isInitializing` | Boolean | Evita guardar durante la carga |

### Estados para Gestión de Usuarios

| Estado | Tipo | Descripción |
|--------|------|-------------|
| `users` | Array | Lista de usuarios del sistema |
| `selectedUsers` | Array | Usuarios seleccionados para operaciones en lote |
| `user` | Object | Usuario actual en edición |
| `userDialog` | Boolean | Control de diálogo de edición de usuario |
| `changePasswordDialog` | Boolean | Control de diálogo de cambio de contraseña |
| `passwordData` | Object | Datos para cambio de contraseña |
| `deleteUserDialog` | Boolean | Control de confirmación de eliminación |
| `deleteSelectedUsersDialog` | Boolean | Control de confirmación de eliminación múltiple |

## Métodos Principales

### Configuración de Estilo

| Método | Descripción |
|--------|-------------|
| `saveStylePreferences()` | Guarda las preferencias de estilo en el servidor |
| `updateColors(type, color)` | Actualiza colores en el estado temporal |
| `applyAndSaveStyles()` | Aplica y guarda todas las preferencias de estilo |
| `resetToDefaults()` | Restaura valores por defecto de estilo |
| `syncTempConfig()` | Sincroniza configuración temporal con valores actuales |

### Gestión de Usuarios

| Método | Descripción |
|--------|-------------|
| `fetchUsers()` | Obtiene la lista de usuarios del servidor |
| `updateUsers()` | Actualiza la lista de usuarios |
| `openNewUser()` | Inicializa un nuevo usuario para creación |
| `editUser(userData)` | Prepara la edición de un usuario existente |
| `editUserPassword(userData)` | Prepara el cambio de contraseña |
| `saveUser()` | Guarda un nuevo usuario o actualiza uno existente |
| `changePassword()` | Actualiza la contraseña de un usuario |
| `deleteUser()` | Elimina un usuario seleccionado |
| `deleteSelectedUsers()` | Elimina múltiples usuarios seleccionados |

## Validación y Seguridad

- Validación de formato de correo electrónico
- Validación de coincidencia en confirmación de contraseñas
- Comprobación de campos requeridos
- Control de acceso basado en roles mediante `isAdmin`
- Manejo de errores con mensajes descriptivos
- Confirmación de operaciones críticas (eliminación)

## Integración con Servicios

El componente utiliza varios servicios para su funcionamiento:
- `UsersService` para operaciones CRUD en usuarios
- `useAuth` para verificar permisos y roles
- `useTheme` para aplicar cambios visuales
- `useLayout` para gestionar configuración de diseño
- `useToast` para notificaciones al usuario

## Referencias

- [Servicio de Usuarios](../services/UsersService.md) - Operaciones CRUD para gestionar usuarios
- [Composable useAuth](../composables/useAuth.md) - Gestión de autenticación y autorización
- [API de Usuarios](../routes/users.md) - Endpoints del backend utilizados