# Copias de seguridad (`db_maintenance`)

Archivo: `backend/src/db/db_maintenance.mjs`.

| Función | Descripción |
|---------|-------------|
| `backupDb(ruta)` | Ejecuta `mysqldump` con la configuración de `db_utilsConn` y escribe el volcado en `ruta`; error si falta algún dato de conexión |
| `restoreDb(ruta)` | Valida el volcado y lo restaura con `mysql`. La validación solo comprueba que en las 50 primeras líneas haya una cabecera `MySQL dump` o `MariaDB dump` y sentencias `DROP TABLE` y `CREATE TABLE` |

Ambas funciones construyen el comando con la contraseña en la línea de comandos y por interpolación de cadenas (hallazgo abierto S-02); `restoreDb` no hace copia previa y no limita el tamaño.

## Referencias

- [API de mantenimiento](../routes/mantenimientoDB.md)
- [Conexión a la base de datos](./db_utilsConn.md)
