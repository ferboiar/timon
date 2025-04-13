# AccService

## Descripción General

El servicio `AccService` actúa como intermediario entre la interfaz de usuario (componentes Vue) y el backend de la aplicación para todo lo relacionado con cuentas bancarias y financieras. Este servicio encapsula las llamadas API necesarias para gestionar el ciclo de vida completo de las cuentas.

## Métodos Principales

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getAccounts()` | Obtiene todas las cuentas registradas | `GET /api/cuentas` |
| `saveAccount(account)` | Crea o actualiza una cuenta | `POST /api/cuentas` |
| `deleteAccounts(accounts)` | Elimina una o más cuentas por ID | `DELETE /api/cuentas` |
| `getTipos()` | Obtiene los tipos de cuentas permitidos | `GET /api/cuentas/tipos` |

## Configuración

El servicio utiliza axios para realizar peticiones HTTP al backend y está configurado con la URL base:

```javascript
const API_URL = 'http://localhost:3000/api/cuentas';
```

## Uso Común

Este servicio es utilizado principalmente por el componente [Accounts.vue](../components/Accounts.md) para realizar todas las operaciones CRUD relacionadas con las cuentas.

### Ejemplo de uso para obtener cuentas:

```javascript
import { AccService } from '@/service/AccService';

// En un componente Vue
async function cargarCuentas() {
    try {
        const cuentas = await AccService.getAccounts();
        // Procesar las cuentas...
    } catch (error) {
        console.error('Error al obtener las cuentas:', error);
    }
}
```

### Manejo de errores

Todos los métodos del servicio incluyen manejo de excepciones que:
1. Registran el error en la consola para facilitar la depuración
2. Re-lanzan la excepción para que pueda ser manejada por el componente que llama al servicio

## Referencias

- [Documentación del API de Cuentas](../routes/cuentas.md) - Detalles sobre los endpoints del backend
- [Utilidades de Base de Datos para Cuentas](../db/db_utilsAcc.md) - Funciones de base de datos utilizadas por el backend
- [Componente Accounts](../components/Accounts.md) - Interfaz de usuario que utiliza este servicio
