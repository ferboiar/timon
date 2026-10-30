# Estado del proyecto Timón

Documento de relevo: léelo primero si retomas el proyecto o abres una conversación nueva. Se actualiza en cada PR (DC-27). Última actualización: 2026-10-30, punto de reanudación tras el PR #44 (D-18).

## 0. Punto exacto de reanudación

Corte operativo: 2026-10-30, main en 20ccc7414145700515f87a77ba859de5d6e12267 (PR #44 fusionado). Desde el corte anterior (4b8aad10, PR #41) se fusionaron el PR #42 (D-17, DC-33), el #43 (homogeneidad del front) y el #44 (cierre de D-15). Este relevo se pone al día (D-18); no corrige funcionalidad.

**D-15 (cerrada el 2026-10-30):** ayudante revisado; sin cambios necesarios. Protege `.db_connection`/`.env*` por diseño, verifica identidad y contenido, y crea copias antes de escribir. El incidente de `.db_connection` de esta iteración no fue causado por el ayudante.

**Siguiente trabajo:** el resto de la agrupación de la fase 1 (sección 10 del registro), empezando por el grupo 2 (F-12/F-13/DC-05). La limpieza de Actualizar fechas (F-11/F-23/F-32) se completó el 2026-10-27 (PR de limpieza). La auditoría fue un inciso y sus cierres parciales no acreditan una certificación integral.

**Incorporado:** división del registro en partes (D-16, DC-28), PR #38, 2026-10-28; validación de un solo año al editar recibos (DC-14, DC-29), PR #39, 2026-10-28; F-17 y retirada de `saldoRestante` (variable no usada de `Advances.vue`), PR #40, 2026-10-28; F-07, F-08, F-09, F-22 y F-10 (Ahorros y categorías), PR #41, 2026-10-29; D-17 y DC-33 (instrucción persistente dividida), PR #42, 2026-10-29; U-09, U-10, U-11 parcial, U-12 y F-44 (homogeneidad del front), PR #43, 2026-10-30; D-15 (revisión del ayudante de parches), PR #44, 2026-10-30.

**Trabajo preparado, sin fusionar:** D-18 (informes de cierre retroactivos de los PR #43 y #44 y relevo al día), rama `mantenimiento/D-18-informes-pr43-pr44`, 2026-10-30. F-14 sigue abierto.

Conservar Generar nuevas fechas y la generación anual. No borrar generarFechasFuturas, todavía usada por pushRecibo (F-12). Leer la sección 5 y el relevo de la sección 8 antes de preparar código. La tabla de prioridad técnica no cambia silenciosamente este orden operativo.

La rama local, archivos sin confirmar y la ejecución de pruebas no se pueden deducir del estado remoto: comprobarlos al retomar.

## 1. Qué es y cómo está montado

Timón es una aplicación de finanzas domésticas: recibos periódicos, anticipos, ahorros, cuentas, categorías y usuarios con roles.

- Frontend: Vue 3 con Vite y PrimeVue 4 (plantilla Sakai) en `src/`: pantallas en `src/views/pages`, servicios de API en `src/service`, composables en `src/composables` y `src/layout/composables`.
- Backend: Node con Express (módulos `.mjs`) en `backend/src`: rutas en `routes`, acceso a datos en `db`, middleware en `middleware`, utilidades en `utils`. Autenticación con JWT y contraseñas con `bcrypt`.
- Base de datos: MariaDB 11.8, base `conta_hogar` en el host `mariadb01` (DC-04, DC-07). El esquema se define solo en `backend/src/db/migrations` (DC-13): 0001 línea base, 0002 esquema de recibo por año, 0003 partición de recibos por año y retirada de `recibos_historico`, 0004 tabla `ajustes_sistema`, procedimiento `generar_recibos_anio` y evento diario.
- Documentación: `doc/`, con índice en `doc/index.md`. Hallazgos, decisiones (DC) y plan: `doc/mantenimiento/registro-hallazgos.md` (entrada y mapa; el contenido está en `registro-hallazgos_1de3.md`, `_2de3.md` y `_3de3.md`, DC-28). Reglas de trabajo: `doc/mantenimiento/instruccion-persistente.md` (entrada y cuatro partes, DC-33). Lista corta de tareas: `TODO`.
- Visor de la documentación: la pantalla `Tech-documentation.vue` carga `doc/**/*.md` y su navegación se mantiene a mano (`docNavigation`).
- Desarrollo: contenedor en `/workspaces/timon`; repositorio `ferboiar/timon`. Node 20.9 o superior de la serie 20.

## 2. Cómo se trabaja

- Una rama por cambio, un PR por rama, fusionado en `main`. El nombre de la rama lleva la fase (o `mantenimiento`) y todos los IDs desglosados, por ejemplo `correccion/fase-1-F07-F08-F09-F22-F10-ahorros-categorias` o `mantenimiento/D-17-dividir-instruccion-persistente`.
- Cada commit y cada PR citan sus IDs (F-xx, S-xx, DC-xx). En el mismo PR se actualizan `doc/`, `TODO`, el plan de la sección 10 del registro y este documento (DC-27). Un documento nuevo se añade también a `docNavigation`.
- Una decisión nueva es una fila DC-nn en el registro. Siguientes identificadores libres: DC-35, D-19, F-45, S-13, R-14 y U-13. Consultar siempre el registro antes de asignarlos.
- Mensajes de commit: `tipo(IDs): resumen`, con cada ID desglosado (por ejemplo `fix(F-07, F-08): resumen`), y cuerpo en español. El título del PR sigue el mismo formato. Descripción del PR con «Qué hace», «Verificado» y «Pendiente».
- Toda operación nueva o modificada deja trazas en el log con el formato «módulo - acción: datos» (DC-09).
- Antes del commit: `npx eslint --fix <ficheros>`, `node --check` en los módulos del backend y prueba en pantalla. Las pruebas del backend (`npm run test:backend`) necesitan una base MariaDB de pruebas; ver `backend/test/README.md`.
- No se añaden nunca a un commit `backend/src/db/.db_connection` (va cifrado con git-crypt y la pestaña Base de Datos lo reescribe, por lo que aparece como modificado) ni `backend/src/db/.db_connection.backup` (lo crea esa misma pestaña).
- Ante discrepancias manda el orden de DC-03: el Excel del usuario, la documentación de diseño, la BD viva y, por último, el código.
- Los cambios se han entregado como parches o scripts de Node generados fuera del repositorio, aplicados por rama; no hay herramienta de migraciones ni de generación de documentación en el repositorio.

## 3. Cómo funciona hoy

### Recibos
- Cada recibo es el de un año natural (DC-14). El del año siguiente es otra fila enlazada con `recibo_origen_id` (único: un sucesor como mucho). Los años pasados no se modifican.
- Las fechas siguen un patrón anclado en la `fecha_inicial` y la periodicidad (DC-16). Cada fecha de cargo tiene estado (`pendiente` o `cargado`; `rechazado` espera a DC-01) e importe propio opcional (DC-15).
- La pantalla muestra el año elegido y, en el año en curso, los pendientes de años anteriores como «Atrasado» (DC-18, DC-19). Un año anterior es un ejercicio cerrado (DC-20). Un cargo pagado solo se edita el mes en que vence, salvo con la opción de sesión del administrador (DC-21). «+» y «Generar nuevas fechas» siguen DC-22.
- Al editar, el modo de fechas es siempre manual; el automático solo reescribe las fechas pendientes (DC-11).
- Todas las fechas de un recibo deben caer en su año natural (DC-14): la pantalla avisa antes de enviar y el servidor responde 400. Excepción para el administrador: el interruptor de sesión «Permitir declarar fechas fuera del año en curso» de Ajustes › Administrar recibos (DC-29).
- El procedimiento `generar_recibos_anio` crea los recibos del año siguiente. Un evento horario actúa a las 03:00 en la zona horaria de los ajustes. Solo inserta, y el interruptor `crear_recibos_automaticamente` lo activa o desactiva. Ajustes › Administrar recibos permite vista previa y ejecución manual (DC-17, DC-24).

### Otros módulos
- Anticipos: planes de pago. Al borrar un pago, «Recalcular pagos» sigue DC-12; el pago sugerido se valida como número (F-02). No usa transacciones (F-27).
- Ahorros: `ahorrado` es el valor inicial más los movimientos y solo se edita a mano sin movimientos (DC-10).
- Cuentas: un IBAN vacío se guarda como NULL (F-06). El saldo es manual (F-21).
- Categorías: el servidor guarda el nombre en minúsculas (DC-31), edita por ID y rechaza duplicados (F-09, F-22); el índice único (DC-02) no existe todavía.
- Calendario: vista anual de los cargos y totales por mes (`doc/components/Calendar.md`). Presupuestos, Transacciones, Automatización y Préstamos son páginas vacías de la plantilla.
- Usuarios: roles `admin`, `user`, `limited_user` y `reader`, y permisos `perm_*` por módulo. Los endpoints de datos todavía no aplican esos permisos (S-01, fase 2). Las rutas de `/api/users` exigen administrador; las de preferencias de estilo, solo sesión.

### Ajustes (`/settings`)
- Pestañas: General, Usuarios, Aspecto, Administrar recibos y Base de Datos. Aspecto la ven todos; el resto, solo los administradores, que abren en General.
- Zona horaria (DC-25): las horas se guardan en UTC y el ajuste `zona_horaria` decide «hoy», el año y el mes en curso y cómo se muestran las horas.
- Apariencia general (DC-26): `system`, `light` o `dark`, por usuario. Se guarda en el servidor y se recuerda en el navegador (`timon.colorScheme`) para no parpadear al cargar; al llegar las preferencias del servidor, estas mandan.
- Base de Datos: configuración de la conexión (`.db_connection`), copia de seguridad y restauración. Tiene hallazgos abiertos de seguridad (S-02, S-03).

## 4. Historial de PR

| PR | IDs | Contenido |
|---|---|---|
| #14 | Fase 0 | Registro, migración 0001 y pruebas base |
| #15 a #18 | F-01, F-02, F-24, F-25, F-26, F-03 | Propietario en las altas, validación del pago sugerido, borrado de pagos y movimientos de ahorro |
| #19 | F-06 | IBAN vacío guardado como NULL |
| #20 | F-04, F-18, F-29 | Edición en manual y automático solo sobre fechas pendientes |
| #21 | F-33, F-36 | «Recalcular pagos» completa el plan hasta el pago sugerido |
| #22 | DC-14 | Esquema de recibo por año |
| #23 | DC-15, DC-16, DC-18 a DC-22 | Importe por cargo, fechas del año, ejercicio cerrado y vista por año |
| #24 | DC-14, DC-23 | Migración 0003 y retirada de `recibos_historico` |
| #25 | DC-17, DC-24, DC-25 | Procedimiento y evento de recibos del año |
| #26 | DC-25 | Zona horaria y rutas de ajustes en el servidor |
| #27 | DC-21, DC-25 | Ajustes General y Administrar recibos; zona horaria en pantalla |
| #28 | DC-26 | Ajustes › Aspecto con apariencia general y pestañas reordenadas |
| #29 | DC-27, D-10 | Primera puesta al día documental, TODO y documento de relevo |
| #30 | DC-27, D-11 | Cierre del contraste documental y tareas F-37 a F-40 |
| #31 | D-12 | Verificación de documentación, fallos F-41 a F-43/S-12 y propuestas R-05 a R-08 |
| #32 | D-13 | Documentación de raíz clasificada y requisitos R-09 a R-13 priorizados |
| #33 | D-14 | Relevo operativo: punto de reanudación, alcance del primer PR y protocolo de otro chat |
| #34 | DC-27 | Editor de parches reforzado en dev/utils/ayudas.mjs con pruebas |
| #35 | — | Instrucción persistente de funcionamiento incorporada a doc/mantenimiento (sin ID de hallazgo) |
| #38 | D-16, DC-28 | Registro de hallazgos dividido en partes |
| #39 | DC-14, DC-29 | Un recibo no puede tener fechas de otro año; interruptor de sesión en Ajustes |
| #40 | F-17 | `return` en `confirmDeleteAdvance` y retirada de `saldoRestante` |
| #41 | F-07, F-08, F-09, F-22, F-10 | Ahorros y categorías: borrado, inactivos, renombrado por ID, duplicados y borrados bloqueados por FK |
| #42 | D-17, DC-33 | Instrucción persistente dividida en entrada y cuatro partes |
| #43 | U-09, U-10, U-11, U-12, F-44 | Homogeneidad del front: guardar sin cambios, inactivos, tooltips de ayuda y textos en minúsculas |
| #44 | D-15 | Cierre de la revisión del ayudante de parches |

Los PR #1 a #13 son una copia de seguridad y propuestas automáticas de actualización de dependencias (Snyk), sin fusionar salvo #1 y #2.

## 5. Siguiente paso operativo

La limpieza de Actualizar fechas (F-11/F-23/F-32) ya está hecha (2026-10-27). El siguiente trabajo acordado es el grupo 2 de la fase 1 (F-12/F-13/DC-05), no implementar automáticamente el backlog P0/P1 ni reiniciar una auditoría sin petición del usuario.

1. [x] Retirar el flujo global antiguo: updateAllDates (ListBills), updateAllBillsDates (BillService), POST /api/recibos/actualizar-fechas, actualizarFechasRecibos y generarNuevasFechasRecibo (db_utils). Hecho el 2026-10-27; los dos errores de eslint de ListBills corregidos.
2. Conservar generateDates, generateBillDates, POST /:id/generar-fechas, completarFechasAnio y la generación anual. Conservar generarFechasFuturas: pushRecibo aún la usa, y F-12 sigue abierto.
3. Actualizar documentación, registro y TODO en ese mismo PR; comprobar UI y pruebas donde sea posible, sin certificar lo no ejecutado.
4. [x] Validación de un solo año al editar recibos (DC-14, DC-29): incorporada (PR #39). [x] Errata F-17 de Advances: incorporada (PR #40).

El relevo operativo más abajo fija archivos, exclusiones, aceptación, entorno y cómo retomar en otro chat. La prioridad de seguridad antes de producción no altera silenciosamente este siguiente paso ya acordado.

## 6. Mapa de `doc/`

- `index.md`: índice por sistemas.
- `components/`: una página por pantalla (Accounts, Advances, Calendar, Categories, ListBills, Login, ProfileSettings, Savings y las páginas vacías).
- `services/`, `composables/`, `utils/`, `config/`, `directives/`, `router/`, `middleware/`, `auth/`: frontend y utilidades de backend.
- `routes/`: API por módulo. `db/`: acceso a datos, procedimiento de recibos y `schema/` (diseño; la fuente del esquema son las migraciones).
- `mantenimiento/`: la instrucción persistente (entrada y cuatro partes `instruccion-persistente_NdeN.md`), el registro (entrada y tres partes `registro-hallazgos_NdeN.md`) y este documento; los informes de cierre de cada PR están en `mantenimiento/informes_iteraciones/`.

## 7. Retomar en una conversación nueva

No hace falta reconstruir la memoria del chat. Leer la instrucción persistente (entrada y todas sus partes), este documento (en especial secciones 0, 5 y 8), TODO y el registro (entrada y todas sus partes), no solo un resultado truncado. Adjuntar la salida actual de git status --short, git branch --show-current y git log --oneline -5. Si hay cambios locales posteriores, revisarlos antes de cambiar de rama. Los archivos /tmp y _adjuntos de otro equipo no son accesibles automáticamente desde un chat nuevo.

Texto recomendado para el primer mensaje:

```text
Estamos retomando el mantenimiento de ferboiar/timon, no empezando un proyecto nuevo.

Lee primero doc/mantenimiento/instruccion-persistente.md (entrada) con todas sus partes instruccion-persistente_1de4.md a instruccion-persistente_4de4.md, en orden, y después doc/mantenimiento/estado-del-proyecto.md, incluido el relevo operativo, TODO y doc/mantenimiento/registro-hallazgos.md (entrada) con todas sus partes registro-hallazgos_1de3.md a registro-hallazgos_3de3.md, en orden. Si una herramienta trunca un fichero, completa su lectura antes de afirmar que lo has revisado. Comprueba el estado real de la rama y los últimos commits; no borres cambios locales.

El siguiente trabajo acordado figura en la sección 0 del relevo y en TODO; no lo deduzcas de este texto. No borres generarFechasFuturas: aún la usa pushRecibo y F-12 sigue abierto.

Sigue los criterios de aceptación y las reglas de trabajo del relevo. No deduzcas requisitos de datos de prueba, no toques .db_connection ni su copia, y no presentes una auditoría parcial como completa ni pruebas no ejecutadas como verificadas. Entrega un único conjunto de comandos, lista exacta de git add y título/descripción completos del PR.

Mi git status --short, rama y últimos commits son:
[pegar aquí la salida actual]
```

## 8. Relevo operativo completo

Fecha de preparación: 2026-10-27. Base confirmada: main en 4d73e0692accd7e71c5c1e9e238b2c012f5910c4, merge del PR #35. Los PR #29 a #32 son documentación; no constituyen nuevas correcciones funcionales. Confirmar el HEAD y estado del workspace al retomar, no suponer que la rama local está actualizada.

### Objetivo y siguiente trabajo

Después de guardar este relevo, continuar el mantenimiento de código de la fase 1, en este orden acordado, un PR por punto:

1. [x] Limpieza de Actualizar fechas: F-11, F-23 y F-32 (hecha el 2026-10-27).
2. [x] Validación de un solo año al editar un recibo: DC-14, DC-29, servidor y pantalla (incorporada, PR #39).
3. [x] F-17: re; turn; en confirmDeleteAdvance de Advances.vue (incorporada, PR #40).

La tabla P0/P1/P2/P3 ordena el backlog por riesgo; no ha sustituido ese siguiente paso expresamente acordado. Antes de desplegar de verdad, autorización, integridad y recuperación son prioritarias. Los requisitos recuperados de notas históricas no están automáticamente aprobados para implementar.

### Primer PR: alcance exacto

Archivos de implementación que revisar:

- src/views/pages/ListBills.vue: retirar updateAllDates y el botón comentado de Actualizar fechas. Comprobar con ESLint los dos errores mencionados como pendientes; no dar por actual ese recuento sin ejecutar el linter.
- src/service/BillService.js: retirar updateAllBillsDates.
- backend/src/routes/recibos.mjs: retirar POST /api/recibos/actualizar-fechas, su import y referencias.
- backend/src/db/db_utils.mjs: retirar actualizarFechasRecibos y generarNuevasFechasRecibo, sus exportaciones y referencias, después de comprobar todos los consumidores.

No retirar:

- generateDates de ListBills, generateBillDates de BillService, POST /api/recibos/:id/generar-fechas ni completarFechasAnio.
- fechasFaltantes, generarFechasDelAnio, generarRecibosAnio, la vista previa, la generación anual manual ni el evento de MariaDB.
- generarFechasFuturas: también la usa pushRecibo al reescribir fechas en automático. Por eso F-12 sigue abierto y no debe marcarse resuelto por la limpieza.

No incluir de paso validación de año, F-17, permisos, nuevas periodicidades ni otra migración. No cambiar fórmulas, importes, cadencia ni datos de la base real.

### Comprobaciones del primer PR

Antes de editar: buscar las referencias a los nombres anteriores en todo el repositorio, incluido backend/test. Al terminar: repetir la búsqueda; lo retirado solo debe quedar en menciones históricas claramente etiquetadas. Revisar el diff para asegurar que no se alteran fechas ni saldos.

Actualizar en el mismo PR la documentación afectada (ListBills, BillService, routes/recibos y db_utilsBill), registro, TODO y estado-del-proyecto. Marcar F-11/F-23/F-32 como corregidos solo cuando la eliminación y sus comprobaciones estén hechas. Mantener F-12 abierto.

Ejecutar ESLint sobre los ficheros del frontend tocados y node --check en los módulos backend. Ejecutar pruebas del backend con BD de pruebas configurada, o indicar explícitamente el bloqueo. Prueba manual: selector de año, edición manual/automática, estado pagado/pendiente y Generar nuevas fechas siguen funcionando; Ajustes conserva vista previa/generación anual. No escribir Verificado si no se ha realizado la prueba correspondiente.

### Entorno y pruebas

- Frontend Vue 3/Vite/PrimeVue 4, backend Node/Express .mjs; Node serie 20, según package.json.
- Contenedor /workspaces/timon en Synology; MariaDB 11.8 en mariadb01, base de aplicación conta_hogar.
- Esquema solo en backend/src/db/migrations: 0001 a 0004. No usar notas SQL de raíz como migraciones ni reaplicar la línea base sobre la BD real.
- Tests: npm run test:backend ejecuta node --test backend/test/. El fichero fase0.test.mjs es un nombre histórico y ya incluye pruebas posteriores.
- La última salida aportada falló en preparación con ENOTFOUND mariadb-test, con 54 tests descubiertos, 0 superados y 53 cancelados. No son 54 fallos funcionales y no hay una ejecución nueva en verde.
- Opción A: backend/test/README.md explica usar mariadb01 con timon_test y conta_hogar_test, pasando TEST_DB_HOST/USER/PASSWORD. La contraseña se introduce en terminal, no se pega en el chat.
- Opción B: arrancar docker-compose.test.yml en el host de Docker, red externa backend, y ejecutar desde el contenedor conectado a esa red.
- Las pruebas borran y recrean TEST_DB_NAME: solo *_test y nunca conta_hogar. No lanzar migraciones, generación anual, backup/restore ni pruebas destructivas contra datos reales para verificar esta limpieza.

### Reglas y preferencias del usuario

- El usuario quiere continuidad sin depender de la memoria del chat: leer estado-del-proyecto, registro completo y TODO, comprobar el código actual y mantenerlos en cada PR.
- No confundir una búsqueda de nombres/enlaces con lectura y contraste del comportamiento. No prometer auditoría sin fisuras, pruebas en verde ni correcciones aplicadas sin evidencia.
- D-10 a D-13 fueron revisiones documentales incrementales, con omisiones reconocidas; D-13 no acredita una auditoría integral terminada. No reiniciar automáticamente otra auditoría en vez del siguiente PR de código.
- Entregar un único bloque de comandos vigente, una lista exacta de archivos preparados y título/descripción completos del PR. Evitar variantes incompatibles, recuentos supuestos y scripts dependientes de /tmp/ayudas.mjs de otra sesión.
- /tmp y _adjuntos son intercambio local, no fuente de verdad ni parte del repositorio. Un chat nuevo no puede leerlos por conocer su ruta.
- No añadir backend/src/db/.db_connection ni .db_connection.backup. La pantalla Base de Datos los reescribe; el primero puede aparecer modificado y la copia sin rastrear entre cambios de rama.
- Usar git add explícito; nunca incluir secretos o adjuntos por hacer git add -A. No usar reset --hard, clean ni restauraciones destructivas para conseguir un estado limpio.
- El conector puede truncar ficheros grandes: detectarlo y completar la lectura con adjuntos o un volcado verificable antes de afirmar revisión completa.
- Los datos de la BD son de pruebas y no determinan requisitos. Distinguir capacidad del código, restricciones actuales del esquema e intención de producto. DC-03 conserva la precedencia de decisiones, pero no permite falsear lo que hoy implementa el código.
- Ahorros puede ser diario, semanal, con otras cadencias o puntual, sin patrón. Hoy admite movimientos manuales y periodicidad NULL; F-37 trata opciones explícitas, R-09 automatización. No trasladar las reglas de recibos a Ahorros.
- Toda operación nueva/modificada deja trazas (DC-09). Documentación y continuidad se actualizan en el mismo PR (DC-27).

### Qué conservar del desarrollo ya incorporado

Recibos por año, importe por cargo, enlace recibo_origen_id, migraciones 0002/0003/0004 y retirada de recibos_historico. El procedimiento generar_recibos_anio/evento crea sucesores sin reescribir años pasados. La zona horaria de Ajustes decide hoy/año/mes; instantes en UTC y fechas DATE sin desplazamiento de día.

Ajustes: General, Usuarios, Aspecto, Administrar recibos y Base de Datos; administrador abre General y resto Aspecto. Apariencia system/light/dark guardada por usuario en servidor y cacheada en timon.colorScheme; el servidor prevalece. El botón de luna no persiste. Permitir editar/borrar pagados es de sesión, se reinicia también al recargar; el borrado forzado solo lo admite el administrador.

La lista completa de fallos está en el registro, no en esta síntesis. DC-01 (rechazado), DC-02 (unicidad de categorías) y dateStrings siguen pendientes; permisos reales también. Los documentos de raíz ya están clasificados como diseños históricos/ejemplos o descripción actual de package.json.

### Protocolo para arrancar otro chat

1. Leer este relevo y comprobar git status --short, rama y git log --oneline -5. No recrear una rama que ya exista ni asumir que el trabajo no confirmado en local está fusionado.
2. Leer doc/mantenimiento/estado-del-proyecto.md, TODO y el registro: registro-hallazgos.md (entrada) y sus tres partes, en orden (decisiones, entorno, aceptación, hallazgos y plan). No limitarse a dos secciones de un resultado truncado.
3. Si la rama actual tiene trabajo posterior, localizarlo y respetarlo antes de cambiar de rama. Las dos modificaciones de conexión conocidas no son permiso para ignorar cualquier otro cambio.
4. Si no hay otro trabajo en curso, empezar el PR de limpieza descrito arriba. Leer las funciones actuales y todos sus consumidores antes de proponer el parche.
5. Distinguir siempre decisiones del usuario, propuestas a revalidar, fallos abiertos y cambios probados.

No se recupera literalmente toda la conversación: el relevo recoge lo operativo para continuar de forma verificable, y los archivos del repositorio son la fuente persistente.

## Cierre de auditoría y fallos pendientes (2026-10-23)

El primer PR de documentación fue #29. El PR #30 incorporó el cierre D-11, completó los nueve documentos pendientes y registró los fallos F-37 a F-40. Informe: [auditoria-documentacion.md](./auditoria-documentacion.md). El contraste de esos nueve documentos fue estático; no significa que las funcionalidades estén corregidas, que haya pruebas de integración en verde ni que toda la documentación del repositorio haya pasado una auditoría integral.

Comportamiento actual que no debe prometerse como terminado:

- Ahorros: el filtro de inactivos, el interruptor «Ahorro activo» (F-08) y el borrado individual (F-07) están corregidos (PR #41); el concepto se envía capitalizado al guardar (F-44). No hay generación de aportaciones ni porcentaje de progreso. Ya admite movimientos manuales sin periodicidad; opciones explícitas de diaria/semanal son F-37.
- Anticipos: importe_total es saldo restante (F-14); mantener pagado al cambiar importe no ajusta saldo; borrar pagado no reactiva por sí solo el anticipo completado. Recalcular tras editar no equivale al algoritmo de completar tras borrar. Operaciones sin transacción (F-27).
- Botón de borrado múltiple de Anticipos sin flujo conectado (F-39); propuestas manuales de fecha de pago suman un mes fijo (F-40).
- saveUser/deleteUsers/changePassword solo leen token de localStorage (F-38); una sesión temporal no tiene el mismo soporte en esos métodos.
- Formularios que mutan fechas antes de éxito (F-16), CSV sin escape completo (F-19), avisos desiguales del servidor (F-28) y apiClient no usado por los servicios (S-07).

Todos tienen tareas concretas en TODO y en la sección 10 del registro. Se mantiene el siguiente orden acordado: limpieza de Actualizar fechas, validación de un año al editar y F-17, antes de esas correcciones agrupadas.

## Verificación del estado fusionado, 2026-10-24

D-12 parte de f4f2328, que incorpora el PR #30. Corrige el historial, la terminología y las funcionalidades sobreafirmadas. No modifica la aplicación ni demuestra pruebas funcionales nuevas.

Fallos abiertos añadidos: F-41 (longitud de descripción de Categorías), F-42 (validación de usuarios), F-43 (validación de borrados) y S-12 (restricciones efectivas de reader/limited_user).

Propuestas a evaluar: R-05 (progreso de Ahorros), R-06 (categorías transversales), R-07 (informes) y R-08 (paginación de usuarios). No se añaden pestañas a Recibos solo por una descripción antigua incorrecta. Se mantiene el orden de correcciones ya acordado.

## Alcance corregido de revisión: D-13

Base: `da4250e93a8746e1a465496d4d816537a62724ae`, PR #31. Las notas de raíz también forman parte de la documentación: ver la sección «Documentación de raíz y vigencia» del índice y el informe de auditoría.

Se clasifican las especificaciones antiguas y se recuperan R-09 a R-13, con prioridad y dependencias. No hay cambios funcionales ni migraciones. Los cierres D-10/D-11/D-12 no deben interpretarse como certificación de una auditoría global sin omisiones.

D-13 corrige cinco documentos de raíz y sincroniza sus tareas. La auditoría integral solicitada no se da por terminada mediante este cambio. No se repiten falsas garantías de «sin fisuras» o de pruebas en verde.
