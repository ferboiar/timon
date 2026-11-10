## Informe de cierre de iteración

### Objetivo y alcance

- **DC-47**: reglas de proceso de edición de ficheros y de publicación y fusiones, con dos bloques delimitados por centinelas, texto íntegro e idéntico en la instrucción persistente y copia deliberada en `.cline/rules`, excepción explícita en el apartado 12 y prueba automática de divergencia.
- **Inclusiones**: los dos bloques (apartado 6 parte 3; apartado 3 parte 2, sustituyendo la frase «No abras, fusiones ni borres ramas remotas sin autorización específica»); la copia en `.cline/rules/00-timon-obligatorio.md` sin `paths`; la excepción del apartado 12; la retirada de la mención del apartado 7; la baja de `.github/copilot-instructions.md`; la fila DC-47 y la viñeta del plan §10; `scripts/comprobar-reglas.mjs`; `backend/test/reglas.test.mjs`; `e2e/tests/documentacionReglas.spec.mjs` y su alta en `e2e/scripts/mapa-fuentes.mjs` y `e2e/package.json`, y filas en `doc/pruebas/e2e.md` y `e2e/README.md`; relevo §0/§2/§4; `TODO`; este informe y su fila en el índice; la corrección de la línea 74 del registro y el orden del índice de informes.
- **Exclusiones**: hook `pre-commit` (no se le añade el comprobador), `package.json` raíz, `doc/index.md`, `docNavigation`, los specs E2E existentes (no cubren esta tarea), las menciones históricas a `copilot-instructions.md` (D-08, D-10 y 16 informes) y cualquier cambio de código, esquema o datos de la aplicación.
- **Interpretación C-1 acordada**: la regla de publicación rige lo que ejecuta el asistente; el bloque de cierre de Fase B del apartado 3 lo ejecuta el usuario, que con ello autoriza su `commit` y su `push`. El apartado 3 no se modifica salvo el bloque de publicación.
- **Autonomías de verificación acordadas**: pruebas de interfaz con la suite E2E, creando los specs necesarios y sin obligación de ejecutar los existentes; y ejecución de `npm run test:backend:local` con `backend/test/.env.test` (DC-46), sin pedir la contraseña y citando siempre las cifras y el código de salida.

### Base

- Rama `mantenimiento/DC-47-reglas-edicion-y-publicacion`, creada desde `main` en `943ca69`.
- PR anterior: **#75 (D-32), fusionado**; comprobado con `gh pr view 75 --json state,mergedAt,mergeCommit` → `MERGED`, `2026-11-10T09:11:19Z`, merge `943ca692285d0090f78c46b592f79c52049b6b0f`.
- Cambios locales conocidos: `backend/src/db/.db_connection` modificado (`Bin 160 -> 148 bytes`, cifrado). **No se prepara ni se descarta** y queda fuera del manifiesto.

### Cambios

