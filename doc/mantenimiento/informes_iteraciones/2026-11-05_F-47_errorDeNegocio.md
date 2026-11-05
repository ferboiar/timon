## Informe de cierre de iteración

### Objetivo y alcance

- **F-47**: distinguir error de negocio y error técnico en el backend para que la interfaz muestre mensajes seguros y específicos, sin prefijos técnicos duplicados ni texto del motor de base de datos.
- Inclusiones: utilidad `backend/src/utils/errorDeNegocio.mjs`; funciones de datos de cuentas, ahorros, categorías y recibos; rutas de cuentas, ahorros, categorías y recibos; pruebas de la utilidad y de las rutas; documentación de la utilidad y de esas rutas.
- **Fuera de alcance, registrado como F-48**: usuarios, conexión, mantenimiento, anticipos y ajustes, la migración de `ErrorDeAjuste` y la sustitución de las funciones locales `responderError` de anticipos y ajustes.
- Exclusiones: frontend (no se toca ninguna pantalla ni servicio; se mantienen sus prefijos), `.db_connection`, `.cline/`, esquema y migraciones.

### Base

- Rama `correccion/fase-1-F47-errores-negocio-tecnicos`, creada desde `main` en `e7154b73777972102c48fbc467a637a5e443b35e`.
- PR anterior: #61 (F-28, D-26), fusionado el 2026-11-05.
- Cambios locales conocidos y ajenos: `backend/src/db/.db_connection` (filtro `git-crypt` sin git-crypt en el contenedor) y `.cline/`. Ninguno se prepara.

### Cambios

- Utilidad: `ErrorDeNegocio(mensaje, status = 400, codigo = null)`, marca explícita `MARCA_ERROR_DE_NEGOCIO`, `esErrorDeNegocio` (reconoce la clase, sus subclases, la marca, y `ErrorDeRecibo`/`ErrorDeAjuste` por nombre y `status` entero; **no** cualquier error con `status`), `respuestaDeError` pura y `responderError` con clave y contexto.
- Datos: `db_utilsAcc` (propietario e IBAN duplicado con 409 y `IBAN_DUPLICADO`), `db_utilsSav` (ahorro, movimientos y bloqueos de borrado), `db_utilsCats` (duplicado, no encontrada y en uso) y `db_utils` (validaciones de `pushRecibo` y filtro de `getRecibos`, sin el prefijo `API. `; `ErrorDeRecibo` pasa a extender `ErrorDeNegocio`).
- Rutas: cuentas, ahorros, categorías y recibos usan `responderError`; se eliminan los prefijos técnicos, las heurísticas `startsWith` y `details: error.stack`; se conservan las claves `error` (alta/edición) y `message` (borrado de recibos).
- Pruebas: `backend/test/errorDeNegocio.test.mjs` (utilidad, marca, clases heredadas, `status` sin marca, respuestas y registro en el log) y `backend/test/rutasErrores.test.mjs` (guarda estática de las cuatro rutas incluidas).
- Documentación: `doc/utils/errorDeNegocio.md`, `doc/index.md`, `docNavigation`, `doc/utils/apiError.md`, y las páginas de las rutas de cuentas, ahorros, categorías y recibos.
- Seguimiento: F-47 corregido y **F-48 registrado** en el registro; plan de la sección 10; relevo §0, §2, §4 y §5; TODO.
- Esquema, API pública y frontend: no aplicable (el contrato de respuesta se mantiene; solo cambia el contenido de los mensajes técnicos y desaparece `details`).

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| `doc/utils/errorDeNegocio.md` | Sí | Nuevo | Página de la utilidad |
| `doc/index.md` | Sí | Sí | Enlace a la utilidad |
| `src/views/pages/Tech-documentation.vue` | Sí | Sí | `docNavigation` |
| `doc/utils/apiError.md` | Sí | Sí | El límite pasa a F-48 |
| `doc/routes/cuentas.md` | Sí | Sí | Nueva sección de manejo de errores |
| `doc/routes/ahorros.md` | Sí | Sí | Ídem |
| `doc/routes/categorias.md` | Sí | Sí | Ídem |
| `doc/routes/recibos.md` | Sí | Sí | Ídem, sin `details` |
| `doc/mantenimiento/registro-hallazgos_2de3.md` | Sí | Sí | F-47 corregido y F-48 registrado |
| `doc/mantenimiento/registro-hallazgos_3de3.md` | Sí | Sí | Plan de la sección 10 |
| `doc/mantenimiento/estado-del-proyecto_1de3.md` | Sí | Sí | §0 y §2 |
| `doc/mantenimiento/estado-del-proyecto_2de3.md` | Sí | Sí | §4 y §5 |
| `TODO` | Sí | Sí | F-47 cerrado y F-48 |
| `doc/routes/users.md`, `conexionDB.md`, `mantenimientoDB.md`, `anticipos.md`, `ajustes.md` | Sí | No | Pertenecen a F-48 |
| `doc/components/*.md` | Sí | No | Sin cambios de comportamiento en pantalla |

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Sintaxis de la utilidad y de los ocho módulos tocados | `node --check` | Sin salida |
| Pruebas de la utilidad | `node --test backend/test/errorDeNegocio.test.mjs` | 14 pruebas, 14 pasadas, 0 fallos |
| Guarda estática de las cuatro rutas | `node --test backend/test/rutasErrores.test.mjs` | 16 pruebas, 16 pasadas, 0 fallos |
| Prueba del ayudante del frontend | `node --test backend/test/apiError.test.mjs` | 8 pruebas, 8 pasadas, 0 fallos |
| Conjunto | las tres anteriores | 38 pruebas, 38 pasadas, 0 fallos |
| Lint del `.vue` tocado | `npx eslint src/views/pages/Tech-documentation.vue` | Sin avisos, `EXIT:0` |
| Build del frontend | `npm run build:frontend` | `BUILD_EXIT:0`, `✓ built` |
| Espacios | `git diff --check` | `EXIT:0` |
| Prefijos y `details` | `grep` en las cuatro rutas | 0 coincidencias |
| IBAN duplicado | revisión de código y prueba de `respuestaDeError` | 409 con `IBAN_DUPLICADO` y el mensaje de la cuenta |

### No verificado

- **Prueba manual de pantalla**: no ejecutada en esta iteración. Debe confirmar que la categoría duplicada, el IBAN duplicado y un error técnico forzado muestran lo esperado. No se declara superada.
- **Suite completa del backend** (`npm run test:backend`): requiere base `*_test`; las pruebas nuevas no la necesitan y se ejecutaron por separado.
- **Comportamiento real de MariaDB**: no se provocó un fallo del motor contra una base viva; la conversión se apoya en la revisión del código y en las pruebas de la utilidad.

### Estado al preparar el informe

- Rama con dos bloques sin commitear: núcleo (utilidad, datos, rutas, pruebas y documentación técnica) y consolidación (este informe y el seguimiento).
- Sin bloqueos. `.db_connection` y `.cline/` fuera del commit.

### Continuidad

- Siguiente trabajo: **F-48** (extender la normalización a usuarios, conexión, mantenimiento, anticipos y ajustes) y después F-30/F-31.
- Qué leer: `doc/utils/errorDeNegocio.md`, las filas F-47 y F-48 del registro y la sección 0 del relevo.
- Qué no asumir: que el PR esté fusionado, que todo el backend use ya el mecanismo (el resto es F-48) o que la prueba manual esté hecha.
