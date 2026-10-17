# Pruebas del backend

Usan `node:test` y una base MariaDB con la configuración de referencia (`doc/mantenimiento/registro-hallazgos.md`, sección 3). Se ejecutan con `npm run test:backend`.

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
- El esquema se carga desde `backend/src/db/migrations/0001_baseline.sql`.
- Todavía no se importan los módulos de `backend/src/db`, porque la conexión se lee de `.db_connection` y apuntaría a la base real. Eso cambia cuando S-03 permita configurar la conexión por variables de entorno.
