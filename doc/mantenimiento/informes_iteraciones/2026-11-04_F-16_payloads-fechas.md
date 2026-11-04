## Informe de cierre de iteración

### Objetivo e IDs

- F-16: preparar los payloads de Ahorros y Anticipos sin convertir a texto las fechas del modelo vivo antes de confirmar el éxito.
- Motivo: si el servidor rechazaba un guardado, `saveSaving` y `saveAdvance` habían convertido las fechas a texto; un reintento fallaba al llamar de nuevo a `getTime()`. En `saveMovimiento` la fecha se reinterpretaba como UTC y en `savePago` el importe ajustado quedaba mutado aunque el guardado fallara.
- Exclusiones: Recibos, Cuentas, F-19, F-28, F-39, F-40, permisos, migraciones y cambios de API o esquema.

### Archivos

- `src/utils/fechasFormulario.js` — nuevo
- `src/views/pages/Savings.vue`
- `src/views/pages/Advances.vue`
- `backend/test/fechasFormulario.test.mjs` — nuevo
- `doc/utils/fechasFormulario.md` — nuevo
- `doc/components/Savings.md`
- `doc/components/Advances.md`
- `doc/index.md`
- `src/views/pages/Tech-documentation.vue`
- `doc/mantenimiento/registro-hallazgos_1de3.md`
- `doc/mantenimiento/registro-hallazgos_2de3.md`
- `doc/mantenimiento/registro-hallazgos_3de3.md`
- `doc/mantenimiento/estado-del-proyecto_1de3.md`
- `doc/mantenimiento/informes_iteraciones/index.md`
- `doc/mantenimiento/informes_iteraciones/2026-11-04_F-16_payloads-fechas.md` — nuevo
- `TODO`

### Cambios

- Nueva utilidad `fechaIsoDeCalendario`: convierte un `Date` de calendario a `YYYY-MM-DD` con componentes locales, sin `getTimezoneOffset` ni `toISOString`; conserva `null` y un texto ISO válido.
- `saveSaving` y `saveAdvance` envían un payload nuevo con las fechas y la periodicidad preparadas; el formulario no se muta antes del éxito.
- `saveMovimiento` envía un payload nuevo con la fecha preparada; el formulario no se muta antes del éxito.
- `savePago` envía un payload nuevo con la fecha y, en altas, el importe ajustado; el formulario no se muta antes del éxito.
- Pruebas unitarias de la utilidad, sin base de datos ni DOM.
- Página de la utilidad, entrada en `doc/index.md` y entrada en `docNavigation`.

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Utilidad | `node --test backend/test/fechasFormulario.test.mjs` | 3 pruebas pasadas; 0 fallos. |
| Sintaxis | `node --check src/utils/fechasFormulario.js` | Sin errores. |
| Parche principal | `node /tmp/f16-payloads-fechas.mjs --check`, dos veces | `Plan válido: 8 ficheros; sin escrituras.` en ambas. |
| Parche de documentación | `node /tmp/f16-docs-fechas.mjs --check`, dos veces | Pendiente de ejecutar por el usuario. |
| Aplicación | Ambos scripts con `--apply`, `npx eslint --fix` y `git diff --check` | Pendiente de ejecutar por el usuario. |
| Prueba manual | Reintento tras error en Ahorros y Anticipos | Pendiente de ejecutar por el usuario. |

### Continuidad

- Qué no asumir: que los parches estén aplicados, que las pruebas de interfaz se hayan ejecutado o que el reintento esté verificado hasta completar las comprobaciones pendientes.
