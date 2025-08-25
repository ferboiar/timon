# BillService

## Descripción General

El servicio `BillService` actúa como intermediario entre la interfaz de usuario (componentes Vue) y el backend de la aplicación para todo lo relacionado con recibos y sus fechas de cargo. Este servicio encapsula las llamadas API necesarias para gestionar el ciclo de vida completo de los recibos.

## Métodos Principales

### Gestión de Recibos

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getBills()` | Obtiene todos los recibos disponibles | `GET /api/recibos` |
| `getBillById(id)` | Obtiene un recibo específico por su ID | `GET /api/recibos/:id` |
| `saveBill(bill)` | Crea o actualiza un recibo | `POST /api/recibos` |
| `deleteBill(id, fecha, periodicidad)` | Elimina un recibo o una fecha de cargo específica | `DELETE /api/recibos/:id` |

### Filtrado de Recibos

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getBillsByPeriodicity(periodicity)` | Obtiene recibos filtrados por periodicidad | `GET /api/recibos?periodicidad=:periodicity` |
| `getBillsByYear(year)` | Obtiene recibos filtrados por año | `GET /api/recibos?año=:year` |
| `getInactiveBills()` | Obtiene recibos inactivos | `GET /api/recibos?activo=0` |

## Características Principales

- Gestión completa de recibos y sus fechas de cargo
- Soporte para filtrado avanzado por diversos criterios
- Manejo detallado de errores con mensajes descriptivos en consola
- Operaciones asíncronas utilizando Promises/async-await

## Uso Común

### Ejemplo de obtención de recibos

```javascript
import { BillService } from '@/service/BillService';

// Obtener todos los recibos
const bills = await BillService.getBills();

// Obtener recibos mensuales
const monthlyBills = await BillService.getBillsByPeriodicity('mensual');

// Obtener recibos de un año específico
const bills2024 = await BillService.getBillsByYear(2024);
```

### Ejemplo de creación de un recibo

```javascript
import { BillService } from '@/service/BillService';

const newBill = {
  concepto: 'Electricidad',
  periodicidad: 'mensual',
  importe: 95.50,
  categoria: 'Suministros',
  cuenta_id: 1, // ID de la cuenta bancaria asociada
  cargo: [
    {
      fecha: '2025-05-01',
      estado: 'pendiente',
      comentario: 'Domiciliación bancaria',
      activo: true
    }
  ]
};

// Crear un nuevo recibo
await BillService.saveBill(newBill);
```

### Ejemplo de eliminación de un recibo

```javascript
import { BillService } from '@/service/BillService';

// Eliminar un recibo mensual completo
await BillService.deleteBill(1, null, 'mensual');

// Eliminar una fecha específica de un recibo trimestral
await BillService.deleteBill(2, '2025-07-15', 'trimestral');
```

## Manejo de errores

El servicio captura y registra en consola todos los errores que ocurren durante las llamadas a la API, incluyendo:
- Errores de red
- Errores de validación de datos
- Errores de servidor

Cada método relanza el error después de registrarlo para que pueda ser manejado por el componente que utiliza el servicio.

## Referencias

- [Documentación del API de Recibos](../routes/recibos.md) - Detalles sobre los endpoints del backend
- [Utilidades de Base de Datos para Recibos](../db/db_utilsBill.md) - Funciones de base de datos utilizadas por el backend
- [Componente Recibos](../components/Recibos.md) - Interfaz de usuario que utiliza este servicio