# AdvService

## Descripción General

El servicio `AdvService` actúa como intermediario entre la interfaz de usuario (componentes Vue) y el backend de la aplicación para todo lo relacionado con anticipos y sus pagos asociados. Este servicio encapsula las llamadas API necesarias para gestionar el ciclo de vida completo de los anticipos.

## Métodos Principales

### Gestión de Anticipos

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getAdvances()` | Obtiene todos los anticipos registrados | `GET /api/anticipos` |
| `saveAdvance(advance)` | Crea o actualiza un anticipo | `POST /api/anticipos` |
| `deleteAdvances(advances)` | Elimina uno o más anticipos por ID | `DELETE /api/anticipos` |
| `getPeriodicidades()` | Obtiene las periodicidades permitidas para anticipos | `GET /api/anticipos/periodicidades` |

### Gestión de Pagos

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getPagos(anticipoId)` | Obtiene todos los pagos de un anticipo específico | `GET /api/anticipos/{anticipoId}/pagos` |
| `savePago(pago)` | Crea o actualiza un pago | `POST /api/anticipos/pagos` |
| `deletePago(pagoId)` | Elimina un pago por su ID | `DELETE /api/anticipos/pagos/{pagoId}` |
| `handlePaymentDeletion(pagoId)` | Maneja la lógica de eliminación de un pago | `POST /api/anticipos/delete-payment` |
| `recalculatePaymentPlan(anticipoId)` | Recalcula el plan de pagos para un anticipo | `POST /api/anticipos/recalculate-payment-plan` |

## Uso Común

Este servicio es utilizado principalmente por el componente [Advances.vue](../components/Advances.md) para realizar todas las operaciones CRUD relacionadas con anticipos y sus pagos.

### Ejemplo de uso para obtener anticipos:

```javascript
import { AdvService } from '@/service/AdvService';

// En un componente Vue
async function cargarAnticipos() {
    try {
        const anticipos = await AdvService.getAdvances();
        // Procesar los anticipos...
    } catch (error) {
        console.error('Error al obtener los anticipos:', error);
    }
}
```

## Referencias

- [Documentación del API de Anticipos](../routes/anticipos.md) - Detalles sobre los endpoints del backend
- [Utilidades de Base de Datos para Anticipos](../db/db_utilsAdv.md) - Funciones de base de datos utilizadas por el backend
- [Componente Advances](../components/Advances.md) - Interfaz de usuario que utiliza este servicio