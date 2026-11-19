# Proceso de trabajo

## Plan y Act
- Modo Plan: lees, analizas y propones; no editas ni cambias estado. Entregas objetivo, alcance,
  exclusiones, aceptación y verificaciones.
- Modo Act: ejecutas el alcance aprobado, verificas con evidencia real y propones la publicación con
  la lista exacta de operaciones.
- En Plan determina y justifica las verificaciones según el comportamiento afectado; consulta
  `.cline/rules/30-tests.md` aunque no vayas a editar pruebas. En Act ejecútalas y registra los
  resultados reales en el PR. Si una comprobación necesaria no puede ejecutarse, declara el bloqueo y
  pide una excepción expresa antes de dar la entrega por verificada.
- Error o matiz: explica la discrepancia, corrige dentro de lo aprobado, repite lo afectado y pide
  aprobación si amplías.
- Distingue terminado, publicado, PR abierto, PR cerrado sin fusionar e incorporado a `main`.

## Niveles (DC-69)
- **Ligero**: sin efecto observable (typo, enlace, comentario, doc sin decisión, prueba sin cambio de
  comportamiento, dependencia dentro de rango). Una frase de alcance basta; no toca relevo ni registro
  y el PR son tres líneas.
- **Completo**: lógica, API, autorización, esquema, seguridad, decisión nueva, script de proceso,
  dependencia con cambio de major o borrado de código.
- **Ante la duda, completo.** Si un ligero crece, se reclasifica y se avisa. Criterios, casos
  intermedios, plantilla y modo autónomo: `cierre-iteracion` §0.

## Alcance
- Cada iteración identifica objetivo, IDs, base, archivos, inclusiones, exclusiones, aceptación,
  riesgos y verificación. Una rama y un PR por iteración.
- Un hallazgo que aparezca en el PR se incluye solo si es viable: mismo ámbito, riesgo y revisión,
  verificable con sus pruebas y sin depender de una decisión de producto ni de otro PR. Si no, se
  registra con ID nuevo y un issue (DC-58). Con más de tres tareas nuevas, divide el PR.
- Lo que quede en «Pendiente» de un PR se refleja en el mismo PR en el registro y en su issue (DC-55).

## Criterios
- Ante discrepancias manda DC-03: Excel del usuario, documentación de diseño, BD viva y, por último,
  el código. No la sustituyas en silencio: si algo la contradice, señálalo y pregunta.
- Una propuesta `R-nn`, una hipótesis o una fila de una base de pruebas no son decisiones ni
  requisitos. Describe lo que hace hoy el código aunque no cumpla el diseño.

## IDs y commits
- Familias: DC, F, S, R, D, U, O. Comprueba el último de la familia en el registro (`npm run
  iter:ids`); no reutilices ni renumere.
- Commit: `tipo(IDs): resumen breve`, con cada ID desglosado y cuerpo en español (qué cambia, por qué,
  qué queda). Tipos: feat, fix, refactor, docs, test, chore, perf, security, revert. Un cambio
  funcional no se etiqueta `docs` por tocar documentación.

## PR y ramas
- Cuerpo del PR y publicación: skill `cierre-iteracion`. No inventes números de PR ni SHA; el de
  fusión lo da `git log --oneline -1 main`.
- Ramas: `correccion/fase-<n>-<tema>` y `mantenimiento/<tema>`. Preparación: `git switch main && git
  pull --ff-only origin main && git fetch --prune && git switch -c <rama>`; si un paso falla, para.
- Borrado de ramas: `/limpieza-ramas`, solo las nombradas en el prompt.
