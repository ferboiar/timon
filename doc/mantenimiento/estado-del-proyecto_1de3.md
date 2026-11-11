# Estado del proyecto Timón: parte 1 de 3

Parte 1 de 3 del [relevo](./estado-del-proyecto.md): secciones 0 a 3 (punto exacto de reanudación; qué es y cómo está montado; cómo se trabaja; cómo funciona hoy). Se lee completa y en orden con las demás: [parte 1 de 3](./estado-del-proyecto_1de3.md) · [parte 2 de 3](./estado-del-proyecto_2de3.md) · [parte 3 de 3](./estado-del-proyecto_3de3.md).

Documento de relevo: léelo primero si retomas el proyecto o abres una conversación nueva. Se actualiza en cada PR (DC-27). Última actualización: 2026-11-11, base ecf83bb (PR #69 a #80). Sin trabajo en curso: F-48, DC-46, S-16, D-31, F-30/F-31, D-32, DC-47, S-17, U-15, S-01/S-06/S-12, S-07, U-16, U-17, S-18, S-19, F-51, U-18, U-19, D-34 y DC-49 están fusionados (el #80 con merge ecf83bb). Trabajo preparado: F-50, F-22, F-52, F-43, F-42, F-41, F-10, D-35, DC-50 y DC-51 en la rama de Fase A, pendiente de revisión y fusión. Siguiente trabajo, en este orden: 1) este PR, 2) la limpieza de las ramas locales fusionadas y 3) el backlog, con S-04 y S-02/S-03 en cabeza. El punto del scope del token de gh queda retirado por decisión del usuario.

## 0. Punto exacto de reanudación

Corte operativo: 2026-11-11, `main` en 2744e5a (PR #82: incorporación de D-36). Antes, c07aed8 (PR #81: F-50, F-22, F-52, F-43, F-42, F-41, F-10, D-35, DC-50 y DC-51) y ecf83bb (PR #80: corrección post-#79). La migración 0006 está aplicada en `conta_hogar` (verificado en solo lectura el 2026-11-11): `uq_categorias_nombre` y `modificado_por` con FK `ON DELETE SET NULL`. F-14 cerrado por DC-42.

**Siguiente trabajo:** no hay trabajo de código preparado. Toca seguridad: S-02/S-03 (con DC-06), S-04 desglosado, S-05, S-11 (10 PR de Snyk abiertos) y S-21. Después, F-49, F-53, F-54, F-55 y el backlog del TODO. La limpieza de las 9 ramas locales y de la rama remota del PR #81 queda pendiente, con confirmación expresa y separada por rama.

**D-36 incorporado con el PR #82:** auditoría y sincronización documental; TODO y registro actualizados.

SHA de fusión de D-36: 2744e5a (DC-52). No asumir que F-49, F-53 o F-54 estén implementadas.

**SET USER temporal (2026-11-11):** permiso global temporal concedido a `timon_admin` para restaurar volcados con `DEFINER=root`; `SHOW GRANTS` confirma `SET USER ON *.*` y `ALL` sobre `conta_hogar` y el patrón `conta\_hogar%`. No se revoca en esta iteración; S-22 lo registra sin fecha. Comando previsto:

```sql
REVOKE SET USER ON *.* FROM 'timon_admin'@'172.20.0.%';
FLUSH PRIVILEGES;
```

**Despliegue:** la 0006 debe aplicarse a cualquier base antes de arrancar este código contra ella.

**Historial:** el detalle por PR está en la sección 4 (parte 2 de 3) y en el TODO. Conservar Generar nuevas fechas y la generación anual. No borrar `generarFechasFuturas`, usada por `pushRecibo` (F-12 corregido: secuencia anclada). Leer la sección 5 y el relevo de la sección 8 antes de preparar código.

La rama local, los archivos sin confirmar y la ejecución de pruebas no se pueden deducir del estado remoto: comprobarlos al retomar.

## 1. Qué es y cómo está montado

Timón es una aplicación de finanzas domésticas: recibos periódicos, anticipos, ahorros, cuentas, categorías y usuarios con roles.

- Frontend: Vue 3 con Vite y PrimeVue 4 (plantilla Sakai) en `src/`: pantallas en `src/views/pages`, servicios de API en `src/service`, composables en `src/composables` y `src/layout/composables`.
- Backend: Node con Express (módulos `.mjs`) en `backend/src`: rutas en `routes`, acceso a datos en `db`, middleware en `middleware`, utilidades en `utils`. Autenticación con JWT y contraseñas con `bcrypt`.
- Base de datos: MariaDB 11.8, base `conta_hogar` en el host `mariadb01` (DC-04, DC-07). El esquema se define solo en `backend/src/db/migrations` (DC-13): 0001 línea base, 0002 esquema de recibo por año, 0003 partición de recibos por año y retirada de `recibos_historico`, 0004 tabla `ajustes_sistema`, procedimiento `generar_recibos_anio` y evento diario, 0005 principal guardado e importe pendiente derivado de anticipos (DC-38) y 0006 trazabilidad de autor e índice único de categorías (F-50, F-22, DC-50, DC-51).
- Documentación: `doc/`, con índice en `doc/index.md`. Hallazgos, decisiones (DC) y plan: `doc/mantenimiento/registro-hallazgos.md` (entrada y mapa; el contenido está en `registro-hallazgos_1de3.md`, `_2de3.md` y `_3de3.md`, DC-28). Reglas de trabajo: `doc/mantenimiento/instruccion-persistente.md` (entrada y cuatro partes, DC-33). Relevo: `doc/mantenimiento/estado-del-proyecto.md` (entrada y tres partes `estado-del-proyecto_1de3.md`, `_2de3.md` y `_3de3.md`, DC-37). Lista corta de tareas: `TODO`.
- Visor de la documentación: la pantalla `Tech-documentation.vue` carga `doc/**/*.md` y su navegación se mantiene a mano (`docNavigation`).
- Desarrollo: contenedor en `/workspaces/timon`; repositorio `ferboiar/timon`. Node 20.9 o superior de la serie 20.

## 2. Cómo se trabaja

- Una rama por cambio, un PR por rama, fusionado en `main`. El nombre de la rama lleva la fase (o `mantenimiento`) y todos los IDs desglosados, por ejemplo `correccion/fase-1-F07-F08-F09-F22-F10-ahorros-categorias` o `mantenimiento/D-17-dividir-instruccion-persistente`.
- Cada commit y cada PR citan sus IDs (F-xx, S-xx, DC-xx). En el mismo PR se actualizan `doc/`, `TODO`, el plan de la sección 10 del registro y el relevo (la parte que contiene la sección afectada, DC-27 y DC-37). Un documento nuevo se añade también a `docNavigation`. Cada informe de iteración nuevo se añade al índice `mantenimiento/informes_iteraciones/index.md`.
- Una decisión nueva es una fila DC-nn en el registro. Siguientes identificadores libres: S-20, R-14 y U-20 (DC-50 y DC-51 se asignan en este PR; D-35 se usa para el seguimiento). Consultar siempre el registro antes de asignarlos.
- Mensajes de commit: `tipo(IDs): resumen`, con cada ID desglosado (por ejemplo `fix(F-07, F-08): resumen`), y cuerpo en español. El título del PR sigue el mismo formato. Descripción del PR con «Qué hace», «Verificado» y «Pendiente».
- Toda operación nueva o modificada deja trazas en el log con el formato «módulo - acción: datos» (DC-09).
- Antes del commit: `npx eslint --fix <ficheros>`, `node --check` en los módulos del backend y prueba en pantalla. Las pruebas del backend (`npm run test:backend`) necesitan una base MariaDB de pruebas; ver `backend/test/README.md`.
- No se añaden nunca a un commit `backend/src/db/.db_connection` (va cifrado con git-crypt y la pestaña Base de Datos lo reescribe, por lo que aparece como modificado) ni `backend/src/db/.db_connection.backup` (lo crea esa misma pestaña). `e2e/.env` sí se versiona, pero solo cifrado con git-crypt (DC-45); los hooks `scripts/hooks/pre-commit` y `pre-push` rechazan cualquier secreto en claro.
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
