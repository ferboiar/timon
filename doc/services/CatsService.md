# CatsService

## Descripción
CatsService es un servicio cliente que proporciona métodos para interactuar con la API de categorías. Encapsula todas las llamadas HTTP necesarias para realizar operaciones CRUD sobre las categorías.

## Configuración
El servicio utiliza axios para realizar peticiones HTTP a la API:

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/categorias';
```

## Métodos

### getCategorias
Obtiene todas las categorías disponibles en el sistema.

```javascript
static async getCategorias() {
    try {
        const response = await axios.get(API_URL);
        return response.data;
    } catch (error) {
        console.error('Error al obtener las categorías:', error);
        throw error;
    }
}
```

### saveCategoria
Guarda una categoría (crea una nueva o actualiza una existente).

```javascript
static async saveCategoria(categoria) {
    try {
        const response = await axios.post(API_URL, categoria);
        return response.data;
    } catch (error) {
        console.error('Error al guardar la categoría:', error);
        throw error;
    }
}
```

### deleteCategorias
Elimina una o más categorías especificadas por sus IDs.

```javascript
static async deleteCategorias(categoriaIds) {
    try {
        const response = await axios.delete(API_URL, { data: { categoriaIds } });
        return response.data;
    } catch (error) {
        console.error('Error al eliminar la(s) categoría(s):', error);
        throw error;
    }
}
```

## Manejo de errores
El servicio captura y registra en consola todos los errores que ocurren durante las llamadas a la API, y los relanza para que puedan ser manejados por el componente que utiliza el servicio.
