# Estado del proyecto Timón

Relevo mínimo (DC-69). Guarda el estado vigente, las decisiones y el mapa. No copia números de PR,
SHA, ramas ni backlog: eso lo dan `git log`, `gh pr list` y los issues del Project (DC-61). Se edita
solo si cambia una decisión vigente o el mapa. El histórico está en el
[registro](./registro-hallazgos.md), que se consulta por ID.

## 0. Estado
- Migraciones aplicadas en `conta_hogar`: 0005 (principal de anticipos y pendiente derivado; consta
  aplicada según el esquema observado en el PR #53, sin evidencia documental de los bytes aplicados ni
  de la copia previa), 0006 (trazabilidad e índice único de categorías), 0007 (objetos reproducibles y
  `DEFINER`), 0008 (`users.token_version`) y 0009 (`fechas_cargo.estado` admite `rechazado`; no exige
  re-login). La 0010 (trazabilidad por fila en cinco tablas) se aplicó el 2026-11-22 sobre el esquema
  actual (36 s, exit 0), con copia previa `conta_hogar_pre_0010_20261122T101717Z.sql` (58 212 B,
  SHA-256 `7ce6fced…28d2`) y ensayo en una base `_test`; no se aplicó desde cero, eso lo cubre la suite.
  La 0008 exige iniciar sesión de nuevo: los tokens anteriores no llevan `ver`.
  La 0011 (bloqueo compartido del recibo de origen en `generar_recibos_anio`, F-63) se aplicó el
  2026-11-26 sobre el esquema actual (exit 0), con copia previa
  `conta_hogar_pre_0011_20261126T200713Z.sql` (60 156 B, SHA-256 `244c6e70…c0bb`) y ensayo de
  restauración y doble aplicación en una base `_test`; el procedimiento queda con 8 326 B y
  `LOCK IN SHARE MODE`, a nombre de `timon_admin`.
