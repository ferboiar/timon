---
name: cierre-iteracion
description: Prepara el cierre de una iteración de Timón y publica el PR. Úsala cuando se pida cerrar la iteración, preparar o abrir el PR, hacer commit y push, fusionar, o comprobar el estado de un PR (git commit, git push, gh pr create, gh pr merge, gh pr view). No ejecuta ninguna operación de publicación sin autorización en el prompt.
---

# Cierre de iteración

Solo para el alcance ya aprobado y en modo Act. **No ejecutes ninguna operación de publicación que
el prompt no autorice**: si falta la autorización, prepara todo, muestra la lista exacta de
operaciones y espera.

## 0. Niveles y modo autónomo (DC-69)

- **Ligero**: no altera comportamiento observable, contratos, datos ni decisiones. Lista cerrada:
  typo, enlace, comentario, formato, doc que no fija decisión, prueba que no cambia comportamiento,
  dependencia dentro de rango. Una frase de alcance, rama `mantenimiento/<tema>`, commit, PR de tres
  líneas (qué / verificado / pendiente), sin registro ni relevo. Se ejecuta `npm run iter:previa` y el
  test o spec tocado, si lo hay. Si toca `doc/`, ejecuta `npm run iter:pruebas` (propone la
  coherencia documental y las reglas).
- **Completo**: lo demás (lógica, API, autorización, esquema, seguridad, decisión nueva, script de
  proceso, dependencia con cambio de major, borrado de código). Todo el resto de esta skill.
- **Ante la duda, completo.** Casos intermedios: un refactor sin cambio de comportamiento es completo;
  una prueba nueva sobre comportamiento existente es ligero pero **ejecutando** el test tocado; los
  scripts y el proceso son completos; un documento que fija una decisión es completo; un
  `package-lock` regenerado es completo.
- **Reclasificación**: si aparece un fichero fuera de lo declarado o el cambio deja de ser no
  observable, se para, se avisa y se sigue como completo en la misma rama (renombrándola si aún no
  está publicada). Se vuelve a Plan solo si hay que tomar una decisión nueva.
- **Plantilla del prompt ligero** (la pega el usuario):

  ```text
  LIGERO · <tema>

  Alcance: <una frase: qué cambia y dónde>.
  Ficheros: <rutas, o «los que hagan falta dentro de esto»>.
  Verificación: npm run iter:previa; <test o spec tocado, si lo hay>.

  Autorizo: crear la rama mantenimiento/<tema>, commit, push, gh pr create y gh pr merge si los
  checks están en verde; después borra mantenimiento/<tema> en local y en remoto.

  No toques registro ni relevo. Si el PR cierra un issue, usa `Closes` y compruébalo al fusionar.
  Si el cambio deja de ser ligero, para y avísame.
  ```

- **PR de tres líneas** (formato fijo): `Qué: <una frase>.` · `Verificado: <comando y resultado>.` ·
  `Pendiente: <nada o el resto con su motivo>.` Ejemplo real: «Qué: corrige el enlace a
  `optimizaciones.md` en `doc/db/schema/index.md`. Verificado: `iter:previa` exit 0; coherencia 7/7.
  Pendiente: nada.»
- **Issue en el PR**: mismo criterio que §4 — `Closes #n` solo si el PR lo cierra; si no, `Refs #n`; si
  el issue ya está cerrado, no se referencia.
- **Modo autónomo del nivel completo**: solo si el prompt lo pide o autoriza publicar el PR junto al
  plan. Dos aprobaciones: (1) el plan, que ya incluye publicar y abrir el PR; (2) fusionar y limpiar,
  tras comprobar los checks. Entre ambas no se pregunta. Se para solo ante un error real: checks en
  rojo, ficheros sensibles en el índice, push rechazado, divergencia con `main` o un hallazgo que
  cambie el alcance. Lo no autorizado se sigue pidiendo aparte. La revisión del PR se hace antes de la
  aprobación de fusión. Esa revisión es la del usuario en el chat, no una revisión de GitHub (§5).
- Se trabaja en Act desde el principio cuando el alcance ya está aprobado: el modo Plan bloquea
  `git add` y `git commit`.

## 1. Comprobaciones previas
- Atajo: `npm run iter:previa` (estado, `git diff --check` y `--cached --check`, sintaxis, lint y
  avisos de formato; `-- --completo` para la salida íntegra).
- `git branch --show-current; git status --short; git log --oneline -3`.
- `git diff --stat` y lectura del diff real, no solo del resumen.
- ESLint de `src/` y de `e2e/` con `--no-ignore` (O-12), que hace `npm run iter:previa`; `--fix`
  **solo si el usuario lo pide en el prompt**; si se usa, se cita en `## Qué hace` con los ficheros que
  tocó. Sin `--no-ignore`, ESLint sobre `e2e/` responde «File ignored» con exit 0 y no es verde.
  `node --check` de los `.mjs` tocados.
