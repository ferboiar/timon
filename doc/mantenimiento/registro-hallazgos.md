# Registro de hallazgos y plan de mantenimiento

Línea base de la fase 0 (2026-10-17). Documento vivo: se actualiza en cada iteración, y cada corrección cita su ID en el commit y actualiza `doc/` en el mismo PR.

## 1. Método

Revisión estática de backend, frontend y documentación, contrastada con el volcado de la BD viva y con pruebas puntuales contra MariaDB. Certeza: Confirmado (leído en código o esquema, o reproducido) o Probable (depende de entorno o driver; reproducir con un test). Severidad: Crítico (rompe un flujo o pierde datos), Alto, Medio, Bajo.

## 2. Decisiones

| ID | Decisión |
|---|---|
| DC-01 | `fechas_cargo.estado` = `cargado`, `pendiente`, `rechazado`. `rechazado` significa que el banco devolvió el recibo: no genera historial, cuenta como pendiente en el disponible y puede volver a `pendiente`. |
| DC-02 | `categorias.nombre` único global (`UNIQUE KEY uq_categorias_nombre (nombre)`). Las categorías son visibles para todos; `propietario_id` es el creador y `es_privado` no tiene efecto en esa tabla. |
| DC-03 | Precedencia ante discrepancias: 1) el Excel del usuario como criterio de aceptación, 2) la documentación de diseño (`doc/db/schema`), 3) la BD viva como línea base migrable, 4) el código. |
| DC-04 | BD en MariaDB 11.8 local. Misma configuración en desarrollo, tests y producción (sección 3). |
| DC-05 | Servidor y sesión en `+00:00`; el evento de mantenimiento se define en `Europe/Madrid`; `mysql2` devolverá `DATE` como texto (`dateStrings`). |
| DC-06 | Usuarios de BD: `timon_app` (SELECT, INSERT, UPDATE, DELETE) y `timon_admin` (ALL) sobre `conta_hogar`, host `172.20.0.%`. La aplicación usa `timon_admin` hasta separar el mantenimiento (S-02). Las pruebas usan `timon_test`, con permisos solo sobre `conta_hogar_test`. |
| DC-07 | Desde 2026-10-18 la aplicación usa la BD local `conta_hogar` en `mariadb01`. Aiven queda fuera de uso; ninguna de las dos bases estaba en producción y tenían los mismos datos. |
| DC-08 | Al borrar un pago y elegir «Recalcular pagos», su importe se reparte entre los pagos pendientes con la misma lógica que al editar un pago: primero se suben los que estén por debajo del pago sugerido y el resto se reparte a partes iguales. Para el borrado queda sustituida por DC-12; sigue vigente para la edición de un pago. |
| DC-09 | Toda operación nueva o modificada deja trazas en el log del backend con el formato «módulo - acción: datos» (`console.log`), como las existentes. Las acciones que no se realizan, por ejemplo un plan de pagos no generado, también se registran con su motivo. |
| DC-10 | `ahorros.ahorrado` es el valor inicial más la suma de los movimientos. Se puede editar a mano solo mientras el ahorro no tiene movimientos (para corregir un valor inicial erróneo). Con movimientos queda bloqueado en la pantalla y el servidor rechaza el cambio; se corrige añadiendo un movimiento positivo o negativo. |
| DC-11 | Al editar un recibo, el modo de fechas es siempre manual; el modo automático solo se activa si el usuario lo elige en el diálogo, que avisa de que se reescribirán las fechas pendientes. El servidor solo reescribe las fechas en estado `pendiente` y conserva las demás, dejando traza del antes y el después de cada fecha. |
| DC-12 | Al borrar un pago y elegir «Recalcular pagos», su importe se coloca así: primero se suben los pagos pendientes que estén por debajo del pago sugerido hasta ese tope y, si aún queda importe, se crean pagos nuevos de hasta el pago sugerido, a continuación del último pago y según la periodicidad. Ningún pago supera el sugerido. Exige pago sugerido y periodicidad, y el botón solo se deshabilita si faltan. |
| DC-13 | El esquema de la base de datos se define solo en `backend/src/db/migrations`. No se mantienen scripts SQL sueltos ni volcados como fuente del esquema; los cambios entran como migraciones nuevas, verificadas por las pruebas. |
| DC-14 | Cada recibo es el recibo de un año natural: todas sus fechas de cargo caen dentro del año de su `fecha_inicial`. Al cambiar de año se crea un recibo nuevo (fila nueva en `recibos` y filas nuevas en `fechas_cargo`) enlazado con el anterior mediante `recibo_origen_id`. Los recibos de años pasados no se modifican nunca. Esto sustituye a `recibos_historico`, que se retirará. |
| DC-15 | `fechas_cargo.importe` guarda el importe real de cada cargo: vacío mientras está pendiente (se usa el del recibo) y fijado al pagarlo. El recibo del año nuevo toma el importe del último cargo pagado del año anterior, o el del recibo si no hubo ninguno. |
| DC-16 | Las fechas siguen un patrón anclado en la `fecha_inicial` original y la periodicidad. El recibo de un año contiene las fechas de la secuencia que caen en ese año, y su `fecha_inicial` es la primera de ellas. Al dar de alta un recibo solo se generan las fechas desde su `fecha_inicial` hasta el 31 de diciembre de ese año: ninguna anterior ni del año siguiente. Si un día no existe en un mes (por ejemplo el 31), se usa el último día del mes. |
| DC-17 | Un evento diario de la base de datos crea los recibos del año siguiente. Solo inserta: nunca modifica ni borra. Cada recibo tiene como mucho un sucesor (restricción única). Nunca crea recibos de un año posterior al actual, salvo desde el 1 de diciembre, que permite el año siguiente. Se replican los recibos activos e inactivos, salvo los marcados con `replicar = 0`. Cada ejecución se anota en `mantenimiento_logs`. Un botón en Ajustes, en «Administrar recibos», permite lanzarlo a mano, con vista previa. |
| DC-18 | La vista de recibos muestra el año en curso y los cargos pendientes de años anteriores, que dejan de verse al pagarse pero se conservan. No se pueden borrar recibos con cargos pagados. Al borrar el recibo de un año que tiene origen se marca `replicar = 0` en su origen, para que el evento no lo recree. |
| DC-19 | En la vista de recibos, los mensuales se agrupan por recibo como los bimestrales y trimestrales, con una tabla de fechas que muestra importe, estado y comentario. Todas las tablas agrupan por recibo, no por concepto. El importe de cada fecha se puede editar: en un cargo pagado queda fijado y en uno pendiente solo se guarda si difiere del importe del recibo. La vista muestra el año elegido (por defecto el actual) y, en el año en curso, los cargos pendientes de años anteriores como «Atrasado». |
| DC-20 | En la vista de recibos, un año anterior al actual es un ejercicio cerrado: no se puede añadir ni editar el recibo, y solo se pueden editar los cargos que sigan pendientes. «+» y «Generar nuevas fechas» están activos solo si faltan fechas para completar el año de la última fecha del recibo y ese año no está cerrado; añaden las fechas siguientes de la secuencia anclada en la fecha inicial (refinado por DC-22). |
| DC-21 | Un cargo pagado solo se puede editar o borrar durante el mes en que vence (para rectificar); los de meses anteriores se consideran cerrados. Pendiente: en Ajustes, sección «Administrar recibos», la opción «Permitir editar/borrar recibos pagados», con un interruptor desactivado por defecto que permita editar y borrar también los cargos pagados de meses cerrados; debe explicar esa regla y volver a desactivarse al cerrar sesión. |
| DC-22 | Una fecha falta si ningún cargo del recibo cae en ese mes de la secuencia anclada en su fecha inicial; solo cuentan los meses del año en curso, nunca los anteriores a la fecha inicial ni los de un ejercicio cerrado. «+» está activo si falta cualquier fecha, incluso una ya pasada. «Generar nuevas fechas» solo añade las posteriores al último cargo y los huecos intermedios cuya fecha aún no ha llegado; si no hay ninguna, queda deshabilitado. |
| DC-23 | La migración 0003 parte los recibos cuyas fechas caen en más de un año en un recibo por año, enlazados con `recibo_origen_id`; la fecha inicial de cada trozo es la primera de la secuencia anclada en la del recibo original, y no se crean fechas que no existían. También elimina `recibos_historico`. Es repetible. Pendiente: el procedimiento y el evento diario (con interruptor «Crear recibos del año automáticamente» en Ajustes, guardado en la base de datos) y «Administrar recibos». |

