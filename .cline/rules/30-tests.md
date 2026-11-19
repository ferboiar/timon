---
paths:
  - "backend/test/**"
  - "e2e/**"
  - "**/*.test.mjs"
  - "dev/utils/**"
---

# Pruebas de Timón

- Pruebas destructivas solo contra bases cuyo nombre termina en `_test`, comprobando el destino;
  nunca `conta_hogar`. El sufijo no sustituye la comprobación.
- Backend: `npm run test:backend:local` (credenciales cifradas de `backend/test/.env.test`, DC-46).
  Sin ese fichero, entrega el comando de `backend/test/README.md` y espera el resumen. No leas
  `.db_connection` para credenciales y no pidas ni escribas contraseñas en claro.
- Interfaz: suite E2E de `e2e/` (Playwright); lee `e2e/README.md` y mantén el spec y su README.
- Cita código de salida y `# tests`, `# pass`, `# fail`, `# cancelled`. Salida corta (DC-69):
  `npm run iter:pruebas -- --ejecuta` o `| grep -E "^# (tests|pass|fail|cancelled)|^not ok"`.
  `--ejecuta` sin `--incluye-entorno` omite la E2E y la base: esa ejecución **no** es verde.
- Una prueba unitaria no sustituye una prueba de interfaz cuando esta es necesaria.
- No declares nada en verde sin la salida real; distingue entorno, fixture y análisis estático.

## Selección de pruebas
- Cambios de lógica, API, autorización, persistencia o esquema: ejecuta las pruebas de backend
  pertinentes y añade o actualiza los casos que demuestren el comportamiento cambiado.
- Cambios de interfaz o de flujos observables por el usuario: ejecuta las E2E pertinentes con
  Playwright y añade o actualiza los escenarios afectados.
- Un cambio exclusivamente de backend también requiere E2E si afecta a un flujo integrado que
  no quede suficientemente demostrado con pruebas de backend.
- Selecciona la cobertura por impacto y riesgo: pruebas focalizadas y, cuando proceda, la suite
  completa. Justifica la selección; no declares las pruebas opcionales solo por conveniencia.
- Lint, sintaxis y build complementan las pruebas funcionales, pero no las sustituyen.
- Si no hacen falta pruebas de backend o E2E, explica brevemente por qué en el PR.
