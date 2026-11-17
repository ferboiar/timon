# Estado del proyecto Timón

Última actualización: 2026-11-16. Se actualiza en cada PR (DC-27). El backlog vive en los issues del
Project (DC-61); aquí solo el corte y las decisiones vigentes.

## 0. Corte
- Fecha y base: 2026-11-16, `main` en `7ebeeb0` (merge del PR #144).
- Último trabajo incorporado: PR #144 (D-47, sincronización posterior al #141), merge `7ebeeb0`.
- Trabajo actual: D-48 con DC-64 y DC-65 (reglas en `.cline/rules/`, skills de proceso y relevo
  único), en la rama `mantenimiento/DC-64-DC-65-reglas-cline`: PR #145 abierto, pendiente de fusión.
- Objetivo: que las reglas se carguen sin releer 52 KB en cada sesión y que exista una sola copia de
  cada una. Estado: implementado, verificado en local y publicado en el PR #145. Próxima acción:
  fusión, pendiente de autorización. Bloqueos: ninguno conocido.
- Migraciones aplicadas en `conta_hogar`: 0006 (trazabilidad e índice único de categorías), 0007
  (objetos reproducibles y `DEFINER`) y 0008 (`users.token_version`). La 0008 exige iniciar sesión de
  nuevo: los tokens anteriores no llevan `ver`.
- Issues abiertas relevantes: #95 (S-05), #96 (S-11), #135 (O-09, limpieza de ramas), #136 (O-10),
  #140 (O-11), #142 (F-57) y #143 (F-59).
- Próximo trabajo: S-05 (#95) y S-11 (#96); después, F-49, F-53, F-54, F-55 y el backlog del Project.
- Identificadores: DC-64 y DC-65 se asignan en este corte. Comprueba el último de cada familia en el
  registro antes de asignar; los siguientes previsibles son S-24 y DC-66.

## 1. Decisiones vigentes
Texto completo en el registro §2; aquí solo el resumen.

| ID | Qué fija |
|---|---|
| DC-03 | Precedencia: Excel del usuario, documentación de diseño, BD viva y código. |
| DC-06 | Usuarios de BD: `timon_app` (DML), `timon_admin` (ALL) y `timon_test` solo sobre bases `_test`. |
| DC-09 | Log de toda operación con el formato «módulo - acción: datos». |
| DC-13 | El esquema se define solo en `backend/src/db/migrations`. |
| DC-27 | Documentación al día en el mismo PR; documento nuevo en `doc/index.md` y `docNavigation`. |
| DC-39 | Escrituras de varias filas con transacción y bloqueo. |
| DC-45 | git-crypt en las rutas cifradas; nada sensible en claro en el remoto. |
| DC-46 | `backend/test/.env.test` cifrado y `npm run test:backend:local`. |
| DC-48 / DC-49 | Matriz de autorización; cuentas y categorías se leen con sesión. |
| DC-55 | Lo que quede «Pendiente» en un PR se registra en el registro y en su issue. |
| DC-58 | Un hallazgo viable se corrige en el mismo PR; si no, ID nuevo e issue. |
| DC-60 | Copia y restauración fieles; objetos sin `DEFINER` explícito. |
| DC-61 | Backlog en issues del Project; el relevo no lo copia. |
| DC-62 | Sesión revocable con `users.token_version`. |
| DC-63 | Límite de intentos de login por IP+usuario y por IP. |
| DC-64 | Reglas en `.cline/rules/`, skills de proceso, autorización por prompt y sin cadena de SHA. |
| DC-65 | Umbrales: 11 000 B de reglas, 7 000 B incondicionales y 12 000 B por cuerpo de skill. |

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
