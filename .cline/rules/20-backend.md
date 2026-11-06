---
paths:
  - "backend/**"
---

# Backend de Timón

- Sigue la instrucción persistente y el relevo antes de modificar rutas, acceso a datos, middleware o utilidades.
- El esquema se define únicamente en `backend/src/db/migrations` (DC-13); no uses scripts SQL sueltos como fuente del esquema.
- Las operaciones que escriben en varias filas deben usar transacciones y bloquear la fila implicada cuando corresponda (DC-39).
- Toda operación nueva o modificada deja traza en el log con el formato «módulo - acción: datos» (DC-09).
- Valida entradas antes de consultar la base de datos y devuelve errores 400 con mensajes breves cuando proceda.