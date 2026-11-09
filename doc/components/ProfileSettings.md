# Componente ProfileSettings

## Descripción General

El componente `ProfileSettings` ofrece una interfaz completa para la gestión de usuarios y personalización de la interfaz en la aplicación Timon. Este componente tiene varias funcionalidades:

1. **Configuración de estilo**: Permite a cualquier usuario personalizar la apariencia visual de la aplicación
2. **Gestión de usuarios**: Disponible solo para administradores, permite crear, editar y eliminar usuarios del sistema
3. **Zona horaria de la aplicación** (pestaña General): solo administradores (DC-25)
4. **Administración de recibos** (pestaña Administrar recibos): creación automática de recibos del año y opciones de sesión para editar recibos pagados y declarar fechas fuera del año, solo administradores (DC-17, DC-21, DC-24, DC-29)
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

- Listado de todos los usuarios del sistema, sin paginador (mejora propuesta R-08)
- Creación de nuevos usuarios con asignación de roles
- Edición de usuarios existentes (nombre, correo, rol)
- Cambio de contraseñas de usuario
- Eliminación de usuarios individuales o en lote
- Validación de campos para garantizar datos correctos
- Notificaciones de éxito/error mediante sistema de mensajes

### Ajustes generales y administración de recibos (solo administradores)

- **General:** selector de la zona horaria de la aplicación (DC-25). Las horas se guardan en UTC y la zona decide el día, mes y año en curso y la hora con que se muestran las fechas. Se guarda en la base de datos y se aplica a toda la aplicación.
- **Administrar recibos**, en este orden: interruptor «Crear recibos del año automáticamente» (persistente, con explicación y riesgos); «Generar los recibos del año ahora», con «Vista previa de hoy», «Simular el próximo 1 de diciembre» sin selector y «Generar ahora» independiente del interruptor automático (DC-17, DC-24, DC-36); interruptor «Permitir editar/borrar recibos pagados» (solo dura la sesión, DC-21); e interruptor «Permitir declarar fechas fuera del año en curso» (solo dura la sesión, con explicación de sus efectos, DC-29).

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

### Estados y control de la generación anual (U-13)

| Elemento | Función |
|---|---|
| `fechaSimulada` | Fecha devuelta por el servidor; null para la vista previa de hoy |
| `avisosGeneracion` | Avisos generales, separados de los recibos de la tabla |
| `puedeGenerarAhora` | Exige candidatos, fecha simulada null y ninguna consulta ni generación en curso |
| `invalidarVistaPrevia()` | Vacía tabla, fecha y avisos y cierra la confirmación antes de consultar y al terminar una ejecución |

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
| `consultarVistaPrevia(proximoDiciembre = false)` | Pide al servidor la vista previa de los recibos que se crearían (`generarRecibosAnio(true)`), o simula diciembre si se solicita; invalida previamente la consulta anterior |
| `generarAhora()` | Comprueba `puedeGenerarAhora`, ejecuta con el reloj real tras confirmar y vuelve a calcular los candidatos. Cuenta solo recibos; si no hay altas muestra un aviso y su motivo. Invalida la vista previa también si falla |
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

- La pantalla comprueba únicamente que el correo contenga @; el servidor no valida su formato (F-42)
- Validación de coincidencia en confirmación de contraseñas
- Comprobación de campos requeridos
- Control de acceso basado en roles mediante `isAdmin`
- Manejo de errores con mensajes descriptivos
- Confirmación de operaciones críticas (eliminación)

## Integración con Servicios

El componente utiliza varios servicios para su funcionamiento:
- `UsersService` para operaciones CRUD en usuarios
- `AjustesService` y `useZonaHoraria` para la zona horaria y los ajustes de recibos
- `useAjustesSesion` para los interruptores de sesión (recibos pagados y fechas fuera del año), que se reinician al cerrar sesión
- `useAuth` para comprobar isAdmin, obtener ROLES y guardar las preferencias de estilo; no aplica permisos por módulo
- `useTheme` para aplicar cambios visuales
- `useLayout` para gestionar configuración de diseño
- `useToast` para notificaciones al usuario

## Mensajes de error en las pestañas de administración (F-48, U-14)

Las pestañas **Usuarios**, **Base de Datos**, **Mantenimiento** y **Ajustes** usan los servicios de F-48. El ayudante local `mensajeDeErrorApi(error, porDefecto)` compone el texto del *toast*:

- Si el servicio lanzó el error con el mensaje del servidor (los que usan `fetch` guardan ahí el texto y **no** tienen `response`), se muestra ese mensaje.
- Si hay `response` (axios), manda el cuerpo del servidor (`data.error` o `data.message`).
- El texto por defecto solo aparece cuando no hay ningún mensaje.

Antes de U-14 (corregido el 2026-11-09) esas llamadas pasaban `{ message: '<texto por defecto>', response: error?.response }`, así que con los servicios `fetch` la pantalla mostraba siempre el texto por defecto y el mensaje del servidor se perdía. Lo detectó `e2e/tests/erroresConexion.spec.mjs`.

La pestaña **Base de Datos** muestra además `invalidFileTypeMessage` en español al elegir un archivo que no es `.sql`: «El archivo «{0}» no es una copia de seguridad. Selecciona un archivo con extensión .sql.». Es un aviso en línea del `FileUpload` (modo `basic`), no un *toast*.

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
- [Registro de hallazgos y decisiones](../mantenimiento/registro-hallazgos.md) - DC-21, DC-25, DC-26, DC-29 y DC-36

## Estado y validaciones auxiliares

- isSaveDisabled exige username, email, un correo con @ y contraseña al crear.
- isPasswordChangeDisabled exige contraseña no vacía y confirmación idéntica; no comprueba fortaleza.
- rolesArray alimenta el selector de rol; no hay controles para editar perm_*.
- hasUnsavedChanges compara preset, menú, apariencia, primario y superficie.
- Los observadores aplican la vista previa del estilo y el menú. Reset aplica y guarda inmediatamente los valores por defecto.
- zonaCambiada habilita Guardar y Descartar; horaEnZonaSeleccionada muestra la hora al evaluar la selección, no un reloj con temporizador.
- isDbConfigChanged compara host, puerto, usuario y base, o detecta una contraseña escrita.
- La confirmación y ejecución del borrado de usuarios, de restauración de conexión y de restauración del volcado son operaciones distintas.

## Vista previa y simulación de diciembre (U-13)

U-13/DC-36 distingue «Vista previa de hoy» de «Simular el próximo 1 de diciembre», sin selector. El servidor calcula el día en la zona de Ajustes: este año antes del 1 de diciembre, hoy si es ese día y el siguiente año después. La simulación proyecta los datos actuales y no predice cambios futuros. No escribe ni habilita «Generar ahora». La ejecución real sigue independiente del interruptor automático; solo se habilita con recibos de una vista previa de hoy y se recalcula al confirmar. Los avisos generales no cuentan como recibos; los avisos de cadencia permanecen asociados a cada recibo.
