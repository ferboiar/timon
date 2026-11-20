# Estado del proyecto Timón

Relevo mínimo (DC-69). Guarda el estado vigente, las decisiones y el mapa. No copia números de PR,
SHA, ramas ni backlog: eso lo dan `git log`, `gh pr list` y los issues del Project (DC-61). Se edita
solo si cambia una decisión vigente o el mapa. El histórico está en el
[registro](./registro-hallazgos.md), que se consulta por ID.

## 0. Estado
- Migraciones aplicadas en `conta_hogar`: 0005 (principal de anticipos y pendiente derivado; consta
  aplicada según el esquema observado en el PR #53, pero no consta evidencia documental de los bytes
  aplicados ni de la copia previa), 0006 (trazabilidad e índice único de categorías), 0007 (objetos
  reproducibles y `DEFINER`) y 0008 (`users.token_version`). La 0008 exige iniciar sesión de nuevo:
  los tokens anteriores no llevan `ver`.
- Siguiente trabajo y bloqueos: los issues del Project.
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
| DC-70 | Lint y formato: `e2e/` se analiza con la configuración raíz de ESLint y sus 33 avisos `prettier/prettier` se aceptan; `dev/utils/` se formatea con `.prettierrc.json` y no se exceptúa. |

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
