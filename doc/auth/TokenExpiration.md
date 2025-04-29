# Gestión de Tokens Expirados en Timón

## Descripción General

Este documento detalla las estrategias implementadas en Timón para manejar adecuadamente la expiración de tokens JWT y garantizar una experiencia de usuario consistente y segura. El sistema detecta automáticamente cuando un token ha expirado y redirige al usuario a la página de inicio de sesión, protegiendo datos sensibles y manteniendo la seguridad de la aplicación.

## Diagrama del Sistema de Detección

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ Interceptor    │     │ Verificación   │     │   Guard de     │
│ Axios (401/403)│────►│ Periódica      │────►│   Navegación   │
│                │     │                │     │                │
└────────┬───────┘     └────────┬───────┘     └────────┬───────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                   Sistema de Detección                     │
│                                                            │
└────────────────────┬───────────────────────────┬───────────┘
                     │                           │
                     ▼                           ▼
          ┌────────────────────┐      ┌───────────────────┐
          │   Limpieza de      │      │ Redirección a     │
          │   Credenciales     │      │ Página de Login   │
          └────────────────────┘      └───────────────────┘
```

## Componentes del Sistema

### 1. Interceptor de Axios para Respuestas 401/403

El sistema incluye un interceptor centralizado en `api.js` que captura automáticamente los errores de autenticación devueltos por el servidor.

```javascript
// En src/config/api.js
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Verificar si el error es de autenticación (401) o autorización (403)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Si el error es por token expirado o inválido
            if (error.response.data && 
                (error.response.data.message === 'Token inválido o expirado' || 
                error.response.data.message === 'Se requiere token de autenticación')) {
                
                console.warn('Sesión expirada o inválida. Redirigiendo a login...');
                
                // Usar useAuth() para cerrar la sesión correctamente
                const { logout } = useAuth();
                logout();
                
                // No propagamos el error ya que el logout ya maneja la redirección
                return Promise.reject(new Error('Sesión expirada. Por favor, inicie sesión nuevamente.'));
            }
        }
        
        // Para otros errores, los propagamos normalmente
        return Promise.reject(error);
    }
);
```

**Características clave:**
- Captura específicamente errores 401 (No autorizado) y 403 (Prohibido)
- Analiza el mensaje de error para identificar problemas relacionados con tokens
- Ejecuta el proceso de logout automáticamente cuando detecta un token expirado
- Presenta al usuario un mensaje informativo sobre la expiración de la sesión

### 2. Verificación Periódica del Token

El composable `useAuth` implementa un mecanismo de verificación periódica para detectar tokens expirados incluso cuando el usuario no está realizando peticiones activas.

```javascript
// En src/composables/useAuth.js
const startTokenVerification = () => {
    // Limpiar cualquier intervalo existente
    if (tokenVerificationInterval) {
        clearInterval(tokenVerificationInterval);
    }

    // Configurar un nuevo intervalo para verificar el token
    tokenVerificationInterval = setInterval(() => {
        verifySessionValidity();
    }, TOKEN_VERIFICATION_INTERVAL); // 5 minutos
};

