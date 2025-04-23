# Middleware de Autenticación

## Descripción General

El middleware de autenticación proporciona la capa de seguridad para controlar el acceso a las rutas de la API de Timon. Implementa la verificación de tokens JWT para proteger las rutas del backend y garantizar que sólo los usuarios autorizados puedan acceder a los recursos protegidos.

## Características Principales

- Verificación de tokens JWT en las cabeceras Authorization
- Control de acceso basado en roles para rutas específicas
- Manejo de errores para tokens inválidos o expirados
- Inyección de datos del usuario en objetos de solicitud
- Compatibilidad con múltiples esquemas de autenticación

## Middlewares Implementados

### verifyToken

Este es el middleware principal que verifica la autenticidad del token JWT proporcionado en la cabecera de la solicitud.

**Funcionamiento:**
1. Extrae el token de la cabecera `Authorization`
2. Verifica la firma del token utilizando el secreto JWT
3. Decodifica el payload del token
4. Añade la información del usuario (id, username, email, rol) a la solicitud
5. Permite continuar la ejecución si el token es válido
6. Responde con error 401 si el token es inválido o no se proporciona

**Uso:**
```javascript
router.get('/ruta-protegida', verifyToken, (req, res) => {
    // El usuario está autenticado, se puede acceder a req.user
    res.json({ message: 'Ruta protegida', user: req.user });
});
```

### checkRole

Middleware para verificar que el usuario tenga un rol específico. Se utiliza después de `verifyToken` para añadir una capa adicional de autorización basada en roles.

**Funcionamiento:**
1. Recibe como parámetro el rol requerido o un array de roles permitidos
2. Verifica si el rol del usuario coincide con el rol requerido o está en el array de roles
3. Permite continuar la ejecución si el usuario tiene el rol adecuado
4. Responde con error 403 si el usuario no tiene el rol requerido

**Uso:**
```javascript
router.post('/ruta-solo-admin', verifyToken, checkRole('admin'), (req, res) => {
    // Solo los administradores pueden acceder a esta ruta
    res.json({ message: 'Operación administrativa exitosa' });
});
```

### verifyAdmin

Un middleware especializado que verifica si el usuario tiene rol de administrador. Es una versión simplificada de `checkRole` específica para el rol de administrador.

**Funcionamiento:**
1. Verifica si el rol del usuario es 'admin'
2. Permite continuar la ejecución si el usuario es administrador
3. Responde con error 403 si el usuario no es administrador

**Uso:**
```javascript
router.delete('/usuarios/:id', verifyToken, verifyAdmin, (req, res) => {
    // Solo los administradores pueden eliminar usuarios
    // Código para eliminar usuario
});
```

## Manejo de Errores

El middleware implementa manejo de errores específicos para diferentes situaciones:

| Situación | Código de Estado | Mensaje |
|-----------|------------------|---------|
| Token no proporcionado | 401 | Acceso denegado. Token no proporcionado |
| Token inválido | 401 | Acceso denegado. Token inválido |
| Token expirado | 401 | Acceso denegado. Token expirado |
| Rol insuficiente | 403 | Acceso denegado. No tienes permisos suficientes |

## Integración con JWT

El middleware utiliza la biblioteca `jsonwebtoken` para verificar la firma de los tokens:

```javascript
jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
        return res.status(401).json({ message: 'Acceso denegado. Token inválido' });
    }
    
    req.user = decoded;
    next();
});
```

## Configuración

El middleware obtiene la clave secreta JWT desde el módulo de configuración centralizado:

```javascript
import { config } from '../config/env.mjs';

// Usar config.jwt.secret para verificar tokens
```

## Seguridad

- Utiliza HTTPS para la transmisión segura de tokens
- Implementa expiración de tokens configurable
- No almacena tokens en el backend (modelo stateless)
- Valida todas las propiedades del usuario dentro del token
- No revela información sensible en respuestas de error

## Referencias

- [API de Autenticación](../routes/auth.md) - Endpoints para la autenticación de usuarios
- [API de Usuarios](../routes/users.md) - Endpoints protegidos por este middleware
- [Configuración de Entorno](../config/env.md) - Configuración de secretos y expiración de JWT
- [Componente Login](../components/Login.md) - Interfaz para autenticación de usuarios
- [Composable useAuth](../composables/useAuth.md) - Hook de Vue para gestión de autenticación