## Informe de cierre de iteración

### Objetivo e IDs

- **D-32**: consolidar el seguimiento de los PR #69 a #74 tras una auditoría que encontró defectos de proceso y de documentación. Sin cambios de código, esquema ni comportamiento.
- Defectos corregidos: relevo y TODO desfasados; identificadores libres con **D-31** ya usado; **D-31 sin fila** en el registro; registro sin número de PR; plan §10 con ramas en vez de PRs; **falta el informe del PR #73**; apartado 10 de la instrucción persistente incoherente con DC-46 y con la lista de rutas cifradas; y la frase que llamaba «secreto» a la contraseña de pruebas.
- Defectos de proceso que se dejan registrados (no se corrigen aquí): **fusiones sin esperar a los checks**: los seis PR se fusionaron entre 10 y 46 s después de crearse (#69: 10 s, #70: 46 s, #71: 10 s, #72: 12 s, #73: 18 s, #74: 40 s); **prueba E2E de sesión caducada omitida** en S-16 y **cobertura de comportamiento de F-30 rebajada** a una guarda estática, ambas sin consultarlo; y el token de `gh` con el scope `admin:public_key`, innecesario.
- Hallazgos nuevos registrados, **no implementados**: **S-17** (falta la prueba E2E de sesión caducada de S-16) y **U-15** (F-30 sin prueba de comportamiento).

### Archivos

- `doc/mantenimiento/estado-del-proyecto_1de3.md` (§0, §2 y trabajo en curso).
- `doc/mantenimiento/estado-del-proyecto_2de3.md` (§4 con las filas #69 a #74 y §5).
- `doc/mantenimiento/registro-hallazgos_1de3.md` (DC-46 con sus PR y la aclaración de que la contraseña de pruebas no es un secreto).
- `doc/mantenimiento/registro-hallazgos_2de3.md` (F-48 y F-30/F-31 con su PR).
- `doc/mantenimiento/registro-hallazgos_3de3.md` (S-16 con su PR; filas nuevas **D-31**, **D-32**, **S-17** y **U-15**; plan §10).
- `doc/mantenimiento/instruccion-persistente_4de4.md` (apartado 10: vía preferente y lista de rutas cifradas).
- `doc/pruebas/entorno-pruebas.md` (la contraseña de pruebas no es un secreto del proyecto).
- `doc/mantenimiento/informes_iteraciones/2026-11-10_D-31_informes-retroactivos.md` (nuevo).
- `doc/mantenimiento/informes_iteraciones/2026-11-10_D-32_consolidar-seguimiento.md` (**nuevo, este informe**).
- `doc/mantenimiento/informes_iteraciones/index.md` (dos filas).
- `TODO` (estado operativo y lista ordenada).

### Verificación

| Comprobación | Comando | Resultado |
|---|---|---|
| IDs libres comprobados contra el registro antes de asignar | `grep -h '^| ID '` de S-16, S-17, U-14, U-15, F-48, F-49, D-31, D-32 y D-33 | S-16, U-14, F-48, D-31 y D-32 existen; S-17, U-15, F-49 y D-33 estaban libres |
| Filas nuevas en el registro | `grep -c '^| S-17 |'` y `^| U-15 |` | 1 y 1 |
| Filas D-31 y D-32 | `grep -c '^| D-3[12] |'` | 1 y 1 |
| Registro con PR en cada fila tocada | `grep` de `PR #69`, `#70 y #71`, `#72`, `#74` | Presentes en F-48, DC-46, S-16 y F-30/F-31 |
| Relevo §4 | `grep -c '^| #'` | 56 filas (50 + 6) |
| Identificadores libres tras usar S-17 y U-15 | `grep` del relevo §2 | `DC-47, D-33, F-49, S-18, R-14 y U-16` |
| Formato abreviado de los dos informes | `grep -n '^## \|^### '` | Título exacto y las cuatro secciones en orden |
| Frase del «secreto» | `grep -c 'contiene un secreto'` en `doc/pruebas/entorno-pruebas.md` | 0 |
| Espacios y cifrado | `git diff --cached --check` y `comprobar-cifrado.mjs --indice` | `EXIT:0` y «Cifrado: correcto… ningún secreto en claro» |
| Sin cambios de código | `git diff --cached --name-only` | Solo `doc/` y `TODO` |

### Continuidad

- **PR pendiente con Fase A, uno por hallazgo**: S-17 (prueba E2E de sesión caducada) y U-15 (prueba de comportamiento de F-30 con un recibo `e2e_trimestral_…`, crear y borrar).
- **DC-47, planificado** (PR propio después de fusionar D-32 y sincronizar `main`): dos reglas con texto íntegro en la instrucción persistente (edición de ficheros en el apartado 6, publicación y fusiones en el apartado 3) y **copia deliberada** en `.cline/rules/00-timon-obligatorio.md`, con excepción explícita en el apartado 12 y la prueba de divergencia `scripts/comprobar-reglas.mjs` + `backend/test/reglas.test.mjs` (sin añadirla al hook `pre-commit` en ese PR). La regla de publicación incluye `git commit`, `git push`, `git push origin --delete`, `gh pr create`, `gh pr edit`, `gh pr merge` y el borrado de ramas locales y remotas.
- Qué no asumir: que los commits y PR ya fusionados se reescriban; que el token de `gh` tenga solo los scopes necesarios; ni que las fusiones de la tanda anterior respetaran la espera de los checks.
