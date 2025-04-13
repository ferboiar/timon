# API de Categorías

## Descripción
La API de categorías proporciona endpoints REST para gestionar categorías en el sistema. Permite realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre las categorías.

## Base URL
```
/api/categorias
```

## Endpoints

### GET /
Obtiene todas las categorías existentes.

#### Respuesta
- **200 OK**: Lista de categorías ordenadas alfabéticamente (con "Otros" siempre al final)
```json
[
  {
    "id": 1,
    "nombre": "Alimentación",
    "descripcion": "Productos alimenticios y comidas"
  },
  {
    "id": 2,
    "nombre": "Transporte",
    "descripcion": "Gastos relacionados con transporte"
  },
  {
    "id": 3,
    "nombre": "Otros",
    "descripcion": "Categoría para elementos sin clasificación específica"
  }
]
```
- **500 Error**: Error al obtener las categorías

### POST /
Crea una nueva categoría o actualiza una existente si ya existe una con el mismo nombre.

#### Parámetros del cuerpo
- **nombre** (obligatorio): Nombre de la categoría
- **descripcion** (opcional): Descripción de la categoría

#### Respuesta
- **201 Created**: Categoría creada o actualizada correctamente
```json
{
  "message": "Categoría insertada o actualizada correctamente"
}
```
- **400 Bad Request**: Error en la solicitud
- **500 Error**: Error al procesar la solicitud

### DELETE /
Elimina una o más categorías especificadas por sus IDs.

#### Parámetros del cuerpo
- **categoriaIds**: Array de IDs de las categorías a eliminar

#### Respuesta
- **200 OK**: Categorías eliminadas correctamente
```json
{
  "message": "Categoría(s) eliminada(s) correctamente"
}
```
- **400 Bad Request**: Error en la solicitud
- **500 Error**: Error al procesar la solicitud

## Validaciones
- El nombre de la categoría es obligatorio para crear o actualizar
- Los IDs de categoría deben ser proporcionados como un array para eliminar
- No se permite enviar un array vacío de IDs para eliminar
