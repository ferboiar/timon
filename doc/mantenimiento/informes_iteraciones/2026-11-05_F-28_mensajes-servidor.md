## Informe de cierre de iteración

### Objetivo y alcance

La rama `correccion/fase-1-F28-mensajes-servidor` contiene **dos partes separadas de la misma iteración**:

- **D-26, sincronización documental** (ya commiteada en `6e0ed6a` y `4f4ae79`): base `762d606`, PR #60 en el historial, F-20/F-21 como incorporados, contigüidad de la fila DC-43 en la tabla de decisiones, limpieza de la cláusula histórica de F-46 y estado vigente del registro §0.
- **F-28, mensajes del servidor** (objeto de este commit): que cualquier error de la API llegue al usuario con el mensaje del servidor, tanto si la ruta responde `{ error }` como `{ message }`.

Inclusiones de F-28: `src/utils/apiError.js`, `backend/test/apiError.test.mjs`, los servicios `UsersService`, `DbConfigService`, `AjustesService` y `MaintenanceDBService`, las pantallas `ProfileSettings`, `ListBills`, `Savings`, `Advances`, `Categories` y `Login`, la fila F-28 del registro y dos correcciones de backend acotadas al flujo de categorías.

Exclusiones: el resto de rutas del backend, `Tech-documentation.vue` (sus errores son de lectura de ficheros), permisos, esquema, migraciones y `Accounts.vue` (ya usaba el ayudante).

### Base

- Rama `correccion/fase-1-F28-mensajes-servidor`, creada desde `main` en `762d606ef3eeb5178963738a96ddce1b460580df`.
- PR anterior: #60 (F-20, F-21), fusionado el 2026-11-05.
- Dos commits D-26 sobre esa base: `6e0ed6a` (sincronización) y `4f4ae79` (registro §0). El padre de `6e0ed6a` es `762d606`.
- Cambios locales conocidos y ajenos: `backend/src/db/.db_connection` modificado y `.cline/` sin seguimiento. Ninguno se prepara.

### Cambios

- Código: `getApiErrorMessage` devuelve, por este orden, `data.error`, `data.message`, `error.message`, el propio valor si es una cadena, o «Error desconocido»; ignora vacíos y recorta espacios.
- Servicios: los cuatro usan el ayudante. En `UsersService` y `DbConfigService` (que usan `fetch`) el cuerpo del error y el texto por defecto viajan como `{ message: porDefecto, response: { data: cuerpo } }`, de modo que se conserva el mensaje propio de cada operación. `MaintenanceDBService` lanza `new Error(...)`, nunca el objeto de la respuesta.
- Pantallas: 37 avisos migrados conservando cada prefijo contextual; los textos con alternativa (`error.message || 'Texto'`) mantienen su texto por defecto.
- Pruebas: `backend/test/apiError.test.mjs`, 8 casos sin base de datos ni DOM.
- **Corrección posterior a la prueba manual (grupo A)**: `Login.vue` lee el cuerpo con el ayudante en el `throw` y usa `getApiErrorMessage(error)` en el `catch` (el envoltorio anterior pisaba el mensaje real con el texto por defecto); `routes/categorias.mjs` devuelve `error.message` sin el prefijo técnico; `db_utilsCats.mjs` lanza `Ya existe otra categoría con el nombre «nombre».`
- Documentación: `doc/utils/apiError.md` reescrito en lo afectado; fila F-28 del registro; relevo §0, §4 y §5; TODO.
- Esquema y API: no aplicable.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| `doc/utils/apiError.md` | Sí | Sí | Nueva prioridad de mensajes y pantallas cubiertas |
| `doc/mantenimiento/registro-hallazgos_2de3.md` | Sí | Sí | Fila F-28 |
| `doc/mantenimiento/estado-del-proyecto_1de3.md` | Sí | Sí | §0 (encabezado, siguiente trabajo, trabajo preparado) |
| `doc/mantenimiento/estado-del-proyecto_2de3.md` | Sí | Sí | §4 (fila del PR) y §5 |
| `TODO` | Sí | Sí | Reanudación, estado operativo y F-28 |
| `doc/mantenimiento/registro-hallazgos_3de3.md` | Sí | Sí | Plan de la sección 10 |
| `doc/mantenimiento/informes_iteraciones/index.md` | Sí | Sí | Fila de este informe |
| `doc/components/ProfileSettings.md`, `doc/routes/users.md` | Sí | No | Ya describen sus pantallas y rutas; el cambio no altera su contrato |
| `doc/services/BillService.md`, `doc/components/ListBills.md` | Sí | No | Sin cambio de comportamiento en los caminos migrados |
| `doc/routes/*.md` | Sí | No | No se toca el backend ni la forma de sus respuestas |

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Sintaxis | `node --check src/utils/apiError.js` | Sin salida |
| Pruebas del ayudante | `node --test backend/test/apiError.test.mjs` | 8 pruebas, 8 pasadas, 0 fallos |
| Sintaxis de los servicios | `node --check` de los cuatro | Sin salida |
| Lint | `npx eslint` de utilidad, prueba, servicios y pantallas | 0 errores, 0 avisos |
| Build del frontend | `npm run build:frontend` con salida a fichero | `BUILD_EXIT:0`, `✓ built` |
| Espacios | `git diff --check` | Sin salida |
| Sustituciones | Script `--check`/`--apply` con recuento por fichero | 37 reemplazos validados antes de escribir |
| Restos de `error.message` en servicios | `grep` | Solo la traza de `BillService` |
| Restos en pantallas | `grep` | Solo tres `console.error` de `ListBills` |
| Sintaxis del backend tocado | `node --check routes/categorias.mjs` y `node --check db/db_utilsCats.mjs` | Sin salida |
| Login, backend | `curl` público con usuario inexistente | `HTTP 401` · `{"success":false,"message":"Credenciales incorrectas"}` |
| **Prueba manual de pantalla** | Navegador del usuario, 2026-11-05 | **Confirmada**: login incorrecto («Credenciales incorrectas»), categoría duplicada («Error al guardar la categoría: Ya existe otra categoría con el nombre «ahorros».») e IBAN duplicado (mensaje específico del servidor) |

### No verificado

- **Grupos B y C no corregidos**: `cuentas.mjs:37`, `ahorros.mjs:33` y `:73` y `recibos.mjs:111`, más los cuatro borrados, siguen añadiendo un prefijo técnico y pueden devolver texto del motor. Sus funciones de datos (`pushAccount`, `pushSaving`, `pushMovimiento`, `pushRecibo`) relanzan el error original, así que no se puede garantizar que `error.message` sea de negocio. Queda registrado como **F-47**.
- **Suite completa del backend** (`npm run test:backend`): no ejecutada; requiere base `*_test`.

### Estado al preparar el informe

- D-26 commiteado en `6e0ed6a` y `4f4ae79`.
- F-28 aplicado, verificado y con la prueba manual confirmada por el usuario el 2026-11-05.
- Sin bloqueos técnicos. `backend/src/db/.db_connection` (filtro `git-crypt`, sin git-crypt en el contenedor) y `.cline/` quedan fuera del commit.

### Continuidad

- Siguiente trabajo: **F-47** (normalización de errores técnicos y de negocio en el backend: cuentas, ahorros, movimientos, recibos y borrado de categorías) y después F-30/F-31.
- Qué leer: `doc/utils/apiError.md`, la fila F-28 del registro y la sección 0 del relevo.
- Qué no asumir: que el PR esté fusionado, que la prueba manual esté hecha o que el backend use una sola forma de error (sigue enviando `{ error }` o `{ message }` según la ruta).
