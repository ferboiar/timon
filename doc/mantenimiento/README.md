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
| `npm run iter:previa` | Rama, estado y últimos commits; `git diff --check` y `git diff --cached --check`; `node --check` de los `.mjs` tocados fuera de `src/`; ESLint sin `--fix` de los `src/`, los `e2e/` (`--no-ignore` como guarda, DC-70) y los `.mjs` de `backend`, `scripts` y `dev` que cambian (DC-76); avisa de CRLF en las líneas añadidas y de cercas de código impares en `.md`, sin bloquear. |
| `npm run iter:pruebas` | Propone las pruebas por impacto. Un cambio en `src/composables`, `config`, `layout`, `router`, `service` o `utils` pide E2E completa y build. Con `-- --ejecuta` lanza las que no necesitan entorno; `--incluye-entorno` añade las de base `_test` y la E2E. |
| `npm run iter:cierre -- <tema> --ficheros a,b` | Manifiesto explícito en `/tmp/manifiesto-<tema>.txt`, `git add --` de esas rutas, rechazo de `.db_connection`, `.env` y `node_modules`, y comparación con el índice. Sin `--ficheros` solo propone y sale con código 2. |
| `npm run iter:ids` | Último ID asignado de cada familia (DC, F, S, O, U, D, R) con orden numérico, leído del registro. |

`--ejecuta` sin `--incluye-entorno` omite la E2E y las pruebas con base: esa ejecución no es verde y el script lo avisa.

> Apunte personal, fotografía a 2026-11-19, no se mantiene; la fuente de verdad son las reglas 00/01 y las skills.

## Informe: cómo se trabaja en Timón después de DC-69

