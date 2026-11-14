# Informe de cierre de iteración

## Objetivo y alcance

- **S-22**: retirar el `SET USER` temporal de `timon_admin`, comprobar que las copias nuevas (`DEFINER=timon_admin`) se restauran sin ese privilegio y que una copia con `DEFINER='root'@'%'` falla con 1227, y documentar el cierre.
- Inclusiones: verificación de `SHOW GRANTS`, restauración literal, prueba negativa, migraciones 0001-0007 como `timon_admin`, suite, documentación y seguimiento.
- Exclusiones: cambios de datos, aplicación de migraciones a `conta_hogar`, otros privilegios y cambios de interfaz.

## Base

- `main` en `a430632` (PR #88 fusionado, merge `a430632322dce02f33a362dc61a0292a201e8262`).
- La revocación la ejecutó el administrador (`root`): `timon_admin` no tiene `GRANT OPTION` y desde el contenedor no hay acceso `root` a MariaDB (sin `.my.cnf`, `.mylogin.cnf`, socket local ni Docker).
- Único cambio local ajeno: `backend/src/db/.db_connection`, no tocado; sha256 `cffe3241e7bdbd082ac15bfea36885c94ea7153613bfe01aa7f7b38081bf15ac`.

## Cambios

- **S-22 cerrada** en la documentación: `TODO`, relevo, registro y este informe.
- **`doc/db/db_maintenance.md`**: nota para limpiar siempre los `timon-pre-restore-*` de `/tmp` tras restauraciones manuales (contienen la tabla `users`).
- **Informe de O-07/O-08**: sección de S-22 actualizada de evaluación a cierre y suite final alineada.
- Sin cambios de código ni de esquema.

## Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| `SHOW GRANTS` antes | `timon_admin`, tras la revocación del administrador | Sin `SET USER`; conserva `ALL` en `conta_hogar` y `conta\_hogar%`; sin `GRANT OPTION` |
| `SHOW GRANTS` después | `timon_admin` | Idéntico: sin `SET USER`, con `ALL`; `timon_test` sin cambios |
| Restauración literal | `restoreDb` del volcado nuevo en `conta_hogar_o08_admin_test` como `timon_admin` | `EXIT 0`; 2 procedimientos y 2 eventos; definers `timon_admin@172.20.0.%`; eventos `ENABLED`; 14 tablas |
| Prueba negativa | Volcado mínimo con `DEFINER='root'@'%'` restaurado como `timon_admin` | 409 `RESTAURACION_SIN_SET_USER` (1227 real) |
| Migraciones | 0001-0007 como `timon_admin` en `conta_hogar_o08_mig_test` | `EXIT 0`; 4 objetos con `DEFINER=timon_admin@172.20.0.%`; eventos `ENABLED`; 0 `root@%` |
| Suite del backend | `npm run test:backend:local` (una instancia) | **359 tests, 359 pasan, 0 fallan, 0 canceladas, 0 omitidas, 0 todo**, `EXIT 0`, 476,5 s |
| Reglas / diff / sha | `comprobar-reglas`, `git diff --check`, `sha256sum` | `EXIT 0`, `EXIT 0`, `cffe3241…` sin cambios |
| Copia nueva | `backupDb` | `/tmp/o0708-new-final-20261114T172129Z.sql`, 58 000 bytes, modo 600, 2 procedimientos, 2 eventos, 4 `DEFINER=timon_admin@172.20.0.%`, 0 `root@%` |
| Copia antigua | `shred -u` | `/tmp/o0708-pre-0007-20261114T102342Z.sql` descartada tras las pruebas 3 y 4 |

## Incidencia de verificación (no de código)

El primer intento de cierre se detuvo antes de revocar porque desde el contenedor no hay acceso `root` a MariaDB. El administrador ejecutó la revocación y se reanudó el cierre. No se modificó código por esta incidencia.

## No verificado

- No se ejecuta la suite E2E: no hay cambios de interfaz.
- No se prueba la restauración de la copia antigua con `root`: se descartó tras comprobar que las copias nuevas se restauran sin `SET USER` y que una copia con `root@%` falla con 1227.

## Estado al preparar el informe

- S-22 cerrada; O-07 y O-08 cerradas y desplegadas.
- `main` en `a430632`; copia nueva conservada; copia antigua descartada; solo `conta_hogar` en la base.
- Sin cambios de código; el único cambio local ajeno es `.db_connection`.

## Continuidad

- Siguiente trabajo: **S-04** desglosado; después S-05 (CORS y trazas) y S-11.
- No asumir que quedan copias antiguas con `root@%`; si aparece una, su restauración exige `SET USER` o `root`.
