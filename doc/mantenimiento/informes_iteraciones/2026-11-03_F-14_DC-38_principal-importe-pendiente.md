## Informe de cierre de iteración

### Objetivo y alcance

- F-14 y DC-38, paso a de cuatro: el principal del anticipo se guarda en `anticipos.importe_original` y el importe pendiente (antes `importe_total`, el saldo restante) deja de guardarse y se deriva de los pagos pagados. El estado `completado` se deduce de ese importe; `pausado` y `cancelado` siguen siendo manuales. Un pago pagado no puede pasar a cancelado.
- Inclusiones: migración 0005, lógica de `db_utilsAdv.mjs`, ruta de anticipos, `Advances.vue` (tabla, formulario, aviso, desplegable y CSV), diez pruebas de integración y la documentación y el seguimiento afectados.
- Exclusiones: transacciones y ruta de borrado única (paso b, F-27), plan automático o manual con vista previa y recálculo de los pagos pendientes al editar un pagado (paso c), fechas ancladas de Anticipos (paso d, F-46). Tampoco se corrige el saldo de datos antiguos más allá de lo que hace el relleno de la migración.

### Base

- Rama `correccion/fase-1-F14-saldo-anticipos`, creada desde `main` en `d59d1dd4f67acf097fa92f569903f60e3f38d5de` (merge del PR #52), comprobado con `git rev-parse HEAD` en el contenedor.
- PR anterior: #52 (D-22), fusionado el 2026-11-03, comprobado en el repositorio remoto con el conector. No hay PR abierto de este trabajo.
- Cambios locales conocidos y excluidos: `backend/src/db/.db_connection` (modificado) y `backend/src/db/.db_connection.backup` (sin rastrear).

### Cambios

- Esquema: migración `0005_anticipos_principal_pendiente_derivado.sql`. Añade `importe_original`, lo rellena con `importe_total` más los pagos pagados, pasa los `completado` a `activo` y retira `importe_total`. Es repetible.
- Servidor: `db_utilsAdv.mjs` define `SQL_PENDIENTE`, `SQL_ESTADO`, `SQL_ANTICIPO` y `leerPendiente`; `getAdvances` devuelve `importe_original`, `pendiente` y el estado efectivo. Se retiran los ajustes incrementales de saldo y las marcas de completado de `pushPago`, `deletePago` y `handlePaymentDeletion`. `pushAdvance` valida el importe y guarda `completado` como `activo`. `recalculatePaymentPlan` recibe solo el id. `pushPago` rechaza pasar de pagado a cancelado (400) y un pago inexistente.
- API: la ruta de alta recibe `importe_original`; las respuestas de borrado devuelven `pendiente` en lugar de `saldoRestante`.
- Interfaz: columnas «Importe» y «Pendiente», formulario con «Importe», sin «Completado» en el estado, «Cancelado» deshabilitado en un pago que estaba pagado, aviso rojo según el estado del pago, cuenta de importe no planificado del diálogo de borrado basada en el principal del servidor y CSV con ambas columnas.
- Pruebas: una prueba de la migración 0005 y nueve del modelo en `fase0.test.mjs`; la alta de F-01 usa `importe_original`.
- Documentación y seguimiento: `db_utilsAdv.md`, `routes/anticipos.md`, `components/Advances.md`, `doc/index.md`, registro (DC-38, F-14, U-06, plan, D-22), relevo (partes 1, 2 y 3), `TODO` y el índice de informes.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| doc/db/db_utilsAdv.md | Sí | Sí | Columnas, funciones, algoritmos, límites y trazas |
| doc/routes/anticipos.md | Sí | Sí | Cuerpo de alta, respuestas y reglas de pago |
| doc/components/Advances.md | Sí | Sí | Tabla, aviso, estados y límites |
| doc/index.md | Sí | Sí | «consulta del importe pendiente» |
| doc/mantenimiento/registro-hallazgos.md y partes 1 a 3 | Sí | Sí (partes 1, 2 y 3) | DC-38, F-14, U-06, plan y D-22 |
| doc/mantenimiento/estado-del-proyecto.md y partes 1 a 3 | Sí | Sí (partes 1, 2 y 3) | Base, trabajo activo, historial, migración 0005 y frase obsoleta del cierre de 2026-10-23 |
| TODO | Sí | Sí | Estado operativo, D-22 y F-14 |
| doc/mantenimiento/informes_iteraciones/index.md | Sí | Sí | Fila de este informe |
| README.md, README_en.md y .github/copilot-instructions.md | Sí (búsqueda de `importe_total`) | No | No describen el saldo de anticipos |
| backend/test/README.md | No | No | Las pruebas nuevas no cambian su procedimiento |
| DB_controlfinanciero.txt | Sí (búsqueda) | No | Especificación histórica de raíz, clasificada en D-13 |

### Verificación

Resultados aportados por el usuario en su contenedor y en `mariadb01`:

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Aplicación del modelo | `node --check`, `--check` y `--apply` de `f14-modelo-anticipos.mjs` | Plan válido: 13 ficheros; aplicado en 13 ficheros; copia en `/tmp/timon-ayudas-backup-i2tyZA` |
| Sintaxis, lint y espacios | `node --check` de tres ficheros, `npx eslint --fix src/views/pages/Advances.vue`, `git diff --check` | `CHECK` en 0 para los tres, `ESLINT_EXIT:0`, `DIFFCHECK:0` |
| Consumidores de `importe_total` | `grep -rn` en `backend/src` y `src` (`.mjs`, `.js`, `.vue`) | Sin coincidencias; en `backend/test` solo la prueba de la migración; en `doc`, README y `.github`, cuatro documentos explicativos o históricos |
| Suite tras el modelo | `npm run test:backend` con `mariadb01:3306`, `timon_test`, `conta_hogar_test` | `EXIT:0`; 95 pasan, 0 fallos (85 anteriores y 10 nuevas) |
| Renombre saldo a pendiente | `f14-renombrar-pendiente.mjs` y 17 marcadores con `grep` | 17 `OK`; el único «saldo» que queda en código es el aviso solicitado (`Advances.vue:878`) |
| Errata de títulos | `sed` de una coincidencia | Una coincidencia en cada fichero antes; después 2 y 1 |
| Suite tras el renombre | Igual que la anterior | 95 de 95; `EXIT:0` |
| Restos de «saldo» | `f14-restos-pendiente.mjs`, `node --check`, `eslint`, `git diff --check` | 5 ficheros; todos en 0 |
| Seguimiento U-06 | `grep` de la fila corregida | Línea presente; `U06_EXIT:0` |
| Suite final | Igual, con salida a `/tmp/suite-f14-final.log` | `EXIT:0`; `tests 95`, `pass 95`, `fail 0`; 226 s |
| Esquema real | `mariadb -h mariadb01 -u timon_admin conta_hogar` con `SHOW COLUMNS` y `SELECT` | Solo `importe_original` (`decimal(10,2) NOT NULL`); 12 anticipos con principal; `completados_guardados = 0` |
| Prueba en pantalla | Aplicación en el contenedor de desarrollo | Declarado por el usuario: pruebas manuales tras el modelo como se esperaba; tras el renombre, confirmados la columna «Pendiente», el CSV, el aviso rojo, «Cancelado» deshabilitado y el toast |

### No verificado

- El volcado de seguridad previo a la migración y la salida de su aplicación sobre `conta_hogar` no se aportaron; consta solo el esquema resultante.
- `npm run build` y las pruebas de interfaz automáticas no se ejecutaron; la pantalla consta solo como declarada, sin detalle por caso.
- Solo `node --check` en el backend; no hay lint del backend.
- Los pendientes no se recalculan al editar un pagado, no hay transacciones y la concurrencia no se ha ejercitado.
- El principal de 950 € del anticipo 32 se atribuye al saldo descuadrado por el fallo anterior; es una inferencia no comprobada con sus pagos.

### Estado al preparar el informe

- Scripts aplicados: `f14-modelo-anticipos.mjs`, `f14-renombrar-pendiente.mjs`, `f14-restos-pendiente.mjs` y `f14-u06.mjs`. El script de cierre (índice de informes, `doc/index.md` y estado de verificación en relevo, TODO y registro) se aplica en el mismo bloque que el commit.
- Migración 0005 aplicada en `conta_hogar` según el esquema aportado.
- Rama `correccion/fase-1-F14-saldo-anticipos`; 18 ficheros en el manifiesto, incluido este informe.

### Continuidad

- Siguiente trabajo: paso b de DC-38 (transacciones y ruta de borrado única, F-27), después el plan automático o manual (paso c) y las fechas ancladas (paso d, F-46).
- Qué leer: la entrada del relevo y sus tres partes, la instrucción persistente y sus cuatro partes, el registro (DC-38 y F-14), `TODO` y este informe.
- Qué no asumir: que este PR esté fusionado, que la migración 0005 esté aplicada en otros entornos, que los pagos pendientes se recalculen al editar un pagado ni que el principal de los anticipos antiguos sea el original.
