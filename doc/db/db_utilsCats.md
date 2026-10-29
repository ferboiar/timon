# Utilidades de Base de Datos para Categorías

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con categorías. Implementa operaciones CRUD básicas para la gestión completa de categorías en la aplicación Timon.

## Características Principales

- Gestión completa de operaciones CRUD para categorías
- Ordenación alfabética de categorías con "Otros" siempre al final
- Compatibilidad con operaciones en lote (eliminación múltiple)
- Validación y transformación de parámetros
- Manejo eficiente de conexiones a la base de datos

## Estructura de Datos

### Tabla `categorias`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `nombre` | VARCHAR | Nombre de la categoría (único) |
| `descripcion` | VARCHAR | Descripción detallada (opcional) |
| `propietario_id` | INT | Usuario que creó la categoría; no limita su visibilidad, las categorías son globales (DC-02) |
| `es_privado` | TINYINT | Columna del esquema sin filtrado en los endpoints; en categorías no limita la visibilidad (S-01, DC-02) |

## Funciones Principales

### Gestión de Categorías

| Función | Descripción |
|---------|-------------|
| `getCategorias()` | Obtiene todas las categorías ordenadas alfabéticamente, con "Otros" al final |
| `pushCategoria(id, nombre, descripcion, propietario_id)` | Con `id` actualiza esa categoría (nombre y descripción); sin `id` crea una nueva. Normaliza el nombre a minúsculas (DC-31) y lanza un error si otra categoría ya tiene ese nombre (F-22) |
| `deleteCategorias(categoriaIds)` | Elimina una o más categorías por sus IDs |

## Características Especiales

### Ordenamiento de "Otros"

Una característica especial de la función `getCategorias()` es que siempre coloca la categoría "Otros" al final de la lista, independientemente del orden alfabético. Esto facilita la organización lógica de las categorías en la interfaz de usuario.

### Validación de Datos

La función `deleteCategorias()` incluye validación para asegurar que los IDs proporcionados sean numéricos, evitando errores de tipo y facilitando el manejo de entrada desde la API.

## Validaciones y Manejo de Errores

- Normaliza el nombre (trim y minúsculas) y comprueba si otra categoría lo tiene antes de insertar o actualizar; sin índice único no hay garantía ante concurrencia hasta la migración DC-02 (F-22)
- Convierte IDs con Number, sin verificar explícitamente que sean válidos
- Si el borrado choca con una clave foránea (ER_ROW_IS_REFERENCED_2), lanza «No se puede eliminar la categoría porque está en uso (recibos, presupuestos u otros registros)» (F-10)
- Trazas (DC-09): `pushCategoria - Nueva categoría: …`, `pushCategoria - Categoría ID: nombre A -> B`, `pushCategoria - Rechazado: …` y `deleteCategorias - Rechazado: …`
- Transformación automática de tipos de datos para asegurar compatibilidad con la base de datos
- Manejo detallado de errores con mensajes específicos para facilitar la depuración

## Consideraciones de Rendimiento

- El ordenamiento alfabético se realiza a nivel de base de datos para optimizar el rendimiento
- Las operaciones de eliminación en lote utilizan una sola consulta SQL para mejorar la eficiencia
- Se implementa liberación inmediata de conexiones para maximizar la disponibilidad del pool

## Referencias

- [API de Categorías](../routes/categorias.md) - Rutas que utilizan estas funciones
- [Documentación de CatsService](../services/CatsService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Categories](../components/Categories.md) - Interfaz de usuario para categorías