- Siguiente trabajo y bloqueos: los issues del Project (hoja de ruta activa: [#197](https://github.com/ferboiar/timon/issues/197), DC-77).
- Identificadores: `npm run iter:ids` da el último de cada familia antes de asignar uno nuevo.

## 1. Decisiones vigentes
Texto completo en el registro §2; aquí solo el resumen.

| ID | Qué fija |
|---|---|
| DC-03 | Precedencia: Excel del usuario, documentación de diseño, BD viva y código. |
| DC-06 | Usuarios de BD: `timon_app` (DML), `timon_admin` (ALL) y `timon_test` solo sobre bases `_test`. |
| DC-09 | Log de toda operación con el formato «módulo - acción: datos». |
| DC-13 | El esquema se define solo en `backend/src/db/migrations`. |
| DC-27 | Documentación al día en el mismo PR; documento nuevo en `doc/index.md` y `docNavigation`. En nivel ligero basta el `doc/` afectado (DC-69). |
| DC-28 | El registro de hallazgos se divide en partes por secciones completas; repartirlo de otro modo es una iteración de proceso aprobada. |
| DC-39 | Escrituras de varias filas con transacción y bloqueo. |
| DC-45 | git-crypt en las rutas cifradas; nada sensible en claro en el remoto. |
| DC-46 | `backend/test/.env.test` cifrado y `npm run test:backend:local`. |
| DC-47 | Edición con la herramienta normal; `dev/utils/ayudas.mjs` solo para varios ficheros, cambios repetidos o ancla ambigua, con verificación posterior (modificada por DC-69). |
| DC-48 / DC-49 | Matriz de autorización; cuentas y categorías se leen con sesión. |
| DC-55 | Lo que quede «Pendiente» en un PR se registra en el registro y en su issue; en nivel ligero no hay registro (DC-69). |
| DC-58 | Un hallazgo viable se corrige en el mismo PR; si no, ID nuevo e issue. |
| DC-60 | Copia y restauración fieles; objetos sin `DEFINER` explícito. |
| DC-61 | Backlog en issues del Project; el relevo no lo copia. |
| DC-62 | Sesión revocable con `users.token_version`. |
| DC-63 | Límite de intentos de login por IP+usuario y por IP. |
| DC-64 | Reglas en `.cline/rules/`, skills de proceso, autorización por prompt y sin cadena de SHA. El modo autónomo añade dos aprobaciones (DC-69). |
| DC-65 | Umbrales: 12 000 B de reglas, 7 000 B incondicionales y 12 000 B por cuerpo de skill. |
| DC-66 | Cierre completo: sin flecos en otro PR; lo no cerrado se registra con ID e issue. El relevo ya no copia PR ni SHA (DC-69). |
| DC-67 | CORS restringido por `CORS_ALLOWED_ORIGINS` (nombres) y `CORS_ALLOWED_NETWORKS` (CIDR, IPs literales); validado al arrancar y cerrado por defecto. |
| DC-68 | Actualización de dependencias solo de lo gobernado por `package.json` y `package-lock.json`; Node, npm e imagen no se actualizan desde el repositorio. |
| DC-69 | Proceso ligero: relevo mínimo sin PR, SHA ni ramas; registro por ID y no entero; niveles ligero y completo con modo autónomo; edición con la herramienta normal; umbral de reglas 12 000 B. |
| DC-70 | Lint y formato: `e2e/` se analiza con la configuración raíz de ESLint y sus 33 avisos `prettier/prettier` se aceptan; `dev/utils/` se formatea con `.prettierrc.json` y no se exceptúa. *(Completada por DC-71 y matizada por DC-76: `e2e/` está formateado y `lint:frontend` ya no usa `--fix`.)* |
| DC-71 | Estabilidad de la E2E: calentamiento en `globalSetup` con `retries` en 0; `eliminarCuenta` espera la fila; `e2e/` formateado con Prettier; el `--fix` de `lint:frontend` lo sustituye `format:frontend` (DC-76). |
| DC-72 | Vocabulario de interfaz (`Guardar`/`Cancelar`/`Sí`/`No`, `Confirmar`, resúmenes `Éxito`/`Aviso`/`Error`) e importes de tabla con `Intl.NumberFormat('es-ES', …, EUR)` tolerando `null`; «Ahorro sugerido» en Ahorros; `Reset` suelto se conserva en inglés. |
| DC-73 | El código que depende de una migración no se fusiona antes de que esté aplicada, o se escribe para tolerar el esquema anterior. Acordado el 2026-11-21. |
| DC-74 | Autor por fila en subrecursos y catálogos (migración 0010, F-53): escritura directa con usuario, filas derivadas a NULL, salvo el activo masivo de `fechas_cargo`; sin backfill y con el id en la API. |
| DC-75 | Privacidad de recibos, anticipos y ahorros: solo el propietario con escritura o un administrador; el control no se renderiza para quien no cumple y el servidor responde 403; en Recibos el cambio se aplica a todos los años del mismo recibo y, tras bloquear la cadena, se releen con bloqueo los sucesores nuevos en hasta tres pasadas (F-61); el procedimiento anual lee el origen con bloqueo compartido antes de copiarlo (migración 0011, F-63). |
| DC-76 | Lint por capas y autoformato explícito: `lint:frontend` (`src`), `lint:e2e` (`e2e`) y `lint:backend` (`backend`, `scripts` y `dev`) son de solo lectura y `lint` los encadena; `format:frontend` aplica `--fix` solo a `src` y `e2e`; `prettier/prettier` se desactiva en `backend/**` y `scripts/**` y `_adjuntos/**` queda fuera del lint y de Prettier. Sustituye el alcance de `lint:frontend` descrito en DC-70 y DC-71. |
| DC-77 | Hoja de ruta activa en el relevo §0: cuando una serie ordenada de iteraciones se agrupa en una issue padre con sub-issues nativas en el Project, §0 puede enlazar únicamente a esa issue padre —sin copiar su tabla, estados, ramas ni PRs—; se edita solo al activarla y al cerrarla para poner o retirar ese enlace, y el avance intermedio lo marcan los `Closes` de cada PR (precisa DC-61 y DC-69). |



## 2. Entorno y mapa
- Frontend: Vue 3 + PrimeVue; vistas en `src/views/pages`, componentes en `src/components`, servicios
  en `src/service` y composables en `src/composables` y `src/layout/composables`.
- Backend: Express con módulos `.mjs`; `routes`, `db`, `middleware`, `utils`. JWT y bcrypt.
- BD: MariaDB 11.8; `conta_hogar` en `mariadb01`. El esquema se define solo en migraciones (DC-13).
- Pruebas: `backend/test/README.md` y `e2e/README.md`; destructivas solo contra bases `_test`.
- Dónde mirar por módulo:
  - Recibos: `doc/components/ListBills.md`, `doc/services/BillService.md`, `doc/routes/recibos.md`,
    `doc/db/db_utilsBill.md`.
  - Anticipos: `doc/components/Advances.md`, `doc/services/AdvService.md`, `doc/routes/anticipos.md`,
    `doc/db/db_utilsAdv.md`.
  - Ahorros: `doc/components/Savings.md`, `doc/services/SavService.md`, `doc/routes/ahorros.md`,
    `doc/db/db_utilsSav.md`.
  - Cuentas: `doc/components/Accounts.md`, `doc/services/AccService.md`, `doc/routes/cuentas.md`,
    `doc/db/db_utilsAcc.md`.
  - Categorías: `doc/components/Categories.md`, `doc/services/CatsService.md`,
    `doc/routes/categorias.md` y `doc/db/db_utilsCats.md`.
  - Resto: `doc/index.md`.
