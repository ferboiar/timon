# Copias de seguridad (`db_maintenance`)

Archivo: `backend/src/db/db_maintenance.mjs`.

## Cómo se ejecutan los comandos (S-02)

- Se usa **`spawn` con un array de argumentos**, sin shell: ni las rutas ni las credenciales se interpolan en una cadena.
- Las credenciales van en un **fichero de opciones temporal** (`--defaults-extra-file`), creado con modo **`600`** en el directorio temporal y **borrado siempre** en el `finally`, también si el proceso falla. Así la contraseña no aparece en `ps` ni en el log.
- **Excepción:** los ficheros de opciones de MySQL recortan los espacios del final del valor, así que si la contraseña termina en espacio se pasa por la variable `MYSQL_PWD` del proceso del cliente (tampoco aparece en `ps`), con un aviso en el log sin el valor.
- La contraseña del log ya estaba cubierta por `sanearParaLog`: la fuga verificable era `ps`.
- Hay una prueba automática (`backend/test/mantenimientoCredenciales.test.mjs`) que sustituye `mysqldump` y `mysql` por un ejecutable de prueba y comprueba que los argumentos no llevan la contraseña, que el fichero de opciones es `600` y que se borra, también al fallar.

## Credenciales de mantenimiento (DC-06)

Si `DB_MAINT_USER` y `DB_MAINT_PASSWORD` están definidos (en el entorno o en el fichero) se usan para la copia y la restauración; si no, se usan `DB_USER` y `DB_PASSWORD`. Si solo está definida una de las dos, se avisa y se usan las de la aplicación. Los `GRANT` los aplica el usuario (DC-57).

## Backup

| Paso | Detalle |
|---|---|
| Traza | `db_maintenance - backup: base <DB_DATABASE> en <DB_HOST>:<DB_PORT>` y, al terminar, el tamaño del volcado |
| Comando | `mysqldump` con `--single-transaction` |
| Error | Si falla, se borra el volcado a medias |

## Restauración

Orden estricto: **validar → comprobar tamaño → copia previa → restaurar**.

| Paso | Detalle |
|---|---|
| Validación | `stat` primero: por encima de **100 MB** lanza **413 `VOLCADO_DEMASIADO_GRANDE`** con el texto «El fichero supera el límite de 100 MB. Reduce el tamaño o divide el volcado.». Después lee hasta **10 000 líneas** buscando cabecera de volcado, `DROP TABLE IF EXISTS` y `CREATE TABLE` (antes solo miraba 50) |
| Copia previa | `timon-pre-restore-<ISO>.sql` en el directorio temporal, modo `600`, con `--single-transaction`; se comprueba antes que quede espacio libre |
| Retención | Se **borra tras una restauración correcta**; si falla, se **conserva** y su ruta queda en el log (sin contraseña) |
| Trazas | `db_maintenance - copia previa: <ruta>`, `db_maintenance - restore: base <X> desde <fichero>` y `db_maintenance - restore: completada` |

## Pendiente: rutinas y eventos (O-06)

Este módulo **no** pasa `--routines` ni `--events`: el cliente los desactiva por defecto (`events FALSE`, `routines FALSE`) y el volcado omite los procedimientos y eventos. Está registrado como **O-06** para el PR siguiente.

## Errores (F-48)

- La validación del volcado lanza errores de negocio 400 (`VOLCADO_NO_VALIDO`, `VOLCADO_INCOMPLETO`) con un texto que explica qué falta, y 413 cuando el fichero es demasiado grande.
- `exigirConfiguracionCompleta` lanza 409 `CONFIGURACION_INCOMPLETA` e indica qué dato falta, comprobando las credenciales que se van a usar de verdad.
- Los fallos de las herramientas se relanzan sin envolver: la ruta los compone con el [catálogo](../utils/catalogoErrores.md) (código 127 o 126 → herramienta ausente; `ENOSPC` y `EACCES` → disco o permisos) y el detalle va al log (DC-09).

## Referencias

- [API de mantenimiento](../routes/mantenimientoDB.md)
- [Conexión a la base de datos](./db_utilsConn.md)