- **Instrucción persistente**: bloque `regla:edicion-ficheros` en el apartado 6 (parte 3), bloque `regla:publicacion-fusiones` en el apartado 3 (parte 2, sustituyendo la frase anterior), excepción en el apartado 12 (parte 4) y retirada de `- .github/copilot-instructions.md.` del apartado 7 (parte 3).
- **`.cline/rules/00-timon-obligatorio.md`**: sección nueva con las dos copias idénticas, sin frontmatter ni `paths`.
- **`.github/copilot-instructions.md`**: baja. No se replica la regla allí; el contenido sustantivo del proyecto sigue en la instrucción persistente, el relevo y `doc/`.
- **Comprobador**: `scripts/comprobar-reglas.mjs` (extracción entre centinelas, comparación y salida 0/1) y `backend/test/reglas.test.mjs` (10 pruebas, incluidas las de divergencia simulada y la comprobación real del repositorio). No se añade al hook `pre-commit`.
- **Prueba de interfaz**: `e2e/tests/documentacionReglas.spec.mjs` (dos pruebas, sin crear ni borrar datos), con alta en `e2e/scripts/mapa-fuentes.mjs`, script `e2e:documentacion` en `e2e/package.json` y filas en `doc/pruebas/e2e.md` y `e2e/README.md`.
- **Seguimiento**: relevo §0 (cabecera, corte operativo, trabajo preparado e identificadores), §4 (fila #75); registro (fila DC-47, plan §10 y corrección de la tabla D); `TODO` (estado operativo, lista acordada 1-5 y punto de reanudación); índice de informes (fila nueva y orden descendente).
- **Correcciones sin ID nuevo**: se borra la línea 74 en blanco que partía la tabla D del registro y se reordena el índice de informes del más reciente al más antiguo.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| `doc/mantenimiento/instruccion-persistente_2de4.md` | Sí | Sí | Bloque de publicación en el apartado 3 |
| `doc/mantenimiento/instruccion-persistente_3de4.md` | Sí | Sí | Bloque de edición (apartado 6) y retirada de la mención del apartado 7 |
| `doc/mantenimiento/instruccion-persistente_4de4.md` | Sí | Sí | Excepción del apartado 12 |
| `.cline/rules/00-timon-obligatorio.md` | Sí | Sí | Copia deliberada de los dos bloques |
| `.github/copilot-instructions.md` | Sí | Sí (baja) | Tercer documento de reglas; no se replica la regla |
| `doc/mantenimiento/registro-hallazgos_1de3.md` | Sí | Sí | Fila DC-47 |
| `doc/mantenimiento/registro-hallazgos_3de3.md` | Sí | Sí | Plan §10 y corrección de la tabla D |
| `doc/mantenimiento/estado-del-proyecto_1de3.md` | Sí | Sí | §0 y §2 |
| `doc/mantenimiento/estado-del-proyecto_2de3.md` | Sí | Sí | §4, fila del PR #75 |
| `doc/mantenimiento/informes_iteraciones/index.md` | Sí | Sí | Fila nueva y orden descendente |
| `TODO` | Sí | Sí | Estado operativo, lista acordada y reanudación |
| `e2e/scripts/mapa-fuentes.mjs` | Sí | Sí | Entrada del spec nuevo |
| `e2e/package.json` | Sí | Sí | Script `e2e:documentacion` |
| `doc/pruebas/e2e.md` | Sí | Sí | Fila del spec nuevo en «Qué prueba» |
| `e2e/README.md` | Sí | Sí | Fila del spec nuevo |
| `doc/index.md` | Sí | No | Sin documento nuevo en `doc/` |
| `docNavigation` (`Tech-documentation.vue`) | Sí | No | Sin documento nuevo que navegar |
| `backend/test/README.md` | Sí | No | No cambia el entorno ni el comando de la suite |
| `package.json` y `package.json.md` | Sí | No | El comprobador se ejecuta con `node scripts/…` |
| `README.md`, `README_en.md` | Sí | No | No describen estas reglas ni el fichero retirado |
| `scripts/hooks/pre-commit` | Sí | No | Decisión: el comprobador no entra en el hook en este PR |

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Sintaxis de los módulos y scripts | `node --check` de los cuatro ficheros nuevos y de los scripts de `/tmp` | Salida vacía, exit 0 |
| Centinelas | `grep -c` de apertura y cierre en las tres ubicaciones | 1 apertura y 1 cierre por bloque y fichero |
| Divergencia | `node scripts/comprobar-reglas.mjs` | `regla edicion-ficheros: idéntica en 2 ficheros (6 líneas)`; `regla publicacion-fusiones: idéntica en 2 ficheros (6 líneas)`; `Reglas coherentes…`; `EXIT:0` |
| Prueba unitaria | `node --test backend/test/reglas.test.mjs` | `# tests 10`, `# pass 10`, `# fail 0`, `# cancelled 0`; exit 0 |
| Suite del backend (DC-46) | `npm run test:backend:local` | `# tests 268`, `# pass 268`, `# fail 0`, `# cancelled 0`, `# skipped 0`, `# todo 0`, `duration_ms 124828.5`; `EXIT:0` |
| Prueba de interfaz | `cd e2e && npm run e2e -- tests/documentacionReglas.spec.mjs` | Primera ejecución: `1 failed`, `1 passed`, `EXIT:1` (mi aserción buscaba `gh pr merge` en una viñeta y está en el párrafo de la regla). Corregida la aserción y repetida: `✓` las dos, `2 passed (24.8s)`, `EXIT:0` |
| Fichero eliminado | `test ! -e .github/copilot-instructions.md` | Ausente, exit 0; `git status` lo marca como `D` |
| Sin referencias normativas | `grep -c 'copilot' doc/mantenimiento/instruccion-persistente_3de4.md` | `0` |
| Tabla D del registro | `awk` de adyacencia D-26/D-27 | `adyacentes` |
| Orden del índice | `grep` de fechas + `sort -c -r` | `EXIT:0` (descendente) |
| Filas del índice | `grep -c '^| 2026-'` | `38` (antes 37) |
| Fila DC-47 | `grep -c '^| DC-47 |'` | `1` |
| Spec mapeado | `grep -c 'documentacionReglas'` en los cuatro ficheros | `1` en cada uno |
| Lint | `npx eslint scripts/comprobar-reglas.mjs backend/test/reglas.test.mjs` | Sin salida, exit 0 (los cuatro avisos de `prettier` iniciales se corrigieron con el ayudante, no con `--fix`) |
| Espacios | `git diff --check` | Sin salida, exit 0 |
| Cifrado | `node scripts/comprobar-cifrado.mjs --indice` | `Cifrado: correcto (rutas de .gitattributes cifradas y ningún secreto en claro en lo revisado).`; exit 0 |

### No verificado

- **Specs E2E existentes**: no se ejecutan. No cubren esta tarea y su ejecución no aportaría evidencia sobre DC-47; quedan como estaban.
- **Lint de `e2e/**`**: `eslintrc` excluye ese directorio (`ignorePatterns`), así que el spec nuevo no pasa por ESLint. Su comprobación es la ejecución real del propio spec.
- **Prueba manual adicional**: no se ha hecho ninguna fuera del spec E2E. La comprobación de pantalla de esta tarea es la que hace el spec (centinelas invisibles, bloques pintados y títulos de parte presentes).
- **Publicación**: no hay commit, push ni PR; la Fase B no se ha ejecutado.

### Estado al preparar el informe

- Parche: aplicado con `dev/utils/ayudas.mjs` en tres tandas (4 + 6 + 4 ficheros), más tres correcciones puntuales con el mismo ayudante (comentario del spec, expectativas de dos pruebas y formato de `prettier`). Todos con `--check` válido antes de `--apply`.
- Ficheros nuevos creados con `cat`: comprobador, test, spec e informe.
- Baja de `.github/copilot-instructions.md` con `rm`, autorizada por nombre.
- Verificación: suite del backend 268/268, prueba unitaria 10/10 y spec E2E 2/2 en verde; lint, espacios y cifrado correctos.
- Rama y archivos: 19 entradas (4 nuevas, 14 modificadas, 1 baja); `.db_connection` fuera.
- Bloqueos o excepciones: ninguno abierto. La primera ejecución del spec falló por una aserción mal planteada, no por la aplicación; se corrigió y se repitió.

### Continuidad

- **Siguiente trabajo**: 1) DC-47 (este PR), 2) S-17 (prueba E2E de sesión caducada), 3) U-15 (prueba de comportamiento de F-30 con un recibo `e2e_trimestral_…`), 4) retirada de `admin:public_key` del token de `gh` (manual, con OAuth) y 5) limpieza de las 9 ramas locales fusionadas, solo con confirmación expresa. Ya hecho: la descripción del PR #70. Después de esa lista, la siguiente tarea oficial es S-01/S-06/S-12.
- **Qué leer**: la fila DC-47 del registro, la sección 0 del relevo y los dos bloques de la instrucción persistente. Para tocar código, `backend/test/README.md` y `doc/pruebas/e2e.md`.
- **Qué no asumir**: que este PR esté fusionado (está preparado); que el hook `pre-commit` compruebe la divergencia (no lo hace todavía); que las menciones históricas a `.github/copilot-instructions.md` estén limpias (se dejaron a propósito); ni que los specs E2E existentes se hayan ejecutado.