- Pruebas que correspondan (regla `30-tests`), con código de salida y `# tests/# pass/# fail`. Si se
  usa `--ejecuta` sin `--incluye-entorno`, la E2E y la base quedan omitidas: no es verde.

## 2. Índice
- Atajo: `npm run iter:cierre -- <tema> --ficheros a,b,c` toma la lista explícita, rechaza
  `.db_connection`, `.env` y `node_modules` y compara el índice con ella. Sin `--ficheros` solo
  propone y sale con 2, sin añadir nada. No hace commit.
- Manifiesto completo, una ruta por línea, en `/tmp/manifiesto-<tema>.txt`.
- `git add -- $(cat /tmp/manifiesto-<tema>.txt)`.
- `git status --short` y `git diff --cached --stat` son informativos; `git diff --cached --name-only`
  debe coincidir con el manifiesto. Si no coincide, no continúes: muestra la diferencia.
- Nunca `git add -A` ni `git add .`, ni `backend/src/db/.db_connection` ni su `.backup`.

## 3. Commit
- Mensaje en `/tmp/mensaje-<tema>.txt`: `tipo(IDs): resumen breve`, línea en blanco y cuerpo en
  español (qué cambia, por qué, qué queda).
- `git commit -F /tmp/mensaje-<tema>.txt` y `git log --oneline -1`.

## 4. Publicación y PR (solo si está autorizado)
- `git push -u origin <rama>`.

## Cuerpo del PR (sustituye al informe de iteración)
El PR es el único registro del trabajo: no hay informes aparte. Debe entenderse sin leer los commits.
- `Closes #<id>, closes #<id> …` **solo** para los issues que el PR cierra; en otro caso `Refs #<id>`.
  La palabra clave se repite antes de cada número. Si el issue ya está cerrado, no se referencia. No se
  cierran a mano después.
- `## Qué hace`: IDs, objetivo, base, alcance y exclusiones; tabla de ficheros agrupada por tipo
  (nuevos, modificados, movidos, borrados) con el motivo de cada grupo; decisiones registradas y qué
  sustituyen; mapa de conservación cuando se muevan reglas.
- `## Verificado`: cada comprobación con comando, código de salida, resultado real y entorno. Una
  prueba no ejecutada no va aquí.
- `## Pendiente`: lo no verificado con su motivo exacto y siguiente paso, riesgos, trabajo derivado y
  hallazgos registrados con su ID.
- Sin tope de líneas: el detalle es la fuente de verdad. Fuera de las tres secciones, una línea de
  coste: `Coste: turnos=N · inicio=<AAAA-MM-DD HH:MM> · fin=<AAAA-MM-DD HH:MM> · nivel=ligero|completo`,
  en hora de Europe/Madrid. `inicio` es el primer mensaje del usuario (si no consta, la creación de la
  rama, indicándolo); `fin`, la hora del commit (`git log -1 --format=%cI`) y, si se fusiona en la misma
  sesión, `mergedAt` de `gh pr view --json mergedAt`; `turnos`, los mensajes del usuario entre la
  petición y la fusión.
- Antes de `gh pr create`, muestra el título y el cuerpo completos y espera confirmación, salvo en modo
  autónomo (se muestran al crear el PR).
- `gh pr create --title "tipo(IDs): resumen" --body-file /tmp/pr-<tema>.md` con la etiqueta
  `nivel:ligero` o `nivel:completo`.
- `gh pr view <n> --json state,mergeable,statusCheckRollup` y `gh pr checks <n>`.

## 5. Fusión y después
- `gh pr merge <n>` solo si el prompt lo autoriza y los checks están en verde.
- `reviewDecision: REVIEW_REQUIRED` es el estado **normal** de un PR creado con el token de `ferboiar`:
  el ruleset de `main` exige una aprobación y el usuario tiene bypass `Exempt`, así que **no bloquea** y
  no hay que hacer nada. La «aprobación 2» es del usuario en el chat, no una revisión de GitHub.
  `--admin` **no** se usa nunca.
- Salvaguarda: si `gh pr merge` se bloquea de forma inesperada (cambio de token o de ruleset), se para y
  se muestra el mensaje exacto; el bypass lo decide el usuario.
- Después: `git switch main && git pull --ff-only origin main && git log --oneline -1` para leer el
  SHA real. Ese SHA no se copia al PR siguiente (DC-64).
- Los issues se cierran solos con `Closes` al fusionar; comprueba que quedaron cerrados. El relevo solo
  se toca si cambió una decisión vigente o el mapa (DC-69); no se anotan PR, SHA ni ramas. Nada queda
  delegado al PR siguiente sin ID e issue (DC-66).

## Qué no hacer
- No declares una fusión sin un `gh pr view` que la muestre.
- No inventes números de PR ni SHA.
- No reapliques un cambio funcional por un fallo de commit o push: corrige y repite.
- No dejes flecos que otro PR deba cerrar sin ID e issue (DC-66).
