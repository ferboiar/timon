# Estado del proyecto Timón: parte 2 de 3

Parte 2 de 3 del [relevo](./estado-del-proyecto.md): secciones 4 a 7 (historial de PR; siguiente paso operativo; mapa de `doc/`; retomar en una conversación nueva). Se lee completa y en orden con las demás: [parte 1 de 3](./estado-del-proyecto_1de3.md) · [parte 2 de 3](./estado-del-proyecto_2de3.md) · [parte 3 de 3](./estado-del-proyecto_3de3.md).

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
| #45 | D-18 | Informes de cierre retroactivos de los PR #43 y #44 y relevo al día |
| #46 | F-12, DC-35 | Fechas futuras ancladas en `generarFechasFuturas` y división del grupo 2 en dos PR |
| #47 | F-45, D-19 | Guardar sin cambios tiene en cuenta el modo de fechas y errata del informe del PR #43 |
| #48 | F-13, DC-05 | Fechas `DATE` como texto en el pool de MariaDB |
| #49 | D-20 | Documentación técnica e índice de informes |
| #50 | U-13, DC-36 | Vista previa de hoy y simulación del próximo 1 de diciembre |
| #51 | D-21 | Contraste documental de cambios recientes e informe retroactivo del PR #42 |
| #52 | D-22, DC-37 | Relevo dividido en entrada y tres partes |
| #53 | F-14, DC-38 | Principal guardado e importe pendiente derivado en anticipos (migración 0005) |
| #54 | F-27, DC-39, DC-40 | Transacciones con el anticipo bloqueado, ruta única de borrado, sustitución atómica y recálculo al editar un pagado |
| #55 | F-46, DC-41 | Fechas ancladas del plan de pagos de anticipos |
| #56 | D-23, DC-42 | Cierre del paso c de DC-38 y de F-14 |
| #57 | F-16 | Payloads de fechas inmutables en Ahorros y Anticipos |
| #58 | F-19, D-24 | Exportación CSV segura y sincronización del seguimiento |
| #59 | D-25 | Sincronización del seguimiento tras el PR #58 y registro de D-23 |
| #60 | F-20, F-21 | Retirada de `getBillById` y decisión DC-43 del saldo manual |
| #61 | F-28, D-26 | Mensajes del servidor homogéneos en servicios y pantallas, y sincronización del seguimiento tras el PR #60 |
| #62 | F-47 | Errores de negocio y técnicos: utilidad compartida aplicada a cuentas, ahorros, categorías y recibos (F-48 quedó registrado, sin implementar: D-30) |
| #63 | O-02, DC-44, D-27 | Suite E2E persistente en `e2e/`: lanzador autónomo, sesión única, triage y documentación |
| #64 | — | Reglas de Cline versionadas (`.cline/rules`) y regla de pruebas de interfaz alineada con `e2e/` |
| #65 | D-28 | Sincronización del seguimiento tras los PR #63 y #64 |
| #66 | S-09, DC-45 | Cifrado con git-crypt: `e2e/.env` cifrado, hooks de comprobación y política |
| #67 | S-15 | Hooks ejecutables con `core.fileMode=false` |
| #68 | D-29 | Sincronización del seguimiento tras los PR #65, #66 y #67 |
| #69 | F-48, D-30, F-38, U-14 | Errores de negocio y mensajes comprensibles en el resto del backend; catálogo de causas y arreglos de sesión y de mensajes en pantalla |
| #70 | DC-46 | Entorno de pruebas cifrado (`backend/test/.env.test`) y `npm run test:backend:local` |
| #71 | DC-46 | Restablecer los permisos `600` del entorno de pruebas (git no conserva el modo) |
| #72 | S-16 | Un token inválido responde 401 y no 403 |
| #73 | D-31 | Informes de cierre retroactivos de los PR #70 y #71 |
| #74 | F-30, F-31 | Selección propia de la tabla de trimestrales y `bill.concepto` en el diálogo de borrado |
| #75 | D-32 | Consolidación del seguimiento de los PR #69 a #74 |
| #76 | DC-47 | Reglas de edición de ficheros y de publicación y fusiones, y baja de `.github/copilot-instructions.md` |
| #77 | S-17 | Prueba E2E de sesión caducada y registro del aviso ausente (U-16) |
| #78 | U-15 | Prueba de comportamiento de F-30 con un recibo trimestral (merge `db11bad`) |
| #79 | S-01, S-06, S-12, S-07, U-16, U-17 | Autorización en servidor (DC-48), `apiClient`, aviso de caducidad y menús únicos (merge `1c59443`) |

Los PR #1 a #13 son una copia de seguridad y propuestas automáticas de actualización de dependencias (Snyk), sin fusionar salvo #1 y #2.

## 5. Siguiente paso operativo