## 3. Entorno de referencia

- MariaDB 11.8.8 (imagen linuxserver, Alpine). Configuración en `/config/custom.cnf` con modo 644: MariaDB ignora los ficheros de configuración escribibles por todos.
- Opciones: `transaction_isolation=READ-COMMITTED`, `character-set-server=utf8mb4`, `collation-server=utf8mb4_spanish_ci`, `sql_mode=STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION`, `max_connections=100`, `event_scheduler=ON`, `default-time-zone='+00:00'`.
- Tablas de zonas horarias cargadas con `mariadb-tzinfo-to-sql`. Base creada con `COLLATE utf8mb4_spanish_ci`.
- Conexión: Node (contenedor `timon`, red Docker `backend`) hacia `mariadb01:3306`. TLS disponible (`have_ssl=YES`).
- Sesión de la aplicación: `mysql2` activa la bandera de cliente `IGNORE_SPACE`, así que el `sql_mode` de cada sesión lleva `IGNORE_SPACE` aunque el valor global no. Las pruebas comparan los valores globales.
- Origen de los datos: volcado de Aiven (MySQL 8.4.8). Restaurado con dos retoques manuales (se quitó el `DEFINER` y se recreó la rutina con comillas invertidas) y verificado: 14 tablas, 18 claves foráneas y el mismo recuento de filas.

