# Timón: instrucción persistente obligatoria

Este repositorio usa como fuente normativa `doc/mantenimiento/instruccion-persistente.md`
y sus cuatro partes.  

## Al iniciar una nueva sesión o iteración

1. Lee `doc/mantenimiento/instruccion-persistente.md` y sus cuatro partes.
2. Lee la sección 0 del relevo (`estado-del-proyecto_1de3.md`) y el último informe pertinente.
3. Comprueba rama, `git status --short`, `HEAD`, últimos commits y el estado real de los PR mencionados.
4. Declara la base revisada, el siguiente trabajo acordado y el alcance propuesto.
5. No modifiques nada hasta que el usuario apruebe el alcance.

## Según el alcance

Lee adicionalmente solo lo necesario:

- Para modificar Recibos: secciones pertinentes del relevo, registro, `doc/components/ListBills.md`, `doc/services/BillService.md`, `doc/routes/recibos.md` y `doc/db/db_utilsBill.md`.
- Para modificar Anticipos: secciones pertinentes del relevo, registro, `doc/components/Advances.md`, `doc/services/AdvService.md`, `doc/routes/anticipos.md` y `doc/db/db_utilsAdv.md`.
- Para modificar Ahorros: secciones pertinentes del relevo, registro, `doc/components/Savings.md`, `doc/services/SavService.md`, `doc/routes/ahorros.md` y `doc/db/db_utilsSav.md`.
- Para modificar Cuentas: secciones pertinentes del relevo, registro, `doc/components/Accounts.md`, `doc/services/AccService.md`, `doc/routes/cuentas.md` y `doc/db/db_utilsAcc.md`.
- Para modificar Categorías: secciones pertinentes del relevo, registro, `doc/components/Categories.md`, `doc/services/CatsService.md`, `doc/routes/categorias.md` y `doc/db/db_utilsCats.md`.
- Para modificar usuarios, ajustes, seguridad, pruebas o despliegue: lee las secciones y ficheros específicamente afectados.

No releas íntegramente el relevo, el registro, `TODO` ni todos los informes en cada mensaje. Conserva la base ya revisada y actualiza el contraste solo cuando cambien la versión, el estado local, el alcance o la evidencia.

## Antes de un cambio sustantivo

- Comprueba rama, `git status --short`, `HEAD` y últimos commits.
- Comprueba el estado real de los PR mencionados.
- Declara qué has leído completo y qué queda pendiente.
- Propón objetivo, alcance, exclusiones, aceptación y verificaciones.
- No modifiques nada hasta que el usuario apruebe el alcance.

## Reglas de edición de ficheros y de publicación

<!-- regla:edicion-ficheros -->
**Edición de ficheros (DC-47).** Todo cambio en un fichero existente del repositorio se hace con `dev/utils/ayudas.mjs`; los ficheros nuevos se crean con `cat`. El ayudante se usa con `--check` antes de `--apply` y con un manifiesto explícito de los archivos que se tocan.

- Los ficheros nuevos se crean con `cat > ruta/del/archivo <<'EOF'`, con su contenido, y no con el editor de parches.
- Un cambio trivial con una única coincidencia se comprueba con `grep -c` (debe devolver exactamente 1) y se aplica con `sed -i`. Cualquier otro cambio va con el ayudante: `--check` y, si no hay errores, `--apply`.
- Los ficheros fuera del repositorio se editan con `cat` o `sed -i`.
- No se usan Python ni scripts ad hoc para modificar ficheros. La excepción solo cabe si no es posible con las herramientas anteriores, el alcance lo justifica, se explica antes y el usuario lo confirma expresamente.
<!-- /regla:edicion-ficheros -->

<!-- regla:publicacion-fusiones -->
**Publicación y fusiones (DC-47).** Cada una de estas operaciones exige confirmación expresa del usuario, nombrada y por separado: `git commit`, `git push`, `git push origin --delete`, `gh pr create`, `gh pr edit`, `gh pr merge`, el borrado de ramas locales y el borrado de ramas remotas.

- «Continúa», «siguiente», «PR hecho, seguimos» o una lista de tareas aprobada no autorizan ninguna de esas operaciones.
- La confirmación se da para la operación concreta y, si hay varias ramas o PR, para cada una. Sin ella, el asistente se detiene y espera.
- Preparar el índice con `git add` y su manifiesto, y comprobar el conjunto de archivos, no publica nada.
- Antes de escribir en el remoto se comprueba el estado real: rama, `HEAD` y PR abiertos o fusionados. Una fusión no se declara sin verificarla.
<!-- /regla:publicacion-fusiones -->
