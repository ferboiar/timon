## Informe de cierre de iteración

### Objetivo y alcance

- **Objetivo:** cerrar en un PR único la trazabilidad de autor, el índice único de categorías y las validaciones pendientes de servidor y pantalla.
- **F-50 / DC-50:** `modificado_por` en recibos, ahorros, anticipos y presupuestos; `created_at` y `updated_at` en recibos; escrituras de rutas y subrecursos con el usuario vigente. `modificado_por` es la última persona que cambió el registro; las escrituras del sistema dejan NULL; la FK usa ON DELETE SET NULL; `propietario_id` sigue inmutable. Los subrecursos actualizan el padre en la misma transacción. Categorías, cuentas y filas hijas quedan fuera (F-53).
- **F-22 / DC-02:** índice único `uq_categorias_nombre` y traducción del duplicado concurrente a 400 de negocio.
- **F-52:** `pushSaving` normaliza a NULL los campos opcionales que el cliente omite.
- **F-43:** validación de cuerpos e identificadores de borrado de cuentas y ahorros antes de consultar la base.
- **F-42 / DC-51:** validación coherente de usuarios en servidor y pantalla. Contraseña de 8–72 caracteres, máximo 72 bytes UTF-8, al menos una letra y un número; obligatoria al crear y al cambiar, opcional en la edición (si llega, se valida igual).
- **F-41:** descripción de categorías limitada a 255 en control, validación y columna.
- **F-10:** borrados bloqueados por FK en cuentas, anticipos y recibos con mensaje de negocio y 409; en anticipos y recibos la traducción es defensiva porque el esquema actual no tiene una FK que los bloquee.
- **D-35:** sincronización con el PR #80, registro de DC-50, DC-51 y F-53, y documentación afectada.
- **Inclusiones:** migración 0006, backend de datos y rutas, validación de usuarios y categorías, pantalla de usuarios y categorías, pruebas unitarias, integración y E2E, documentación de rutas, datos, esquema, componentes y pruebas, TODO, relevo, registro, índice de informes y este informe.
- **Exclusiones:** F-49, S-04, S-02/S-03, F-39, F-40, F-37, DC-01, U-09/U-11, R-xx y la limpieza de las 9 ramas locales.
- **Límites:** `presupuestos` no tiene rutas de escritura; su columna queda preparada. La traducción FK de anticipos y recibos es defensiva. La trazabilidad por fila de subrecursos y catálogos queda en F-53.

### Base

- Rama `correccion/fase-1-F50-F22-F52-F43-F42-F41-F10-D35-DC-50-trazabilidad-y-validaciones`, creada desde `main` en `ecf83bb`.
- PR anterior: #80, fusionado el 2026-11-10T22:39:40Z con merge `ecf83bbad8c776ddf77071acbf0b1a3a186e0fa5`; comprobado con `gh pr view 80`.
- Cambio local conocido: `backend/src/db/.db_connection` modificado, fuera del manifiesto y no tocado.
- Migración 0006 aplicada a `conta_hogar` tras confirmación expresa; copia de seguridad en `/home/node/timon_backups/conta_hogar_antes_0006_20261111.sql`.
- `SET USER` es un permiso global temporal concedido a `timon_admin` para restaurar volcados con `DEFINER=root`. No se revoca en esta iteración; se revisará/revocará en una futura limpieza de permisos, sin fecha ni compromiso inmediato. Comando previsto: `REVOKE SET USER ON *.* FROM 'timon_admin'@'172.20.0.%'; FLUSH PRIVILEGES;`.

### Cambios

#### 1. F-50 y DC-50: trazabilidad

- Migración `0006_trazabilidad_y_categoria_unica.sql`: columnas, FK con `ON DELETE SET NULL`, índices y `created_at`/`updated_at` en recibos.
- `db_utils.mjs`: `pushRecibo`, `completarFechasAnio` y `deleteRecibo` rellenan `modificado_por` y actualizan explícitamente `updated_at` al tocar el padre.
- `db_utilsSav.mjs`: altas/ediciones y movimientos actualizan el autor y la fecha del padre.
- `db_utilsAdv.mjs`: anticipos, pagos, sustituciones, borrados y recálculo del plan actualizan el padre en la misma transacción.
- Las rutas pasan `req.usuario.id`; las escrituras del sistema dejan NULL.
- 27 recibos existentes reciben la marca de tiempo de la migración como `created_at`/`updated_at`; no hay otra fuente histórica.

