# API de Ahorros

## Descripción General

Este módulo implementa las rutas de la API REST para la gestión de ahorros y sus movimientos asociados. Sirve como capa intermedia entre la interfaz de usuario y las funciones de acceso a la base de datos.

## Rutas Implementadas

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/ahorros` | Obtiene todos los ahorros |
| `POST` | `/api/ahorros` | Crea o actualiza un ahorro |
| `DELETE` | `/api/ahorros` | Elimina uno o más ahorros |
| `GET` | `/api/ahorros/periodicidades` | Obtiene las periodicidades válidas |
| `GET` | `/api/ahorros/{ahorroId}/movimientos` | Obtiene movimientos de un ahorro específico |
| `POST` | `/api/ahorros/movimientos` | Crea o actualiza un movimiento |
| `DELETE` | `/api/ahorros/movimientos/{id}` | Elimina un movimiento específico |

## Características Principales

- Gestión completa de ahorros y sus movimientos asociados 
- Validación de parámetros obligatorios
- Manejo detallado de errores con mensajes descriptivos
- Soporte para operaciones en lote (eliminación múltiple)
- Endpoints específicos para obtener valores enumerados (periodicidades)

## Detalles de Implementación

### Obtener todos los ahorros (GET /api/ahorros)

Esta ruta devuelve un array con todos los ahorros registrados en el sistema. Los datos son obtenidos directamente desde la función `getSavings()` del módulo de utilidades de base de datos.

### Crear o actualizar un ahorro (POST /api/ahorros)

Esta ruta permite crear un nuevo ahorro o actualizar uno existente si se proporciona un ID.

#### Campos del cuerpo de la solicitud:

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | Number | ID del ahorro (null para crear nuevo) | No |
| `concepto` | String | Concepto o nombre del ahorro | Sí |
| `descripcion` | String | Descripción detallada del ahorro | No |
| `ahorrado` | Number | Al crear, valor inicial. Al actualizar, solo se admite un cambio si el ahorro no tiene movimientos; en otro caso la petición se rechaza con 400 | No |
| `fecha_objetivo` | Date | Fecha para completar el objetivo de ahorro | No |
| `periodicidad` | String | Frecuencia de ahorro (diaria, mensual, etc.) | No |
| `importe_periodico` | Number | Cantidad sugerida a ahorrar por periodo | Sí |
| `activo` | Number | Estado del ahorro (1=activo, 0=inactivo) | No |

#### Propietario y valor de `ahorrado`

Al crear un ahorro, el propietario (`propietario_id`) se toma del usuario autenticado (`req.user.id`); no se acepta desde el cuerpo de la petición. `ahorrado` es el valor inicial más la suma de los movimientos (DC-10): se puede corregir mientras no haya movimientos y, a partir de ahí, solo cambia añadiendo movimientos positivos o negativos.

### Eliminar ahorros (DELETE /api/ahorros)

Esta ruta permite eliminar uno o más ahorros basándose en sus IDs. Acepta un array de IDs en el cuerpo de la petición bajo la propiedad `savings`.

### Obtener periodicidades (GET /api/ahorros/periodicidades)

Devuelve un array con las periodicidades definidas en el esquema de la base de datos. Estas periodicidades representan las opciones válidas para el campo `periodicidad` de un ahorro.

### Gestión de Movimientos

Las rutas de movimientos permiten:
- Obtener todos los movimientos asociados a un ahorro específico
- Crear o actualizar movimientos individuales
- Eliminar movimientos existentes

Los movimientos representan aportaciones a un objetivo de ahorro y pueden ser de tipo "regular" o "extraordinario".

Crear, editar y eliminar un movimiento ajusta `ahorrado` en la misma transacción. Al editar, solo se suma la diferencia entre el importe nuevo y el anterior, y el ahorro afectado es el que ya tiene el movimiento en la base de datos (el `ahorro_id` del cuerpo solo se usa al crear). Si algo falla, no se guarda ningún cambio.

## Trazas en el log

Las operaciones sobre ahorros y movimientos escriben sus pasos en el log del backend (DC-09); el detalle está en [db_utilsSav](../db/db_utilsSav.md#trazas-en-el-log).

## Manejo de Errores

Todas las rutas implementan manejo de errores que:
1. Capturan excepciones que puedan ocurrir durante el procesamiento
2. Devuelven códigos de estado HTTP apropiados (200, 201, 400, 500)
3. Proporcionan mensajes de error descriptivos y detalles adicionales cuando es necesario

## Dependencias

Este módulo depende directamente de las funciones de base de datos definidas en [`db_utilsSav.mjs`](../db/db_utilsSav.md), que manejan todas las operaciones de base de datos relacionadas con ahorros y movimientos.

## Referencias

- [Documentación de SavService](../services/SavService.md) - Cliente que consume esta API
- [Utilidades de Base de Datos para Ahorros](../db/db_utilsSav.md) - Implementación de las funciones de base de datos
- [Componente Savings](../components/Savings.md) - Interfaz de usuario que interactúa con esta API