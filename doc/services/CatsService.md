# CatsService

## Descripción General

El servicio `CatsService` actúa como intermediario entre la interfaz de usuario (componentes Vue) y el backend de la aplicación para todo lo relacionado con categorías. Este servicio encapsula las llamadas API necesarias para gestionar el ciclo de vida completo de las categorías.

## Métodos Principales

### Gestión de Categorías

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getCategorias()` | Obtiene todas las categorías disponibles | `GET /api/categorias` |
| `saveCategoria(categoria)` | Crea o actualiza una categoría | `POST /api/categorias` |
| `deleteCategorias(categoriaIds)` | Elimina una o más categorías por ID | `DELETE /api/categorias` |

## Características Principales

- Gestión completa de operaciones CRUD para categorías
- Manejo de errores con registro detallado en consola
- Relanzamiento de excepciones para manejo en componentes de UI
- Soporte para eliminación múltiple de categorías

## Uso Común

Este servicio es utilizado principalmente por el componente [Categories.vue](../components/Categories.md) para realizar todas las operaciones CRUD relacionadas con las categorías.

### Ejemplo de uso para obtener categorías:

```javascript
import { CatsService } from '@/service/CatsService';

// En un componente Vue
async function cargarCategorias() {
    try {
        const categorias = await CatsService.getCategorias();
        // Procesar las categorías...
    } catch (error) {
        console.error('Error al obtener las categorías:', error);
    }
}
```

## Manejo de errores

El servicio captura y registra en consola todos los errores que ocurren durante las llamadas a la API, y los relanza para que puedan ser manejados por el componente que utiliza el servicio.

## Referencias

- [Documentación del API de Categorías](../routes/categorias.md) - Detalles sobre los endpoints del backend
- [Utilidades de Base de Datos para Categorías](../db/db_utilsCats.md) - Funciones de base de datos utilizadas por el backend
- [Componente Categories](../components/Categories.md) - Interfaz de usuario que utiliza este servicio
