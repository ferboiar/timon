# API de Anticipos

## Descripción General

Este módulo implementa las rutas de la API REST para la gestión de anticipos y pagos asociados. Sirve como capa intermedia entre la interfaz de usuario y las funciones de acceso a la base de datos.

## Rutas Implementadas

### Gestión de Anticipos

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/anticipos` | Obtiene todos los anticipos |
| `POST` | `/api/anticipos` | Crea o actualiza un anticipo |
| `DELETE` | `/api/anticipos` | Elimina uno o más anticipos |
| `GET` | `/api/anticipos/periodicidades` | Obtiene las periodicidades válidas |

### Gestión de Pagos

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/anticipos/:anticipoId/pagos` | Obtiene los pagos de un anticipo específico |
| `POST` | `/api/anticipos/pagos` | Crea o actualiza un pago |
| `DELETE` | `/api/anticipos/pagos/:id` | Elimina un pago específico |
| `POST` | `/api/anticipos/delete-payment` | Maneja la eliminación de un pago con opciones adicionales |
| `POST` | `/api/anticipos/recalculate-payment-plan` | Recalcula el plan de pagos para un anticipo |

## Detalles de Implementación

### Manejo de Anticipos

La ruta principal para anticipos maneja operaciones CRUD básicas:
- **GET**: Recupera todos los anticipos almacenados
- **POST**: Crea un nuevo anticipo o actualiza uno existente si se proporciona un ID
- **DELETE**: Elimina uno o más anticipos basándose en un array de IDs

### Manejo de Pagos

Las rutas de pagos permiten:
- Recuperar pagos asociados a un anticipo específico
- Crear, actualizar y eliminar pagos individuales
- Recalcular el plan de pagos cuando sea necesario

### Ejemplo de Cuerpo de Solicitud para POST /api/anticipos

```json
{
  "id": null, // null para crear, ID para actualizar
  "concepto": "Reparación coche",
  "importe_total": 1000,
  "pago_sugerido": 200,
  "fecha_inicio": "2023-01-15",
  "fecha_fin_prevista": "2023-06-15",
  "descripcion": "Reparación del motor del coche",
  "estado": "activo",
  "cuenta_origen_id": 1,
  "periodicidad": "mensual"
}
```

## Dependencias

Este módulo depende directamente de las funciones de base de datos definidas en [`db_utilsAdv.mjs`](../db/db_utilsAdv.md), que manejan todas las operaciones de base de datos relacionadas con anticipos y pagos.

## Referencias

- [Documentación de AdvService](../services/AdvService.md) - Cliente que consume esta API
- [Utilidades de Base de Datos para Anticipos](../db/db_utilsAdv.md) - Implementación de las funciones de base de datos
- [Componente Advances](../components/Advances.md) - Interfaz de usuario que interactúa con esta API
