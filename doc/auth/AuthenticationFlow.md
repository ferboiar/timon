# Flujo de Autenticación en Timon

## Descripción General

Este documento describe el flujo completo de autenticación en la aplicación Timon, desde el inicio de sesión del usuario hasta la protección de rutas y recursos en el frontend y backend. El sistema implementa autenticación basada en tokens JWT con soporte para roles y persistencia de sesión.

## Diagrama de Flujo de Autenticación

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuario   │────►│  Login.vue  │────►│ API de Auth │────►│ Base de     │
│             │     │             │     │             │     │ Datos       │
└─────────────┘     └──────┬──────┘     └──────┬──────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │ localStorage│     │ JWT Secret  │     │ bcrypt      │
                    │ o session-  │◄────┤ + Payload   │◄────┤ password    │
                    │ Storage     │     │             │     │ verification│
                    └──────┬──────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Router     │◄────┤ Composable  │     │ Directiva   │
│  Guards     │     │ useAuth     │────►│ v-role      │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  API Rest   │◄────┤ JWT Token   │────►│ Middleware  │
│  Endpoints  │     │ en Headers  │     │ verifyToken │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Proceso Paso a Paso

### 1. Inicio de Sesión del Usuario

El flujo comienza cuando el usuario accede a la página de inicio de sesión (`Login.vue`):

1. El componente `Login.vue` muestra un formulario de autenticación
2. Si existe un usuario recordado previamente, autocompleta el campo de usuario
3. El usuario introduce sus credenciales y opcionalmente marca "Recordarme"
4. Al enviar el formulario, se ejecuta `handleLogin()`:
   - Se validan los campos username y password
   - Se muestra un indicador de carga
   - Se envía una petición POST a `/api/auth/login` con las credenciales

### 2. Verificación en el Backend

Cuando el backend recibe la solicitud de inicio de sesión:

1. El endpoint `/api/auth/login` recibe username y password
2. Llama a la función `verifyCredentials()` del módulo `db_utilsUsers.mjs`
3. Esta función:
   - Consulta el usuario por username en la base de datos
   - Utiliza bcrypt para comparar el hash de la contraseña almacenada con la proporcionada
   - Devuelve el objeto usuario si la autenticación es exitosa, o null si falla
4. Si la autenticación es exitosa, el endpoint:
   - Genera un token JWT con la información del usuario y sus permisos
   - Firma el token con un secreto configurado en variables de entorno
   - Establece un tiempo de expiración para el token
   - Devuelve el token junto con datos básicos del usuario

### 3. Almacenamiento del Token en el Cliente

Cuando el cliente recibe la respuesta:

1. El componente `Login.vue` maneja la respuesta:
   - Si hay error, muestra el mensaje correspondiente
   - Si es exitosa, procede a almacenar el token
2. Según la opción "Recordarme":
   - Si está marcada, guarda token y datos de usuario en `localStorage`
   - Si no está marcada, los guarda en `sessionStorage` (se eliminarán al cerrar el navegador)
   - Siempre guarda el nombre de usuario en `rememberedUser` para autocompletar futuros inicios
3. Finalmente, redirecciona al usuario al dashboard o a la ruta que intentaba acceder originalmente

### 4. Carga de Datos del Usuario en la Aplicación

Cuando el usuario navega por la aplicación:

1. El composable `useAuth` se inicializa en muchos componentes
2. Durante la inicialización, `useAuth` busca credenciales almacenadas:
   - Primero en `localStorage` (sesiones persistentes)
   - Luego en `sessionStorage` (sesiones temporales)
3. Si encuentra datos de usuario:
   - Actualiza el estado reactivo `currentUser`
   - Proporciona propiedades computadas como `isAuthenticated`, `isAdmin`, etc.
   - Carga las preferencias de estilo del usuario desde el servidor
   - Aplica las preferencias visuales a la interfaz

### 5. Protección de Rutas

Para cada navegación dentro de la aplicación:

