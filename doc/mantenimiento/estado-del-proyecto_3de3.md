# Estado del proyecto Timón: parte 3 de 3

Parte 3 de 3 del [relevo](./estado-del-proyecto.md): sección 8 y cierres históricos (relevo histórico de la limpieza de 2026-10-27; cierres de auditoría de 2026-10-23 y 2026-10-24; alcance corregido de D-13). Se lee completa y en orden con las demás: [parte 1 de 3](./estado-del-proyecto_1de3.md) · [parte 2 de 3](./estado-del-proyecto_2de3.md) · [parte 3 de 3](./estado-del-proyecto_3de3.md).

Nota de vigencia (2026-11-11): esta parte conserva el relevo histórico de 2026-10-27 y los cierres de auditoría de 2026-10-23 y 2026-10-24. Están superados: el índice único de DC-02 (0006, PR #81), los permisos reales (S-01, PR #79), el esquema 0001 a 0006, apiClient (S-07, PR #79), F-12 (PR #46) y F-16, F-19, F-28 y F-38 (PR #57, #58, #61 y #69). El estado vigente está en las secciones 0 y 5, en el TODO y en el registro.

## 8. Relevo histórico de la limpieza (2026-10-27)

Esta sección conserva el alcance y las comprobaciones históricas de la limpieza; no define la siguiente tarea actual, que figura en las secciones 0 y 5.

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
- Evidencia histórica al preparar la limpieza: ENOTFOUND mariadb-test impidió la preparación. Evidencia posterior de U-13 (2026-11-02): EXIT:0, 85 pruebas pasadas, 0 fallos, canceladas u omitidas, usando mariadb01, puerto 3306, timon_test y conta_hogar_test.
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

La lista completa de fallos está en el registro, no en esta síntesis. DC-01 (rechazado) y DC-02 (unicidad de categorías) siguen pendientes; dateStrings para DATE se incorporó en el PR #48. Los permisos reales siguen pendientes. Los documentos de raíz ya están clasificados como diseños históricos/ejemplos o descripción actual de package.json.

### Protocolo para arrancar otro chat

1. Leer este relevo y comprobar git status --short, rama y git log --oneline -5. No recrear una rama que ya exista ni asumir que el trabajo no confirmado en local está fusionado.
2. Leer doc/mantenimiento/estado-del-proyecto.md (entrada y sus tres partes, en orden), TODO y el registro: registro-hallazgos.md (entrada) y sus tres partes, en orden (decisiones, entorno, aceptación, hallazgos y plan). No limitarse a dos secciones de un resultado truncado.
3. Si la rama actual tiene trabajo posterior, localizarlo y respetarlo antes de cambiar de rama. Las dos modificaciones de conexión conocidas no son permiso para ignorar cualquier otro cambio.
4. Si no hay otro trabajo en curso, seguir las secciones 0 y 5 actuales; no reiniciar la limpieza histórica descrita arriba. Leer las funciones actuales y todos sus consumidores antes de proponer el parche.
5. Distinguir siempre decisiones del usuario, propuestas a revalidar, fallos abiertos y cambios probados.

No se recupera literalmente toda la conversación: el relevo recoge lo operativo para continuar de forma verificable, y los archivos del repositorio son la fuente persistente.

## Cierre de auditoría y fallos pendientes (2026-10-23)

El primer PR de documentación fue #29. El PR #30 incorporó el cierre D-11, completó los nueve documentos pendientes y registró los fallos F-37 a F-40. Informe: [auditoria-documentacion.md](./auditoria-documentacion.md). El contraste de esos nueve documentos fue estático; no significa que las funcionalidades estén corregidas, que haya pruebas de integración en verde ni que toda la documentación del repositorio haya pasado una auditoría integral.

Comportamiento actual que no debe prometerse como terminado:

- Ahorros: el filtro de inactivos, el interruptor «Ahorro activo» (F-08) y el borrado individual (F-07) están corregidos (PR #41); el concepto se envía capitalizado al guardar (F-44). No hay generación de aportaciones ni porcentaje de progreso. Ya admite movimientos manuales sin periodicidad; opciones explícitas de diaria/semanal son F-37.
- Anticipos: en esta auditoría importe_total era el saldo restante (F-14) y cambiar el importe de un pagado no lo ajustaba. Incorporado en el PR #53 (DC-38, paso a): el principal se guarda en importe_original, el importe pendiente y el estado completado se derivan de los pagos pagados y un pagado no puede cancelarse. El recálculo de los pagos pendientes al editar un pagado (DC-40) y las transacciones (F-27, DC-39) se incorporaron en el PR #54: al editar un pagado solo se recalcula si el plan cuadraba. Recalcular tras editar no equivale al algoritmo de completar tras borrar. Las fechas del plan automático se calculan ancladas en el día de fecha_inicio (F-46, DC-41), incorporadas en el PR #55. El resto del paso c de DC-38 se declara no aplicable por DC-42.
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
