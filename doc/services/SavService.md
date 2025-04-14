# SavService

## Descripción General

El servicio `SavService` actúa como intermediario entre la interfaz de usuario (componentes Vue) y el backend de la aplicación para todo lo relacionado con ahorros y sus movimientos asociados. Este servicio encapsula las llamadas API necesarias para gestionar el ciclo de vida completo de los ahorros.

## Métodos Principales

### Gestión de Ahorros

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getSavings()` | Obtiene todos los ahorros registrados | `GET /api/ahorros` |
| `saveSaving(saving)` | Crea o actualiza un ahorro | `POST /api/ahorros` |
| `deleteSavings(savings)` | Elimina uno o más ahorros por ID | `DELETE /api/ahorros` |
| `getPeriodicidades()` | Obtiene las periodicidades permitidas para los ahorros | `GET /api/ahorros/periodicidades` |

### Gestión de Movimientos

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getMovimientos(ahorroId)` | Obtiene todos los movimientos de un ahorro específico | `GET /api/ahorros/{ahorroId}/movimientos` |
| `saveMovimiento(movimiento)` | Crea o actualiza un movimiento | `POST /api/ahorros/movimientos` |
| `deleteMovimiento(movimientoId)` | Elimina un movimiento por su ID | `DELETE /api/ahorros/movimientos/{movimientoId}` |

## Características Principales

- Gestión completa de operaciones CRUD para ahorros y sus movimientos
- Manejo de errores con registro detallado en consola
- Relanzamiento de excepciones para manejo en componentes de UI
- Soporte para operaciones en lotes como eliminación múltiple
- Métodos específicos para gestionar periodicidades

## Uso Común

Este servicio es utilizado principalmente por el componente [Savings.vue](../components/Savings.md) para realizar todas las operaciones CRUD relacionadas con ahorros y sus movimientos.

### Ejemplo de uso para obtener ahorros:

```javascript
import { SavService } from '@/service/SavService';

// En un componente Vue
async function cargarAhorros() {
    try {
        const ahorros = await SavService.getSavings();
        // Procesar los ahorros...
    } catch (error) {
        console.error('Error al obtener los ahorros:', error);
    }
}
```

## Manejo de errores

El servicio captura y registra en consola todos los errores que ocurren durante las llamadas a la API, y los relanza para que puedan ser manejados por el componente que utiliza el servicio.

## Referencias

- [Documentación del API de Ahorros](../routes/ahorros.md) - Detalles sobre los endpoints del backend
- [Utilidades de Base de Datos para Ahorros](../db/db_utilsSav.md) - Funciones de base de datos utilizadas por el backend
- [Componente Savings](../components/Savings.md) - Interfaz de usuario que utiliza este servicio