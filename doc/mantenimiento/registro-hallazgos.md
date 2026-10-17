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
| F-02 | Crítico | `recalculatePaymentPlan`, `Advances.vue` | `mysql2` devuelve DECIMAL como string. Con `pago_sugerido = '0.00'` (valor por defecto al crear) el bucle inserta pagos de 0 € sin fin; la guarda de la UI (`=== 0`) no salta. Indicio: `anticipos_pagos` tiene AUTO_INCREMENT 5501 con 32 filas (salto de id 124 a 5499). | Probable |
| F-03 | Alto | `pushMovimiento` | Editar un movimiento suma el importe completo a `ahorrado`. `ahorrado` es editable a mano (dos fuentes de verdad) y las tres sentencias no van en transacción. | Confirmado |
| F-04 | Alto | `ListBills.vue`, `pushRecibo` | `editBill` abre en modo auto si hay `fecha_inicial`, y todos los recibos la tienen. Al guardar en auto se reescriben las fechas y se pisan las manuales. | Probable |
| F-05 | Alto | `add_recibos_historico.sql` | Crea `recibos_historico` con columnas distintas de las que usa el código y de la tabla viva (`pagado`, `notas`). | Confirmado |
| F-06 | Alto | `cuentas`, `Accounts.vue` | `UNIQUE(iban)` más el formulario enviando `''` hace fallar la segunda cuenta sin IBAN. | Confirmado |
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
| F-18 | Bajo | `ListBills.vue` | `openNew()` no reinicia `modoFechas` ni `fecha_inicial`. | Confirmado |
| F-19 | Bajo | Exportaciones CSV | No se escapan `;`, comillas, saltos de línea ni `=`, `+`, `-`, `@`. | Confirmado |
| F-20 | Bajo | `BillService.getBillById` | Llama a `GET /api/recibos/:id`, que no existe. | Confirmado |
| F-21 | Bajo | Cuentas | `saldo_actual` es manual y nada lo actualiza. | Confirmado |
| F-22 | Medio | `categorias` | `nombre` no es único y los recibos resuelven la categoría por nombre con una subconsulta. Se cierra con DC-02. | Confirmado |
| F-23 | Medio | `generarNuevasFechasRecibo` | SQL con comillas dobles (`estado = «pendiente»`) falla con ANSI_QUOTES. Con el `sql_mode` de MariaDB no ocurre; se corrige igualmente. Verificar la versión activa del fichero. | Probable |

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
| D-03 | Medio | Falta documentar `historial`, `generar-fechas`, `actualizar-fechas`, `/api/db-config*`, `/api/db/backup|restore`, `fecha_inicial`, `modoFechas` y las páginas Calendar, Budgets, Transactions y Automation. |
| D-04 | Bajo | `db_utilsBill.md` apunta a un módulo inexistente; faltan `anual` y otros valores; `Tech-documentation.vue` duplica a mano `doc/`. |
| D-05 | Bajo | Los planes de anticipos de los datos empiezan un periodo después de `fecha_inicio`; el código actual empieza en `fecha_inicio`. Aclarar el comportamiento. |

## 8. Hoja de ruta funcional (alineación con el Excel; no se aborda hasta cerrar los fallos)

| ID | Necesidad del Excel |
|---|---|
| R-01 | Reserva mensual de recibos no mensuales, con marca de pagado o pendiente. |
| R-02 | Movimientos con saldo corrido y conciliación entre cuentas. |
| R-03 | Disponible del mes = nómina − recibos − gastos − previstos netos de reservas. |
| R-04 | Reparto de sueldos entre dos personas (políticas A, B y C). |

## 9. Cobertura de la revisión

Sin leer: `Tech-documentation.vue`, `Login.vue`, `layout/*`, `useTheme`, `vRole`, `AccService`, `AdvService`, `UsersService`, `DbConfigService`, `MaintenanceDBService`, `doc/auth|components|composables|directives|middleware|router|services`, `doc/routes` salvo recibos, `schema/optimizaciones.md` y `schema/index.md`. Lectura parcial por truncado del conector (~40 KB): final de `db_utils.mjs` y de `db_utilsAdv.mjs`, plantilla de `ListBills.vue`, cola de `Advances.vue` y diálogo de usuario de `ProfileSettings.vue`.

## 10. Plan por fases

1. Fase 0, completada el 2026-10-17: este registro, migración 0001 (esquema de la BD viva), pruebas con `npm run test:backend` (5 pasan y 4 de F-01 quedan como `todo`, verificadas contra MariaDB 11.8.8) y `docker-compose.test.yml` como alternativa.
2. Fase 1 (en curso): F-01 corregido; pendientes F-02, F-03, F-04, F-05 y F-06, más las migraciones de DC-01 y DC-02.
3. Fase 2: permisos reales (S-01, S-04, S-06).
4. Fase 3: operación (S-02, S-03, S-07) y migración 0002 de la rutina de mantenimiento (`NOW(6)`, solo `ANALYZE`, 14 tablas).
5. Fase 4: limpieza de interfaz y sincronización de `doc/` (U-01 a U-08, D-01 a D-05).
6. Fase 5: dependencias (S-11), revisando antes las ramas `snyk-fix-*` y con las pruebas en verde.
7. Fase 6: hoja de ruta funcional (R-01 a R-04).
