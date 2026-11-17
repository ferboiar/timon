# API de Autenticación

## Descripción General

Este módulo implementa las rutas de la API REST para gestionar la autenticación de usuarios en el sistema Timon. Proporciona endpoints para iniciar sesión mediante credenciales (username/password) y verificar la validez de tokens JWT. Al autenticarse exitosamente, devuelve un JWT con identidad y rol; no contiene los permisos por módulo.

## Rutas Implementadas

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `POST` | `/api/auth/login` | Autentica un usuario mediante credenciales |
| `GET` | `/api/auth/verify` | Verifica la validez de un token JWT |
| `POST` | `/api/auth/logout` | Revoca todos los tokens del usuario (S-04a) |

## Características Principales

- Autenticación segura mediante credenciales de usuario
- Generación y verificación de tokens JWT
- Encriptación y comparación segura de contraseñas
- Control de acceso mediante sistema de roles
- Manejo detallado de errores de autenticación
- Registro de intentos de inicio de sesión

## Detalles de Implementación

### Proceso de Autenticación

El endpoint de login sigue el siguiente proceso:
1. Recibe credenciales de usuario (username y password)
2. Valida que se proporcionen ambos campos
3. Verifica las credenciales contra la base de datos usando bcrypt para comparar contraseñas
4. En caso de éxito, genera un token JWT firmado con la información del usuario
5. Devuelve el token junto con datos básicos del usuario (sin la contraseña)

### Estructura del Token JWT

El token JWT generado contiene la siguiente información en su payload:
- `id`: Identificador único del usuario
- `username`: Nombre de usuario
- `email`: Correo electrónico del usuario
- `rol`: Rol del usuario (admin, user, limited_user, reader)
- `ver`: Versión de token del usuario; si no coincide con `users.token_version`, la sesión está revocada

### Verificación de Token

El endpoint de verificación valida que el token proporcionado:
1. Tenga una firma válida (no haya sido alterado)
2. No haya expirado
3. Lleve la versión `ver` y coincida con `users.token_version`
4. Corresponda a un usuario vigente, cuyo rol se usa en la respuesta

## Configuración

La API utiliza las siguientes variables de configuración desde el módulo `env.mjs`:
- `JWT_SECRET`: Clave secreta para firmar tokens
- `JWT_EXPIRATION`: Tiempo de validez del token (ej: '24h')
- `LOGIN_MAX_INTENTOS`: Fallos de `/login` permitidos por ventana (5 por defecto)
- `LOGIN_IP_MAX_INTENTOS`: Fallos por IP permitidos por ventana (30 por defecto)
- `LOGIN_VENTANA_MS`: Ventana del límite, en milisegundos (900000 por defecto)

## Seguridad

- Uso de bcrypt para almacenamiento seguro y verificación de contraseñas
- F-59: la verificación compara siempre con bcrypt; si el usuario no existe se usa un hash ficticio de coste 10, para que el tiempo de respuesta no revele qué nombres de usuario están dados de alta
- Tokens JWT firmados para garantizar integridad y autenticidad
- Expiración configurable de tokens para limitar la ventana de ataque
- Registro de intentos de acceso para monitoreo de seguridad
- Revocación por versión de token: logout y cambio de contraseña invalidan los JWT anteriores (S-04a)
- Dos capas de límite (S-04b, DC-63): limitador propio por IP+usuario (5 fallos/15 min, solo fallos, reinicio con login correcto) y tope por IP instanciado en `routes/auth.mjs` con `rateLimit(opcionesLimitadorIp(config.login))`; `middleware/limitadorIp.mjs` solo expone las opciones puras. El tope usa 30 fallos/15 min, `skipSuccessfulRequests`, IPv6 por subred /56, cabeceras `RateLimit-*` draft-7 y `Retry-After`; ambos responden 429 con el mismo cuerpo. El tope por IP cubre la rotación de usuarios y la alerta de CodeQL, que no reconoce el limitador a través de una fábrica de otro fichero.
- `req.ip` es la dirección del socket: no hay `trust proxy` en `server.mjs` ni proxy en Vite. Si se coloca un proxy inverso delante, todas las peticiones compartirán su IP hasta configurar `trust proxy`, y tanto el tope por IP como el límite por IP+usuario se resentirán.
- Manejo de errores que no revela información sensible

## Integración con Middleware

Esta API se integra con los siguientes middlewares para proteger rutas:
- `verifyToken`: Verifica que el token sea válido
- `verifyAdmin`: Verifica que el usuario sea administrador
- `checkRole`: Verifica que el usuario tenga un rol específico

## Referencias

- [Utilidades de Base de Datos para Usuarios](../db/db_utilsUsers.md) - Funciones de acceso a datos utilizadas
- [Composable useAuth](../composables/useAuth.md) - Hook de Vue para autenticación y autorización
- [Servicio de Usuarios](../services/UsersService.md) - Servicio para gestión de usuarios
- [API de Usuarios](./users.md) - API para gestión de usuarios autenticados

## Códigos y validación reales

POST /login: 200 con token y user; 400 por usuario/contraseña ausentes; 401 por credenciales incorrectas; 429 al superar el umbral por IP+usuario o el tope por IP, con `Retry-After`; 500 por fallo del servidor. POST /logout: 200 y revoca todas las sesiones del usuario; 401 sin token o con token ya revocado. GET /verify: 200 con la identidad vigente o 401 sin token/inválido/caducado/revocado. Verify y verifyToken comparten la comprobación de versión; el 401 por token inválido o caducado se mantiene desde S-16. Si la comprobación falla por una causa técnica, el manejador central responde 500; el frontend no cierra la sesión ante 5xx (F-56).

La validación comprueba firma, caducidad y `ver` contra `users.token_version`, y carga el usuario vigente; por tanto sí consulta revocación, rol actualizado y existencia actual del usuario en la base de datos (S-04a).
