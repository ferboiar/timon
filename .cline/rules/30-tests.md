---
paths:
  - "backend/test/**"
  - "backend/src/**"
  - "src/**"
  - "**/*.test.mjs"
  - "**/*.test.js"
---

# Pruebas de Timón

- Las pruebas destructivas usan exclusivamente una base cuyo nombre termina en `_test`; nunca `conta_hogar`.
- Para la suite de backend, sigue `backend/test/README.md` y la configuración confirmada en el relevo.
- Las pruebas del frontend (UI) se hacen con la suite E2E de `e2e/`; sigue `e2e/README.md`.
- Conserva el código de salida de los comandos; no lo ocultes con tuberías.
- Una prueba unitaria no sustituye una prueba de interfaz cuando esta es necesaria.
- No declares pruebas superadas sin evidencia real de su ejecución.