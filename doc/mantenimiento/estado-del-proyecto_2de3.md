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

Los PR #1 a #13 son una copia de seguridad y propuestas automáticas de actualización de dependencias (Snyk), sin fusionar salvo #1 y #2.

## 5. Siguiente paso operativo

La limpieza de Actualizar fechas (F-11/F-23/F-32) ya está hecha (2026-10-27). El trabajo activo es F-14 (grupo 3 de la fase 1) con el modelo de DC-38, por pasos: los pasos a, b y d se incorporaron en los PR #53, #54 y #55; el resto del paso c se declara no aplicable por DC-42 (solo se implementó el recálculo al editar un pagado, DC-40). No hay que implementar automáticamente el backlog P0/P1 ni reiniciar una auditoría sin petición del usuario.

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
