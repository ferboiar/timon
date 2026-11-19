# Ficheros de seguimiento del proyecto Timón

Cuatro piezas reparten la memoria del proyecto. Una regla, un sitio: las reglas y los procedimientos
viven en `.cline/` y no se copian aquí ni en `doc/`.

| Pieza | Cuándo se consulta | Qué aporta |
|---|---|---|
| Issues y Project (`ferboiar/timon`) | Al empezar y al planificar | Qué toca ahora, con prioridad y estado |
| `.cline/rules/` y `.cline/skills/` | Siempre / al usar un procedimiento | Cómo se trabaja |
| `estado-del-proyecto.md` (relevo) | Al retomar | Estado vigente (migraciones), decisiones y mapa; sin PR, SHA ni ramas (DC-69) |
| `registro-hallazgos.md` y sus 3 partes | Solo por ID, con `grep` | Histórico con evidencia; ya no lleva reanudación operativa (DC-69) |

El relevo es un solo fichero y se edita solo si cambia una decisión vigente o el mapa. El registro se
divide en tres partes (DC-28) y no se lee entero. El material congelado vive en `archivo/` e
`informes_iteraciones/`.

## Scripts de iteración

Herramientas mecánicas del flujo; no hacen commit, push ni PR. La lógica pura vive en `scripts/lib/iteracion.mjs` y se prueba en `backend/test/iteracion.test.mjs`.

| Orden | Qué hace |
|---|---|
| `npm run iter:previa` | Rama, estado y últimos commits; `git diff --check` y `git diff --cached --check`; `node --check` de los `.mjs` tocados fuera de `src/`; ESLint de los `src/` tocados y con `--no-ignore` de los `e2e/` (O-12); avisa de CRLF en las líneas añadidas y de cercas de código impares en `.md`, sin bloquear. |
| `npm run iter:pruebas` | Propone las pruebas por impacto. Un cambio en `src/composables`, `config`, `layout`, `router`, `service` o `utils` pide E2E completa y build. Con `-- --ejecuta` lanza las que no necesitan entorno; `--incluye-entorno` añade las de base `_test` y la E2E. |
| `npm run iter:cierre -- <tema> --ficheros a,b` | Manifiesto explícito en `/tmp/manifiesto-<tema>.txt`, `git add --` de esas rutas, rechazo de `.db_connection`, `.env` y `node_modules`, y comparación con el índice. Sin `--ficheros` solo propone y sale con código 2. |
| `npm run iter:ids` | Último ID asignado de cada familia (DC, F, S, O, U, D, R) con orden numérico, leído del registro. |

`--ejecuta` sin `--incluye-entorno` omite la E2E y las pruebas con base: esa ejecución no es verde y el script lo avisa.
