# Componente Login

## Descripción General

El componente `Login.vue` implementa la interfaz de inicio de sesión para la aplicación Timon. Proporciona un formulario con campos de usuario y contraseña, y gestiona todo el proceso de autenticación, incluyendo la verificación de credenciales, almacenamiento de tokens y redirección tras inicio de sesión exitoso.

## Funcionalidades Principales

- Formulario de autenticación con validación de campos
- Opción "Recordarme" para mantener la sesión entre visitas
- Autocompletado de nombre de usuario para usuarios recurrentes
- Verificación automática de sesiones existentes
- Manejo detallado de errores de autenticación
- Soporte para almacenamiento dual (localStorage y sessionStorage)
- Indicador visual durante el proceso de autenticación

## Estados y Referencias

### Referencias Externas

| Referencia | Propósito |
|------------|-----------|
| `API_BASE_URL` | URL base para comunicación con el backend |
| `useRouter` | Hook de Vue Router para redirecciones |

### Estados Internos

| Estado | Tipo | Descripción |
|--------|------|-------------|
| `username` | ref(String) | Nombre de usuario para el inicio de sesión |
| `password` | ref(String) | Contraseña del usuario |
| `checked` | ref(Boolean) | Estado del checkbox "Recordarme" |
| `errorMessage` | ref(String) | Mensaje de error a mostrar |
| `isLoading` | ref(Boolean) | Indica si hay una operación en curso |

## Flujo de Autenticación

El componente implementa dos flujos principales:

### 1. Verificación de Sesión Existente

Al cargar el componente:
1. Busca un token JWT en localStorage o sessionStorage
2. Si existe un token, realiza una petición a `/api/auth/verify` para validarlo
3. Si el token es válido, redirige al dashboard
4. Si el token no es válido, lo elimina del almacenamiento y muestra el formulario

### 2. Inicio de Sesión Manual

Cuando el usuario completa el formulario:
1. Valida que los campos username y password estén completos
2. Envía las credenciales al endpoint `/api/auth/login`
3. Si las credenciales son correctas:
   - Almacena el token JWT en localStorage o sessionStorage según la opción "Recordarme"
   - Guarda los datos del usuario en el mismo almacenamiento
   - Si "Recordarme" está marcado, guarda el username para futuros inicios de sesión
   - Redirige al usuario al dashboard
4. Si las credenciales son incorrectas, muestra un mensaje de error

## Almacenamiento de Sesión

El componente implementa un esquema dual de almacenamiento:

- **localStorage**: Cuando "Recordarme" está marcado, para persistencia entre sesiones del navegador
- **sessionStorage**: Cuando "Recordarme" no está marcado, para sesiones temporales

Además, mantiene `rememberedUser` en localStorage incluso cuando no se marca "Recordarme", para facilitar el autocompletado del nombre de usuario en futuros inicios de sesión.

## Gestión de UI

- Mensaje de error claro cuando falla la autenticación
- Indicador de carga durante el proceso de autenticación
- Autocompletado del campo de usuario si existe en rememberedUser
- Validación de campos para evitar envíos de formularios vacíos
- Campo de contraseña con opción para mostrar/ocultar

## Seguridad

- No almacena la contraseña en ningún medio de almacenamiento
- Comunica con el backend mediante HTTPS
- Elimina tokens inválidos automáticamente
- Separa los tokens de sesión y permanentes en diferentes almacenamientos
- Validación en servidor antes de aceptar el token

## Código de Ejemplo

### Verificación de Sesión Existente
```javascript
const verifySession = async () => {
    let token = localStorage.getItem('token');
    if (!token) {
        token = sessionStorage.getItem('token');
    }
    
    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                router.push('/dashboard');
            } else {
                // Limpiar tokens inválidos
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
        }
    }
};
```

### Manejo de Inicio de Sesión
```javascript
const handleLogin = async () => {
    try {
        // Validar campos
        if (!username.value || !password.value) {
            errorMessage.value = 'Por favor, introduce nombre de usuario y contraseña';
            return;
        }
        
        isLoading.value = true;
        
        // Enviar petición de login
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username.value,
                password: password.value
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error al iniciar sesión');
        }
        
        // Almacenar token y datos según opción "Recordarme"
        if (checked.value) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('rememberedUser', JSON.stringify({ username: username.value }));
        } else {
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // Redireccionar al dashboard
        router.push('/dashboard');
    } catch (error) {
        errorMessage.value = error.message;
    } finally {
        isLoading.value = false;
    }
};
```

## Referencias

- [API de Autenticación](../routes/auth.md) - Endpoints utilizados por este componente
- [Middleware de Autenticación](../middleware/auth.md) - Middleware para verificar tokens
- [Composable useAuth](../composables/useAuth.md) - Hook para gestión de autenticación en componentes
- [Protección de Rutas](../router/routeGuards.md) - Navegación protegida basada en autenticación