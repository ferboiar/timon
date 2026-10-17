# Pruebas del backend

Usan `node:test` y un MariaDB efímero que reproduce la configuración de referencia (`doc/mantenimiento/registro-hallazgos.md`, sección 3).

## Ejecutar

1. Levantar la base de datos de pruebas, en el host de Docker. Necesita la red externa `backend`:

```bash
docker compose -f docker-compose.test.yml up -d --wait
```

2. Desde la raíz del proyecto, en el contenedor `timon`:

```bash
node --test backend/test/
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

## Notas

- Las pruebas borran y recrean la base `TEST_DB_NAME`. Nunca la apuntes a `conta_hogar`.
- Las pruebas marcadas como `todo` reproducen hallazgos abiertos del registro y no hacen fallar la ejecución. Al corregir el hallazgo se quita la marca.
- El esquema se carga desde `backend/src/db/migrations/0001_baseline.sql`.
- Todavía no se importan los módulos de `backend/src/db`, porque la conexión se lee de `.db_connection` y apuntaría a la base real. Eso cambia cuando S-03 permita configurar la conexión por variables de entorno.
