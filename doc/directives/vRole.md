# Directiva vRole

## Descripción General

La directiva personalizada `vRole` proporciona una forma declarativa de controlar la visibilidad de elementos en la interfaz de usuario basada en los roles del usuario actual. A diferencia de usar condicionales como `v-if` con propiedades computadas como `isAdmin`, esta directiva simplemente oculta el elemento (display: none) en lugar de eliminarlo del DOM.

## Casos de Uso

- Mostrar/ocultar elementos pequeños de la UI como botones o enlaces basados en roles
- Controlar acceso a funcionalidades específicas dentro de componentes más grandes
- Implementar restricciones de UI sin necesidad de lógica adicional en el componente

## Sintaxis

La directiva acepta un string con el nombre de un rol o un array de roles:

```html
<!-- Visible solo para administradores -->
<button v-role="'admin'">Administrar Usuarios</button>

<!-- Visible para usuarios con rol admin o user -->
<div v-role="['admin', 'user']">Contenido para usuarios</div>
```

## Implementación

La directiva se integra con el composable `useAuth` para verificar si el usuario actual tiene los roles requeridos:

1. En el hook `beforeMount`, comprueba si el usuario tiene al menos uno de los roles especificados
2. Si no tiene permisos, establece `display: none` en el elemento
3. En el hook `updated`, vuelve a verificar los permisos cuando cambian los datos de binding
4. Restaura el estilo de visualización si el usuario obtiene los permisos necesarios

## Consideraciones

- Para secciones completas o componentes grandes, es preferible usar `v-if` con propiedades computadas como `isAdmin`, ya que esto evita renderizar completamente el elemento
- Esta directiva solo oculta visualmente el elemento, pero sigue estando en el DOM
- No proporciona seguridad real en el cliente, solo mejora la experiencia de usuario ocultando elementos no pertinentes
- Debe complementarse con seguridad adecuada en el servidor para todas las operaciones

## Registro Global

La directiva está registrada globalmente en `main.js` para estar disponible en toda la aplicación:

```javascript
// En main.js
import { vRole } from './directives/vRole';

// Registrar directivas
app.directive('role', vRole);
```

## Referencias

- [Composable useAuth](../composables/useAuth.md) - Proporciona la lógica de verificación de roles
- [API de Autenticación](../routes/auth.md) - Sistema de autenticación backend
- [Componentes UI](../components/ProfileSettings.md) - Ejemplos de uso de esta directiva