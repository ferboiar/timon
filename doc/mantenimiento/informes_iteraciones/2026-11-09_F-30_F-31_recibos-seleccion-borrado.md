## Informe de cierre de iteración

### Objetivo y alcance

- **F-30**: la tabla de trimestrales compartía la selección con la de bimestrales, así que seleccionar en una afectaba a la otra y `selectedQuarterlyBills` no se llenaba nunca.
- **F-31**: el diálogo de borrado mostraba `bill.name`, un campo que no existe (el real es `concepto`), y el nombre salía vacío.
- Inclusiones: `src/views/pages/ListBills.vue`, la guarda estática `backend/test/plantillasRecibos.test.mjs`, el spec `e2e/tests/recibosBorrado.spec.mjs` con su registro en `package.json`, `mapa-fuentes.mjs`, `e2e/README.md` y `doc/pruebas/e2e.md`, y la documentación de `ListBills`, el registro, el TODO y el relevo.
- Exclusiones: no se toca la lógica de borrado del servidor ni se crean datos de prueba; no se añaden pestañas ni se reordena la pantalla.

### Base

- Rama `correccion/fase-1-F30-F31-seleccion-y-borrado-recibos`, creada desde `main` en `a639b59` (PR #73).
- PR anterior: #73 (informes retroactivos de D-31), fusionado.
- Cambios locales ajenos: `backend/src/db/.db_connection`. No se prepara.

### Cambios

- `ListBills.vue`: la tabla de trimestrales enlaza `selectedQuarterlyBills` (antes `selectedBimonthlyBills`) y el diálogo de borrado usa `bill.concepto` (antes `bill.name`).
- `backend/test/plantillasRecibos.test.mjs`: guarda estática que fija qué selección usa cada tabla y que el diálogo no vuelve a `bill.name`.
- `e2e/tests/recibosBorrado.spec.mjs`: abre el diálogo del primer recibo visible, comprueba que muestra su concepto y **cancela**; no crea ni borra datos. Espera la respuesta de `/api/recibos` y la primera fila antes de decidir, y se omite con motivo explícito si no hay recibos.
- Esquema, API y servicios: no aplicable (solo plantilla y prueba).

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| `doc/components/ListBills.md` | Sí | Sí | Selección por tabla y concepto en el diálogo (F-30, F-31) |
| `backend/test/plantillasRecibos.test.mjs` | Sí | Nuevo | Guarda estática |
| `e2e/tests/recibosBorrado.spec.mjs` | Sí | Nuevo | Spec de interfaz |
| `e2e/package.json`, `e2e/scripts/mapa-fuentes.mjs` | Sí | Sí | Script `e2e:recibos` y mapa de fuentes |
| `e2e/README.md`, `doc/pruebas/e2e.md` | Sí | Sí | Descripción del spec |
| `doc/mantenimiento/registro-hallazgos_2de3.md` y `_3de3.md` | Sí | Sí | F-30 y F-31 corregidos; plan §10 |
| `TODO` | Sí | Sí | F-30/F-31 marcados y estado operativo |
| `doc/mantenimiento/estado-del-proyecto_1de3.md` | Sí | Sí | §0 |
| `doc/services/BillService.md`, `doc/routes/recibos.md`, `doc/db/db_utilsBill.md` | Sí | No | No cambia el servicio, la ruta ni el acceso a datos |

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Guarda estática de la plantilla | `node --test backend/test/plantillasRecibos.test.mjs` | 3 pruebas, 3 pasadas |
| Suite completa del backend | `npm run test:backend:local` (`mariadb01`, `conta_hogar_test`) | **258 pruebas, 258 pasadas, 0 fallos** |
| Lint de la vista | `npx eslint src/views/pages/ListBills.vue` | Sin avisos |
| Build del frontend | `npm run build:frontend` | `✓ built in 20.97s` |
| Preflight del CDP | `node /tmp/f48-preflight-cdp.mjs` | `CDP alcanzable: http=200 ok=true` |
| **Suite E2E completa** | `npm run e2e` | **16 pruebas, 16 pasadas, 0 omitidas** (3,0 min) |
| Spec de F-31 aislado | `npm run e2e -- tests/recibosBorrado.spec.mjs` | 1 prueba, 1 pasada |

### No verificado

- **F-30 de extremo a extremo**: la selección compartida no es observable por la interfaz sin borrar recibos reales; se cubre con la guarda estática y la revisión del código. Se autorizó crear un recibo `e2e_trimestral_…` para probarlo, pero no fue necesario y no se creó ningún dato.
- **Borrado real desde la pantalla**: el spec abre el diálogo y cancela; el borrado ya está cubierto por la suite del backend y no se ejecuta sobre datos reales.
- Primera pasada del spec nuevo: se omitió por buscar filas antes de que la pantalla cargara los recibos. Se corrigió la espera (respuesta de `/api/recibos` y primera fila) y la ejecución completa quedó en 16/16.

### Estado al preparar el informe

- Rama `correccion/fase-1-F30-F31-seleccion-y-borrado-recibos` con los cambios aplicados y **sin commit**.
- Sin bloqueos. `.db_connection` fuera del manifiesto.

### Continuidad

- Con F-30/F-31 se cierra la lista ordenada del TODO. Siguiente trabajo: el backlog por prioridad técnica, con **S-01/S-06/S-12** (autorización efectiva en servidor) en cabeza.
- Qué leer: sección 5 del relevo (siguiente paso operativo), filas S-01, S-06 y S-12 del registro y `doc/middleware/auth.md`.
- Qué no asumir: que la selección por tabla esté probada por interfaz, ni que el backlog esté aprobado por estar priorizado.
