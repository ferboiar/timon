# Historial de revisiones documentales y límites de cobertura

## Base, alcance y límites

La primera parte de esta auditoría se preparó sobre main tras PR #29 y se incorporó mediante PR #30. Los cambios de desarrollo se reconstruyeron con cambios_por_pr.txt, PR #14 a #28; los ficheros grandes se leyeron desde los adjuntos, no desde los resultados truncados del conector.

El cierre completa los nueve documentos expresamente pendientes y consolida las correcciones anteriores rechazadas por ser parciales. No cambia código de aplicación, esquemas, datos, reglas de negocio ni ejecuta migraciones. La revisión es estática; verificar que un parche se aplica no equivale a ejecutar Vue o MariaDB.

## Trazabilidad de los nueve documentos

| Documento | Código contrastado | Resultado |
|---|---|---|
| components/Advances | src/views/pages/Advances.vue, service/AdvService, routes/anticipos y db_utilsAdv | Formularios, condición de botones, fechas, sustitución, recálculo, CSV y errores. Documentados F-14/F-16/F-17/F-27/F-28/F-39/F-40 |
| components/Savings | Savings.vue, SavService, routes/ahorros y db_utilsSav | Inactivos sin filtrar, falta de edición de activo, uso manual sin patrón, validaciones, borrado, recargas y CSV. F-07/F-08/F-10/F-16/F-19/F-28/F-37 |
| services/AccService | src/service/AccService.js | URL configurable, token dual, métodos/rutas, cuerpo DELETE, errores axios |
| services/AdvService | src/service/AdvService.js y routes/anticipos | Cuerpos, validación del array de IDs, recálculo y dos vías de borrado |
| services/CatsService | src/service/CatsService.js y db_utilsCats | Cuerpo de IDs y límite de renombrado por nombre (F-09) |
| services/SavService | src/service/SavService.js | Siete métodos, periodicidades del servidor y movimientos individuales, no programación |
| services/UsersService | src/service/UsersService.js y routes/users | fetch, respuesta y errores, POST/PUT y token solo local en tres métodos (F-38) |
| db/db_utilsAdv | backend/src/db/db_utilsAdv.mjs, leído completo | Todas las funciones, caminos de estado/saldo, reparto, límites 1200, fechas y trazas; ausencia de transacciones |
| db/db_utilsSav | backend/src/db/db_utilsSav.mjs, leído completo | Todas las funciones y trazas; transacciones y bloqueos concretos, diferencias, validación, orden y FK |

## Otras correcciones incluidas

- router/routeGuards y middleware/auth reflejan los guardias y códigos reales, no ejemplos imaginados.
- AuthenticationFlow, TokenExpiration, Login y routes/auth separan token/rol, almacenamiento, red, autorización e interceptores no usados.
- db_utilsUsers no genera el hash ni valida emails ni fusiona preferencias: esas atribuciones se corrigen.
- db_utilsAcc y db_utilsCats diferencian normalización, índices y validación real.
- Los ENUM actuales son restricciones de implementación, no intenciones deducidas de datos de prueba ni catálogo definitivo de producto.
- permisos y presupuestos se señalan como diseño; optimizaciones y migracion_recibos_cuentas ya estaban marcados como históricos en PR #29.
- README_en y backend/test/README dejan de describir versiones y pruebas antiguas.
- Registro, TODO y estado-del-proyecto quedan sincronizados con estos fallos. No queda una casilla de lectura documental pendiente para los nueve documentos.

## Verificaciones que NO se han realizado

No se ha ejecutado la aplicación, build, lint ni una nueva suite MariaDB durante este cierre. La salida de pruebas entregada falló durante preparación por ENOTFOUND mariadb-test. No se certifica ausencia de errores ni concurrencia/rollback/conciliación solo por leer código.

## Relevo

Leer [estado-del-proyecto.md](./estado-del-proyecto.md), el [registro](./registro-hallazgos.md) y TODO. Mantener esos tres puntos de continuidad en cada PR. Los fallos listados están documentados y pendientes de corregir, no cerrados por esta auditoría.

## Verificación posterior del estado fusionado, 2026-10-24

Base: f4f2328901f208d97965117a44c7429ab89e03f2, con PR #30. Se recibieron 59 documentos de doc/ más el registro y nueve archivos de raíz, configuración y visor. Los controles de enlaces, filas de identificadores y correspondencia de rutas no hallaron destinos inexistentes, IDs duplicados ni rutas documentadas sin implementación en las diez APIs.

La lectura funcional adicional corrigió estructura de Recibos, listado de usuarios, validaciones, roles y rastro del procedimiento. Los resultados se registran en D-12. Las sugerencias se separan de los fallos: F-41 a F-43 y S-12 son limitaciones verificadas; R-05 a R-08 son propuestas a evaluar.

Sigue siendo una revisión estática. No se certifica ausencia de defectos ni una ejecución de UI/MariaDB satisfactoria. No confundir comprobación documental con prueba funcional.

## Ampliación de alcance D-13: documentos de raíz

Fecha: 2026-10-24. Base fija: `da4250e93a8746e1a465496d4d816537a62724ae` (PR #31).

Las revisiones anteriores dejaron fuera cinco documentos de raíz. Esa omisión impide usar sus cierres como certificación de una auditoría integral. Se corrigen/classifican ahora:

| Fichero | Contraste | Resultado |
|---|---|---|
| package.json.md | package.json: comandos, rutas de entrada y ubicación del frontend | Documento desfasado: se regenera la descripción desde el manifiesto actual |
| DB_controlfinanciero.txt | Savings/Advances/Budgets, db_utilsSav/db_utilsAdv y migraciones | SQL histórico; se recuperan automatización, cadencias y presupuestos como R-09/R-10/R-11 |
| DB_presupuestos.txt | Migración base, Budgets y ausencia de rutas de presupuestos | Borrador histórico; user_id/cascadas no son contrato vigente |
| presupuestos.txt | Budgets/Transactions y modelo actual de recibos por año | Requisitos no implementados: R-11/R-12/R-13 |
| categorías.txt | Categories, db_utilsCats y esquema de categorias | Ejemplos; no hay jerarquía implementada ni se propone una a partir de la lista |

Las tareas se ordenan en TODO y en la sección 10 por P0/P1/P2/P3. Las nuevas de producto requieren revalidación antes de implementar. No cambian negocio, código de aplicación, datos ni esquema.

D-13 resuelve estas discrepancias concretas. No significa que se haya completado una lectura exhaustiva fichero por fichero de todo el repositorio, ni que se haya ejecutado UI/build/tests. El fallo de entorno de MariaDB sigue sin equivaler a una prueba funcional en verde.
