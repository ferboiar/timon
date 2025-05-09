# API de Usuarios

## Descripción General

Este módulo implementa las rutas de la API REST para la gestión de usuarios en el sistema Timon. Sirve como capa intermedia entre la interfaz de usuario y las funciones de acceso a la base de datos. Proporciona endpoints para administrar usuarios, incluyendo operaciones CRUD completas y gestión de preferencias de estilo personalizadas.

## Rutas Implementadas

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/users` | Obtiene todos los usuarios registrados |
| `POST` | `/api/users` | Crea un nuevo usuario |
| `PUT` | `/api/users` | Actualiza un usuario existente |
| `PUT` | `/api/users/password` | Cambia la contraseña de un usuario |
| `DELETE` | `/api/users` | Elimina uno o más usuarios |
| `PUT` | `/api/users/style-preferences` | Guarda preferencias de estilo del usuario |
| `GET` | `/api/users/style-preferences` | Obtiene preferencias de estilo del usuario |

## Características Principales

- Gestión completa de usuarios (administradores, usuarios estándar, usuarios limitados)
- Control de acceso mediante autenticación JWT
- Permisos granulares por módulo (recibos, presupuestos, ahorros, anticipos, etc.)
- Validación de datos de entrada con mensajes de error descriptivos
- Encriptación de contraseñas mediante bcrypt
- Soporte para operaciones en lote (eliminación múltiple)
- Persistencia de preferencias personalizadas de interfaz

## Seguridad

- Todas las rutas están protegidas mediante el middleware `verifyToken`
- Las contraseñas se almacenan encriptadas, nunca en texto plano
- Se utilizan medidas contra inyección SQL mediante consultas parametrizadas
- Validación exhaustiva de datos de entrada para prevenir ataques
- No se devuelven contraseñas en las respuestas API

## Detalles de Implementación

### Creación de Usuarios

Para crear un nuevo usuario se requieren los siguientes campos:
- `username`: Nombre de usuario único
- `email`: Correo electrónico único
- `password`: Contraseña (será encriptada)
- `rol`: Rol del usuario (admin, user, limited_user, reader)
- `perm_recibos`: Nivel de permiso para recibos ('escritura', 'lectura', 'no')
- `perm_presupuestos`: Nivel de permiso para presupuestos ('escritura', 'lectura', 'no')
- `perm_ahorros`: Nivel de permiso para ahorros ('escritura', 'lectura', 'no')
- `perm_anticipos`: Nivel de permiso para anticipos ('escritura', 'lectura', 'no')
- `perm_transacciones`: Nivel de permiso para transacciones ('escritura', 'lectura', 'no')
- `perm_categorias`: Nivel de permiso para categorías ('escritura', 'lectura', 'no')
- `perm_cuentas`: Nivel de permiso para cuentas ('escritura', 'lectura', 'no')

La API verifica que no existan usuarios con el mismo nombre o correo electrónico y encripta la contraseña antes de almacenarla.

### Actualización de Usuarios

La actualización de usuarios permite modificar:
- Nombre de usuario
- Correo electrónico
- Rol
- Permisos granulares para cada módulo:
  - `perm_recibos`
  - `perm_presupuestos`
  - `perm_ahorros`
  - `perm_anticipos`
  - `perm_transacciones`
  - `perm_categorias`
  - `perm_cuentas`

La operación de cambio de contraseña se maneja por separado para mayor seguridad.

### Eliminación de Usuarios

Soporta la eliminación individual o en lote mediante un array de IDs de usuario.

### Preferencias de Estilo

Las preferencias de estilo son específicas para cada usuario y se almacenan en formato JSON, permitiendo personalizar:
- Tema visual (preset)
- Modo de menú
- Tema claro/oscuro
- Colores primarios y de superficie

## Referencias

- [Servicio de Usuarios](../services/UsersService.md) - Cliente de API para consumir estos endpoints
- [Utilidades de Base de Datos para Usuarios](../db/db_utilsUsers.md) - Funciones de base de datos utilizadas por esta API
- [Componente de Gestión de Usuarios](../components/ProfileSettings.md) - Interfaz de usuario que interactúa con esta API