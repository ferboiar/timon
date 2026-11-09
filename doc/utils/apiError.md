# apiError

## Descripción General

El módulo `src/utils/apiError.js` exporta `getApiErrorMessage(error)`, que devuelve el texto que se debe mostrar al usuario cuando falla una petición al backend.

## Función

| Función | Descripción |
|---------|-------------|
| `getApiErrorMessage(error)` | Devuelve, por este orden: `error.response.data.error`, `error.response.data.message`, `error.message`, el propio valor si es una cadena, o «Error desconocido». Ignora los textos vacíos o en blanco y recorta los espacios de los extremos |

## Motivo

El backend no usa una única forma de respuesta de error: unas rutas envían `{ error }` (recibos, cuentas, ahorros, categorías, anticipos) y otras `{ message }` (usuarios, conexión y mantenimiento de la base de datos). Con axios, `error.message` es siempre un texto genérico como «Request failed with status code 400», así que el motivo real solo se conserva leyendo la respuesta del servidor.

El ayudante entiende las dos formas y evita que la pantalla muestre el texto de axios. Los servicios relanzan un `Error` con ese mensaje y las pantallas lo muestran con su prefijo contextual:

```javascript
import { getApiErrorMessage } from '@/utils/apiError';

try {
    await AccService.saveAccount(cuenta);
} catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar la cuenta: ${getApiErrorMessage(error)}`, life: 5000 });
}
```

Cuando el servicio tiene un texto por defecto propio, lo pasa en el hueco del mensaje del error para que no se pierda:

```javascript
getApiErrorMessage({ message: 'No se pudo guardar la configuración.', response: error?.response });
```

## Dónde se usa

- Pantallas: `Accounts.vue`, `Advances.vue`, `Savings.vue`, `Categories.vue`, `ListBills.vue`, `ProfileSettings.vue` y `Login.vue`.
- Servicios: `UsersService`, `DbConfigService`, `AjustesService`, `MaintenanceDBService` y el guardado y borrado de `BillService`.
- Quedan fuera los errores de lectura de ficheros de `Tech-documentation.vue`, que no son de la API.

## Límite actual

F-47 y F-48 normalizan todo el backend: cada ruta devuelve el mensaje de negocio tal cual o, ante un error técnico, el texto propio de la operación con la causa del [catálogo de causas](./catalogoErrores.md), sin prefijos técnicos, sin códigos del motor y sin detalle interno. Las pantallas siguen anteponiendo su prefijo contextual («Error al guardar usuario: …»), que ahora se lee como una frase completa. Los fallos de la prueba de conexión nunca muestran el código del sistema.

## Referencias

- [Componente Accounts](../components/Accounts.md) - Pantalla que lo usa
- [Componente ProfileSettings](../components/ProfileSettings.md) - Usuarios, Ajustes y Base de Datos
- [Componente ListBills](../components/ListBills.md) - Recibos
- [API de Cuentas](../routes/cuentas.md) - Rutas cuyas respuestas de error devuelven el campo `error`
- [API de Usuarios](../routes/users.md) - Rutas cuyas respuestas de error devuelven el campo `message`