#### 2. F-22 / DC-02: categorías

- Índice `uq_categorias_nombre` en la 0006, con guarda previa que falla si hay duplicados y no borra datos.
- `pushCategoria` traduce `ER_DUP_ENTRY` a 400 de negocio.
- Comprobación real antes de migrar: 9 categorías y 0 duplicados.

#### 3. F-52

- `pushSaving` normaliza a NULL `descripcion`, `fecha_objetivo`, `periodicidad` e `importe_periodico`.
- Prueba de integración que crea un ahorro con campos omitidos y comprueba NULL.

#### 4. F-43

- `DELETE /api/cuentas` valida `accounts` con `leerListaEnterosPositivos`.
- `DELETE /api/ahorros` valida `savings`; los movimientos validan sus IDs.
- Errores 400 antes de la base y prueba E2E de cuerpos inválidos.

#### 5. F-42 / DC-51

- Nuevo `backend/src/utils/validacionUsuarios.mjs` y espejo `src/utils/validacionUsuarios.js`.
- `POST /api/users`, `PUT /api/users` y `PUT /api/users/password` validan antes de hashear; la edición admite contraseña omitida y valida la que llegue.
- `ProfileSettings.vue` muestra mensajes por campo y deshabilita Guardar.
- Prueba de paridad backend/frontend y E2E de pantalla y API.

#### 6. F-41

- `validacionCategorias.mjs` limita la descripción a 255; `pushCategoria` la usa.
- `Categories.vue` usa `maxlength=255` y contador; el aviso contradictorio de 260 desaparece.
- La columna sigue siendo `VARCHAR(255)`.

#### 7. F-10

- `deleteAccounts` traduce FK a 409 de negocio (caso real).
- `deleteAdvances` y `deleteRecibo` traducen FK de forma defensiva.
- Helper puro `esErrorDeReferencia` y prueba de integración de cuenta usada por un recibo.

#### 8. D-35 y seguimiento

- TODO, relevo §0/§2/§4/§5, registro §0, D-34, S-18, plan §10 y documentación de rutas/db/schema/componentes actualizados.
- Registradas DC-50, DC-51 y F-53; PR #80 incorporado.
- Índice de informes y `doc/pruebas/e2e.md`/`e2e/README.md` actualizados.

#### 9. Despliegue