## 4. Casos de aceptación (Excel del usuario)

- Octubre 2026: nómina 2.115,45 €; recibos del mes 1.239,89 € (786,40 mensuales + 110,00 bimestrales + 218,00 trimestrales + 125,49 anuales); gastos del mes 581,81 €; previstos netos de reservas 356,48 €; disponible −62,73 €.
- Año 2026: recibos 12.072,40 €, media 1.006,03 € al mes.

## 5. Hallazgos funcionales (F)

| ID | Sev. | Dónde | Hallazgo | Certeza |
|---|---|---|---|---|
| F-01 | Crítico | `db_utilsSav/Adv/Acc/Cats.mjs` | Los INSERT de ahorros, anticipos, cuentas y categorías omiten `propietario_id` (NOT NULL sin default). Reproducido contra la BD real: ER_NO_DEFAULT_FOR_FIELD. Regresión de la migración de permisos. Corregido en la fase 1: las rutas pasan el id del token a las funciones de alta. Verificado con las pruebas y creando los cuatro registros desde la aplicación (2026-10-18). | Confirmado |
| F-02 | Crítico | `recalculatePaymentPlan`, `Advances.vue` | `mysql2` devuelve DECIMAL como string. Con `pago_sugerido = '0.00'` (valor por defecto al crear) el bucle inserta pagos de 0 € sin fin; la guarda de la UI (`=== 0`) no salta. Indicio: `anticipos_pagos` tiene AUTO_INCREMENT 5501 con 32 filas (salto de id 124 a 5499). Corregido en la fase 1: el pago sugerido se convierte a número y se valida (mayor que 0 y como máximo 1200 pagos) antes de crear ningún pago, al guardar el anticipo y al generar el plan; la pantalla también lo valida como número. | Probable |
| F-03 | Alto | `pushMovimiento` | Editar un movimiento suma el importe completo a `ahorrado`. `ahorrado` es editable a mano (dos fuentes de verdad) y las tres sentencias no van en transacción. Corregido en la fase 1: al editar solo se aplica la diferencia de importe, las sentencias van en una transacción, el ahorro se toma de la base de datos y `ahorrado` tolera valores nulos. La edición manual de `ahorrado` se rige por DC-10. | Confirmado |
| F-04 | Alto | `ListBills.vue`, `pushRecibo` | `editBill` abre en modo auto si hay `fecha_inicial`, y todos los recibos la tienen. Al guardar en auto se reescriben las fechas y se pisan las manuales. Alcance real: solo los recibos anuales y mensuales llegan al diálogo con `fecha_inicial` (las filas agrupadas de trimestrales y bimestrales no la llevan), así que solo ellos se abrían en auto. Corregido en la fase 1 (DC-11): la edición parte siempre en manual, el diálogo avisa al elegir auto y el servidor solo reescribe las fechas pendientes, con traza del antes y el después. | Confirmado |
| F-05 | Alto | `add_recibos_historico.sql` | Crea `recibos_historico` con columnas distintas de las que usa el código y de la tabla viva (`pagado`, `notas`): con ella, marcar un cargo como «cargado» fallaría al escribir el historial. Corregido en la fase 1 (DC-13, DC-14): se eliminan el script y `setup_auto_dates.sh`, que solo lo citaba, y el esquema queda definido por las migraciones; `recibos_historico` desaparecerá con el rediseño de recibos por año. | Confirmado |
| F-06 | Alto | `cuentas`, `Accounts.vue` | `UNIQUE(iban)` más el formulario enviando `''` hace fallar la segunda cuenta sin IBAN. Corregido en la fase 1: el servidor guarda NULL cuando el IBAN llega vacío o con solo espacios (`UNIQUE` admite varios NULL pero no varias cadenas vacías), la pantalla envía NULL y la exportación CSV deja vacía la columna en vez de escribir «null». Las cuentas ya guardadas con IBAN vacío se pasan a NULL con `UPDATE cuentas SET iban = NULL WHERE iban = '';`. El aviso de IBAN repetido indica ahora la cuenta que ya lo tiene (código 409; ver F-28). | Confirmado |
| F-07 | Medio | `Savings.vue` | `deleteSaving` llama a `getCurrentInstance().refs` tras un await: TypeError tras borrar con éxito. | Confirmado |
| F-08 | Medio | `Savings.vue` | Mostrar u ocultar inactivos no filtra nada y `activo` no es editable. | Confirmado |
| F-09 | Medio | Categorías | El API ignora `id` y busca por nombre: renombrar crea otra categoría. | Confirmado |
| F-10 | Medio | Borrados con FK | Las FK reales no tienen cascada; borrar algo en uso da un 500 y la UI muestra el mensaje genérico de axios. | Confirmado |
| F-11 | Medio | `actualizarFechasRecibos` | Devuelve `{total, actualizados}` anidado en `resultado`; la UI lee `response.actualizados`. | Confirmado |
| F-12 | Medio | `generarFechasFuturas` | `setMonth` desborda con los días 29 a 31. | Confirmado |
| F-13 | Bajo | Fechas | `DATE` como `Date` local más `toISOString()` desplaza un día si Node corre fuera de UTC. En el contenedor de desarrollo Node corre en UTC, así que es latente. Solución: `dateStrings` (DC-05). | Confirmado |
| F-14 | Medio | Anticipos | `importe_total` es el saldo restante y se pierde el importe original (verificado con los datos). Editar el importe de un pago `pagado` no ajusta el saldo, y hay dos endpoints para borrar un pago. | Confirmado |
| F-15 | Medio | Recibos | Se escribe «Fecha inicial» en la primera fecha de cada tanda; `deleteRecibo` en mensuales borra el recibo entero; el historial queda huérfano al revertir un cargo. | Confirmado |
| F-16 | Medio | `Savings.vue`, `Advances.vue` | Se muta el modelo a texto antes del POST; si falla, el reintento revienta. | Confirmado |
| F-17 | Bajo | `Advances.vue` | `re; turn;` en lugar de `return` en `confirmDeleteAdvance`. | Confirmado |
| F-18 | Bajo | `ListBills.vue` | `openNew()` no reinicia `modoFechas` ni `fecha_inicial`. Corregido junto con F-04. | Confirmado |
| F-19 | Bajo | Exportaciones CSV | No se escapan `;`, comillas, saltos de línea ni `=`, `+`, `-`, `@`. La exportación de cuentas envuelve el IBAN en `="…"` a propósito, para que Excel no lo convierta en número; al corregir F-19 hay que conservar ese efecto con otro método. | Confirmado |
| F-20 | Bajo | `BillService.getBillById` | Llama a `GET /api/recibos/:id`, que no existe. | Confirmado |
| F-21 | Bajo | Cuentas | `saldo_actual` es manual y nada lo actualiza. | Confirmado |
| F-22 | Medio | `categorias` | `nombre` no es único y los recibos resuelven la categoría por nombre con una subconsulta. Se cierra con DC-02. | Confirmado |
| F-23 | Medio | `generarNuevasFechasRecibo` | SQL con comillas dobles (`estado = «pendiente»`) falla con ANSI_QUOTES. Con el `sql_mode` de MariaDB no ocurre; se corrige igualmente. Verificar la versión activa del fichero. | Probable |
| F-24 | Alto | `recalculatePaymentPlan` | Al regenerar el plan desde la base de datos, el saldo y el pago sugerido son cadenas y se comparan como texto (por ejemplo «100.00» resulta menor que «40.00»): se crea un único pago por el total en lugar de cuotas. Corregido junto con F-02 al convertir los importes a número. | Probable |
| F-25 | Medio | `Advances.vue` (`savePago`, `addNewPayment`) | «Añadirlo en uno nuevo» tras borrar un pago: la bandera `isReplacingPayment` no se consultaba y el pago a sustituir seguía contando en la suma de pendientes, así que salía «los pagos pendientes incluidos ya cubren el anticipo» y no dejaba guardar. Aunque pasara, el pago antiguo no se borraba. Corregido: se excluye de la suma y se elimina tras guardar el nuevo. | Confirmado |
| F-26 | Medio | `Advances.vue` (`recalculatePayments`) | «Recalcular pagos» tras borrar un pago volvía a generar el plan y añadía un pago nuevo al final en vez de repartir el importe. Corregido según DC-08. `recalculatePendingPayments` (prorrateo igualitario) no la usa ninguna ruta. | Confirmado |
| F-27 | Medio | `db_utilsAdv.mjs` | Las operaciones compuestas de anticipos (borrar un pago y repartir, editar un pago y recalcular, regenerar el plan) ejecutan varias sentencias sin transacción; un fallo intermedio deja el plan a medias. Comprobado: el módulo no usa `beginTransaction`. | Confirmado |
| F-28 | Medio | Pantallas (`*.vue`) | Los avisos de error muestran el `error.message` de axios («Request failed with status code 400») y no el mensaje que devuelve el servidor en `response.data.error`. Excepción: `BillService.saveBill` ya relanza el mensaje del servidor, así que el guardado de recibos lo muestra bien. Corregido en la fase 1 solo en `Accounts.vue`, con el ayudante `src/utils/apiError.js`; el resto de pantallas queda pendiente (incluye lo descrito en F-10). | Confirmado |
| F-29 | Bajo | `ListBills.vue` | El botón «Nuevo» de la barra llama a `openNew` con el evento del clic como periodicidad, así que el recibo nuevo nace con un objeto en `periodicidad` y hay que elegirla a mano en el desplegable. Corregido en la fase 1: el botón llama a `openNew('')`. | Confirmado |
| F-30 | Bajo | `ListBills.vue` | La tabla de trimestrales enlaza su selección a `selectedBimonthlyBills` y comparte estado con la de bimestrales; `selectedQuarterlyBills` no se llena nunca. | Confirmado |
| F-31 | Bajo | `ListBills.vue` | El diálogo de borrado muestra `bill.name`, que no existe (el campo es `concepto`): el mensaje sale sin nombre. | Confirmado |
| F-32 | Bajo | `generarNuevasFechasRecibo` | Si el recibo no tiene fechas previas genera siempre 4 fechas, sea mensual, bimestral, trimestral o anual; con fechas previas genera 12, 6, 4 o 1 según la periodicidad. | Confirmado |
| F-33 | Bajo | `Advances.vue` | El botón «Recalcular pagos» del diálogo de borrado se deshabilita cuando queda un solo pago pendiente (`pagosPendientesCount <= 1`), aunque el servidor sabe repartir el importe sobre uno; por eso el aviso «Sin pagos pendientes» no se puede alcanzar desde la pantalla. Resuelto con DC-12 en la fase 1: «Recalcular pagos» completa los pagos hasta el sugerido y crea los que falten, y solo se deshabilita si el anticipo no tiene pago sugerido y periodicidad. | Confirmado |
| F-34 | Bajo | `pushRecibo`, `ListBills.vue` | Al faltar un campo obligatorio, el aviso enumeraba siempre los seis campos (incluido el propietario, que no se introduce) sin indicar cuál faltaba. Corregido en la fase 1: la pantalla avisa antes de enviar y el servidor nombra los campos que faltan. | Confirmado |
| F-35 | Bajo | `pushRecibo` | Cambiar en modo manual la fecha de un cargo ya pagado deja `recibos_historico.fecha_pago` con la fecha antigua: el historial solo se escribe al pasar a «cargado» (ver también F-15). | Confirmado |
| F-36 | Bajo | `recalculatePaymentPlan` | El saldo restante se resta en coma flotante sin redondear; con céntimos puede quedar un residuo del orden de 1e-15 que crea un último pago de 0,00 € (por ejemplo, 20,10 € en pagos de 6,70 € genera 4 pagos en vez de 3). Corregido en la fase 1: el saldo se redondea a céntimos en cada paso. | Confirmado |

