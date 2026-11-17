# Proceso de trabajo

## Plan y Act
- Modo Plan: lees, analizas y propones. No editas ficheros ni ejecutas nada que cambie el estado.
  Entregas objetivo, alcance, exclusiones, aceptación y verificaciones.
- Modo Act: ejecutas solo el alcance aprobado, verificas con evidencia real y propones la publicación
  con la lista exacta de operaciones para que el usuario la autorice.
- En Plan determina y justifica las verificaciones necesarias según el comportamiento afectado;
  consulta `.cline/rules/30-tests.md` aunque todavía no vayas a editar pruebas. En Act ejecútalas y
  registra los resultados reales en el PR. Si una comprobación necesaria no puede ejecutarse, declara
  el bloqueo y solicita una excepción expresa antes de dar la entrega por verificada.
- Error o matiz: explica la discrepancia, corrige dentro de lo aprobado, repite las comprobaciones
  afectadas y pide aprobación si hay que ampliar.
- Distingue implementación terminada, entrega preparada, publicado, PR abierto, PR cerrado sin
  fusionar e incorporado a `main`. «Terminado» no sustituye a esos estados.

## Alcance
- Cada iteración identifica objetivo, IDs, base, archivos, inclusiones, exclusiones, aceptación,
  riesgos y verificación. Una rama y un PR por iteración.
- Un hallazgo que aparezca durante el PR se incluye en él solo si es viable: mismo ámbito, riesgo y
  revisión, verificable con sus pruebas y sin depender de una decisión de producto ni de otro PR. Si
  no lo es, se registra con ID nuevo en el registro y un issue del Project (DC-58). Con más de tres
  tareas nuevas, divide el PR.
- Lo que quede en «Pendiente» de un PR se refleja en el mismo PR en el registro y en su issue (DC-55).

## Criterios
- Ante discrepancias manda DC-03: Excel del usuario, documentación de diseño, BD viva y, por último,
  el código. No la sustituyas en silencio: si algo la contradice, señálalo y pregunta.
- Una propuesta `R-nn`, una hipótesis o una fila de una base de pruebas no son decisiones ni
  requisitos.
- Describe lo que hace hoy el código aunque no cumpla el diseño; no cambies la implementación solo
  para hacer verdadera una frase antigua.

## IDs y commits
- Familias: DC (decisiones), F (funcional), S (seguridad), R (requisitos y propuestas), D
  (documentación), U (interfaz), O (operación). Comprueba en el registro el último de la familia
  antes de asignar; no reutilices ni renumere.
- Commit: `tipo(IDs): resumen breve`, con cada ID desglosado y cuerpo en español (qué cambia, por qué,
  qué queda). Tipos: feat, fix, refactor, docs, test, chore, perf, security, revert. Un cambio
  funcional no se etiqueta `docs` por tocar documentación.

## PR
- El cuerpo sigue la skill `cierre-iteracion` (secciones `Qué hace`, `Verificado` y `Pendiente`).
- No inventes números de PR ni SHA; el SHA de fusión lo da `git log --oneline -1 main`.

## Ramas
- Patrones: `correccion/fase-<n>-<tema>` y `mantenimiento/<tema>`.
- Preparación: `git switch main && git pull --ff-only origin main && git fetch --prune && git switch -c
  <rama>`. Sin `|| true`: si un paso falla, para.
- `git branch -d` para lo ya fusionado. Si rechaza por upstream atrasado, comprueba la integración y
  pide autorización antes de `-D`. El borrado remoto es `git push origin --delete <rama>`, solo con
  esa rama nombrada en el prompt.
- Cierre y publicación, bajo demanda: `/cierre-iteracion`. Limpieza de ramas: `/limpieza-ramas`.
