# Registro de hallazgos y plan de mantenimiento: parte 3 de 3

Parte 3 de 3 del [registro de hallazgos](./registro-hallazgos.md): secciones 6 a 10 (seguridad y operación (S, O), interfaz y documentación (U, D), hoja de ruta (R), cobertura de la revisión y plan por fases). Se lee completa y en orden con las demás: [parte 1 de 3](./registro-hallazgos_1de3.md) · [parte 2 de 3](./registro-hallazgos_2de3.md) · [parte 3 de 3](./registro-hallazgos_3de3.md).

## 6. Seguridad y operación (S)

| ID | Sev. | Hallazgo | Certeza |
|---|---|---|---|
| S-01 | Alto | Ningún endpoint de datos filtra por `propietario_id`, `es_privado` ni `perm_*`; editar un recibo ajeno lo reasigna al editor. `permisos.md` lo presenta como implementado. | Confirmado |
| S-02 | Alto | `db_maintenance.mjs` monta comandos de shell por interpolación: contraseñas con símbolos rompen backup y restore y la contraseña queda en `ps` y en el log. Validación de restore cosmética, sin backup previo, sin límite de tamaño. | Confirmado |
| S-03 | Alto | `saveDbConfig` escribe claves sin validar, el pool no se recrea tras el cambio, `initPool` no memoiza, el TLS va fijo con `rejectUnauthorized:false` y `GET /api/db-config/password` devuelve la contraseña. | Confirmado |
| S-04 | Medio | JWT de 24 h con rol embebido y sin revocación; sin rate limiting en `/login`; borrar o degradar admins sin guardas. | Confirmado |
| S-05 | Medio | `error.stack` devuelto al cliente, `console.log` masivo y CORS abierto. | Confirmado |
| S-06 | Medio | `/tech-docs` y `/documentation` solo se ocultan en el menú; ninguna ruta define `requiresAdmin`. | Confirmado |
| S-07 | Medio | Los servicios usan `axios` crudo, no `apiClient`; el interceptor llama a `useAuth()` fuera de componente; dependencia circular `api.js` y `useAuth.js`; cada `useAuth()` crea su estado e intervalo. | Confirmado |
| S-08 | Bajo | `.gitignore` no cubre `.db_connection.backup` ni `*.sql`; `engines` Node >=20.9 <21 frente a README Node 16+; scripts con rutas `/workspaces`; sin herramienta de migraciones (la línea base 0001 y las pruebas de la fase 0 son el primer paso). | Confirmado |
| S-09 | Bajo | El contenedor de desarrollo no trae `git-crypt` aunque el README lo exige; añadirlo a `.devcontainer/Dockerfile`. | Confirmado |
| S-10 | Cerrado | El `.env` de la raíz solo contiene `VITE_API_URL`; no hay secretos. `backend/.env` y `backend/src/db/.db_connection` figuran cifrados. | Confirmado |
| S-11 | Alto | Dependencias: Dependabot informa de 108 vulnerabilidades en `main` el 2026-10-17 (3 críticas, 59 altas, 38 moderadas, 8 bajas) y hay cinco ramas `snyk-fix-*` sin fusionar. Actualizar en una fase propia, con las pruebas en verde. | Confirmado |
| S-12 | Alto | reader y limited_user están definidos pero no limitan escritura en los endpoints de datos. isUser/canRead y vRole no se usan para imponer esas restricciones. Definir la matriz de autorización y aplicarla en servidor y UI; vinculado a S-01 y S-06. Abierto. | Confirmado |
| O-01 | Bajo | `VITE_API_URL=http://localhost:3000`: el frontend no alcanzará el backend desde otros equipos de la red; configurar en el despliegue. | Confirmado |

## 7. Interfaz y documentación (U, D)

