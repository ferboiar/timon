# apiError

## Descripción General

El módulo `src/utils/apiError.js` exporta `getApiErrorMessage(error)`, que devuelve el texto que se debe mostrar al usuario cuando falla una petición al backend.

## Función

| Función | Descripción |
|---------|-------------|
| `getApiErrorMessage(error)` | Devuelve, por este orden: el mensaje del servidor (`error.response.data.error`), el mensaje del propio error (`error.message`) o «Error desconocido» |

## Motivo

Con axios, `error.message` es siempre un texto genérico como «Request failed with status code 400». El motivo real, por ejemplo «El IBAN … ya está asignado a la cuenta …», viaja en `error.response.data.error`. Los servicios relanzan el error original de axios, así que las pantallas pueden usar este ayudante en sus avisos:

```javascript
import { getApiErrorMessage } from '@/utils/apiError';

try {
    await AccService.saveAccount(cuenta);
} catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar la cuenta: ${getApiErrorMessage(error)}`, life: 5000 });
}
```

## Dónde se usa

Por ahora solo en `Accounts.vue`. El resto de pantallas siguen mostrando `error.message` (hallazgo F-28 del registro de mantenimiento).

## Referencias

- [Componente Accounts](../components/Accounts.md) - Pantalla que lo usa
- [API de Cuentas](../routes/cuentas.md) - Rutas cuyas respuestas de error devuelven el campo `error`
