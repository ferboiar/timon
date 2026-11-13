# Informe de cierre de iteración

## Objetivo y alcance

- **O-06**: que `backupDb` y `restoreDb` incluyan rutinas y eventos, con prueba de ida y vuelta entre bases `*_test` y documentación de `DEFINER` y S-22.
- **O-08** (registro): normalización del `DEFINER` para restaurar sin `SET USER`; se planifica junto con O-07 porque la migración 0007 fijará el `DEFINER` de los mismos objetos.
- Inclusiones: `argumentosDeVolcado`, aviso de negocio para el error 1227, prueba unitaria y de integración, documentación y seguimiento.
- Exclusiones: migración 0007, cambios de privilegios, frontend y la base `conta_hogar` (solo lectura para el volcado de evidencia).

## Base

- Rama `correccion/fase-3-O-06-volcados-rutinas-eventos`, sobre `main` en `d291233`.
- PR #85 fusionado (merge `704b2e4`, 2026-11-13); los commits `adcb046` y `d291233` son seguimiento documental de DC-52.
- Único cambio local ajeno: `backend/src/db/.db_connection`, no tocado; su sha256 sigue siendo `cffe3241e7bdbd082ac15bfea36885c94ea7153613bfe01aa7f7b38081bf15ac`.

## Cambios

- **`backend/src/db/db_maintenance.mjs`**: `argumentosDeVolcado` pasa `--single-transaction --routines --events`; la copia previa usa los mismos argumentos. No se usa `--skip-definer` (no existe en MariaDB 11.8). Un `ERROR 1227` de `mysql` se traduce a 409 `RESTAURACION_SIN_SET_USER` con un mensaje accionable.
- **`backend/test/mantenimientoCredenciales.test.mjs`**: comprueba que el volcado pide rutinas y eventos y que el 1227 se explica como falta de `SET USER`, con el stub de `mysql` emitiendo el error y saliendo con 1.
- **`backend/test/mantenimientoVolcado.test.mjs`** (nuevo): volcado y restauración entre `conta_hogar_o06_origen_test` y `conta_hogar_o06_destino_test`; comprueba el procedimiento, el evento, el estado `DISABLE` y el `DEFINER`; restaura dos veces sobre el destino poblado y verifica que no falla ni duplica. Aísla la configuración con `DB_CONFIG_PATH` y un fichero temporal (600); antes de cada operación comprueba que la base efectiva es la esperada, termina en `_test` y que host, puerto y usuario son los de `TEST_DB_*`.
- **Verificación real del 1227**: volcado nuevo de `conta_hogar` restaurado con `timon_test` en `conta_hogar_o06_destino_test`; MariaDB responde `ERROR 1227 (42000) at line 798: Access denied; you need (at least one of) the SET USER privilege(s) for this operation`; `restoreDb` lanza `ErrorDeNegocio` 409 `RESTAURACION_SIN_SET_USER` y conserva la copia previa.
- **Documentación**: `db_maintenance.md`, `mantenimientoDB.md`, `optimizaciones.md`, `generar_recibos_anio.md`, `backend/test/README.md`, `entorno-pruebas.md` y `e2e/README.md`. El clon E2E se mantiene **sin** rutinas ni eventos: `timon_test` no tiene `SET USER` y los objetos de `conta_hogar` tienen `DEFINER=root@%`; el comentario del script lo explica.
- **Seguimiento**: O-06 cerrado, O-08 registrado, S-22 marcada como bloqueada por O-08, O-07+O-08 planificados juntos, erratas del TODO y del índice de informes corregidas.

## Documentación revisada

| Archivo | Revisado | Modificado | Motivo |
|---|---|---|---|
| `TODO` | Sí | Sí | O-06 cerrado, O-08, S-22 y erratas |
| `doc/mantenimiento/registro-hallazgos_3de3.md` | Sí | Sí | O-06 corregido, O-07+O-08, S-22 |
| `doc/mantenimiento/estado-del-proyecto_1de3.md` | Sí | Sí | Sección 0, corte y SET USER |
| `doc/mantenimiento/estado-del-proyecto_2de3.md` | Sí | Sí | Historial y siguiente paso |
| `doc/mantenimiento/informes_iteraciones/index.md` | Sí | Sí | Alta del informe y errata duplicada |
| `doc/db/db_maintenance.md` | Sí | Sí | Rutinas, eventos, `DEFINER` y 1227 |
| `doc/db/generar_recibos_anio.md` | Sí | Sí | Copia con `DEFINER` |
| `doc/db/schema/optimizaciones.md` | Sí | Sí | Existe en la base, no en migraciones |
| `doc/routes/mantenimientoDB.md` | Sí | Sí | Copia con rutinas/eventos y 409 |
| `doc/pruebas/entorno-pruebas.md` | Sí | Sí | GRANT de la prueba |
| `backend/test/README.md` | Sí | Sí | Prueba nueva y GRANT |
| `e2e/README.md` | Sí | Sí | Motivo del clon sin rutinas |
| `e2e/scripts/prepara-base-pruebas.mjs` | Sí | Sí | Comentario del `DEFINER` |
| `backend/src/db/db_maintenance.mjs` | Sí | Sí | Flags y 1227 |
| `backend/test/mantenimientoCredenciales.test.mjs` | Sí | Sí | Argumentos y 1227 |
| `backend/test/mantenimientoVolcado.test.mjs` | Sí | Sí (nuevo) | Ida y vuelta entre bases `*_test` |
| `doc/mantenimiento/informes_iteraciones/2026-11-13_O-06_volcados-rutinas-eventos.md` | Sí | Sí (nuevo) | Este informe |

## Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Sintaxis | `node --check` en `db_maintenance.mjs`, `mantenimientoCredenciales.test.mjs`, `mantenimientoVolcado.test.mjs` y `e2e/scripts/prepara-base-pruebas.mjs` | OK |
| ESLint | `npx eslint` en los tres ficheros JS del PR | **0 errores**, 19 avisos de Prettier preexistentes; los tres avisos introducidos por este PR se corrigieron |
| Prettier (main vs rama) | `eslint --stdin --stdin-filename --no-ignore` | `db_maintenance.mjs`: 4/4 avisos; `mantenimientoCredenciales.test.mjs`: 15/15; `prepara-base-pruebas.mjs`: 7/7; `mantenimientoVolcado.test.mjs`: 0 (nuevo) |
| Suite del backend | `npm run test:backend:local` (sin servidor E2E vivo) | **356 tests, 356 pasan, 0 fallan, 0 canceladas, 0 omitidas**, `EXIT 0`, 197,1 s |
| Prueba unitaria | `node --env-file=backend/test/.env.test --test backend/test/mantenimientoCredenciales.test.mjs` | **4 tests, 4 pasan, 0 fallan, 0 omitidas**, `EXIT 0`; incluye el 1227 con stub y salida 1 |
| Ida y vuelta | `node --env-file=backend/test/.env.test --test backend/test/mantenimientoVolcado.test.mjs` | **1 test, 1 pasa, 0 fallan, 0 omitidas**, `EXIT 0`; volcado de 4 492 bytes, dos restauraciones, procedimiento y evento `DISABLED` presentes |
| 1227 real | Volcado nuevo de `conta_hogar` restaurado con `timon_test` en `conta_hogar_o06_destino_test` | `ERROR 1227 (42000) at line 798: Access denied; you need (at least one of) the SET USER privilege(s) for this operation`; `ErrorDeNegocio` 409 `RESTAURACION_SIN_SET_USER`; copia previa conservada y borrada |
| Volcado real | `mysqldump --routines --events` de `conta_hogar` y restauración con `timon_admin` en `conta_hogar_o06_real_test` | **57 846 bytes; 2 procedimientos y 2 eventos**, todos `DEFINER=root@%`; los dos eventos `ENABLED`; base efímera borrada (`conta_hogar%` solo deja `conta_hogar`) |
| Reglas | `node scripts/comprobar-reglas.mjs` | `EXIT 0`; los bloques con centinelas son idénticos |
| Diff | `git diff --check` | `EXIT 0` |
| `.db_connection` | `sha256sum backend/src/db/.db_connection` | `cffe3241e7bdbd08…` sin cambios |

## No verificado

- No se ha probado un usuario de mantenimiento con privilegios mínimos distintos de `ALL PRIVILEGES` sobre la base (no se crean usuarios en esta iteración).
- La restauración real con `timon_admin` se hizo con `SET USER` vigente; no se ha probado un usuario de mantenimiento sin `SET USER` restaurando el volcado real de `conta_hogar` (el 1227 real se probó con `timon_test`, que carece de ese privilegio).
- No se ha ejecutado la suite E2E: no hay cambios de interfaz y el clon E2E no cambia de comportamiento (solo su comentario).
- No se ha probado la restauración de un volcado con un `DEFINER` que no exista en el servidor; el error esperado es el mismo 1227.
- No se ha medido el crecimiento del volcado en una base grande; la muestra de desarrollo pasó de 44 066 a 57 846 bytes, por debajo del límite de 100 MB.

## Incidencia de verificación (no de código)

El primer script de la prueba real del 1227 importó `db_utilsConn` antes de fijar `DB_CONFIG_PATH`, así que `restoreDb` usó la configuración real y restauró el volcado en `conta_hogar` en lugar de la base destino. El volcado era de la propia `conta_hogar`, tomado segundos antes con `--single-transaction`, y no había escrituras concurrentes (servidor E2E parado; fuera de las 03:00 y del día 1). Se comprobó que `conta_hogar` conserva 2 procedimientos, 2 eventos `ENABLED`, `event_scheduler=ON` y filas en las tablas principales. El script se corrigió para fijar `DB_CONFIG_PATH` antes de importar `db_maintenance`; la prueba repetida apuntó a `conta_hogar_o06_destino_test` y devolvió el 409 esperado. No se modificó código del repositorio por este incidente.

## Estado al preparar el informe

- Parche aplicado y comprobado; 15 ficheros modificados y 2 nuevos (este informe incluido).
- Rama `correccion/fase-3-O-06-volcados-rutinas-eventos`; sin `git add`, commit ni push (DC-47).
- El único cambio local ajeno sigue siendo `backend/src/db/.db_connection`.

## Continuidad

- Siguiente trabajo: **O-07 y O-08 juntos** (migración 0007, `DEFINER` y restauración sin `SET USER`).
- Leer el registro (O-06, O-07, O-08 y S-22), el TODO y la sección 0 del relevo.
- No asumir que S-22 puede aplicarse antes de O-08 ni que el clon E2E incluye rutinas o eventos.