- La 0006 debe aplicarse a una base antes de arrancar este código contra ella; de lo contrario fallan las escrituras de recibos, ahorros y anticipos.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo |
|---|---|---|---|
| TODO | Sí | Sí | Cambio del PR |
| backend/src/db/db_utils.mjs | Sí | Sí | Cambio del PR |
| backend/src/db/db_utilsAcc.mjs | Sí | Sí | Cambio del PR |
| backend/src/db/db_utilsAdv.mjs | Sí | Sí | Cambio del PR |
| backend/src/db/db_utilsCats.mjs | Sí | Sí | Cambio del PR |
| backend/src/db/db_utilsSav.mjs | Sí | Sí | Cambio del PR |
| backend/src/db/migrations/0006_trazabilidad_y_categoria_unica.sql | Sí | Sí | Cambio del PR |
| backend/src/routes/ahorros.mjs | Sí | Sí | Cambio del PR |
| backend/src/routes/anticipos.mjs | Sí | Sí | Cambio del PR |
| backend/src/routes/cuentas.mjs | Sí | Sí | Cambio del PR |
| backend/src/routes/recibos.mjs | Sí | Sí | Cambio del PR |
| backend/src/routes/users.mjs | Sí | Sí | Cambio del PR |
| backend/src/utils/catalogoErrores.mjs | Sí | Sí | Cambio del PR |
| backend/src/utils/validacionCategorias.mjs | Sí | Sí | Cambio del PR |
| backend/src/utils/validacionUsuarios.mjs | Sí | Sí | Cambio del PR |
| backend/test/README.md | Sí | Sí | Cambio del PR |
| backend/test/catalogoErrores.test.mjs | Sí | Sí | Cambio del PR |
| backend/test/fase0.test.mjs | Sí | Sí | Cambio del PR |
| backend/test/paridadValidacionUsuarios.test.mjs | Sí | Sí | Cambio del PR |
| backend/test/rutasErrores.test.mjs | Sí | Sí | Cambio del PR |
| backend/test/validacionCategorias.test.mjs | Sí | Sí | Cambio del PR |
| backend/test/validacionUsuarios.test.mjs | Sí | Sí | Cambio del PR |
| doc/components/Categories.md | Sí | Sí | Cambio del PR |
| doc/components/ProfileSettings.md | Sí | Sí | Cambio del PR |
| doc/db/db_utilsAcc.md | Sí | Sí | Cambio del PR |
| doc/db/db_utilsAdv.md | Sí | Sí | Cambio del PR |
| doc/db/db_utilsBill.md | Sí | Sí | Cambio del PR |
| doc/db/db_utilsCats.md | Sí | Sí | Cambio del PR |
| doc/db/db_utilsSav.md | Sí | Sí | Cambio del PR |
| doc/db/db_utilsUsers.md | Sí | Sí | Cambio del PR |
| doc/db/schema/index.md | Sí | Sí | Cambio del PR |
| doc/db/schema/permisos.md | Sí | Sí | Cambio del PR |
| doc/index.md | Sí | Sí | Cambio del PR |
| doc/mantenimiento/estado-del-proyecto_1de3.md | Sí | Sí | Cambio del PR |
| doc/mantenimiento/estado-del-proyecto_2de3.md | Sí | Sí | Cambio del PR |
| doc/mantenimiento/informes_iteraciones/2026-11-11_F50-F22-F52-F43-F42-F41-F10-D35-DC-50-DC-51_trazabilidad-y-validaciones.md | Sí | Sí | Cambio del PR |
| doc/mantenimiento/informes_iteraciones/index.md | Sí | Sí | Cambio del PR |
| doc/mantenimiento/registro-hallazgos_1de3.md | Sí | Sí | Cambio del PR |
| doc/mantenimiento/registro-hallazgos_2de3.md | Sí | Sí | Cambio del PR |
| doc/mantenimiento/registro-hallazgos_3de3.md | Sí | Sí | Cambio del PR |
| doc/pruebas/e2e.md | Sí | Sí | Cambio del PR |
| doc/routes/ahorros.md | Sí | Sí | Cambio del PR |
| doc/routes/anticipos.md | Sí | Sí | Cambio del PR |
| doc/routes/categorias.md | Sí | Sí | Cambio del PR |
| doc/routes/cuentas.md | Sí | Sí | Cambio del PR |
| doc/routes/recibos.md | Sí | Sí | Cambio del PR |
| doc/routes/users.md | Sí | Sí | Cambio del PR |
| e2e/README.md | Sí | Sí | Cambio del PR |
| e2e/package.json | Sí | Sí | Cambio del PR |
| e2e/scripts/mapa-fuentes.mjs | Sí | Sí | Cambio del PR |
| e2e/tests/borradosEnUso.spec.mjs | Sí | Sí | Cambio del PR |
| e2e/tests/helpers/api.mjs | Sí | Sí | Cambio del PR |
| e2e/tests/helpers/timon.mjs | Sí | Sí | Cambio del PR |
| e2e/tests/recibosTrazabilidad.spec.mjs | Sí | Sí | Cambio del PR |
| e2e/tests/usuariosValidacion.spec.mjs | Sí | Sí | Cambio del PR |
| src/utils/validacionUsuarios.js | Sí | Sí | Cambio del PR |
| src/views/pages/Categories.vue | Sí | Sí | Cambio del PR |
| src/views/pages/ProfileSettings.vue | Sí | Sí | Cambio del PR |

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Sintaxis backend | `node --check` de los módulos tocados | `SINTAXIS_BACKEND_OK`, EXIT 0 |
| Sintaxis cliente | `node --check src/utils/validacionUsuarios.js` | EXIT 0 |
| ESLint | `npx eslint` de los tres ficheros de `src` tocados | EXIT 0, sin avisos |
| Unitarias | `node --test` de validación, parámetros y catálogo | `# tests 48`, `# pass 48`, `# fail 0`, `# cancelled 0`, EXIT 0 |
| Suite backend | `npm run test:backend:local` | `# tests 311`, `# pass 311`, `# fail 0`, `# cancelled 0`, EXIT 0 |
| Copia | `mariadb-dump` con `umask 077` | DUMP_EXIT 0; última línea `-- Dump completed`; 55362 bytes; SHA256 `aa86292e...f6c065`; tablas/rutinas/eventos/triggers 14/2/2/0 |
| Restauración | `conta_hogar_restore_test` con la misma colación | RESTORE_EXIT 0; 14/2/2/0; 18 FK; filas coincidentes |
| Ensayo 0006 | Dos aplicaciones en `conta_hogar_restore_test` | APPLY1_EXIT 0, APPLY2_EXIT 0; columnas, FK SET NULL e índice correctos; DROP_EXIT 0 |
| Migración real | 0006 sobre `conta_hogar` | APPLY_EXIT 0; esquema correcto; filas sin cambios |
| E2E trazabilidad | `--repeat-each=2` | 2 passed, EXIT 0 |
| E2E usuarios | `--repeat-each=2` | 6 passed, EXIT 0 |
| E2E borrados | `--repeat-each=2` | 6 passed, EXIT 0 |
| E2E sesión | `sesionCaducada.spec.mjs` | 4 passed, EXIT 0 |
| E2E autorización | `autorizacion.spec.mjs` | 3 passed, EXIT 0 |
| E2E subrecursos | `autorizacionSubrecursos.spec.mjs` | 4 passed, EXIT 0 |
| Suite E2E completa | `npm run e2e` | 37 passed (7.6m), EXIT 0 |
| Restos E2E | Barrido de todas las columnas de texto/JSON, excluyendo `e2e_piloto` | 0 restos; `conta_hogar_restore_test` ausente |
| Diff | `git diff --check` | EXIT 0 |
| Cifrado | `node scripts/comprobar-cifrado.mjs --indice` | correcto, EXIT 0 |