1. Los guardias de Vue Router se ejecutan antes de la navegación
2. El guardia global verifica:
   - Si la ruta requiere autenticación
   - Si el usuario está autenticado (usando `useAuth`)
   - Si la ruta requiere roles específicos
3. Según el resultado:
   - Permite la navegación si los requisitos se cumplen
   - Redirecciona a login si se requiere autenticación y el usuario no está autenticado
   - Redirecciona a una página de acceso denegado si el usuario no tiene los roles necesarios
   - Redirecciona al dashboard si un usuario autenticado intenta acceder a páginas de login

### 6. Control de Acceso a Nivel de Componente

Dentro de los componentes:

1. Se utiliza la directiva personalizada `v-role` para controlar la visibilidad de elementos:
   ```html
   <button v-role="'admin'">Acceso solo para administradores</button>
   ```
2. La directiva verifica mediante `useAuth` si el usuario tiene los roles necesarios
3. Oculta los elementos para los que el usuario no tiene permisos
4. Para componentes completos, se utilizan condicionales con propiedades computadas:
   ```html
   <admin-panel v-if="isAdmin" />
   ```

### 7. Protección de Endpoints en el Backend

Para cada solicitud a la API:

1. Los endpoints protegidos utilizan el middleware `verifyToken`:
   ```javascript
   router.get('/api/protected', verifyToken, (req, res) => {...});
   ```
2. El middleware:
   - Extrae el token JWT del encabezado `Authorization`
   - Verifica la firma del token con el secreto configurado
   - Comprueba si el token ha expirado
   - Decodifica el payload y añade los datos del usuario a la solicitud
3. Para endpoints que requieren roles específicos, se añade el middleware `checkRole`:
   ```javascript
   router.post('/api/admin', verifyToken, checkRole('admin'), (req, res) => {...});
   ```
4. Si la verificación falla, responde con un código de error (401 o 403)

### 8. Cierre de Sesión

Cuando el usuario decide cerrar sesión:

1. Se llama a la función `logout()` del composable `useAuth`
2. Esta función:
   - Elimina el token JWT y los datos de usuario de `localStorage` y `sessionStorage`
   - Mantiene `rememberedUser` para facilitar futuros inicios de sesión
   - Actualiza el estado reactivo `currentUser` a null
   - Redirecciona al usuario a la página de inicio de sesión

## Manejo de Sesiones Inactivas o Expiradas

Para tokens expirados o invalidados:

1. Cuando se realiza una solicitud con un token expirado:
   - El servidor responde con un error 401
   - El interceptor de axios captura este error
   - Limpia los datos de sesión local
   - Redirecciona al usuario a la página de login con un mensaje apropiado

## Seguridad del Sistema

El sistema implementa varias capas de seguridad:

1. **En el frontend**:
   - Tokens almacenados en localStorage/sessionStorage solo cuando es necesario
   - Control de acceso a nivel de rutas y componentes
   - No expone información sensible en el estado de la aplicación

2. **En el backend**:
   - Contraseñas encriptadas con bcrypt (no se almacenan en texto plano)
   - Tokens JWT firmados con un secreto seguro
   - Expiración configurable de tokens
   - Verificación de permisos antes de ejecutar operaciones sensibles

3. **En la comunicación**:
   - Uso de HTTPS para transmisión segura de credenciales y tokens
   - Tokens enviados en headers de autorización (no en query params)
   - Validación de datos de entrada en cliente y servidor

## Referencias

- [Componente Login](../components/Login.md) - Interfaz de inicio de sesión
- [Composable useAuth](../composables/useAuth.md) - Gestión de autenticación
- [Middleware de Autenticación](../middleware/auth.md) - Seguridad del backend
- [Protección de Rutas](../router/routeGuards.md) - Seguridad en navegación
- [Directiva vRole](../directives/vRole.md) - Control de acceso en componentes
- [API de Autenticación](../routes/auth.md) - Endpoints de autenticación
- [Utilidades de Base de Datos](../db/db_utilsUsers.md) - Funciones de verificación de credenciales