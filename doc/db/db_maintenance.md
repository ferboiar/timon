# Copias de seguridad (`db_maintenance`)

Archivo: `backend/src/db/db_maintenance.mjs`.

| Función | Descripción |
|---------|-------------|
| `backupDb(ruta)` | Ejecuta `mysqldump` con la configuración de `db_utilsConn` y escribe el volcado en `ruta`; error si falta algún dato de conexión |
| `restoreDb(ruta)` | Valida el volcado y lo restaura con `mysql`. La validación solo comprueba que en las 50 primeras líneas haya una cabecera `MySQL dump` o `MariaDB dump` y sentencias `DROP TABLE` y `CREATE TABLE` |

Ambas funciones construyen el comando con la contraseña en la línea de comandos y por interpolación de cadenas (hallazgo abierto S-02); `restoreDb` no hace copia previa y no limita el tamaño.

## Errores (F-48)

Entra en F-48 porque el detalle de `mysqldump` y `mysql` llegaba al cliente tal cual. Ahora:

- La validación del volcado lanza errores de negocio 400 (`VOLCADO_NO_VALIDO`, `VOLCADO_INCOMPLETO`) con un texto que explica qué falta.
- `exigirConfiguracionCompleta` lanza 409 `CONFIGURACION_INCOMPLETA` e indica qué dato falta.
- Los fallos de las herramientas se relanzan sin envolver: la ruta los compone con el [catálogo](../utils/catalogoErrores.md) (código 127 o 126 → herramienta ausente; `ENOSPC` y `EACCES` → disco o permisos) y el detalle va al log (DC-09).

No cambia el uso de `exec` ni el montaje de los comandos: S-02 sigue abierto.

## Referencias

- [API de mantenimiento](../routes/mantenimientoDB.md)
- [Conexión a la base de datos](./db_utilsConn.md)
