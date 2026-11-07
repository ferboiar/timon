## Informe de cierre de iteración

### Objetivo e IDs

- D-29: sincronizar el seguimiento tras la fusión de los PR #65 (D-28), #66 (S-09 y DC-45) y #67 (S-15).
- Inclusiones: relevo §0 (cabecera, corte operativo, siguiente trabajo, trabajo preparado e identificadores libres), §2, §4 (filas #65 a #67) y §5; registro §0, S-09 y S-15 como cerrados o corregidos, D-28 como incorporado, plan de la sección 10 y fila nueva D-29; TODO; este informe y su índice.
- Exclusiones: código, `scripts/`, `e2e/.env`, `.db_connection`, `.db_connection.backup` y las ramas remotas (se borran aparte). No se reescriben informes de PR anteriores.

### Archivos

- `doc/mantenimiento/estado-del-proyecto_1de3.md` (§0 y §2).
- `doc/mantenimiento/estado-del-proyecto_2de3.md` (§4 y §5).
- `doc/mantenimiento/registro-hallazgos_1de3.md` (§0).
- `doc/mantenimiento/registro-hallazgos_3de3.md` (S-09, S-15, D-28, plan §10 y D-29 nueva).
- `TODO` (punto de reanudación y estado operativo).
- `doc/mantenimiento/informes_iteraciones/2026-11-06_D-29_sincronizacion-post-pr66-67.md` (**nuevo**, este informe).
- `doc/mantenimiento/informes_iteraciones/index.md` (fila de este informe).

### Verificación

| Comprobación | Comando | Resultado |
|---|---|---|
| D-29 una sola vez y en la tabla §7 | `grep -c '^| D-29 '` del registro | 1, entre D-28 y la sección 8 |
| Sin pendientes obsoletos de S-09, S-15 y D-28 | `grep` de sus filas | S-09 «Cerrado (PR #66)», S-15 «Corregido (PR #67)», D-28 «incorporado (PR #65)» |
| Identificadores libres coherentes | relevo §2 | `DC-46, D-30, F-49, S-16, R-14 y U-14` |
| Fechas y base | relevo §0 y registro §0 | `a8bf567`; #63 a #67 enumerados |
| Espacios y manifiesto | `git diff --cached --check` | Limpio |

### Continuidad

- Siguiente trabajo: **F-30/F-31** (selección compartida de trimestrales y bimestrales y `bill.name` en el borrado de Recibos).
- Qué leer: relevo §0, las filas S-09, S-15 y D-29 del registro y la sección de secretos de `doc/pruebas/e2e.md`.
- Qué no asumir: que la imagen del devcontainer se reconstruyó con git-crypt, que el `postCreateCommand` se ejecutó o que el desbloqueo con clave está probado.
