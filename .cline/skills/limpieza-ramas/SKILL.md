---
name: limpieza-ramas
description: Limpia ramas locales y remotas ya fusionadas en Timón. Úsala cuando se pida borrar o limpiar ramas o comprobar si una rama está integrada.
---

# Limpieza de ramas

Solo se borran las ramas **nombradas en el prompt**; el criterio general no amplía la lista (DC-64).
Si el prompt no nombra ninguna, pregunta cuáles antes de tocar nada.

## 1. Comprobar
- `git fetch --prune` y `git branch -vv`.
- Por rama: `git log --oneline -1 <rama>`, `git branch --merged main` y
  `gh pr view <rama> --json state,mergedAt,mergeCommit`.
- Está lista si su PR consta `MERGED` y su punta está integrada en `origin/main`.

## 2. Local
- `git branch -d <rama>`.
- Con squash, `-d` falla siempre porque la punta no es ancestro de `main`. Si el PR consta `MERGED` y
  la rama está nombrada en el prompt, `-D` queda autorizado.
- Si rechaza por upstream atrasado, retira el upstream con `git branch --unset-upstream <rama>` y
  repite `-d`.

## 3. Remota
- `git push origin --delete <rama>`, solo con esa rama nombrada y autorizada.
- Después, `git fetch --prune`.

## 4. Si una rama sobrevive
- El motivo va como comentario en el PR de esa rama. No se anota en el relevo ni en un issue.