Todo lo que sigue está verificado contra `main` en `34f443d` (PR #163). Cada afirmación cita la regla o skill real; lo que no está cubierto se dice en el apartado 6.

## 0. Mapa de piezas (dónde vive cada cosa)

| Pieza | Qué contiene | Cuándo se carga |
|---|---|---|
| `.cline/rules/00-timon-obligatorio.md` | rol, «Al empezar», seguridad, autorización de publicación, edición | **siempre** (3 554 B) |
| `.cline/rules/01-proceso.md` | Plan/Act, **niveles**, alcance, criterios, IDs y commits, PR y ramas | **siempre** (3 374 B) |
| `.cline/rules/30-tests.md` | bases `_test`, comandos, salida corta, selección de pruebas | por `paths` |
| `.cline/rules/40-documentacion.md` | qué doc toca cada nivel, índice, `docNavigation` | por `paths` |
| `.cline/skills/cierre-iteracion/SKILL.md` | **§0 niveles y modo autónomo**, §1 previa, §2 índice, §3 commit, §4 PR, §5 fusión | al invocarse |
| `.cline/skills/limpieza-ramas/SKILL.md` | §1 comprobar, §2 local, §3 remota, §4 ramas que sobreviven | al invocarse |
| `npm run iter:previa\|pruebas\|cierre\|ids` | pasos mecánicos (PR #161) | cuando se ejecutan |
| `.clineignore` | histórico congelado, dependencias, `tmp/`, plantilla; **no** resultados de la E2E | siempre (lectura) |

Presupuesto: **10 877 B** de reglas (límite 12 000) e **incondicionales 6 934 B** (límite 7 000).

---

## 1. Flujo LIGERO

### 1.1 Qué cuenta como ligero (lista cerrada)

Fuente: **01 «Niveles (DC-69)»** y **cierre §0**. Ligero = **no altera comportamiento observable, contratos, datos ni decisiones**, y entra en esta lista:

- typo, enlace, comentario, formato;
- doc que **no** fija decisión;
- prueba que **no** cambia comportamiento;
- dependencia **dentro de rango**.

No es ligero: lógica, API, autorización, esquema, seguridad, decisión nueva, script de proceso, dependencia con cambio de *major* o borrado de código (**01 «Niveles»**).

### 1.2 Plantilla que pega el usuario

Transcrita de **cierre-iteracion §0**, con un ejemplo real de este repo:

```text
LIGERO · errata-enlace-schema

Alcance: corregir la errata del enlace a `optimizaciones.md` en `doc/db/schema/index.md`.
Ficheros: doc/db/schema/index.md.
Verificación: npm run iter:previa; npm run iter:pruebas -- --ejecuta.

Autorizo: crear la rama mantenimiento/errata-enlace-schema, commit, push, gh pr create y
gh pr merge si los checks están en verde; después borra mantenimiento/errata-enlace-schema
en local y en remoto.

No toques registro, relevo ni issues. Si el cambio deja de ser ligero, para y avísame.
```

La línea de verificación propuesta (`iter:pruebas`) es la que de verdad cubre un cambio de documentación: sobre `doc/`, `iter:pruebas` propone **`coherenciaDocumental.test.mjs` + `reglasCline.test.mjs`** (comprobado hoy: `node scripts/iteracion.mjs pruebas --ficheros doc/db/schema/index.md`).

### 1.3 Pasos que ejecuta Cline

| # | Paso | Detalle |
|---|---|---|
| 1 | Declarar | Una frase de alcance y la lista de ficheros (**00.3**: en ligero la petición *es* el alcance; **no hay Plan previo**) |
| 2 | Rama | `git switch main && git pull --ff-only && git fetch --prune && git switch -c mantenimiento/<tema>` (**01 «PR y ramas»**) |
| 3 | Editar | Herramienta normal; `ayudas.mjs` solo si ≥3 ficheros, cambios repetidos o ancla ambigua (**00 «Edición»**) |
| 4 | `npm run iter:previa` | estado, `git diff --check` y `--cached --check`, `node --check`, ESLint de `src/` y `e2e/` con `--no-ignore`, avisos de CRLF y cercas |
| 5 | Prueba tocada | El test o spec afectado, si lo hay; con `iter:pruebas` para doc (**cierre §0**) |
| 6 | `npm run iter:cierre -- <tema> --ficheros …` | Índice = manifiesto; sin `--ficheros` solo propone y sale con 2 |
| 7 | Commit | `tipo(IDs): resumen` + cuerpo breve (**01 «IDs y commits»**) |
| 8 | PR | **Tres líneas** (qué / verificado / pendiente), etiqueta **`nivel:ligero`** (**cierre §4**) |
| 9 | Fusión | Solo si el prompt la autoriza **y los checks están en verde** (**cierre §5**) |
| 10 | Borrado | Solo la rama nombrada, local y remota (**limpieza-ramas §2-§3**) |

Ejemplo de cuerpo de PR ligero (convención, no plantilla normativa — ver hueco 6.3):

```
Qué: corrige el enlace a optimizaciones.md en doc/db/schema/index.md.
Verificado: npm run iter:previa (exit 0); coherencia 7/7 y reglas 6/6.
Pendiente: nada.
```

### 1.4 Qué autoriza el prompt y qué no

Autoriza, **literalmente** (**00 «Autorización de publicación»**): crear la rama nombrada, `git commit`, `git push`, `gh pr create` y `gh pr merge` **condicionado a checks en verde**; y el borrado de **esa** rama en local y remoto.

No autoriza: `gh pr edit`, otras ramas, issues, ni operaciones «de la misma familia» que no estén nombradas. «Continúa» o «siguiente» no autorizan publicar. `iter:cierre` nunca hace commit ni push.

### 1.5 Cuándo se reclasifica y qué se hace

**cierre §0**: si aparece un fichero fuera de lo declarado o el cambio deja de ser no observable → **se para, se avisa y se sigue como completo en la misma rama** (renombrándola si aún no está publicada). Se vuelve a Plan solo si hay que tomar una **decisión nueva**.

Además, **01 «Alcance»**: un «Pendiente» que exija registro obliga a reclasificar como completo.

---

## 2. Flujo COMPLETO

### 2.1 Qué cuenta como completo y los cinco casos intermedios

Completo (**01 «Niveles»**): lógica, API, autorización, esquema, seguridad, decisión nueva, script de proceso, dependencia con cambio de *major*, borrado de código.

Los cinco intermedios (**cierre §0**), con ejemplo real del repo:

| Caso | Nivel | Ejemplo real |
|---|---|---|
| Refactor sin cambio de comportamiento | **Completo** | `74a2d58` «Renombrar función de recálculo de pagos y actualizar rutas…» — toca función y rutas: el riesgo no lo cubre el lint |
| Prueba nueva sobre comportamiento existente | **Ligero**, pero **ejecutando** el test tocado | `4d84bbc test(S-17, U-16): prueba E2E de sesión caducada…` |
| Scripts y proceso | **Completo** | **#161** (`e099b6c`, scripts `iter:*`) y **#163** (`34f443d`, prueba de coherencia y `.clineignore`) |
| Documento que fija una decisión | **Completo** | **#162** (`fea8124`): registra DC-69 y reescribe el relevo |
| `package-lock` regenerado | **Completo** | **#154** (`7c4687c`): actualización de dependencias de S-11 |

### 2.2 Plan y aprobación 1

**01 «Plan y Act»** + **00.3**: en completo **no se edita hasta que el usuario apruebe el alcance**. El Plan entrega objetivo, IDs, base, archivos, inclusiones, exclusiones, aceptación, riesgos y verificaciones; el usuario aprueba (**aprobación 1**). Si el prompt autoriza publicar junto al plan, esa misma aprobación cubre commit + push + PR (**00 «Autorización»**, paquete «commit + push + PR»).

### 2.3 Pasos que ejecuta Cline

| # | Paso | Detalle |
|---|---|---|
| 1 | Rama | `mantenimiento/<tema>` o `correccion/fase-<n>-<tema>` (**01**) |
| 2 | Implementar | Edición normal; `ayudas.mjs` con `--check`/`--apply` si ≥3 ficheros, repetidos o ancla ambigua; después `iter:previa` y `git diff --stat` (**00 «Edición»**) |
| 3 | `npm run iter:pruebas` | Selección por impacto: núcleo de backend o `src/composables|config|layout|router|service|utils` → **suite completa o E2E completa + build**; `--ejecuta` ejecuta lo que no necesita entorno; `--incluye-entorno` añade base `_test` y E2E (**30 «Selección»**, **cierre §1**) |
| 4 | `npm run iter:cierre -- <tema> --ficheros …` | Lista explícita, rechazo de prohibidas, comparación con el índice (**cierre §2**) |
| 5 | Commit + push | `tipo(IDs)` con cada ID desglosado (**01**) |
| 6 | PR | **Tres secciones, sin tope de líneas**; `Closes #n` o `Refs #n`; etiqueta `nivel:completo`; pie de coste (**cierre §4**) |
| 7 | Checks | `gh pr view … --json state,mergeable,statusCheckRollup` y `gh pr checks` (**cierre §4**) |
| 8 | Registro/issue | Doc afectado, registro (decisión o hallazgo) e issue (**40**); el relevo **solo** si cambia una decisión vigente o el mapa |

### 2.4 Modo autónomo

**cierre §0**. Se activa **solo si el prompt lo pide** o autoriza publicar junto al plan.

- **Qué autoriza**: entre la aprobación 1 y la 2, no se pregunta nada; se encadenan implementación, pruebas, commit, push y PR. **No hay parada previa a `gh pr create`** (el título y el cuerpo se muestran al crear).
- **Paradas que mantiene**: checks en rojo, ficheros sensibles en el índice, push rechazado, divergencia con `main`, hallazgo que cambie el alcance. Lo no autorizado se sigue pidiendo aparte.
- **Qué control pierde el usuario**: la revisión del título y cuerpo **antes** de publicar, y la posibilidad de vetar el PR antes de que exista. Lo recupera en la **aprobación 2**: la revisión del PR se hace antes de fusionar; si algo no cuadra, no se fusiona y se corrige (`gh pr edit` requiere autorización propia).

### 2.5 Aprobación 2: fusión y limpieza

Condición: **checks en verde**. `gh pr merge <n> --squash` (método usado en #159, #161, #162 y #163), verificación con `gh pr view` de `MERGED`, `git switch main && git pull --ff-only`, y borrado de la rama **nombrada** (con squash, `-d` falla: `limpieza-ramas §2` autoriza `-D` si el PR consta `MERGED` y la rama está en el prompt).

---

## 3. Criterios de decisión

1. **Ante la duda, completo** (**01**, **cierre §0**).
2. La lista del ligero es **cerrada**: lo que no esté en ella, es completo.
3. Si un ligero **crece**, se reclasifica y se avisa (**1.5**).

---

## 4. Qué NO cambia respecto de antes

- **El PR del nivel completo sigue siendo la fuente de verdad**: tres secciones (`Qué hace`, `Verificado`, `Pendiente`), **sin tope de líneas**, con tablas, comandos, códigos de salida y entorno (**cierre §4**). El «detalle habitual» se conserva.
- **Rutas prohibidas**: `.db_connection`, `.db_connection.backup`, `.env*`, `node_modules`; nunca `git add -A` ni `git add .` (**00 «Seguridad»**; y `iter:cierre` las rechaza).
- **Seguridad**: nada de secretos en claro, git-crypt sin `lock`, pruebas destructivas solo contra `*_test` comprobando el destino.
- **Autorización de publicación**: sigue siendo literal y por operación (**00 «Autorización», DC-64**); la fusión y el borrado de ramas necesitan su propia autorización.
- **Documentación**: documento nuevo en `doc/index.md` y `docNavigation`; sin informes de iteración (**40**).

---

## 5. En cinco minutos, un Cline nuevo

1. Lee **00 «Al empezar»**: `git branch/status/log/rev-parse`, y el relevo (`estado-del-proyecto.md`); el registro **no** se lee entero (`iter:ids` para IDs).
2. Pregunta o deduce el nivel con **01 «Niveles»** y **cierre §0**; si duda, **completo**.
3. Ligero: pide/usa la plantilla, rama `mantenimiento/<tema>`, `iter:previa`, prueba, `iter:cierre`, PR de tres líneas con `nivel:ligero`.
4. Completo: Plan + aprobación 1; implementación; `iter:pruebas`; `iter:cierre`; PR de tres secciones con `nivel:completo`; checks; aprobación 2; fusión squash; limpieza de la rama nombrada.
5. Nunca: `git add -A`, tocar `.db_connection`, publicar sin autorización, fusionar con checks rojos o usar `--admin` sin que lo autorice el usuario.

