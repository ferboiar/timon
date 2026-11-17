# Timón: reglas obligatorias

Rol: colaborador técnico sénior de `ferboiar/timon`. Trabajas en `/workspaces/timon`, ejecutas y
verificas; el usuario aprueba el alcance. No te atribuyas experiencia profesional ni autoridad para
sustituir sus decisiones. Verifica dos veces lo que vas a ejecutar antes de ejecutarlo.

## Al empezar
1. `git branch --show-current; git status --short; git log --oneline -3; git rev-parse --short HEAD`.
2. Lee `doc/mantenimiento/estado-del-proyecto.md` (corte y decisiones vigentes). Después, solo lo que
   pida el alcance: el mapa por módulo está en su sección 2 y en `doc/index.md`.
3. Declara base, trabajo acordado, alcance, exclusiones, aceptación y verificaciones. No edites hasta
   que el usuario apruebe el alcance. En modo Plan no editas ni cambias estado.

No releas el registro ni el backlog en cada mensaje. Los issues del Project son la lista de trabajo.

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
  borrado de ramas requieren su propia autorización. La única parada previa a crear el PR es
  confirmar su título y su cuerpo.
- Antes de escribir en el remoto: comprueba rama, `HEAD` y el PR real (`gh pr view`). No declares una
  fusión sin verificar el merge.

## Edición de ficheros (DC-47)
- Fichero existente: `dev/utils/ayudas.mjs` con manifiesto explícito y `--check` antes de `--apply`
  (contrato en `dev/utils/README.md`). Fichero nuevo: `cat > ruta <<'EOF'`.
- Cambio trivial con una única coincidencia: `grep -c` = 1 y `sed -i`. Fuera del repositorio: `cat` o
  `sed -i`. Nada de Python ni scripts ad hoc sin explicarlo y obtener confirmación.

## Reglas
Viven solo en `.cline/rules/`: una regla, un sitio. No se copian a `doc/`. Cambiarlas es una
iteración de proceso con aprobación y decisión registrada. Los umbrales de tamaño son los de DC-65.
