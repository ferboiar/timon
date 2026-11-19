# Estado del proyecto Timón

Última actualización: 2026-11-18. Se actualiza en cada PR (DC-27). El backlog vive en los issues del
Project (DC-61); aquí solo el corte y las decisiones vigentes.

## 0. Corte
- Fecha y base: 2026-11-19, `main` en el merge del PR #159.
- Último trabajo incorporado: PR #159 (F-54, F-55 y D-43).
- Trabajo actual: ninguno abierto. F-54 (#104), F-55 (#105) y D-43 (#98) se cierran con el PR #159, sin migraciones y con los ficheros de las tres separados; O-12 (#156, eslint no analiza `e2e/`), O-13 (#157, formato de `dev/utils/`) y O-14 (#158, arranque en frío de la E2E) quedan registrados con su issue y fuera de alcance.
- Objetivo: unificar en una iteración tres hallazgos con ficheros disjuntos y sin migraciones: estado único de `useAuth` con un solo intervalo (F-54), 400 de negocio para un nombre de categoría de más de 30 caracteres (F-55) y validación de sintaxis con reversión en `ayudas.mjs --apply` (D-43).
- Próxima acción: siguiente lote del Project — Lote 2: #101 (F-15) y #100 (DC-01), más las issues #156 (O-12), #157 (O-13) y #158 (O-14); después, #103 (F-53) y #102 (F-49). Ramas que quedan: `main` y `mantenimiento/migraciones-bd-skill` (previa, ajena a esta iteración); `correccion/fase-1-F54-F55-D43` se borró en local y en remoto el 2026-11-19. La limpieza de Snyk se hizo el 2026-11-18 (PR #4–#9 cerrados con comentario y las seis ramas `snyk-*` borradas en remoto) y `correccion/fase-1-S11-dependencias` ya no existe (comprobado con `git branch -a` y `git ls-remote --heads origin`). Bloqueos: ninguno conocido.
- Migraciones aplicadas en `conta_hogar`: 0005 (principal de anticipos y pendiente derivado; la
  migración consta aplicada según el esquema observado en el PR #53; no consta evidencia documental
  de los bytes aplicados ni de la copia previa), 0006 (trazabilidad e índice único de categorías),
  0007 (objetos reproducibles y `DEFINER`) y 0008 (`users.token_version`). La 0008 exige iniciar
  sesión de nuevo: los tokens anteriores no llevan `ver`.
- Issues abiertas relevantes: #155 (S-24), #136 (O-10), #140 (O-11), #142 (F-57), #156 (O-12), #157 (O-13) y #158 (O-14). Cerradas: S-11 (#96), #105, #104 y #98.
- Próximo trabajo: #101 (F-15), #100 (DC-01) y el backlog del Project; S-24 sigue en su issue #155.
- Identificadores: en este corte se asignan DC-68, S-24, R-14 y R-15; D-53 y D-52, en cortes anteriores. Comprueba el último de cada
  familia en el registro antes de asignar; en esta iteración se asignan O-12, O-13 y O-14; los siguientes previsibles son D-54, DC-69 y R-16.

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
| DC-66 | Cierre completo: el §0 queda con el corte posterior a la fusión y sin flecos en otro PR. |
| DC-67 | CORS restringido por `CORS_ALLOWED_ORIGINS` (nombres) y `CORS_ALLOWED_NETWORKS` (redes CIDR, solo IPs literales); validado al arrancar y cerrado por defecto. |
| DC-68 | Ámbito de actualización de dependencias: solo lo gobernado por `package.json`/`package-lock.json`; Node, npm y la imagen son del contenedor y no se actualizan desde el repositorio. Si el parche de una alerta exige un Node mayor, queda como resto justificado. |

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