## 6. Seguridad y operación (S)

| ID | Sev. | Hallazgo | Certeza |
|---|---|---|---|
| S-01 | Alto | Ningún endpoint de datos filtra por `propietario_id`, `es_privado` ni `perm_*`; editar un recibo ajeno lo reasigna al editor. `permisos.md` lo presenta como implementado. | Confirmado |
| S-02 | Alto | `db_maintenance.mjs` monta comandos de shell por interpolación: contraseñas con símbolos rompen backup y restore y la contraseña queda en `ps` y en el log. Validación de restore cosmética, sin backup previo, sin límite de tamaño. | Confirmado |
| S-03 | Alto | `saveDbConfig` escribe claves sin validar, el pool no se recrea tras el cambio, `initPool` no memoiza, el TLS va fijo con `rejectUnauthorized:false` y `GET /api/db-config/password` devuelve la contraseña. | Confirmado |
| S-04 | Medio | JWT de 24 h con rol embebido y sin revocación; sin rate limiting en `/login`; `style-preferences` exige admin; borrar o degradar admins sin guardas. | Confirmado |
| S-05 | Medio | `error.stack` devuelto al cliente, `console.log` masivo y CORS abierto. | Confirmado |
| S-06 | Medio | `/tech-docs` y `/documentation` solo se ocultan en el menú; ninguna ruta define `requiresAdmin`. | Confirmado |
| S-07 | Medio | Los servicios usan `axios` crudo, no `apiClient`; el interceptor llama a `useAuth()` fuera de componente; dependencia circular `api.js` y `useAuth.js`; cada `useAuth()` crea su estado e intervalo. | Confirmado |
| S-08 | Bajo | `.gitignore` no cubre `.db_connection.backup` ni `*.sql`; `engines` Node >=20.9 <21 frente a README Node 16+; scripts con rutas `/workspaces`; sin herramienta de migraciones (la línea base 0001 y las pruebas de la fase 0 son el primer paso). | Confirmado |
| S-09 | Bajo | El contenedor de desarrollo no trae `git-crypt` aunque el README lo exige; añadirlo a `.devcontainer/Dockerfile`. | Confirmado |
| S-10 | Cerrado | El `.env` de la raíz solo contiene `VITE_API_URL`; no hay secretos. `backend/.env` y `backend/src/db/.db_connection` figuran cifrados. | Confirmado |
| S-11 | Alto | Dependencias: Dependabot informa de 108 vulnerabilidades en `main` el 2026-10-17 (3 críticas, 59 altas, 38 moderadas, 8 bajas) y hay cinco ramas `snyk-fix-*` sin fusionar. Actualizar en una fase propia, con las pruebas en verde. | Confirmado |
| O-01 | Bajo | `VITE_API_URL=http://localhost:3000`: el frontend no alcanzará el backend desde otros equipos de la red; configurar en el despliegue. | Confirmado |