### No verificado

- La prueba manual de pantalla no se ha hecho de forma separada; la cobertura es E2E.
- La revocación de `SET USER` no se ejecuta en esta iteración por decisión expresa; queda para una limpieza futura de permisos.
- No se ha abierto PR ni se ha publicado nada al preparar este informe.

### Estado al preparar el informe

- Migración 0006 aplicada en `conta_hogar`; copia y restauración verificadas; `conta_hogar_restore_test` eliminada.
- Suite backend y E2E en verde; sin restos `e2e_` (excluido `e2e_piloto`).
- Cambios aplicados con `dev/utils/ayudas.mjs` (`--check` antes de `--apply`) y ficheros nuevos con `cat`.
- `.db_connection` sigue modificado y fuera del manifiesto. Sin commit, push ni PR.

### Continuidad

- **Siguiente trabajo:** revisar el manifiesto, confirmar el commit, publicar la rama y abrir el PR. Después, la limpieza de las 9 ramas locales fusionadas y el backlog, con S-04 y S-02/S-03 en cabeza.
- **Qué leer:** este informe, el relevo §0 y las filas F-41, F-42, F-43, F-50, F-52, F-53, DC-50, DC-51 y D-35 del registro.
- **Qué no asumir:** que la UI de privacidad (F-49) esté hecha; que `SET USER` se haya revocado; que la trazabilidad por fila de subrecursos/catálogos exista (F-53); que el PR esté publicado o fusionado.
