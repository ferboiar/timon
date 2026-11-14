# Informe de cierre de iteración

## Objetivo y alcance

- **O-07**: incorporar a las migraciones los objetos de esquema que solo existían en `conta_hogar` y en `doc/db/schema/optimizaciones.md` (`realizar_mantenimiento_indices` e `indice_mantenimiento_mensual`).
- **O-08**: normalizar el `DEFINER` de los cuatro objetos vivos a la cuenta que ejecuta las migraciones, manteniendo la copia y la restauración fieles (el `DEFINER` se conserva y se reproduce).
- **DC-60**: decisión de copia y restauración fieles y de objetos de esquema nacidos en migraciones.
- Inclusiones: migración 0007, prueba `mantenimientoEsquema.test.mjs`, mensaje 409, documentación y seguimiento.
- Exclusiones: despliegue de la 0007 en `conta_hogar`, retirada de `SET USER` (S-22), cambios de interfaz y ampliaciones funcionales.

## Base

- Rama `correccion/fase-3-O-07-O-08-definer-objetos-esquema`, sobre `main` en `39036d6`.
- PR #86 de O-06 fusionado (merge `f6e36c2`); el corte de partida es `39036d6`, seguimiento documental de DC-52.
- Único cambio local ajeno: `backend/src/db/.db_connection`, no tocado; sha256 `cffe3241e7bdbd082ac15bfea36885c94ea7153613bfe01aa7f7b38081bf15ac`.

## Cambios

- **`backend/src/db/migrations/0007_objetos_esquema_definer.sql`** (nuevo): recrea los cuatro objetos sin cláusula `DEFINER`; es repetible; el evento mensual usa `Europe/Madrid`, `NOT PRESERVE`, `STARTS` futuro y `ENABLED`; el horario usa `+00:00`, `PRESERVE`, `START` futuro y `ENABLED`. El cuerpo de `generar_recibos_anio` es idéntico a la 0004 (`diff` = 0).
- **`backend/test/mantenimientoEsquema.test.mjs`** (nuevo): tres casos: (1) la 0007 crea los cuatro objetos con el `DEFINER` del ejecutor y es repetible; (2) el volcado conserva el `DEFINER` y se restaura dos veces con la misma cuenta sin `SET USER`, con los objetos funcionando; (3) una copia con `DEFINER=root@%` no se restaura con `timon_test` y devuelve 409 `RESTAURACION_SIN_SET_USER`.
- **`backend/src/db/db_maintenance.mjs`**: JSDoc de fidelidad y O-08; el mensaje del 1227 ya no sugiere normalizar la copia, sino restaurar con la cuenta que creó los objetos o con una que tenga `SET USER`.
- **Formato**: se corrigen los avisos de prettier de `db_maintenance.mjs` y de la prueba nueva; solo formato, sin cambios de comportamiento.
- **Documentación**: `db_maintenance.md` (fidelidad), `generar_recibos_anio.md`, `optimizaciones.md`, `schema/index.md` (regla de objetos de esquema), `routes/mantenimientoDB.md`, `entorno-pruebas.md`, `backend/test/README.md`, `e2e/README.md` y el comentario de `prepara-base-pruebas.mjs`.
- **Seguimiento**: O-07 y O-08 cerrados y desplegados; DC-60 registrada; S-22 pendiente de evaluación (no se ejecuta).

## Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| `TODO` | Sí | Sí | Cierre de O-07/O-08, DC-60 y S-22 |
| `doc/mantenimiento/registro-hallazgos_1de3.md` | Sí | Sí | DC-60 |
| `doc/mantenimiento/registro-hallazgos_3de3.md` | Sí | Sí | O-07, O-08 y S-22 |
| `doc/mantenimiento/estado-del-proyecto_1de3.md` | Sí | Sí | Sección 0, migraciones y IDs |
| `doc/mantenimiento/estado-del-proyecto_2de3.md` | Sí | Sí | Sección 5 y pendiente |
| `doc/mantenimiento/informes_iteraciones/index.md` | Sí | Sí | Alta del informe |
| `doc/db/db_maintenance.md` | Sí | Sí | Fidelidad y O-08 |
| `doc/db/generar_recibos_anio.md` | Sí | Sí | Copia con el DEFINER del ejecutor |
| `doc/db/schema/optimizaciones.md` | Sí | Sí | Objetos en la 0007 |
| `doc/db/schema/index.md` | Sí | Sí | Regla de objetos de esquema |
| `doc/routes/mantenimientoDB.md` | Sí | Sí | Mensaje del 409 |
| `doc/pruebas/entorno-pruebas.md` | Sí | Sí | Bases O-08 |
| `backend/test/README.md` | Sí | Sí | Prueba y permisos O-08 |
| `e2e/README.md` | Sí | Sí | Motivo del clon sin rutinas |
| `e2e/scripts/prepara-base-pruebas.mjs` | Sí | Sí | Comentario del clon |

## Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Sonda de definer | `conta_hogar_test`; `timon_admin` crea `o08_sonda_p` y `o08_sonda_e` con `DEFINER='root'@'%'`; `timon_test` los reemplaza con `CREATE OR REPLACE` | Antes: `root@%`, evento `DISABLED`. Después: `timon_test@172.20.0.%`, evento `DISABLED`. Sin `SET USER`. Se elige `CREATE OR REPLACE`. |
| Migración por CLI | Base efímera `conta_hogar_o08_debug_test`; 0001-0006 y 0007 con el cliente | 0007 en **2,047 s**, `EXIT 0`; 2 procedimientos y 2 eventos con `DEFINER=timon_test@172.20.0.%`, eventos `ENABLED`. Base eliminada. |
| Sintaxis | `node --check` de `db_maintenance.mjs`, `e2e/scripts/prepara-base-pruebas.mjs` y la prueba | `EXIT 0` |
| ESLint | `npx eslint backend/src/db/db_maintenance.mjs backend/test/mantenimientoEsquema.test.mjs` | **0 errores y 0 avisos**. `e2e/**` está excluido por O-05. |
| Formato E2E | `npx eslint --no-ignore e2e/scripts/prepara-base-pruebas.mjs` | Antes: 7 avisos de prettier. Después: **0 avisos, 0 errores**; `node --check` `EXIT 0`; solo espacios y saltos (commit `fe830f6`). |
| Prueba nueva (aislada) | `node --env-file=backend/test/.env.test --test backend/test/mantenimientoEsquema.test.mjs` | **3 tests, 3 pasan, 0 fallan, 0 canceladas, 0 omitidas**, 200,8 s; `ok 1` y `# fail 0`. |
| Suite del backend | `npm run test:backend:local` (sin servidor E2E vivo) | **359 tests, 72 suites, 359 pasan, 0 fallan, 0 canceladas, 0 omitidas, 0 todo**, `EXIT 0`, 457,8 s. |
| Reglas | `node scripts/comprobar-reglas.mjs` | `EXIT 0`; bloques con centinelas idénticos. |
| Diff | `git diff --check` | `EXIT 0` |
| `.db_connection` | `sha256sum backend/src/db/.db_connection` | `cffe3241e7bdbd082ac15bfea36885c94ea7153613bfe01aa7f7b38081bf15ac`, sin cambios. |
| Limpieza | `SHOW DATABASES LIKE 'conta_hogar%'` y temporales | Solo queda `conta_hogar`; sin `timon-o08-*` ni `timon-pre-restore-*`. |

## Despliegue (2026-11-14)

- PR #87 fusionado con merge `0be3216a6c94dc9807112e88c702eeecb44a0f2e`; `main` contiene la 0007.
- Aplicada como `timon_admin`: `EXIT 0`.
- Antes: 2 procedimientos y 2 eventos con `DEFINER=root@%`; eventos `ENABLED`; `STARTS` 2025-06-01 03:00 (mensual) y 2026-10-23 00:00 (horario).
- Después: 2 procedimientos y 2 eventos con `DEFINER=timon_admin@172.20.0.%`; eventos `ENABLED`; `STARTS` 2026-12-01 03:00 (mensual, Europe/Madrid) y 2026-11-15 00:00 (horario, +00:00); `root@%` = 0.
- Recuentos antes y después iguales: users 4, recibos 27, fechas_cargo 70, ahorros 6, ahorros_movimientos 4, anticipos 13, anticipos_pagos 75, cuentas 8, categorias 9, presupuestos 0, presupuesto_periodos 0, mantenimiento_logs 15, ajustes_sistema 2, users_style_preferences 3.
- `CALL generar_recibos_anio(1, 1, '2026-12-01 03:00:00')` en simulación: 15 filas proyectadas; recuentos sin cambios (no escribe).
- Volcado nuevo: 58 000 bytes; 2 procedimientos, 2 eventos, 4 `DEFINER=timon_admin@172.20.0.%`, 0 `root@%`, eventos `ENABLE`.
- Restauración a) con `timon_admin` en `conta_hogar_o08_admin_test`: `EXIT 0`; 2 procedimientos y 2 eventos, definers y `ENABLED` conservados; 14 tablas.
- Restauración b) con `timon_test` (sin `SET USER`) en `conta_hogar_o08_restore_test`: 409 `RESTAURACION_SIN_SET_USER` (1227 real); la copia previa se conserva. Es el comportamiento esperado.
- Copia previa del despliegue: `/tmp/o0708-pre-0007-20261114T102342Z.sql` (57 846 bytes, `DEFINER=root@%`), conservada para decisión del usuario.

