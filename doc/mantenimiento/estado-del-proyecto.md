# Estado del proyecto Timón

Documento de relevo: léelo primero si retomas el proyecto o abres una conversación nueva. Se actualiza en cada PR (DC-27). Última actualización: 2026-10-23, cierre de auditoría D-11 sobre PR #29. No requiere ninguna versión anterior de p16.

## 1. Qué es y cómo está montado

Timón es una aplicación de finanzas domésticas: recibos periódicos, anticipos, ahorros, cuentas, categorías y usuarios con roles.

- Frontend: Vue 3 con Vite y PrimeVue 4 (plantilla Sakai) en `src/`: pantallas en `src/views/pages`, servicios de API en `src/service`, composables en `src/composables` y `src/layout/composables`.
- Backend: Node con Express (módulos `.mjs`) en `backend/src`: rutas en `routes`, acceso a datos en `db`, middleware en `middleware`, utilidades en `utils`. Autenticación con JWT y contraseñas con `bcrypt`.
- Base de datos: MariaDB 11.8, base `conta_hogar` en el host `mariadb01` (DC-04, DC-07). El esquema se define solo en `backend/src/db/migrations` (DC-13): 0001 línea base, 0002 esquema de recibo por año, 0003 partición de recibos por año y retirada de `recibos_historico`, 0004 tabla `ajustes_sistema`, procedimiento `generar_recibos_anio` y evento diario.
- Documentación: `doc/`, con índice en `doc/index.md`. Hallazgos, decisiones (DC) y plan: `doc/mantenimiento/registro-hallazgos.md`. Lista corta de tareas: `TODO`.
- Visor de la documentación: la pantalla `Tech-documentation.vue` carga `doc/**/*.md` y su navegación se mantiene a mano (`docNavigation`).
- Desarrollo: contenedor en `/workspaces/timon`; repositorio `ferboiar/timon`. Node 20.9 o superior de la serie 20.

## 2. Cómo se trabaja

- Una rama por cambio (`correccion/fase-1-<tema>`), un PR por rama, fusionado en `main`.
- Cada commit y cada PR citan sus IDs (F-xx, S-xx, DC-xx). En el mismo PR se actualizan `doc/`, `TODO`, el plan de la sección 10 del registro y este documento (DC-27). Un documento nuevo se añade también a `docNavigation`.
- Una decisión nueva es una fila DC-nn en el registro. La siguiente libre es DC-28; la siguiente de hallazgos de documentación, D-12. Hallazgos funcionales libres desde F-41, tras F-37 a F-40 de esta auditoría.
- Mensajes de commit: `tipo(IDs): resumen` y cuerpo en español. Descripción del PR con «Qué hace», «Verificado» y «Pendiente».
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
- El procedimiento `generar_recibos_anio` crea los recibos del año siguiente. Un evento horario actúa a las 03:00 en la zona horaria de los ajustes. Solo inserta, y el interruptor `crear_recibos_automaticamente` lo activa o desactiva. Ajustes › Administrar recibos permite vista previa y ejecución manual (DC-17, DC-24).

### Otros módulos
- Anticipos: planes de pago. Al borrar un pago, «Recalcular pagos» sigue DC-12; el pago sugerido se valida como número (F-02). No usa transacciones (F-27).
- Ahorros: `ahorrado` es el valor inicial más los movimientos y solo se edita a mano sin movimientos (DC-10).
- Cuentas: un IBAN vacío se guarda como NULL (F-06). El saldo es manual (F-21).
- Categorías: el nombre debería ser único (DC-02), pero la migración no existe todavía.
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

Los PR #1 a #13 son una copia de seguridad y propuestas automáticas de actualización de dependencias (Snyk), sin fusionar salvo #1 y #2.

## 5. Siguiente paso

Ver la sección 10 del registro y `TODO`: limpieza de «Actualizar fechas», validación de un solo año al editar un recibo y la errata F-17 de Anticipos.

## 6. Mapa de `doc/`

- `index.md`: índice por sistemas.
- `components/`: una página por pantalla (Accounts, Advances, Calendar, Categories, ListBills, Login, ProfileSettings, Savings y las páginas vacías).
- `services/`, `composables/`, `utils/`, `config/`, `directives/`, `router/`, `middleware/`, `auth/`: frontend y utilidades de backend.
- `routes/`: API por módulo. `db/`: acceso a datos, procedimiento de recibos y `schema/` (diseño; la fuente del esquema son las migraciones).
- `mantenimiento/`: el registro y este documento.

## 7. Retomar en una conversación nueva

Pega este documento, las secciones 2 y 10 del registro, `TODO`, la salida de `git status --short` y de `git log --oneline -10`, e indica el siguiente punto. Si hay que editar ficheros grandes, adjúntalos: el conector del repositorio trunca los de más de unos 25 KB.

## Cierre de auditoría y fallos pendientes (2026-10-23)

El primer PR de documentación fue #29. El cierre D-11 incorpora las correcciones de las versiones de p16 que no se aplicaron y completa el contraste de los nueve documentos que seguían pendientes. Informe: [auditoria-documentacion.md](./auditoria-documentacion.md). La auditoría documental es estática y queda cerrada; no significa que las funcionalidades estén corregidas ni que haya nuevas pruebas de integración en verde.

Comportamiento actual que no debe prometerse como terminado:

- Ahorros: inactivos no filtra ni hay edición visible de activo (F-08); el borrado individual puede fallar después de borrar (F-07). No hay generación de aportaciones ni porcentaje de progreso. Ya admite movimientos manuales sin periodicidad; opciones explícitas de diaria/semanal son F-37.
- Anticipos: importe_total es saldo restante (F-14); mantener pagado al cambiar importe no ajusta saldo; borrar pagado no reactiva por sí solo el anticipo completado. Recalcular tras editar no equivale al algoritmo de completar tras borrar. Operaciones sin transacción (F-27).
- Botón de borrado múltiple de Anticipos sin flujo conectado (F-39); propuestas manuales de fecha de pago suman un mes fijo (F-40).
- saveUser/deleteUsers/changePassword solo leen token de localStorage (F-38); una sesión temporal no tiene el mismo soporte en esos métodos.
- Formularios que mutan fechas antes de éxito (F-16), CSV sin escape completo (F-19), avisos desiguales del servidor (F-28) y apiClient no usado por los servicios (S-07).

Todos tienen tareas concretas en TODO y en la sección 10 del registro. Se mantiene el siguiente orden acordado: limpieza de Actualizar fechas, validación de un año al editar y F-17, antes de esas correcciones agrupadas.
