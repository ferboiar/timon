# Pruebas del backend

Usan `node:test` y una base MariaDB con la configuración de referencia (`doc/mantenimiento/registro-hallazgos_1de3.md`, sección 3). Se ejecutan con `npm run test:backend`.

## Opción A: tu MariaDB existente (la usada en la fase 0)

1. Como root en MariaDB, crea un usuario con permisos solo sobre la base de pruebas:

```sql
CREATE USER 'timon_test'@'172.20.0.%' IDENTIFIED BY 'ELIGE_UNA_CONTRASEÑA';
GRANT ALL PRIVILEGES ON `conta_hogar_test`.* TO 'timon_test'@'172.20.0.%';
```

2. En el contenedor `timon`, desde la raíz del proyecto:

```bash
read -s -p "Contraseña timon_test: " TEST_DB_PASSWORD; echo; export TEST_DB_PASSWORD
TEST_DB_HOST=mariadb01 TEST_DB_USER=timon_test npm run test:backend
```

La preparación de la base tarda unos 80 segundos en el NAS de desarrollo.

## Opción B: MariaDB efímero con Docker

1. Levantar la base de datos de pruebas, en el host de Docker. Necesita la red externa `backend`:

```bash
docker compose -f docker-compose.test.yml up -d --wait
```

2. Desde la raíz del proyecto, en el contenedor `timon`:

```bash
npm run test:backend
```

3. Pararla al terminar:

```bash
docker compose -f docker-compose.test.yml down
```

## Opción C: fichero de entorno cifrado (DC-46)

```bash
cd /workspaces/timon
npm run test:backend:local
```

Carga `backend/test/.env.test` (versionado y cifrado con git-crypt, permisos 600) y, antes de lanzar nada, comprueba que están las cinco variables `TEST_DB_*` y que el usuario de pruebas **solo** tiene permisos sobre bases acabadas en `_test`. El detalle está en `doc/pruebas/entorno-pruebas.md`.

## Variables

| Variable | Valor por defecto |
|---|---|
| `TEST_DB_HOST` | `mariadb-test` |
| `TEST_DB_PORT` | `3306` |
| `TEST_DB_USER` | `root` |
| `TEST_DB_PASSWORD` | `test_root_pw` |
| `TEST_DB_NAME` | `conta_hogar_test` (debe acabar en `_test`) |

Los valores por defecto corresponden a la opción B. En la opción A hay que indicar al menos host, usuario y contraseña.

## Notas

- Las pruebas borran y recrean la base `TEST_DB_NAME`. Nunca la apuntes a `conta_hogar`.
- Las pruebas marcadas como `todo` reproducen hallazgos abiertos del registro y no hacen fallar la ejecución. Al corregir el hallazgo se quita la marca.
- La prueba de configuración compara los valores globales del servidor. La sesión de `mysql2` añade `IGNORE_SPACE` al `sql_mode`, por lo que el valor de sesión no sirve para comparar.
- El esquema se carga aplicando por orden todos los ficheros de `backend/src/db/migrations/`.
- Las pruebas fijan DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_DATABASE antes de importar dinámicamente db_connection.mjs y db_utils.mjs; dotenv no pisa esas variables y las funciones reales usan la base de pruebas.
- fase0.test.mjs conserva su nombre histórico pero prueba también lógica de recibos por año y migraciones. `fechas.test.mjs` prueba `generarFechasFuturas` (F-12) sin base de datos y se puede ejecutar solo: `node --test backend/test/fechas.test.mjs`. `pool.test.mjs` prueba la configuración del pool (F-13, DC-05) sin base de datos: `node --test backend/test/pool.test.mjs`. `fechasAnticipos.test.mjs` prueba las fechas ancladas de Anticipos (F-46, DC-41) sin base de datos: `node --test backend/test/fechasAnticipos.test.mjs`. `csv.test.mjs` prueba la utilidad de exportación CSV (F-19) sin base de datos ni DOM: `node --test backend/test/csv.test.mjs`. ENOTFOUND mariadb-test impide iniciar la suite: no demuestra un fallo funcional ni pruebas superadas. Configura la opción A o arranca la B.

## Migración 0006 y pruebas nuevas

La suite de integración no aplica migraciones a mano: fase0.test.mjs elimina y recrea la base TEST_DB_NAME y aplica por orden todos los ficheros de backend/src/db/migrations, incluida la 0006. La migración es repetible y su guarda SIGNAL se prueba en la propia suite. Las pruebas unitarias nuevas son validacionUsuarios.test.mjs, validacionCategorias.test.mjs y paridadValidacionUsuarios.test.mjs (esta última importa también src/utils/validacionUsuarios.js).

## Pruebas de conexión y mantenimiento de la base de datos (PR #85)

Las cinco pruebas nuevas son unitarias y no necesitan MariaDB: `mantenimientoCredenciales.test.mjs` (S-02: argumentos sin contraseña, fichero de opciones en 600 y borrado también al fallar, con `mysqldump` y `mysql` simulados en el PATH), `configuracionConexion.test.mjs` (claves, ida y vuelta, TLS, precedencia, pool y aislamiento), `configuracionBd.test.mjs` (reglas 1 a 6 y utilidades de pantalla), `rutasConexionBd.test.mjs` (404 de `/password`, los 400 de validación y contraseña efectiva) y `preparaBasePruebas.test.mjs` (el script de preparación de las E2E se niega a tocar una base sin `_test`).

## Pruebas de simulación anual (U-13)

`node --test backend/test/generacionAnual.test.mjs` prueba sin MariaDB el cálculo de diciembre, la prohibición de escritura futura y la separación de avisos. La suite de integración existente de `fase0.test.mjs` requiere la base *_test. Los cuatro tests nuevos son unitarios: no prueban por HTTP la ruta ni reproducen el bloqueo concurrente de MariaDB. La simulación de diciembre se comprobó además manualmente en la aplicación.