La limpieza de Actualizar fechas (F-11/F-23/F-32) ya está hecha (2026-10-27). F-14 (grupo 3 de la fase 1) está cerrado: los pasos a, b y d se incorporaron en los PR #53, #54 y #55 y el resto del paso c se declara no aplicable por DC-42 (solo se implementó el recálculo al editar un pagado, DC-40). F-19 y D-24 se incorporaron en el PR #58, D-25 en el #59, F-20/F-21 en el #60, F-28 con D-26 en el #61, F-47 en el #62 (F-48 quedó solo registrado: D-30) y D-29 en el #68. O-02, DC-44 y D-27 se incorporaron en el PR #63 (2026-11-06), el PR #64 versionó las reglas de Cline y los PR #65, #66 y #67 completaron D-28, el cifrado (S-09 y DC-45) y S-15. F-48, DC-46, S-16 y F-30/F-31 están fusionados (PR #69 a #74), DC-47 con el #76, S-17/U-16 con el #77 y U-15 con el #78. La autorización (S-01/S-06/S-12), S-07, U-16 y U-17 se incorporaron con el PR #79 (merge `1c59443`). El siguiente trabajo es la corrección posterior al #79 (S-18, S-19, F-51, U-18, U-19, D-34 y DC-49); después, la limpieza de las ramas locales fusionadas y F-50, y a continuación el backlog por prioridad, con S-04 y S-02/S-03 en cabeza. No hay que implementar automáticamente el backlog P0/P1 ni reiniciar una auditoría sin petición del usuario.

1. [x] Retirar el flujo global antiguo: updateAllDates (ListBills), updateAllBillsDates (BillService), POST /api/recibos/actualizar-fechas, actualizarFechasRecibos y generarNuevasFechasRecibo (db_utils). Hecho el 2026-10-27; los dos errores de eslint de ListBills corregidos.
2. Conservar generateDates, generateBillDates, POST /:id/generar-fechas, completarFechasAnio y la generación anual. Conservar generarFechasFuturas: pushRecibo la usa (F-12 corregido el 2026-11-01).
3. Actualizar documentación, registro y TODO en ese mismo PR; comprobar UI y pruebas donde sea posible, sin certificar lo no ejecutado.
4. [x] Validación de un solo año al editar recibos (DC-14, DC-29): incorporada (PR #39). [x] Errata F-17 de Advances: incorporada (PR #40).

El relevo operativo de la sección 8 (parte 3 de 3) fija archivos, exclusiones, aceptación, entorno y cómo retomar en otro chat. La prioridad de seguridad antes de producción no altera silenciosamente este siguiente paso ya acordado.

## 6. Mapa de `doc/`

- `index.md`: índice por sistemas.
- `components/`: una página por pantalla (Accounts, Advances, Calendar, Categories, ListBills, Login, ProfileSettings, Savings y las páginas vacías).
- `services/`, `composables/`, `utils/`, `config/`, `directives/`, `router/`, `middleware/`, `auth/`: frontend y utilidades de backend.
- `routes/`: API por módulo. `db/`: acceso a datos, procedimiento de recibos y `schema/` (diseño; la fuente del esquema son las migraciones).
- `mantenimiento/`: la instrucción persistente (entrada y cuatro partes `instruccion-persistente_NdeN.md`), el registro (entrada y tres partes `registro-hallazgos_NdeN.md`) y el relevo (entrada `estado-del-proyecto.md` y tres partes `estado-del-proyecto_NdeN.md`, DC-37); los informes de cierre de cada PR están en `mantenimiento/informes_iteraciones/`, con su índice en `index.md`.

## 7. Retomar en una conversación nueva

No hace falta reconstruir la memoria del chat. Leer la instrucción persistente (entrada y todas sus partes), el relevo (`estado-del-proyecto.md` y sus tres partes, en orden; en especial las secciones 0, 5 y 8), TODO y el registro (entrada y todas sus partes), no solo un resultado truncado. Adjuntar la salida actual de git status --short, git branch --show-current y git log --oneline -5. Si hay cambios locales posteriores, revisarlos antes de cambiar de rama. Los archivos /tmp y _adjuntos de otro equipo no son accesibles automáticamente desde un chat nuevo.

Texto recomendado para el primer mensaje:

```text
Estamos retomando el mantenimiento de ferboiar/timon, no empezando un proyecto nuevo.

Lee primero doc/mantenimiento/instruccion-persistente.md (entrada) con todas sus partes instruccion-persistente_1de4.md a instruccion-persistente_4de4.md, en orden, y después doc/mantenimiento/estado-del-proyecto.md (entrada) con todas sus partes estado-del-proyecto_1de3.md a estado-del-proyecto_3de3.md, en orden, incluido el relevo operativo, TODO y doc/mantenimiento/registro-hallazgos.md (entrada) con todas sus partes registro-hallazgos_1de3.md a registro-hallazgos_3de3.md, en orden. Si una herramienta trunca un fichero, completa su lectura antes de afirmar que lo has revisado. Comprueba el estado real de la rama y los últimos commits; no borres cambios locales.

El siguiente trabajo acordado figura en la sección 0 del relevo y en TODO; no lo deduzcas de este texto. No borres generarFechasFuturas: la usa pushRecibo (F-12 corregido el 2026-11-01).

Sigue los criterios de aceptación y las reglas de trabajo del relevo. No deduzcas requisitos de datos de prueba, no toques .db_connection ni su copia, y no presentes una auditoría parcial como completa ni pruebas no ejecutadas como verificadas. Entrega un único conjunto de comandos, lista exacta de git add y título/descripción completos del PR.

Mi git status --short, rama y últimos commits son:
[pegar aquí la salida actual]
```