## 7. Interfaz y documentación (U, D)

| ID | Sev. | Hallazgo |
|---|---|---|
| U-01 | Alto | El Dashboard (página de inicio) es el de la plantilla Sakai. |
| U-02 | Medio | `/manual` y `/documentation` cargan la misma página (plantilla Sakai en inglés); no existe manual de usuario. |
| U-03 | Medio | El menú muestra «UI Components», «Pages» y «Hierarchy» a todos; Presupuestos, Transacciones y Automatización son páginas vacías. |
| U-04 | Medio | `className` en vez de `class` en `Budgets.vue` y `ProfileSettings.vue`; pestaña «Header III» con Lorem ipsum. |
| U-05 | Bajo | Idioma mezclado (Cancel, Save, Yes, Confirm, Successful, Warning). |
| U-06 | Bajo | Formato inconsistente: saldo sin moneda en Cuentas; «Importe periódico» frente a «Ahorro sugerido»; «Importe total» de Anticipos es el saldo. |
| U-07 | Bajo | Calendario: no pinta mensuales pero los suma; mensual manual con una fecha cuenta un solo mes; tooltip solo del primer evento. |
| U-08 | Bajo | Servicios de demo (`CustomerService.js` de 284 KB y otros) y `views/uikit` en el repositorio. |
| D-01 | Medio | Estados y `comentario` de `fechas_cargo` en la doc no coinciden con la BD. Resuelto en diseño por DC-01. |
| D-02 | Medio | `presupuestos.md` usa `transacciones`, `periodo_id` y `recibos_periodos`, que no existen; `DB_presupuestos.txt` usa `user_id`. |
| D-03 | Medio | Documentados en la fase 1: `historial`, `generar-fechas`, `actualizar-fechas`, `fecha_inicial` y `modoFechas`. Falta documentar `/api/db-config*`, `/api/db/backup|restore` y las páginas Calendar, Budgets, Transactions y Automation. |
| D-04 | Bajo | `db_utilsBill.md` apunta a un módulo inexistente; faltan `anual` y otros valores; `Tech-documentation.vue` duplica a mano `doc/`. |
| D-05 | Bajo | Los planes de anticipos de los datos empiezan un periodo después de `fecha_inicio`; el código actual empieza en `fecha_inicio`. Aclarar el comportamiento. |
| D-06 | Medio | `db_utilsSav.md` y `db_utilsAdv.md` afirmaban que las operaciones usaban transacciones y ninguna lo hacía. Corregido en la fase 1: el de ahorros describe las transacciones de F-03 y el de anticipos avisa de que no las usa (F-27). Puesta al día de F-01, F-02, F-03, F-24, F-25 y F-26 en `doc/db`, `doc/routes`, `doc/components`, `doc/services` e `index.md`. |
| D-07 | Bajo | `db_utilsAcc.md` decía que los saldos se mantenían automáticamente y que el IBAN se verificaba antes de insertar; el saldo es manual (F-21) y el duplicado lo detecta el índice único. Corregido en la fase 1 junto con F-06. |
| D-08 | Bajo | `README.md`, `README_en.md` y `.github/copilot-instructions.md` presentaban `DB_estructura.txt` (volcado antiguo con datos de ejemplo) como fuente del esquema, y el `TODO` citaba una función inexistente (`actualizarFechasCargoPagado`) y un histórico por depurar. Corregido en la fase 1 (DC-13). |
| D-09 | Bajo | La documentación de `fechas_cargo` y de la API de recibos decía que `estado` admite «pagado» y «rechazado»; el esquema solo admite «pendiente» y «cargado». Corregido en la fase 1 junto con el PR de backend de DC-14. |

