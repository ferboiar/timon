# Estado del proyecto Timón: parte 1 de 3

Parte 1 de 3 del [relevo](./estado-del-proyecto.md): secciones 0 a 3 (punto exacto de reanudación; qué es y cómo está montado; cómo se trabaja; cómo funciona hoy). Se lee completa y en orden con las demás: [parte 1 de 3](./estado-del-proyecto_1de3.md) · [parte 2 de 3](./estado-del-proyecto_2de3.md) · [parte 3 de 3](./estado-del-proyecto_3de3.md).

Documento de relevo: léelo primero si retomas el proyecto o abres una conversación nueva. Se actualiza en cada PR (DC-27). Última actualización: 2026-11-05, base tras el PR #60 (F-20, F-21); sin trabajo activo.

## 0. Punto exacto de reanudación

Corte operativo: 2026-11-05, main en 762d606ef3eeb5178963738a96ddce1b460580df, PR #60 fusionado el 2026-11-05 (F-20, F-21). Frente a la base anterior d59d1dd (PR #52) se incorporaron el paso a de DC-38 (F-14: principal guardado, importe pendiente y estado completado derivados, migración 0005; PR #53), el paso b (transacciones con bloqueo del anticipo, ruta única de borrado, sustitución atómica de pagos y recálculo al editar un pagado: F-27, DC-39, DC-40; PR #54) y el paso d (fechas ancladas de Anticipos: F-46, DC-41; PR #55), además de F-16 (payloads de fechas inmutables en Ahorros y Anticipos; PR #57), F-19 con D-24 (exportación CSV segura y sincronización del seguimiento; PR #58) y D-25 (sincronización del seguimiento tras el PR #58 y fila D-23; PR #59), F-20 con F-21 (retirada de `BillService.getBillById` y decisión DC-43 del saldo manual; PR #60). El resto del paso c se declara no aplicable por DC-42 y F-14 queda cerrado.

**D-15 (cerrada el 2026-10-30):** ayudante revisado; sin cambios necesarios. Protege `.db_connection`/`.env*` por diseño, verifica identidad y contenido, y crea copias antes de escribir. El incidente de `.db_connection` de esta iteración no fue causado por el ayudante.

