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

## Funciones Principales

### Gestión de Categorías

| Función | Descripción |
|---------|-------------|
| `getCategorias()` | Obtiene todas las categorías ordenadas alfabéticamente, con "Otros" al final |
| `pushCategoria(nombre, descripcion)` | Crea una nueva categoría o actualiza una existente |
| `deleteCategorias(categoriaIds)` | Elimina una o más categorías por sus IDs |

## Características Especiales

### Ordenamiento de "Otros"

Una característica especial de la función `getCategorias()` es que siempre coloca la categoría "Otros" al final de la lista, independientemente del orden alfabético. Esto facilita la organización lógica de las categorías en la interfaz de usuario.

### Validación de Datos

La función `deleteCategorias()` incluye validación para asegurar que los IDs proporcionados sean numéricos, evitando errores de tipo y facilitando el manejo de entrada desde la API.

## Validaciones y Manejo de Errores

- Verificación de unicidad de nombres de categorías
- Comprobación de validez de IDs al realizar operaciones de eliminación
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
