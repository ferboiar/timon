---
name: cierre-iteracion
description: Prepara el cierre de una iteración de Timón y publica el PR. Úsala cuando se pida cerrar la iteración, preparar o abrir el PR, hacer commit y push, fusionar, o comprobar el estado de un PR (git commit, git push, gh pr create, gh pr merge, gh pr view). No ejecuta ninguna operación de publicación sin autorización en el prompt.
---

# Cierre de iteración

Solo para el alcance ya aprobado y en modo Act. **No ejecutes ninguna operación de publicación que
el prompt no autorice**: si falta la autorización, prepara todo, muestra la lista exacta de
operaciones y espera.

## 1. Comprobaciones previas
- `git branch --show-current; git status --short; git log --oneline -3`.
- `git diff --stat` y lectura del diff real, no solo del resumen.
- `npx eslint --fix` de los ficheros de `src/` y `e2e/` tocados; `node --check` de los `.mjs`.
- Pruebas que correspondan (regla `30-tests`), con código de salida y `# tests/# pass/# fail`.

## 2. Índice
- Manifiesto completo, una ruta por línea, en `/tmp/manifiesto-<tema>.txt`.
- `git add -- $(cat /tmp/manifiesto-<tema>.txt)`.
- `git status --short` y `git diff --cached --stat` son informativos.
- Comprueba que `git diff --cached --name-only` coincide con el manifiesto. Si no coincide, no
  continúes: muestra la diferencia.
- Nunca `git add -A` ni `git add .`, ni `backend/src/db/.db_connection` ni su `.backup`.

## 3. Commit
- Mensaje en `/tmp/mensaje-<tema>.txt`: `tipo(IDs): resumen breve`, línea en blanco y cuerpo en
  español (qué cambia, por qué, qué queda).
- `git commit -F /tmp/mensaje-<tema>.txt` y `git log --oneline -1`.

## 4. Publicación y PR (solo si está autorizado)
- `git push -u origin <rama>`.
## Cuerpo del PR (sustituye al informe de iteración)
El PR es el único registro del trabajo: no hay informes aparte. Debe entenderse sin leer los commits.
- `Closes #<id>, closes #<id> …` con todos los issues del alcance. La palabra clave se
  repite antes de cada número (`Closes #1, closes #2`): GitHub solo cierra el primero si
  se menciona una vez. No se cierran a mano después ni se declaran como acción manual pendiente.
- `## Qué hace`: IDs, objetivo, base, alcance y exclusiones; tabla de ficheros agrupada por tipo
  (nuevos, modificados, movidos, borrados) con el motivo de cada grupo; decisiones registradas y
  qué sustituyen; mapa de conservación cuando se muevan reglas.
- `## Verificado`: cada comprobación con comando, código de salida, resultado real y entorno. Una
  prueba no ejecutada no va aquí.
- `## Pendiente`: lo no verificado con su motivo exacto y siguiente paso, riesgos, trabajo
  derivado y hallazgos registrados con su ID.
- Antes de `gh pr create`, muestra el título y el cuerpo completos y espera confirmación.
- `gh pr create --title "tipo(IDs): resumen" --body-file /tmp/pr-<tema>.md`.
- `gh pr view <n> --json state,mergeable,statusCheckRollup` y `gh pr checks <n>`.

## 5. Fusión y después
- `gh pr merge <n>` solo si el prompt lo autoriza y los checks están en verde.
- Después: `git switch main && git pull --ff-only origin main && git log --oneline -1` para leer el
  SHA real. Ese SHA no se copia al PR siguiente (DC-64).
- Actualiza el relevo §0 en el mismo acto. Los issues se cierran solos con `Closes` ante cada número al fusionar;
  comprueba que quedaron cerrados. El §0 describe el estado posterior a la fusión, con el número de
  PR y sin SHA copiado; nada queda delegado al PR siguiente (DC-66).

## Qué no hacer
- No declares una fusión sin un `gh pr view` que la muestre.
- No inventes números de PR ni SHA.
- No reapliques un cambio funcional por un fallo de commit o push: corrige y repite.
- No dejes en §0 «pendiente de publicar» ni flecos que otro PR deba cerrar (DC-66).