## 8. Hoja de ruta funcional (alineación con el Excel; no se aborda hasta cerrar los fallos)

| ID | Necesidad del Excel |
|---|---|
| R-01 | Reserva mensual de recibos no mensuales, con marca de pagado o pendiente. |
| R-02 | Movimientos con saldo corrido y conciliación entre cuentas. |
| R-03 | Disponible del mes = nómina − recibos − gastos − previstos netos de reservas. |
| R-04 | Reparto de sueldos entre dos personas (políticas A, B y C). |

## 9. Cobertura de la revisión

Sin leer: `Tech-documentation.vue`, `Login.vue`, `layout/*`, `useTheme`, `vRole`, `AccService`, `AdvService`, `UsersService`, `DbConfigService`, `MaintenanceDBService`, `doc/auth|composables|directives|middleware|router`, `doc/components` salvo Advances y Savings, `doc/services` salvo AdvService, `doc/routes` salvo recibos, ahorros, anticipos, cuentas y categorías, `schema/optimizaciones.md` y `schema/index.md`. Lectura parcial por truncado del conector (~40 KB): final de `db_utils.mjs` y de `db_utilsAdv.mjs`, plantilla de `ListBills.vue`, cola de `Advances.vue` y diálogo de usuario de `ProfileSettings.vue`.

## 10. Plan por fases

1. Fase 0, completada el 2026-10-17: este registro, migración 0001 (esquema de la BD viva), pruebas con `npm run test:backend` (5 pasan y 4 de F-01 quedan como `todo`, verificadas contra MariaDB 11.8.8) y `docker-compose.test.yml` como alternativa.
2. Fase 1 (en curso): F-01, F-02, F-03, F-04, F-05, F-06, F-18, F-24, F-25, F-26, F-29, F-33, F-34 y F-36 corregidos; pendientes F-27, F-28, F-30, F-31, F-32 y F-35, más el rediseño de recibos por año (DC-14 a DC-18, en varios PR) y las migraciones de DC-01 y DC-02.
3. Fase 2: permisos reales (S-01, S-04, S-06).
4. Fase 3: operación (S-02, S-03, S-07) y migración 0002 de la rutina de mantenimiento (`NOW(6)`, solo `ANALYZE`, 14 tablas).
5. Fase 4: limpieza de interfaz y sincronización de `doc/` (U-01 a U-08, D-01 a D-05).
6. Fase 5: dependencias (S-11), revisando antes las ramas `snyk-fix-*` y con las pruebas en verde.
7. Fase 6: hoja de ruta funcional (R-01 a R-04).
