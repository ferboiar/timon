---
paths:
  - "backend/**"
---

# Backend de Timón

- El esquema se define solo en `backend/src/db/migrations` (DC-13); no uses SQL suelto como fuente
  del esquema.
- Las operaciones que escriben en varias filas usan transacción y bloquean la fila implicada cuando
  corresponda (DC-39).
- Toda operación nueva o modificada deja traza en el log con el formato «módulo - acción: datos»
  (DC-09).
- Valida la entrada antes de consultar la base y devuelve 400 con un mensaje breve cuando proceda.
- Respeta la matriz de autorización DC-48/DC-49 con `autorizar()` y `propiedad.mjs`.
