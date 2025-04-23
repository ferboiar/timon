# Utilidades de Base de Datos para Usuarios

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con usuarios y sus preferencias. Implementa operaciones CRUD básicas para la gestión completa de usuarios en la aplicación Timon, incluyendo creación, consulta, actualización y eliminación de usuarios, así como gestión de preferencias de estilo personalizadas.

## Características Principales

- Gestión completa de operaciones CRUD para usuarios
- Autenticación y verificación de credenciales
- Encriptación segura de contraseñas utilizando bcrypt
- Gestión de preferencias de estilo personalizadas
- Manejo eficiente de conexiones a la base de datos
- Validación y transformación de parámetros
- Manejo detallado de errores y excepciones

## Estructura de Datos

### Tabla `users`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `username` | VARCHAR(50) | Nombre de usuario único |
| `email` | VARCHAR(100) | Correo electrónico único |
| `password` | VARCHAR(255) | Contraseña encriptada |
| `rol` | ENUM | Rol del usuario ('admin', 'user', 'limited_user', 'reader') |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

### Tabla `users_style_preferences`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `user_id` | INT | Clave foránea a users.id |
| `preferences` | JSON | Preferencias de estilo almacenadas como JSON |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

## Funciones Principales

### Gestión de Usuarios

| Función | Descripción |
|---------|-------------|
| `getUsers()` | Obtiene todos los usuarios registrados (sin devolver contraseñas) |
| `getUserById(userId)` | Obtiene un usuario específico por su ID |
| `getUserByUsername(username)` | Obtiene un usuario por su nombre de usuario |
| `getUserByEmail(email)` | Obtiene un usuario por su correo electrónico |
| `createUser(userData)` | Crea un nuevo usuario |
| `updateUser(userId, userData)` | Actualiza los datos de un usuario existente |
| `changePassword(userId, hashedPassword)` | Cambia la contraseña de un usuario |
| `deleteUsers(userIds)` | Elimina uno o más usuarios por sus IDs |
| `verifyCredentials(username, password)` | Verifica las credenciales de un usuario para autenticación |

### Gestión de Preferencias de Estilo

| Función | Descripción |
|---------|-------------|
| `saveStylePreferences(userId, stylePrefs)` | Guarda las preferencias de estilo de un usuario |
| `getStylePreferences(userId)` | Obtiene las preferencias de estilo de un usuario |

## Características Especiales

### Encriptación de Contraseñas

El módulo utiliza la biblioteca bcrypt para el manejo seguro de contraseñas:
- Encriptación de contraseñas al crear o actualizar usuarios
- Verificación de contraseñas durante la autenticación
- Generación automática de salt para mayor seguridad

### Validación de Datos

Incluye validaciones robustas para garantizar la integridad de los datos:
- Unicidad de nombres de usuario y correos electrónicos
- Formato válido de correos electrónicos
- Conversión de tipos para evitar errores de tipo
- Validación específica para IDs de usuarios en operaciones en lote

### Manejo de Preferencias de Estilo

El sistema permite almacenar y recuperar preferencias de interfaz personalizadas:
- Almacenamiento en formato JSON para máxima flexibilidad
- Actualización parcial de preferencias (actualiza solo los campos proporcionados)
- Conversión automática entre formatos string y objeto JSON

## Referencias

- [API de Usuarios](../routes/users.md) - Endpoints que utilizan estas funciones
- [Servicio de Usuarios](../services/UsersService.md) - Cliente para consumir la API de usuarios
- [Componente de Gestión de Usuarios](../components/ProfileSettings.md) - Interfaz de usuario para gestión de usuarios
- [API de Autenticación](../routes/auth.md) - Sistema de autenticación que utiliza estas funciones