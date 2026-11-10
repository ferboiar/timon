# AdvService

## Descripción General

El servicio `AdvService` actúa como intermediario entre la interfaz de usuario (componentes Vue) y el backend de la aplicación para todo lo relacionado con anticipos y sus pagos asociados. Este servicio encapsula las llamadas API necesarias para gestionar el ciclo de vida completo de los anticipos.

## Métodos Principales

### Gestión de Anticipos

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getAdvances()` | Obtiene todos los anticipos registrados | `GET /api/anticipos` |
| `saveAdvance(advance)` | Crea o actualiza un anticipo; el servidor guarda el concepto en minúsculas (DC-31) | `POST /api/anticipos` |
| `deleteAdvances(advances)` | Elimina uno o más anticipos por ID | `DELETE /api/anticipos` |
| `getPeriodicidades()` | Obtiene las periodicidades permitidas para anticipos | `GET /api/anticipos/periodicidades` |

### Gestión de Pagos

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getPagos(anticipoId)` | Obtiene todos los pagos de un anticipo específico | `GET /api/anticipos/{anticipoId}/pagos` |
| `savePago(pago)` | Crea o actualiza un pago | `POST /api/anticipos/pagos` |
| `replacePago(pagoId, pago)` | Sustituye un pago por uno nuevo en una sola operación atómica (F-27, DC-39) | `POST /api/anticipos/pagos/{pagoId}/sustituir` |
| `handlePaymentDeletion(pagoId, redistribuir)` | Elimina un pago; con `redistribuir = true` el servidor completa el plan de pagos con su importe (DC-12). Una sola ruta para los dos casos (DC-39) | `DELETE /api/anticipos/pagos/{pagoId}?redistribuir=…` |
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

## Transporte y contrato comprobados

Usa `apiClient` (`src/config/api.js`): su interceptor añade la cabecera `Authorization` con el token de `localStorage` o `sessionStorage`, sin construirla a mano (S-07). La URL sale de `API_BASE_URL` (`VITE_API_URL`, con respaldo `http://localhost:3000`) y cada método devuelve `response.data`. Registra y relanza el error original, sin convertirlo en un mensaje específico de negocio. No valida permisos en el cliente: el servidor aplica la matriz DC-48.

`deleteAdvances(ids)` exige array no vacío y envía `{ advances: ids }`. `handlePaymentDeletion(id, redistribuir = false)` envía `DELETE …/pagos/{id}` con `redistribuir` como parámetro de consulta y sin cuerpo; `replacePago(id, pago)` envía el pago nuevo a `POST …/pagos/{id}/sustituir`; `recalculatePaymentPlan(id)` envía `{ anticipoId: id }`. La pantalla usa handlePaymentDeletion para borrar pagos y replacePago para sustituirlos (DC-39). La antigua ruta DELETE sin reparto, deletePago y POST /delete-payment se retiraron.