**Siguiente trabajo:** ninguno acordado. El siguiente punto de la lista ordenada del TODO es F-28 (mensajes del servidor), no iniciado. F-14 / DC-38 está cerrado: (a) incorporado (PR #53), (b) incorporado (PR #54: F-27, DC-39, DC-40), (d) incorporado (PR #55: F-46, DC-41) y el resto del paso c —modo automático o manual del plan y vista previa— declarado no aplicable por DC-42. El recálculo al editar un pagado (DC-40) sí está incorporado.

**Incorporado:** división del registro en partes (D-16, DC-28), PR #38, 2026-10-28; validación de un solo año al editar recibos (DC-14, DC-29), PR #39, 2026-10-28; F-17 y retirada de `saldoRestante` (variable no usada de `Advances.vue`), PR #40, 2026-10-28; F-07, F-08, F-09, F-22 y F-10 (Ahorros y categorías), PR #41, 2026-10-29; D-17 y DC-33 (instrucción persistente dividida), PR #42, 2026-10-29; U-09, U-10, U-11 parcial, U-12 y F-44 (homogeneidad del front), PR #43, 2026-10-30; D-15 (revisión del ayudante de parches), PR #44, 2026-10-30; D-18 (informes de cierre retroactivos y relevo al día), PR #45, 2026-10-30; F-12 (secuencia anclada en `generarFechasFuturas`) y DC-35 (el grupo 2 se divide en dos PR), PR #46, 2026-11-01; F-45 (guardar sin cambios con el modo de fechas) y D-19 (errata del informe del PR #43), PR #47, 2026-11-01; F-13 y DC-05 (fechas `DATE` como texto en el pool de MariaDB), PR #48, 2026-11-02; D-20 (documentación técnica e índice de informes), PR #49, 2026-11-02; U-13/DC-36 (simulación de diciembre), PR #50, 2026-11-02; D-21 (contraste documental de cambios recientes e informe retroactivo del PR #42), PR #51, 2026-11-02; D-22 y DC-37 (relevo dividido en entrada y tres partes), PR #52, 2026-11-03; F-14 / DC-38 paso a (principal guardado e importe pendiente derivado, migración 0005), PR #53, 2026-11-03; F-27, DC-39 y DC-40 (transacciones, ruta de borrado única, sustitución atómica y recálculo al editar un pagado), PR #54, 2026-11-04; F-46 y DC-41 (fechas ancladas de Anticipos), PR #55, 2026-11-04; D-23 y DC-42 (cierre del paso c de DC-38 y de F-14), PR #56, 2026-11-04; F-16 (payloads de fechas inmutables en Ahorros y Anticipos), PR #57, 2026-11-04; F-19 y D-24 (exportación CSV segura y sincronización del seguimiento), PR #58, 2026-11-05; D-25 (sincronización del seguimiento tras el PR #58 y fila D-23), PR #59, 2026-11-05; F-20 y F-21 (retirada de `BillService.getBillById` y decisión DC-43 del saldo manual), PR #60, 2026-11-05.

**Trabajo preparado, sin fusionar:** ninguno. Los PR #55 (F-46 / DC-41), #56 (D-23 / DC-42), #57 (F-16), #58 (F-19 / D-24), #59 (D-25) y #60 (F-20 / F-21) están fusionados; el resto del paso c de DC-38 se declara no aplicable por DC-42. U-13 está incorporado (PR #50); su ejecución real nueva y bloqueo concurrente siguen sin ejercitarse.

Conservar Generar nuevas fechas y la generación anual. No borrar generarFechasFuturas, usada por pushRecibo (F-12 corregido: calcula la secuencia anclada). Leer la sección 5 y el relevo de la sección 8 antes de preparar código. La tabla de prioridad técnica no cambia silenciosamente este orden operativo.

La rama local, archivos sin confirmar y la ejecución de pruebas no se pueden deducir del estado remoto: comprobarlos al retomar.

## 1. Qué es y cómo está montado

Timón es una aplicación de finanzas domésticas: recibos periódicos, anticipos, ahorros, cuentas, categorías y usuarios con roles.

- Frontend: Vue 3 con Vite y PrimeVue 4 (plantilla Sakai) en `src/`: pantallas en `src/views/pages`, servicios de API en `src/service`, composables en `src/composables` y `src/layout/composables`.
- Backend: Node con Express (módulos `.mjs`) en `backend/src`: rutas en `routes`, acceso a datos en `db`, middleware en `middleware`, utilidades en `utils`. Autenticación con JWT y contraseñas con `bcrypt`.
- Base de datos: MariaDB 11.8, base `conta_hogar` en el host `mariadb01` (DC-04, DC-07). El esquema se define solo en `backend/src/db/migrations` (DC-13): 0001 línea base, 0002 esquema de recibo por año, 0003 partición de recibos por año y retirada de `recibos_historico`, 0004 tabla `ajustes_sistema`, procedimiento `generar_recibos_anio` y evento diario, 0005 principal guardado e importe pendiente derivado de anticipos (DC-38).
- Documentación: `doc/`, con índice en `doc/index.md`. Hallazgos, decisiones (DC) y plan: `doc/mantenimiento/registro-hallazgos.md` (entrada y mapa; el contenido está en `registro-hallazgos_1de3.md`, `_2de3.md` y `_3de3.md`, DC-28). Reglas de trabajo: `doc/mantenimiento/instruccion-persistente.md` (entrada y cuatro partes, DC-33). Relevo: `doc/mantenimiento/estado-del-proyecto.md` (entrada y tres partes `estado-del-proyecto_1de3.md`, `_2de3.md` y `_3de3.md`, DC-37). Lista corta de tareas: `TODO`.
- Visor de la documentación: la pantalla `Tech-documentation.vue` carga `doc/**/*.md` y su navegación se mantiene a mano (`docNavigation`).
- Desarrollo: contenedor en `/workspaces/timon`; repositorio `ferboiar/timon`. Node 20.9 o superior de la serie 20.

## 2. Cómo se trabaja

- Una rama por cambio, un PR por rama, fusionado en `main`. El nombre de la rama lleva la fase (o `mantenimiento`) y todos los IDs desglosados, por ejemplo `correccion/fase-1-F07-F08-F09-F22-F10-ahorros-categorias` o `mantenimiento/D-17-dividir-instruccion-persistente`.
- Cada commit y cada PR citan sus IDs (F-xx, S-xx, DC-xx). En el mismo PR se actualizan `doc/`, `TODO`, el plan de la sección 10 del registro y el relevo (la parte que contiene la sección afectada, DC-27 y DC-37). Un documento nuevo se añade también a `docNavigation`. Cada informe de iteración nuevo se añade al índice `mantenimiento/informes_iteraciones/index.md`.
- Una decisión nueva es una fila DC-nn en el registro. Siguientes identificadores libres: DC-44, D-27, F-47, S-13, R-14 y U-14. Consultar siempre el registro antes de asignarlos.
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
- Al editar, el modo de fechas es siempre manual; el automático solo reescribe las fechas pendientes (DC-11). Guardar sin cambios (DC-30) solo se considera tal si el modo sigue en manual: pasar a automático cuenta como cambio (F-45).
- Todas las fechas de un recibo deben caer en su año natural (DC-14): la pantalla avisa antes de enviar y el servidor responde 400. Excepción para el administrador: el interruptor de sesión «Permitir declarar fechas fuera del año en curso» de Ajustes › Administrar recibos (DC-29).
- El procedimiento `generar_recibos_anio` crea los recibos del año siguiente. Un evento horario actúa a las 03:00 en la zona horaria de los ajustes. Solo inserta, y el interruptor `crear_recibos_automaticamente` lo activa o desactiva. Ajustes › Administrar recibos permite vista previa de hoy, simulación del próximo 1 de diciembre sin selector y ejecución manual independiente del interruptor automático (DC-17, DC-24, DC-36).

### Otros módulos
- Anticipos: planes de pago. Al borrar un pago, «Recalcular pagos» sigue DC-12; el pago sugerido se valida como número (F-02). Las operaciones compuestas son transaccionales, con el anticipo bloqueado (F-27, DC-39, incorporado en el PR #54).
- Ahorros: `ahorrado` es el valor inicial más los movimientos y solo se edita a mano sin movimientos (DC-10).
- Cuentas: un IBAN vacío se guarda como NULL (F-06). El saldo es manual (F-21, DC-43).
- Categorías: el servidor guarda el nombre en minúsculas (DC-31), edita por ID y rechaza duplicados (F-09, F-22); el índice único (DC-02) no existe todavía.
- Calendario: vista anual de los cargos y totales por mes (`doc/components/Calendar.md`). Presupuestos, Transacciones, Automatización y Préstamos son páginas vacías de la plantilla.
- Usuarios: roles `admin`, `user`, `limited_user` y `reader`, y permisos `perm_*` por módulo. Los endpoints de datos todavía no aplican esos permisos (S-01, fase 2). Las rutas de `/api/users` exigen administrador; las de preferencias de estilo, solo sesión.

### Ajustes (`/settings`)
- Pestañas: General, Usuarios, Aspecto, Administrar recibos y Base de Datos. Aspecto la ven todos; el resto, solo los administradores, que abren en General.
- Zona horaria (DC-25): las horas se guardan en UTC y el ajuste `zona_horaria` decide «hoy», el año y el mes en curso y cómo se muestran las horas.
- Apariencia general (DC-26): `system`, `light` o `dark`, por usuario. Se guarda en el servidor y se recuerda en el navegador (`timon.colorScheme`) para no parpadear al cargar; al llegar las preferencias del servidor, estas mandan.
- Base de Datos: configuración de la conexión (`.db_connection`), copia de seguridad y restauración. Tiene hallazgos abiertos de seguridad (S-02, S-03).
