# Auditoría de documentación: cierre del 2026-10-23

## Base, alcance y límites

Se parte de main tras PR #29 (no de una versión de p16 aplicada). Los cambios de desarrollo se reconstruyeron con cambios_por_pr.txt, PR #14 a #28; los ficheros grandes se leyeron desde los adjuntos, no desde los resultados truncados del conector.

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
