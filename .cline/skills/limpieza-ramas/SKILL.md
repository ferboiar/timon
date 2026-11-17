---
name: limpieza-ramas
description: Limpia ramas locales y remotas ya fusionadas en Timón. Úsala cuando se pida borrar o limpiar ramas, comprobar si una rama está integrada o retomar la limpieza pendiente (O-09).
---

# Limpieza de ramas

Solo se borran las ramas **nombradas en el prompt**; el criterio general no amplía la lista (DC-64).
Si el prompt no nombra ninguna, pregunta cuáles antes de tocar nada.

## 1. Comprobar
- `git fetch --prune` y `git branch -vv`.
- Por rama: `git log --oneline -1 <rama>`, `git branch --merged main` y
  `gh pr view <rama> --json state,mergedAt,mergeCommit`.
- Está lista si su PR consta fusionado y su punta está integrada en `origin/main`.

## 2. Local
- `git branch -d <rama>`.
- Si rechaza por upstream atrasado: no uses `-D` por reflejo. Comprueba la integración, retira el
  upstream con `git branch --unset-upstream <rama>` y repite `-d`.
- Solo si el PR consta fusionado (squash o rebase) y la punta es la del PR: pide autorización y usa
  `git branch -D <rama>`.

## 3. Remota
- `git push origin --delete <rama>`, solo con esa rama nombrada y autorizada.
- Después, `git fetch --prune`.

## 4. Registrar
- Anota en el relevo §0 o en el issue O-09 qué ramas quedan y por qué.
