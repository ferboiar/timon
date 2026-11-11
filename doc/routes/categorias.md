# API de Categorías

## Descripción General

Este módulo implementa las rutas de la API REST para la gestión de categorías en el sistema. Sirve como capa intermedia entre la interfaz de usuario y las funciones de acceso a la base de datos.

## Rutas Implementadas

| Método HTTP | Ruta | Descripción |
|-------------|------|-------------|
| `GET` | `/api/categorias` | Obtiene todas las categorías |
| `POST` | `/api/categorias` | Crea o actualiza una categoría |
| `DELETE` | `/api/categorias` | Elimina una o más categorías |

## Características Principales

- Gestión completa de operaciones CRUD para categorías
- Ordenación alfabética de categorías con "Otros" siempre al final
- Validación de parámetros obligatorios
- Manejo detallado de errores con mensajes descriptivos
- Soporte para operaciones en lote (eliminación múltiple)

## Detalles de Implementación

### Obtener todas las categorías (GET /api/categorias)

Esta ruta devuelve un array con todas las categorías registradas en el sistema. Los datos son obtenidos desde la función `getCategorias()` del módulo de utilidades de base de datos, que asegura que la categoría "Otros" siempre aparezca al final de la lista.

### Crear o actualizar una categoría (POST /api/categorias)

Esta ruta crea una nueva categoría (sin `id`) o actualiza la categoría indicada por `id`, incluido su nombre (F-09). El servidor guarda el nombre en minúsculas (DC-31) y responde 400 si otra categoría ya lo tiene (F-22).

#### Campos del cuerpo de la solicitud:

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | Number | ID de la categoría a actualizar (vacío para crear una nueva) | No |
| `nombre` | String | Nombre de la categoría (se guarda en minúsculas, DC-31) | Sí |
| `descripcion` | String | Descripción de la categoría | No |

Al crear una categoría, el propietario (`propietario_id`) se toma del usuario autenticado (`req.user.id`); las categorías son visibles para todos (DC-02).

### Eliminar categorías (DELETE /api/categorias)

Esta ruta permite eliminar una o más categorías basándose en sus IDs. Acepta un array de IDs en el cuerpo de la petición bajo la propiedad `categoriaIds`. Si una categoría está en uso (clave foránea), responde 409 con el mensaje «No se puede eliminar la categoría porque está en uso…» (F-10).

## Validaciones

La API implementa las siguientes validaciones:
- El nombre de la categoría es obligatorio para crear o actualizar
- Un nombre que ya tiene otra categoría se rechaza con 400 (F-22); desde la migración 0006 existe el índice único uq_categorias_nombre
- Los IDs de categoría deben ser proporcionados como un array para eliminar
- No se permite enviar un array vacío de IDs para eliminar

## Manejo de Errores

Las rutas usan la utilidad común `backend/src/utils/errorDeNegocio.mjs` (F-47):

1. **Error de negocio** (`ErrorDeNegocio`): se devuelve su mensaje con su código HTTP. Un nombre repetido responde 400 con «Ya existe otra categoría con el nombre «nombre».»; una categoría en uso responde 409.
2. **Error técnico**: se responde **500** con un texto genérico («No se pudo guardar la categoría.», «No se pudieron eliminar las categorías.»), sin detalle interno. El detalle queda en el log del servidor.

## Dependencias

Este módulo depende directamente de las funciones de base de datos definidas en [`db_utilsCats.mjs`](../db/db_utilsCats.md), que manejan todas las operaciones de base de datos relacionadas con categorías.

## Límite de descripción e índice único (F-41, F-22)

La descripción de una categoría admite como máximo 255 caracteres, el mismo límite del control de la pantalla y de la columna categorias.descripcion (VARCHAR(255)). El servidor valida antes de escribir y responde 400 si se supera. El índice único uq_categorias_nombre (migración 0006) garantiza la unicidad también ante concurrencia; pushCategoria traduce el duplicado a un 400 de negocio.

## Referencias

- [Documentación de CatsService](../services/CatsService.md) - Cliente que consume esta API
- [Utilidades de Base de Datos para Categorías](../db/db_utilsCats.md) - Implementación de las funciones de base de datos
- [Componente Categories](../components/Categories.md) - Interfaz de usuario que interactúa con esta API

## Autorización implementada

Las rutas usan `autorizar('categorias', …)`: escritura y borrado según `perm_categorias` y el rol (DC-48). Las categorías son globales (DC-02): no aplica propietario ni `es_privado`. La lectura está disponible con cualquier sesión válida (DC-49); por eso un usuario con `perm_recibos = escritura` y `perm_categorias = no` sí carga el desplegable de categorías en Recibos (U-18).

## Compatibilidad del borrado

La ruta admite categoriaIds directamente y también el cuerpo anidado que produce actualmente la pantalla: { categoriaIds: { categoriaIds: [...] } }. Lo desenvuelve antes de exigir array no vacío. Esto no supone validación exhaustiva de cada ID.
