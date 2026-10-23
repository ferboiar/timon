# Componente ProfileSettings

## Descripción General

El componente `ProfileSettings` ofrece una interfaz completa para la gestión de usuarios y personalización de la interfaz en la aplicación Timon. Este componente tiene varias funcionalidades:

1. **Configuración de estilo**: Permite a cualquier usuario personalizar la apariencia visual de la aplicación
2. **Gestión de usuarios**: Disponible solo para administradores, permite crear, editar y eliminar usuarios del sistema
3. **Zona horaria de la aplicación** (pestaña General): solo administradores (DC-25)
4. **Administración de recibos** (pestaña Administrar recibos): creación automática de recibos del año y opción de sesión para editar recibos pagados, solo administradores (DC-17, DC-21, DC-24)
5. **Base de datos** (pestaña Base de Datos): solo administradores; configuración de la conexión, copia de seguridad y restauración

## Características principales

### Pestañas

Orden (DC-26): General, Usuarios, Aspecto, Administrar recibos y Base de Datos. Aspecto la ven todos los usuarios; las demás, solo los administradores. Al abrir Ajustes, los administradores ven General y el resto Aspecto (`pestanaActiva`).

### Configuración de Estilo

- Selección de colores primarios mediante una paleta visual
- Selección de colores de superficie para la interfaz
- Cambio entre temas preestablecidos (Aura, Lara)
- Configuración del modo de menú (estático o superpuesto)
- Apariencia general: Sistema (sigue el modo claro u oscuro del navegador), Claro u Oscuro
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

### Ajustes generales y administración de recibos (solo administradores)

- **General:** selector de la zona horaria de la aplicación (DC-25). Las horas se guardan en UTC y la zona decide el día, mes y año en curso y la hora con que se muestran las fechas. Se guarda en la base de datos y se aplica a toda la aplicación.
- **Administrar recibos:** interruptor «Crear recibos del año automáticamente» (persistente, con explicación y riesgos), interruptor «Permitir editar/borrar recibos pagados» (solo dura la sesión, DC-21) y vista previa con botón «Generar ahora» del proceso anual (DC-17, DC-24).

## Estados y Propiedades

### Estados para Configuración de Estilo

| Estado | Tipo | Descripción |
|--------|------|-------------|
| `tempLayoutConfig` | Object | Configuración temporal para vista previa (`preset`, `menuMode`, `colorScheme`, `primary` y `surface`) |
| `hasUnsavedChanges` | Computed | Indica si hay cambios sin guardar |
| `isInitializing` | Boolean | Evita guardar durante la carga |
| `pestanaActiva` | Ref | Pestaña seleccionada: `general` para los administradores y `Estilo` (Aspecto) para el resto |

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

### Ajustes generales, recibos y base de datos (solo administradores)

| Método | Descripción |
|--------|-------------|
| `cargarAjustesGenerales()` | Carga la zona horaria guardada y la lista de zonas del navegador (`Intl.supportedValuesOf`) |
| `guardarZona()` | Guarda la zona horaria (`AjustesService.saveZonaHoraria`) y la aplica en toda la aplicación (`establecerZonaHoraria`) |
| `cargarAjustesRecibos()` | Carga el estado del interruptor «Crear recibos del año automáticamente» |
| `pedirCambioCreacionAutomatica(valor)` / `confirmarCambioCreacionAutomatica()` | Abren el diálogo con la explicación y los riesgos y, al confirmar, guardan el interruptor |
| `consultarVistaPrevia()` | Pide al servidor la vista previa de los recibos que se crearían (`generarRecibosAnio(true)`) |
| `generarAhora()` | Ejecuta el procedimiento anual (`generarRecibosAnio(false)`) tras confirmar y avisa de cuántos recibos se han creado |
| `fetchDbConfig()`, `fetchAndShowPassword()`, `testDbConnection()`, `confirmSaveDbConfig()`, `saveDbConfig()`, `confirmRestoreDbConfig()`, `restoreDbConfig()` | Pestaña Base de Datos: leer, probar, guardar y restaurar la configuración de conexión ([DbConfigService](../services/DbConfigService.md)) |
| `backupDatabase()`, `onSelectFileToRestore()`, `restoreDatabase()` | Pestaña Base de Datos: descargar una copia de seguridad y restaurar desde un volcado ([MaintenanceDBService](../services/MaintenanceDBService.md)) |

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
- `AjustesService` y `useZonaHoraria` para la zona horaria y los ajustes de recibos
- `useAjustesSesion` para el interruptor de recibos pagados, que se reinicia al cerrar sesión
- `useAuth` para verificar permisos y roles
- `useTheme` para aplicar cambios visuales
- `useLayout` para gestionar configuración de diseño
- `useToast` para notificaciones al usuario

## Referencias

- [Servicio de Usuarios](../services/UsersService.md) - Operaciones CRUD para gestionar usuarios
- [Composable useAuth](../composables/useAuth.md) - Gestión de autenticación y autorización
- [API de Usuarios](../routes/users.md) - Endpoints del backend utilizados
- [Servicio de Ajustes](../services/AjustesService.md) - Cliente de la API de ajustes
- [Composable useZonaHoraria](../composables/useZonaHoraria.md) - Zona horaria de la aplicación
- [Composable useAjustesSesion](../composables/useAjustesSesion.md) - Ajustes que solo duran la sesión
- [Composable useTheme](../composables/useTheme.md) y [useLayout](../composables/useLayout.md) - Temas y apariencia general
- [API de Ajustes](../routes/ajustes.md) - Zona horaria y recibos
- [API de conexión](../routes/conexionDB.md) y [API de mantenimiento](../routes/mantenimientoDB.md) - Pestaña Base de Datos
- [Registro de hallazgos y decisiones](../mantenimiento/registro-hallazgos.md) - DC-21, DC-25 y DC-26