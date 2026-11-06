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