const verifySessionValidity = async () => {
    // Obtener token de localStorage o sessionStorage
    let token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // Si no hay token, consideramos la sesión como inválida
    if (!token) {
        if (isAuthenticated.value) {
            console.warn('No se encontró token pero el usuario aparece como autenticado. Cerrando sesión...');
            logout();
        }
        return false;
    }

    try {
        // Verificar validez del token con el backend
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            // Token inválido o expirado
            console.warn('Token expirado o inválido detectado durante verificación periódica');
            logout();
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error al verificar la validez del token:', error);
        // En caso de error de red, mantenemos la sesión activa
        return true;
    }
};
```

**Características clave:**
- Verifica el token cada 5 minutos mediante un intervalo
- Realiza una petición específica al endpoint `/api/auth/verify` para validar el token
- Gestiona automáticamente el cierre de sesión si se detecta un token inválido
- Implementa manejo de errores para evitar cierres de sesión innecesarios en caso de problemas de red

### 3. Verificación en el Layout Principal

El componente AppLayout realiza una verificación inicial al cargarse, para garantizar que el usuario tenga credenciales válidas antes de mostrar cualquier contenido protegido.

```javascript
// En src/layout/AppLayout.vue
// Verificar la validez de la sesión al cargar el layout principal
onMounted(async () => {
    try {
        await verifySessionValidity();
    } catch (error) {
        console.error('Error al verificar la sesión en AppLayout:', error);
        // El método verifySessionValidity ya maneja el logout si el token es inválido
    }
});
```

**Características clave:**
- Se ejecuta una vez al cargar el layout principal
- Proporciona una capa adicional de seguridad antes de renderizar contenido protegido
- Previene que el usuario navegue por la aplicación con un token expirado

### 4. Guard de Navegación Mejorado

El router de Vue incluye guards de navegación que verifican la validez del token antes de permitir el acceso a rutas protegidas.

```javascript
// En src/router/index.js
router.beforeEach(async (to, from, next) => {
    // Código existente para verificar rutas públicas y autenticación básica
    // ...

    // Si requiere autenticación y hay un token, verificar que sigue siendo válido
    if (authRequired && token) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // Token inválido o expirado, limpiar datos y redirigir a login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                
                console.warn('Sesión expirada detectada en navegación. Redirigiendo a login...');
                return next('/auth/login');
            }
        } catch (error) {
            console.error('Error verificando token en guard de navegación:', error);
            // En caso de error de red, permitir continuar para no bloquear la navegación
        }
    }

    // Resto del código del guard
    // ...
});
```

**Características clave:**
- Verifica el token en cada cambio de ruta protegida
- Proporciona una capa adicional de seguridad durante la navegación
- Redirige inmediatamente al login si se detecta un token expirado
- Incluye manejo de errores para permitir la navegación en caso de problemas de red

## Flujo de Expiración de Token

Cuando un token JWT expira en Timón, el sistema sigue este flujo:

1. **Detección**: El sistema detecta la expiración a través de uno de los cuatro mecanismos:
   - Interceptor de Axios (cuando se realiza una petición API)
   - Verificación periódica (cada 5 minutos)
   - Verificación en carga inicial del layout
   - Guard de navegación (al cambiar de ruta)

2. **Limpieza de datos**: El sistema elimina todas las credenciales almacenadas:
   - Tokens JWT en localStorage y sessionStorage
   - Datos del usuario en localStorage y sessionStorage
   - Estado de autenticación en memoria (currentUser)

3. **Redirección**: El usuario es redirigido automáticamente a la página de login

4. **Información al usuario**: El sistema muestra un mensaje informativo explicando que la sesión ha expirado

5. **Preservación del usuario recordado**: Para mayor comodidad, el sistema mantiene el nombre de usuario en `rememberedUser` para facilitar el siguiente inicio de sesión

## Mejor Prácticas Implementadas

- **Detección multicapa**: El sistema no depende de un solo método para detectar tokens expirados
- **Verificación proactiva**: No espera a que ocurra un error para verificar la validez del token
- **Experiencia de usuario fluida**: Redirige automáticamente sin necesidad de interacción manual
- **Gestión contextual de errores**: Diferencia entre problemas de red y tokens realmente expirados
- **Preservación de información útil**: Mantiene el nombre de usuario para facilitar el reinicio de sesión

## Configuración y Personalización

El sistema de detección de tokens expirados puede ser configurado modificando las siguientes variables:

- **Intervalo de verificación**:
  ```javascript
  // En src/composables/useAuth.js
  const TOKEN_VERIFICATION_INTERVAL = 5 * 60 * 1000; // 5 minutos en milisegundos
  ```

- **Mensajes de expiración**:
  ```javascript
  // En src/config/api.js - Mensaje para el interceptor
  return Promise.reject(new Error('Sesión expirada. Por favor, inicie sesión nuevamente.'));
  ```