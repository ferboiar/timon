# Informe de cierre de iteración

## Objetivo y alcance

- **D-36**: auditar y sincronizar la documentación de mantenimiento (TODO, registro de hallazgos y relevo) con el código, las pruebas y los PR reales, tras la fusión del PR #81.
- Alcance: TODO, las tres partes del registro, las partes 1 y 2 del relevo, nueve documentos técnicos de `doc/` y el índice de informes. Filas nuevas: F-49, F-53, F-54, F-55, S-20 a S-22, O-03, O-04, U-20, U-21, D-36 a D-39 y DC-52/DC-53.
- Exclusiones: código de la aplicación, esquema, migraciones, pruebas destructivas, `backend/src/db/.db_connection` y su copia. Sin commit, push, PR ni borrado de ramas.

## Base

- `main` en c07aed8 (2026-11-11), merge del PR #81 (F-50, F-22, F-52, F-43, F-42, F-41, F-10, D-35, DC-50 y DC-51).
- Cambio local ajeno y excluido: `backend/src/db/.db_connection`.
- **Confirmación V ejecutada el 2026-11-11** (solo lectura, con el cargador del backend): la migración 0006 está aplicada en `conta_hogar` (`uq_categorias_nombre` único y `modificado_por` con FK `ON DELETE SET NULL` en recibos, ahorros, anticipos y presupuestos); `SHOW GRANTS` confirma `SET USER` global de `timon_admin`; el `SELECT` de O-04 devolvió 0 filas.

## Cambios

- **TODO**: reescrito (207 líneas): §0 al corte #81, prioridad técnica actualizada, backlog completo por prioridad, historial de los PR #14 a #81 con fecha real de fusión, preguntas abiertas y verificaciones pendientes. U-15, U-16 y U-17 cerrados; O-04 no aplicable; F-15 pendiente de código; F-10 unificado como hecho; D-33 añadido al PR #79.
- **Registro, parte 1**: §0 a D-36; DC-02 actualizada a la migración 0006; tabla DC unificada (53 filas) y DC-39 escapado; DC-52 y DC-53 añadidas.
- **Registro, parte 2**: F-49 a F-55 con 5 columnas; F-50 y F-52 actualizadas a corregido en el PR #81; 55 filas F.
- **Registro, parte 3**: S-20 a S-22, O-03, O-04, U-20, U-21 y D-36 a D-39; S-05 parcial; U-02 relacionado con U-20; U-16/U-17 con el PR #79; las 60 filas U/D quedan con 3 columnas.
- **Relevo, parte 1**: §0 al corte #81, siguiente bloque de seguridad y pendientes operativos.
- **Relevo, parte 2**: §4 con #36, #37 y #81; §5 al siguiente bloque.
- **Documentación técnica**: `db_utilsCats.md`, `Categories.md`, `routes/auth.md`, `auth/TokenExpiration.md`, `composables/useAuth.md`, `db_utilsUsers.md`, `db_utilsAdv.md`, `components/Advances.md` y `components/Savings.md` (índice 0006, 401, interceptor activo, matriz DC-48, `VARCHAR(100)`, permisos `no/lectura/escritura`, F-46 #55 y F-16/F-28 corregidos).
- **Índice de informes**: alta del informe del PR #74, que faltaba, y de este informe.

## Documentación revisada

| Archivo | Revisado | Modificado | Motivo |
|---|---|---|---|
| `TODO` | Sí | Sí | Estado, backlog e historial |
| `registro-hallazgos_1de3.md` | Sí | Sí | §0, DC-02, DC-39, DC-52/DC-53 |
| `registro-hallazgos_2de3.md` | Sí | Sí | F-49 a F-55 |
| `registro-hallazgos_3de3.md` | Sí | Sí | S-20 a S-22, O-03/O-04, U-20/U-21, D-36 a D-39 |
| `estado-del-proyecto_1de3.md` | Sí | Sí | §0 |
| `estado-del-proyecto_2de3.md` | Sí | Sí | §4 y §5 |
| `estado-del-proyecto_3de3.md` | Sí | No | Relevo histórico; no se reescribe |
| Nueve documentos técnicos | Sí | Sí | Desincronizaciones descritas arriba |
| `informes_iteraciones/index.md` | Sí | Sí | #74 y D-36 |
| `README.md`, `README_en.md` | No | No | Sin cambios que les afecten |

## Ficheros del PR

- `TODO`
- `doc/auth/TokenExpiration.md`
- `doc/components/Advances.md`
- `doc/components/Categories.md`
- `doc/components/Savings.md`
- `doc/composables/useAuth.md`
- `doc/db/db_utilsAdv.md`
- `doc/db/db_utilsCats.md`
- `doc/db/db_utilsUsers.md`
- `doc/mantenimiento/estado-del-proyecto_1de3.md`
- `doc/mantenimiento/estado-del-proyecto_2de3.md`
- `doc/mantenimiento/informes_iteraciones/2026-11-11_D-36_auditoria-sincronizacion.md`
- `doc/mantenimiento/informes_iteraciones/index.md`
- `doc/mantenimiento/registro-hallazgos_1de3.md`
- `doc/mantenimiento/registro-hallazgos_2de3.md`
- `doc/mantenimiento/registro-hallazgos_3de3.md`
- `doc/routes/auth.md`

## Verificación

| Comprobación | Comando | Resultado |
|---|---|---|
| Ayudante, lote 1 (TODO) | `--check` y `--apply` | `EXIT:0`; 1 fichero; copia previa |
| Ayudante, lotes 2 a 6b | `--check` y `--apply` | `EXIT:0` en cada lote; copias previas en `/tmp/timon-ayudas-backup-*` |
| Tabla DC | `grep -c '^| DC-'` y `awk -F'|'` | 53 filas; 4 campos por fila |
| Tabla F | `awk -F'|'` | 55 filas; 7 campos (5 columnas) |
| Tablas U/D | `awk -F'|'` | 60 filas; 5 campos (3 columnas) |
| Tabla §4 del relevo | `awk -F'|'` | 5 campos (3 columnas); #36, #37 y #81 |
| Frases obsoletas | `grep -c` | 0 en TODO y en los documentos técnicos corregidos |
| Espacios y finales | `git diff --check` | `EXIT:0` |
| Base viva (V) | `SHOW CREATE TABLE`, `information_schema`, `SHOW GRANTS` y `SELECT` | 0006 aplicada; O-04 sin filas |

## No verificado

- No se ejecutaron `npm run test:backend:local` ni `npm run e2e`: son posteriores y requieren autorización separada.
- El PR #82 publica este informe; su fusión no se declara hasta verificarla.
- F-15 sigue pendiente de código (`db_utils.mjs:140` y `:168`); F-55 está confirmado por lectura y por la base viva, no reproducido con una petición.
- DC-53 está aprobada como decisión, pero no se ha aplicado retroactivamente a los PR ya fusionados.

## Estado al incorporar el informe

- PR #82: 16 ficheros existentes modificados y este informe nuevo (17 en total). SHA de fusión pendiente de registrar (DC-52).
- Sin bloqueos. `backend/src/db/.db_connection` sigue fuera del conjunto.

## Continuidad

- Después de fusionar el PR #82: `npm run test:backend:local` y el PR de código de F-15.
- Después: `npm run test:backend:local`, el PR de código de F-15 y el bloque de seguridad (S-02/S-03 con DC-06, S-04, S-05, S-11 y S-21).
- No asumir que las pruebas están ejecutadas ni que F-49, F-53 o F-54 existan ya en código.
