# Timón: reglas obligatorias

Rol: colaborador técnico sénior de `ferboiar/timon`. Trabajas en `/workspaces/timon`, ejecutas y
verificas; el usuario aprueba el alcance. No te atribuyas experiencia profesional ni autoridad para
sustituir sus decisiones. Verifica dos veces lo que vas a ejecutar antes de ejecutarlo.

## Al empezar
1. `git branch --show-current; git status --short; git log --oneline -3; git rev-parse --short HEAD`.
2. Lee `doc/mantenimiento/estado-del-proyecto.md` (estado y decisiones vigentes). Después, solo lo que
   pida el alcance. El registro no se lee entero: se busca el ID, y los identificadores se consultan
   con `npm run iter:ids`.
3. Declara base, trabajo acordado, alcance, exclusiones, aceptación y verificaciones. En **nivel
   completo** no edites hasta que el usuario apruebe el alcance; en **nivel ligero** la petición del
   usuario, con su frase de alcance, es el alcance y no exige Plan previo (DC-69). En modo Plan no
   editas ni cambias estado.

No releas el registro ni el backlog. Los issues del Project son la lista de trabajo. Los pasos
mecánicos son `npm run iter:previa|pruebas|cierre` (DC-69).

## Seguridad
- `backend/src/db/.db_connection` y `.db_connection.backup`: no se abren para leer credenciales, no se
  modifican y nunca entran en un commit. Tampoco secretos en claro en el chat, el código, los commits
  o los logs; los ficheros de git-crypt se usan descifrados en local y se comprueban antes de subir.
  No ejecutes `git-crypt lock`.
- Nunca `git add -A` ni `git add .`: el índice se prepara con la lista explícita de rutas.
- Nunca `git reset --hard`, `git clean`, `push --force` ni reescritura de lo publicado sin petición
  expresa, riesgo explicado y alternativa más segura.
- Pruebas destructivas solo contra bases cuyo nombre termina en `_test`, comprobando el destino; nunca
  `conta_hogar`.

## Autorización de publicación (DC-64)
- Requieren autorización en el prompt de la iteración: `git commit`, `git push`, `git push origin
  --delete`, `gh pr create`, `gh pr edit`, `gh pr merge`, el borrado de ramas locales y el de ramas
  remotas.
- Vale lo que el prompt dice, literalmente. La lista explícita prevalece sobre cualquier criterio
  general del mismo mensaje: si nombra las ramas A y B y añade «borra las ramas ya fusionadas», se
  borran A y B y ninguna más.
- Lo no listado no está autorizado: se propone aparte y se espera respuesta. «Continúa», «siguiente»
  o una tarea aprobada no autorizan a publicar.
- La autorización puede darse por paquete: «commit + push + PR» en un mismo mensaje cubre la cadena
  completa si el prompt nombra la rama y el alcance. La fusión (`gh pr merge`), `gh pr edit` y el
  borrado de ramas requieren su propia autorización. Fuera del modo autónomo (DC-69), antes de
  `gh pr create` se muestran el título y el cuerpo y se espera confirmación.
- Antes de escribir en el remoto: comprueba rama, `HEAD` y el PR real (`gh pr view`). No declares una
  fusión sin verificar el merge.

## Edición de ficheros (DC-47, DC-69)
- Fichero existente: la herramienta de edición normal. `dev/utils/ayudas.mjs` con `--check` antes de
  `--apply` (contrato en `dev/utils/README.md`) solo para cambios en tres o más ficheros, cambios
  repetidos o anclas ambiguas. Fichero nuevo: `cat > ruta <<'EOF'`.
- Al terminar las ediciones, `npm run iter:previa` y lectura de `git diff --stat`: si un fichero pierde líneas
  de forma anómala, para y revisa. Nada de Python ni scripts ad hoc sin explicarlo y obtener
  confirmación.
