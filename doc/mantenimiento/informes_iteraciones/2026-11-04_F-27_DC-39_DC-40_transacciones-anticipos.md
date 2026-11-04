## Informe de cierre de iteración

### Objetivo y alcance

- Paso b de DC-38 (F-14): F-27 y la atomicidad de F-25 (DC-39), validación de identificadores en las rutas de anticipos (F-43, solo en Anticipos) y, por petición expresa durante la iteración, el recálculo de los pagos pendientes al editar un pago que está o pasa a estar pagado (DC-40, parte del paso c).
- Inclusiones: asistente `enTransaccion` con bloqueo del anticipo, borrado de pago en una sola ruta REST, sustitución atómica, validación de parámetros, mensajes de error legibles en la pantalla, trazas del resultado de cada transacción y del antes y el después de cada pago, recálculo con el criterio «el plan cuadraba», 20 pruebas y la documentación y el seguimiento afectados.
- Exclusiones: modo automático o manual del plan y vista previa (resto del paso c), fechas ancladas de Anticipos (paso d, F-46), cualquier cambio de esquema o migración, pruebas HTTP de las rutas y la reparación de datos antiguos.

### Base

- Rama `correccion/fase-1-F27-transacciones-anticipos`, creada desde `main` en `2315f8a94a73908a5b499cbc2b0ea3bc23a8eef0` (merge del PR #53), comprobado con `git rev-parse HEAD` en el contenedor.
- PR anterior: #53 (F-14 / DC-38, paso a), fusionado el 2026-11-03 a las 22:49 UTC, comprobado en el repositorio remoto con el conector. No hay PR abierto de este trabajo.
- Cambios locales conocidos y excluidos: `backend/src/db/.db_connection` (modificado) y `backend/src/db/.db_connection.backup` (sin rastrear).

### Cambios

- Servidor: `db_connection.mjs` exporta `enTransaccion(conexionExterna, operacion)`, que confirma o deshace y deja traza del resultado. `db_utilsAdv.mjs` bloquea el anticipo con `bloquearAnticipo` (`SELECT … FOR UPDATE`) al empezar `pushAdvance`, `pushPago`, `handlePaymentDeletion`, `sustituirPago`, `deleteAdvances`, `recalculatePaymentPlan` y `recalculatePendingPayments`; las funciones internas (`generarPlanDePagos`, `completarPlanTrasBorrado`, `recalculatePostEditPayments`) reciben la conexión. Se retira `deletePago`; se añaden `sustituirPago`, `errorHttp`, `traducirErrorBD` y `planCuadra`. Los errores de validación (plan de más de 1200 pagos, pago sugerido, datos del pago nuevo) y los «no existe» llevan código 400 o 404. `pushPago` deduce el anticipo desde el propio pago y reparte la diferencia de importe entre los pendientes si el pago queda pendiente o queda pagado con el plan cuadrado.
- API: `DELETE /api/anticipos/pagos/:id?redistribuir=true|false` sustituye a `POST /delete-payment` y a la antigua `DELETE /pagos/:id`; nueva `POST /api/anticipos/pagos/:id/sustituir`; las respuestas de error llevan un mensaje breve en los 400 y 404 y un texto genérico en los 500; nuevo `utils/parametros.mjs`.
- Interfaz: `AdvService` cambia `handlePaymentDeletion` a `DELETE` con parámetro y añade `replacePago`; `Advances.vue` sustituye con una sola petición, muestra el mensaje del servidor con `getApiErrorMessage` y avisa en el diálogo de pago de si los pendientes se recalcularán o no según `planCuadrado`.
- Pruebas: `parametros.test.mjs` (6, sin base de datos) y, en `fase0.test.mjs`, 11 de F-27 (reversión, 404 y 400, sustitución, borrado de anticipos, cuenta inexistente y concurrencia) y 3 de DC-40; la prueba de F-14 que usaba `deletePago` usa `handlePaymentDeletion`.
- Documentación y seguimiento: `db_utilsAdv.md`, `routes/anticipos.md`, `components/Advances.md`, `services/AdvService.md`, `utils/apiError.md`, registro (partes 1 a 3: DC-39, DC-40, F-14, F-25, F-27, F-28 y plan), relevo (partes 1 a 3), `TODO` y el índice de informes.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| doc/db/db_utilsAdv.md | Sí | Sí | Transacciones, bloqueo, funciones, trazas y límites |
| doc/routes/anticipos.md | Sí | Sí | Rutas de pagos, errores, parámetros y trazas |
| doc/components/Advances.md | Sí | Sí | Sustitución, avisos y F-27 |
| doc/services/AdvService.md | Sí | Sí | Métodos y rutas; frase obsoleta de F-14 |
| doc/utils/apiError.md | Sí | Sí | Nuevos usos en Advances.vue |
| doc/mantenimiento/registro-hallazgos.md y partes 1 a 3 | Sí | Sí (partes 1, 2 y 3) | DC-39, DC-40, F-14, F-25, F-27, F-28 y plan |
| doc/mantenimiento/estado-del-proyecto.md y partes 1 a 3 | Sí | Sí (partes 1, 2 y 3) | Base, trabajo activo, historial y cierre de 2026-10-23 |
| TODO | Sí | Sí | Estado operativo, F-14, F-27 y F-28 |
| doc/mantenimiento/informes_iteraciones/index.md | Sí | Sí | Fila de este informe |
| README.md, README_en.md y .github/copilot-instructions.md | Sí (búsqueda de rutas retiradas) | No | No mencionan las rutas ni las funciones retiradas |
| doc/index.md | Sí | No | No describe rutas ni transacciones |

### Verificación

Resultados aportados por el usuario en su contenedor (suite con `timon_test` / `conta_hogar_test` en `mariadb01`):

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Código (script 1) | `node --check`, `--check` y `--apply` de `f27-1-codigo.mjs` | Plan válido: 5 ficheros; aplicado en 5; copia `/tmp/timon-ayudas-backup-8yfvOx` |
| Sintaxis y lint tras el script 1 | `node --check` de cuatro módulos, `eslint` de `Advances.vue` y `AdvService.js`, `git diff --check` | Todos en 0 |
| Retirada de rutas | `grep` de `deletePago`, `delete-payment` y `getConnection` en el backend | Sin restos; solo los tres `getConnection` de las lecturas no transaccionales |
| Pruebas (script 2) | `f27-2-pruebas.mjs` y suite | Aplicado en 1 fichero (copia `PTCIcl`); `EXIT:0`, 111 pasan, 0 fallos |
| Documentación (script 3) | `f27-3-documentacion.mjs` y `grep` | Aplicado en 11 ficheros (copia `sRm6w3`); `DIFFCHECK:0`; los restos de `deletePago` y `delete-payment` son frases explicativas |
| Ajustes de errores y trazas (scripts 4 y 5) | `f27-4-ajustes.mjs`, `f27-5-trazas.mjs`, suite y log | Script 4 aplicado en 12 ficheros (copia `55hLvg`) con `CHECK` y `ESLINT_EXIT` en 0; `EXIT:0` y 112 pasan; el script 5 se comprueba por el log: traza `pushPago` del antes y el después, y errores 400 sin pila |
| Recálculo al editar un pagado (script 6) | `f27-6-recalculo-pagado.mjs` y suite | Declarado por el usuario: «todo aplicado, pruebas pasadas con éxito»; sin salida de la suite final |
| Pantalla y log | Aplicación en el contenedor de desarrollo | Anticipo 37 con plan de 10 pagos; borrado sin y con reparto (2 pagos nuevos); sustitución en una petición (5602 por 5607); alta con plan imposible deshecha (`Transacción deshecha`, 400); edición del anticipo 19 deshecha con valores conservados (declarado); editar pendiente con reparto; editar pagado 100 a 150 con recálculo (94 y 95, suma 850) y de vuelta a 100; edición con plan descuadrado sin recálculo; completar el plan con 3 pagos; borrado de anticipos |
| Avisos y mensajes | Aplicación | Declarado por el usuario; los textos exactos de los dos avisos no se han confirmado de forma explícita |

### No verificado

- La salida de la suite tras el script 6 (115 pruebas esperadas): consta solo como declarada.
- Las rutas HTTP no tienen pruebas automáticas: la lectura estricta de `redistribuir`, los 404 y los 400 de la ruta solo están probados en `parametros.mjs` y en las funciones; en pantalla solo se ejercitaron los caminos de éxito y el 400 del plan.
- No se ejecutó `npm run build` ni pruebas de interfaz automáticas.
- Concurrencia: probada únicamente con dos regeneraciones simultáneas del plan.
- No se repara el plan de anticipos antiguos descuadrados; en ellos editar un pagado no recalcula, con aviso.

### Estado al preparar el informe

- Scripts aplicados: `f27-1-codigo.mjs`, `f27-2-pruebas.mjs`, `f27-3-documentacion.mjs`, `f27-4-ajustes.mjs`, `f27-5-trazas.mjs` y `f27-6-recalculo-pagado.mjs`. El script de cierre (fila del índice y estado de verificación en relevo, TODO y registro) se aplica en el mismo bloque que el commit.
- Sin migraciones ni cambios de esquema.
- Rama `correccion/fase-1-F27-transacciones-anticipos`; 22 ficheros en el manifiesto, incluido este informe.

### Continuidad

- Siguiente trabajo: resto del paso c de DC-38 (modo automático o manual del plan por anticipo, con vista previa) y después el paso d (fechas ancladas de Anticipos, F-46).
- Qué leer: la entrada del relevo y sus tres partes, la instrucción persistente y sus cuatro partes, el registro (DC-38, DC-39 y DC-40), `TODO` y este informe.
- Qué no asumir: que este PR esté fusionado; que el recálculo al editar un pagado ocurra siempre (solo si el plan cuadraba); que la API conserve `POST /delete-payment` o `deletePago`; ni que las rutas tengan pruebas HTTP.