| ID | Sev. | Hallazgo |
|---|---|---|
| U-01 | Alto | El Dashboard (página de inicio) es el de la plantilla Sakai. |
| U-02 | Medio | `/manual` y `/documentation` cargan la misma página (plantilla Sakai en inglés); no existe manual de usuario. |
| U-03 | Medio | El menú muestra «UI Components», «Pages» y «Hierarchy» a todos; Presupuestos, Transacciones y Automatización son páginas vacías. |
| U-04 | Medio | `className` en vez de `class` en `Budgets.vue` y `ProfileSettings.vue`. La pestaña «Header III» con Lorem ipsum se eliminó en DC-26; `className` sigue en ambos (2026-10-23). |
| U-05 | Bajo | Idioma mezclado (Cancel, Save, Yes, Confirm, Successful, Warning). |
| U-06 | Bajo | Formato inconsistente: saldo sin moneda en Cuentas; «Importe periódico» frente a «Ahorro sugerido»; «Importe total» de Anticipos es el saldo. |
| U-07 | Bajo | Calendario: no pinta mensuales pero los suma; mensual manual con una fecha cuenta un solo mes; tooltip solo del primer evento. |
| U-08 | Bajo | Servicios de demo (`CustomerService.js` de 284 KB y otros) y `views/uikit` en el repositorio. |
| U-09 | Bajo | Guardar un diálogo de edición sin haber tocado nada debe mostrar el aviso verde «No se ha cambiado nada.» y cerrar sin llamar al servidor (DC-30). Aplicado el 2026-10-29 en Ahorros y Categorías; falta el diálogo de movimientos de Ahorros y el resto (Cuentas, Anticipos, Recibos, Usuarios, Ajustes). |
| U-10 | Bajo | La vista de inactivos de Ahorros debe comportarse como la de Recibos. Diferencias conocidas: el botón de Ahorros se deshabilita cuando no hay inactivos y no hay tarjeta «Inactivos»; Recibos filtra con los filtros de DataTable. Leer las líneas de `ListBills.vue` antes de homogeneizar. |
| U-11 | Medio | Hoy solo Recibos y Ahorros ofrecen mostrar/ocultar inactivos. Aplicar DC-32 en todas las vistas donde se añaden y quitan entradas (Recibos, Ahorros, Anticipos, Cuentas, Categorías, Presupuestos y las que se añadan): activo/inactivo por entrada, botón «Mostrar/Ocultar inactivos» igual que en Recibos y selección coherente con lo visible (`watch`, F-08). Antes, inventario: qué tablas tienen ya `activo` o un estado equivalente (Anticipos usa `estado`: activo, pausado, cancelado, completado) y cuáles necesitarían una migración nueva (DC-13). Incluye U-10. |
| D-01 | Medio | Estados y `comentario` de `fechas_cargo` en la doc no coinciden con la BD. Resuelto en diseño por DC-01. |
| D-02 | Medio | `presupuestos.md` usa `transacciones`, `periodo_id` y `recibos_periodos`, que no existen; `DB_presupuestos.txt` usa `user_id`. |
| D-03 | Medio | Documentados en la fase 1: `historial`, `generar-fechas`, `actualizar-fechas`, `fecha_inicial` y `modoFechas`. Documentados el 2026-10-23: `/api/db-config*`, `/api/db/backup|restore` y la página Calendar; Budgets, Transactions, Automation y Loans son páginas vacías de la plantilla (U-03). |
| D-04 | Bajo | `db_utilsBill.md` apunta a un módulo inexistente; faltan `anual` y otros valores; `Tech-documentation.vue` duplica a mano `doc/`. |
| D-05 | Bajo | Los planes de anticipos de los datos empiezan un periodo después de `fecha_inicio`; el código actual empieza en `fecha_inicio`. Aclarar el comportamiento. |
| D-06 | Medio | `db_utilsSav.md` y `db_utilsAdv.md` afirmaban que las operaciones usaban transacciones y ninguna lo hacía. Corregido en la fase 1: el de ahorros describe las transacciones de F-03 y el de anticipos avisa de que no las usa (F-27). Puesta al día de F-01, F-02, F-03, F-24, F-25 y F-26 en `doc/db`, `doc/routes`, `doc/components`, `doc/services` e `index.md`. |
| D-07 | Bajo | `db_utilsAcc.md` decía que los saldos se mantenían automáticamente y que el IBAN se verificaba antes de insertar; el saldo es manual (F-21) y el duplicado lo detecta el índice único. Corregido en la fase 1 junto con F-06. |
| D-08 | Bajo | `README.md`, `README_en.md` y `.github/copilot-instructions.md` presentaban `DB_estructura.txt` (volcado antiguo con datos de ejemplo) como fuente del esquema, y el `TODO` citaba una función inexistente (`actualizarFechasCargoPagado`) y un histórico por depurar. Corregido en la fase 1 (DC-13). |
| D-09 | Bajo | La documentación de `fechas_cargo` y de la API de recibos decía que `estado` admite «pagado» y «rechazado»; el esquema solo admite «pendiente» y «cargado». Corregido en la fase 1 junto con el PR de backend de DC-14. |
| D-10 | Medio | Auditoría de `doc/` del 2026-10-23 (comprobación mecánica de nombres, rutas, enlaces y migraciones sobre los 45 documentos, y lectura de los que cambiaron en los PR #22 a #28). Corregido en el PR de documentación (DC-27): plan y `TODO` obsoletos; «Pendiente» ya hechos en DC-21, DC-23, `db_utilsBill.md` y `ListBills.md`; `permitirPagados` sin documentar; funciones inexistentes en `ListBills.md` (`fetchCategories`, `fetchAccounts`); `db_ajustes.md` atribuía a `db_ajustes` las funciones de `utils/tiempo`; 21 enlaces `../` de `doc/index.md` rotos en GitHub, 6 en `schema/index.md`, 1 en `middleware/auth.md` y 1 en `BillService.md`; MySQL y Aiven en `schema/index.md` y `optimizaciones.md`; `README.md` y `.github/copilot-instructions.md` con versiones y funciones desfasadas. Nuevos: `useTheme`, `useLayout`, `useAjustesSesion`, `tiempo`, `env`, `conexionDB`, `mantenimientoDB`, `DbConfigService`, `MaintenanceDBService`, `db_utilsConn`, `db_maintenance`, `Calendar` y `PaginasVacias`. |
| D-11 | Medio | Cierre de la auditoría documental del 2026-10-23, tras PR #29. Contrastados los nueve documentos pendientes: Advances, Savings, AccService, AdvService, CatsService, SavService, UsersService, db_utilsAdv y db_utilsSav. Corregidas promesas de funciones que no ejecuta el código (inactivos, borrado múltiple, validaciones y transacciones), contratos de token/errores, saldo restante, algoritmos de recálculo y trazas. Se consolidan también las correcciones documentales de guardias, middleware, autenticación, privacidad/permisos, README inglés y pruebas. F-37 a F-40 quedan abiertos; F-07, F-08, F-14, F-16, F-19, F-27 y F-28 no se dan por corregidos. |
| D-12 | Medio | Verificación del estado fusionado en f4f2328 (PR #30), 2026-10-24: corregidas pestañas inexistentes de Recibos, paginación de usuarios ausente, validaciones sobreafirmadas, restricciones de roles no aplicadas, precisión del rastro SQL e historial de PR. F-41 a F-43 y S-12 permanecen abiertos; R-05 a R-08 son propuestas, no compromisos aprobados. Se limpian referencias a scripts de la conversación. |
| D-13 | Medio | Revisión de documentación de raíz omitida en los cierres previos (base da4250e/PR #31): package.json.md describía comandos y directorios inexistentes; DB_controlfinanciero.txt y DB_presupuestos.txt contenían SQL histórico sin delimitar su vigencia; presupuestos.txt mezclaba requisitos con capacidades actuales; categorías.txt era una lista de ejemplos, no una jerarquía. Se corrige/clasifica cada archivo, se recuperan R-09 a R-13 por prioridad y se sincronizan TODO, plan, índice y relevo. No se certifica que la auditoría integral del repositorio esté completa. |
| D-14 | Medio | Relevo operativo tras PR #32: fija la secuencia de próximos PR, alcance y exclusiones de Actualizar fechas, aceptación, entorno de tests, distinción entre prioridad técnica y orden acordado, reglas del usuario y arranque de otro chat. Sin cambios de negocio ni nuevas pruebas funcionales. |
| D-15 | Bajo | Actualización del punto de reanudación a base 4d73e06 (PR #35) tras fusionar #33 (D-14), #34 (DC-27) y #35; añade regla en §3 de la instrucción persistente sobre commit remoto delegado con contenido erróneo o marcador no sustituido. Sin cambios de negocio. |
| D-16 | Bajo | División del registro en partes (DC-28): el registro superaba lo que el conector lee de una vez (se truncaba hacia los 40 000 caracteres, en F-41). Se divide por secciones completas en 3 partes; `registro-hallazgos.md` queda como entrada con mapa de secciones, y se actualizan las referencias, el relevo, el índice, `docNavigation`, la instrucción persistente y las rutas de `backend/test/README.md` y `docker-compose.test.yml`. Sin cambios de negocio: los IDs y las filas existentes no cambian. |
| D-17 | Bajo | Dividir la instrucción persistente en partes (33 KB; el conector la trunca hacia el §11) y revisar los .md próximos al límite de lectura (por ejemplo `estado-del-proyecto.md`, 26 KB), como D-16/DC-28. Preparado el 2026-10-29 en la rama `mantenimiento/D-17-dividir-instruccion-persistente` (DC-33), pendiente de revisión y fusión; `estado-del-proyecto.md` se revisa sin dividirlo. |

## 8. Hoja de ruta funcional (alineación con el Excel; no se aborda hasta cerrar los fallos)

| ID | Necesidad del Excel |
|---|---|
| R-01 | Reserva mensual de recibos no mensuales, con marca de pagado o pendiente. |
| R-02 | Movimientos con saldo corrido y conciliación entre cuentas. |
| R-03 | Disponible del mes = nómina − recibos − gastos − previstos netos de reservas. |
| R-04 | Reparto de sueldos entre dos personas (políticas A, B y C). |
| R-05 | Propuesta de mejora, no aprobada ni implementada: progreso de Ahorros. Decidir si hace falta importe objetivo además de fecha y cómo medir avance; no equiparar fecha objetivo a objetivo monetario. |
| R-06 | Propuesta de mejora, no aprobada ni implementada: clasificación transversal por categorías, coordinada con R-02 y presupuestos; evitar añadir relaciones aisladas sin modelo de movimientos común. |
| R-07 | Propuesta de mejora, no aprobada ni implementada: informes básicos de saldo y plan de Anticipos, y aportaciones de Ahorros, con periodo y cifras trazables. CSV actual no equivale a informes. |
| R-08 | Propuesta de mejora de prioridad baja: paginación y búsqueda de usuarios cuando el volumen lo justifique; el listado actual no pagina. |
| R-09 | P2, requisito histórico a revalidar: automatización de aportaciones de Ahorros mediante reglas. Fuente DB_controlfinanciero.txt. No existe hoy; requiere idempotencia por regla/periodo, pausa, historial de ejecución, política de fallo y no duplicar aportaciones manuales. Depende de integridad F-27 y operación; no se resuelve solo ampliando F-37. |
| R-10 | P2, requisito histórico a revalidar: cadencias adicionales de Anticipos, p. ej. semanal y cada cuatro meses, citadas en DB_controlfinanciero.txt. Afecta algoritmo, esquema, fechas de fin y UI; no basta con ampliar ENUM. Coordinar con F-40 y pruebas de calendario. |
| R-11 | P2, requisito histórico a revalidar: presupuestos por periodo con importe asignado, gastado y disponible, y selector mes/año. Fuentes presupuestos.txt, DB_presupuestos.txt y DB_controlfinanciero.txt. Las tablas parciales no equivalen a API ni pantalla. Depende del modelo de movimientos R-02 y disponible R-03; evitar otra fuente de saldo. |
| R-12 | P2, requisito histórico a revalidar: presupuesto especial de recibos con esperado, recibido, diferencia y pendientes. Fuente presupuestos.txt; relacionado con R-01. Definir efecto de diferencias y continuidad de pendientes sin duplicar fechas_cargo ni romper DC-14; depende de R-11/R-02. |
| R-13 | P2, requisito histórico a revalidar: detalle de transacciones de un presupuesto y periodo al pulsar su concepto. Fuente presupuestos.txt (fase II). Depende de R-11 y del modelo de movimientos R-02, con trazabilidad y autorización de servidor. |

## 9. Cobertura de la revisión

D-13 amplía el alcance a cinco documentos de raíz que faltaban en los inventarios anteriores. Corrige o clasifica sus afirmaciones y recupera requisitos priorizados, pero no acredita que la auditoría integral esté finalizada.


Auditoría cerrada el 2026-10-23 sobre el código de los PR #14 a #28, el primer PR de documentación #29 y los ficheros entregados por el usuario. El historial se contrastó con cambios_por_pr.txt. Los adjuntos sustituyen las lecturas truncadas del conector.

La revisión combina lectura de los documentos, contraste de afirmaciones con los caminos del código, tablas y restricciones de las migraciones, endpoints, cuerpos y respuestas, formularios, exportaciones y trazas; no es solo una comparación de nombres. Se completó expresamente la revisión de Advances.md, Savings.md, AccService.md, AdvService.md, CatsService.md, SavService.md, UsersService.md, db_utilsAdv.md y db_utilsSav.md. No queda la anterior lista de documentos pendientes de lectura.

Los documentos históricos y de diseño de schema/ se identifican como tales: no se presentan como funcionalidades implementadas ni como scripts de instalación vigentes. Las filas de una BD de pruebas no son requisitos de negocio. Los ENUM del esquema sí limitan lo que la implementación actual ofrece, pero no deciden por sí solos el diseño deseado. En Ahorros ya existe uso manual con periodicidad NULL; ampliar opciones explícitas es F-37.

Es una revisión estática, no una certificación de ausencia de defectos. No se han ejecutado de nuevo UI, build, lint ni pruebas de integración contra MariaDB en esta auditoría. La salida recibida de npm run test:backend falló durante preparación por ENOTFOUND mariadb-test, sin una ejecución funcional satisfactoria. Resolver el entorno y volver a ejecutar la suite queda como tarea operativa, no como corrección de documentación pendiente.

La documentación describe los fallos como comportamiento actual y remite a F/S/U; cerrar la auditoría documental no cierra esos fallos. Informe y trazabilidad: [auditoria-documentacion.md](./auditoria-documentacion.md).

## 10. Plan por fases

### Prioridad técnica de trabajo futuro (D-13)

La siguiente tabla ordena por riesgo y dependencias. No reordena por sí sola los tres micro-PR ya acordados (Actualizar fechas, validación de un año y F-17); si se prepara un despliegue real, los riesgos P0/P1 deben resolverse antes de ampliaciones funcionales. P0 es la prioridad mayor.

| Prioridad | Trabajo | Dependencias/criterio |
|---|---|---|
| P0 | S-01/S-06/S-12: autorización efectiva en servidor | reader no debe poder escribir; la ocultación de controles no es seguridad |
| P1 | F-14/F-16/F-27 y S-02/S-03: saldos, transacciones, reintentos y recuperación | Evitar pérdidas, duplicados y operaciones parciales |
| P1 | F-41/F-42/F-43 y entorno de tests | Validación coherente, respuestas claras y ejecución reproducible de pruebas |
| P2 | R-02/R-03 y R-11: movimientos y presupuestos por periodo | Primero un modelo común, sin fuentes de saldo paralelas |
| P2 | R-01/R-12: recepción de recibos y diferencias | Depende de presupuestos, respeta DC-14 y no duplica estados de pago |
| P2 | R-09: reglas de aportación automática de Ahorros | Idempotencia, pausa, historial y política de fallos; distinto de uso manual/F-37 |
| P2 | R-10: cadencias adicionales de Anticipos | Rediseño de calendario y pruebas, no solo ENUM; relacionado con F-40 |
| P2 | R-13: detalle de transacciones por presupuesto/periodo | Depende de R-02/R-11 y de autorización efectiva |
| P3 | R-05/R-07: progreso e informes básicos | Dependen de objetivos definidos y cifras conciliables |
| P3 | R-08: paginación/búsqueda de usuarios | Solo si el volumen lo justifica |

R-09 a R-13 se recuperan de especificaciones históricas. Quedan como tareas para revalidar y diseñar, no como funcionalidades aprobadas, implantadas o corregidas. categorías.txt no justifica por sí solo implementar jerarquías.


Estado al cierre de la auditoría documental del 2026-10-23, después del PR #29. Fuente de continuidad: [estado-del-proyecto.md](./estado-del-proyecto.md); lista corta en TODO. La documentación ya no queda aplazada como una lectura pendiente: se modifica con cada cambio de código.

1. Fase 0 completada: línea base, registro y pruebas iniciales. La ejecución actual requiere configurar el entorno de backend/test/README.md.
2. Fase 1 en curso: ya están incorporados el rediseño de recibos por año, Ajustes, zona horaria y Aspecto (PR #22 a #28), además de las correcciones F-01 a F-06, F-18, F-24 a F-26, F-29, F-33 a F-36 según el registro (F-35 dejó de aplicar al retirar el histórico).
3. Siguiente, un PR por punto, sin alterar el orden acordado:
   - [x] Retirar Actualizar fechas (hecho 2026-10-27): updateAllDates y botón comentado, BillService.updateAllBillsDates, ruta /api/recibos/actualizar-fechas, actualizarFechasRecibos y generarNuevasFechasRecibo retirados; los dos errores de eslint de ListBills corregidos. Cierra F-11, F-23 y F-32, no F-12.
   - [x] Dividir el registro en partes (D-16, DC-28): incorporado el 2026-10-28 (PR #38). Fue antes de DC-14 porque ese PR edita el registro y añade una decisión.
   - [x] Validación de un solo año al editar recibos (DC-14, DC-29), servidor y pantalla, con el interruptor de sesión «Permitir declarar fechas fuera del año en curso»: incorporada el 2026-10-28 (PR #39).
   - Incluye la recolocación de «Generar los recibos del año ahora» justo debajo de «Crear recibos del año automáticamente» en Ajustes › Administrar recibos.
   - [x] F-17: errata re/turn en confirmDeleteAdvance: incorporada el 2026-10-28 (PR #40). El orden de las correcciones agrupadas del punto 4 quedó acordado el 2026-10-29 (ver abajo). Alcance ampliado con aprobación del usuario: retirar `saldoRestante`, variable no usada de `Advances.vue`; F-14 sigue abierto.
4. Resto de fase 1, agrupado para no perder fallos de la auditoría:
   - [x] F-07/F-08: borrado e inactivos de Ahorros; F-09/F-22: edición e índice único de categorías; F-10: errores de FK: incorporados el 2026-10-29 (PR #41). F-22 queda mitigado sin índice único (DC-02) y F-10 solo cubre categorías (en ahorros hay una traducción defensiva).
   - F-12/F-13 y DC-05: calendario/normalización de DATE; F-14: saldo, cambios de pagado, reactivación al borrar y respuesta de la ruta antigua de pagos.
   - F-16: no mutar fechas de los formularios antes de confirmar éxito; F-19: CSV seguro; F-20/F-21: endpoint inexistente y saldo de cuentas manual; F-27: atomicidad de operaciones y sustitución de pagos; F-28: mensajes del servidor; F-30/F-31: selección y texto de borrado en recibos; F-15 solo en lo no sustituido por el rediseño.
   - F-37: opciones explícitas de cadencia de Ahorros, conservando uso manual sin patrón; F-38: token de sesión temporal en UsersService; F-39: borrado múltiple de Anticipos; F-40: propuesta de fechas manuales.
   - Migraciones de DC-01 (rechazado) y DC-02 (unicidad de categorías), todavía ausentes de 0001 a 0004.
   - Agrupación de la fase 1 acordada el 2026-10-29 (un PR por grupo; rama, commit y PR con los IDs desglosados, p. ej. `fix(F-07, F-08, F-09, F-22, F-10): …`): 1) F-07/F-08/F-09/F-22/F-10; 2) F-12/F-13/DC-05; 3) F-14 (solo); 4) F-27 (solo); 5) F-16/F-19/F-20/F-21/F-28/F-30/F-31/F-15 y F-38; 6) F-37/F-40; 7) F-39 (solo); 8) DC-01/DC-02 (migraciones, solo). F-38 no figuraba en la propuesta del 2026-10-28 y se incluye en el grupo 5 a falta de confirmación.
   - PR intercalados acordados el 2026-10-29: D-17 (dividir la instrucción persistente; preparado en la rama `mantenimiento/D-17-dividir-instruccion-persistente`, pendiente de revisión y fusión) tras el grupo 1 y, a continuación, un PR de homogeneidad del front (U-09, U-10, F-44). U-11 (todas las vistas de listado) se apunta como tarea aparte; su orden se acordará tras un inventario de qué entidades tienen `activo`.
5. Fase 2: permisos reales y acceso (S-01, S-04, S-06). Los campos de permisos y la ocultación de controles no equivalen a autorización del servidor.
6. Fase 3: operación (S-02, S-03, S-07, O-01, S-08/S-09) y migración nueva de mantenimiento. Unificar uso de API/estado de sesión e interceptores; confirmar el entorno de tests antes de presentar resultados.
7. Fase 4: interfaz y funcionalidades de plantilla (U-01 a U-08), diseño pendiente (D-01 a D-05 en lo no resuelto) y mantenimiento automático de navegación/documentación. El cierre de los contrastes D-11/D-12 no acredita una auditoría integral de todos los archivos del repositorio: D-13 incorpora documentos de raíz antes omitidos.
8. Fase 5: dependencias (S-11), revisar las ramas Snyk antes de actualizar, con pruebas funcionales disponibles.
9. Fase 6: hoja de ruta funcional del Excel (R-01 a R-04), que se conserva en la sección 8.