## S-22: evaluación (sin ejecutar)

- Condiciones: 0007 desplegada (`0be3216`), volcado nuevo sin `root@%` y restauración con `timon_admin` correcta. La prueba literal sin `SET USER` no se ha ejecutado; se propone abajo.
- Copias antiguas con `DEFINER=root@%`: solo `/tmp/o0708-pre-0007-20261114T102342Z.sql` (57 846 bytes, 2026-11-14 10:23). El resto de `.sql` en `/tmp` no contiene definers `root@%`.
- Opciones:
  1. Mantener `SET USER` indefinidamente: conserva la restauración de la copia previa con `timon_admin`; mantiene un privilegio global.
  2. Revocar tras descartar o convertir la copia previa: elimina el privilegio; se pierde la copia de reversión con `root@%` o hay que reconvertirla.
  3. Revocar y exigir `root` para la copia previa: conserva la copia; las copias nuevas se restauran con `timon_admin`; la copia antigua se restaura con `root` o con una reposición temporal de `SET USER`.
- Recomendación: **opción 3** si se mantiene la copia previa y hay acceso a `root`; **opción 1** si no se quiere tocar privilegios todavía; **opción 2** solo si se acepta descartar la copia previa.
- Procedimiento propuesto para la opción 3 (no ejecutado):

```sql
SHOW GRANTS FOR 'timon_admin'@'172.20.0.%';
REVOKE SET USER ON *.* FROM 'timon_admin'@'172.20.0.%';
FLUSH PRIVILEGES;
```

Después, restaurar el volcado nuevo en `conta_hogar_o08_admin_test` con `timon_admin` (sin `SET USER`). Si falla, reponer de inmediato:

```sql
GRANT SET USER ON *.* TO 'timon_admin'@'172.20.0.%';
FLUSH PRIVILEGES;
SHOW GRANTS FOR 'timon_admin'@'172.20.0.%';
```

La copia previa con `root@%` se restauraría con `root` (o con una reposición temporal de `SET USER`).

## Incidencia de verificación (no de código)

Durante la primera tanda quedaron vivas dos suites antiguas del backend (procesos de días anteriores) que competían por `conta_hogar_test` y las bases `*_test`; una prueba falló con `Unknown database` y otra se quedó esperando un bloqueo de metadatos. Se identificaron con `ps`, se detuvieron todos los procesos de prueba, se limpiaron las bases `*_test` y los temporales, y se repitió la suite con una sola instancia. El resultado citado es el de esa ejecución limpia. En la primera ejecución posterior al despliegue, dos copias `timon-pre-restore-*` de las restauraciones de comprobación hicieron fallar `mantenimientoCredenciales`; se limpiaron y se repitió la suite. No se modificó código por estas incidencias.

## No verificado

- La 0007 se ha desplegado y verificado en `conta_hogar` el 2026-11-14 (merge `0be3216`).
- No se revoca `SET USER`: S-22 queda pendiente de evaluación y decisión. La restauración del volcado nuevo se ha hecho con `timon_admin` con `SET USER` vigente; la restauración con `timon_test` (sin el permiso) falla con 409 como se espera.
- No se ejecuta la suite E2E: no hay cambios de interfaz.
- Las copias antiguas con `DEFINER=root@%` siguen necesitando `SET USER` o `root`; es inherente a la fidelidad y no se prueba a restaurarlas con `timon_admin` sin `SET USER` en este PR.

## Estado al preparar el informe

- PR #87 fusionado con merge `0be3216` (2026-11-14); 0007 desplegada y verificada en `conta_hogar`.
- Documentación de despliegue preparada en la rama `mantenimiento/O-07-O-08-despliegue-0007`; pendiente de commit y PR.
- El único cambio local ajeno sigue siendo `backend/src/db/.db_connection`.

## Continuidad

- Siguiente trabajo: evaluar y decidir S-22; después S-04, S-05 y S-11.
- Leer el registro (S-22 y DC-60), el TODO y la sección 0 del relevo.
- No asumir que S-22 puede retirarse sin la prueba literal y la decisión sobre la copia previa con `root@%`.
