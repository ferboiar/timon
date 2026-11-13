# API de conexión a la base de datos

Rutas montadas en `/api/db-config` (`backend/src/routes/conexionDB.mjs`). Todas exigen administrador (`verifyAdmin`). Las usa la pestaña Base de Datos de Ajustes.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/db-config` | Devuelve `{ config, backupExists }`: la configuración **sin contraseñas** (ni `DB_PASSWORD` ni `DB_MAINT_PASSWORD`) y si existe la copia |
| `POST` | `/api/db-config/test` | Prueba una configuración con la **contraseña efectiva**: si `DB_PASSWORD` llega vacío se usa la guardada. 400 con el motivo si falla |
| `PUT` | `/api/db-config` | Valida claves y campos obligatorios, prueba la conexión, guarda, **prueba también las credenciales de mantenimiento si se envían** y **recrea el pool**; antes copia el fichero actual a `.db_connection.backup` |
| `POST` | `/api/db-config/restore` | Restaura la configuración desde `.db_connection.backup` y borra la copia; 409 `SIN_COPIA` si no existe |

**`GET /api/db-config/password` se retiró (S-03): ahora responde 404.** La pantalla muestra la contraseña vacía y, si se deja así, se conserva la actual.

## Orden de validación del `PUT`

1. **Claves admitidas** (400 `CLAVES_NO_ADMITIDAS`) y **campos obligatorios** (400 `CAMPOS_OBLIGATORIOS`, 400 `PUERTO_NO_VALIDO`). Se valida antes de probar la conexión, para no devolver un error de red cuando el problema es un dato.
2. Si no hay contraseña ni guardada ni enviada: 400 `CONTRASENA_OBLIGATORIA`.
3. Prueba de conexión con la contraseña efectiva.
4. Estado final (`calcularConfiguracionFinal`): 400 `MANTENIMIENTO_SIN_CONTRASENA` o `MANTENIMIENTO_SIN_USUARIO` si procede.
5. Si se envían credenciales de mantenimiento, se prueban también (400 `MANTENIMIENTO_NO_CONECTA`).
6. Guardado y `recrearPool()`; si la recreación falla, se registra y la respuesta sigue siendo 200 (la configuración sí se guardó).

## Trazas (DC-09)

- `conexionDB - configuración guardada: <base> en <host>:<puerto>` (sin usuario ni contraseña).
- `conexionDB - pool: recreado con la configuración guardada` o `sin cambios (<motivo>)`.
- `conexionDB - prueba de conexión: correcta`.

## Pruebas

`backend/test/rutasConexionBd.test.mjs` monta el router y comprueba, de forma persistente, que `GET /password` responde 404, que el `PUT` rechaza campos obligatorios vacíos, puerto fuera de rango y claves no admitidas, y que `POST /test` con la contraseña vacía conecta con la guardada.

## Manejo de errores (F-48)

Todas las rutas exigen administrador, así que los mensajes pueden hablar del archivo de configuración, del servicio de la base de datos y de los permisos del servidor. Se usa la utilidad compartida con la clave `message` y el [catálogo de causas](../utils/catalogoErrores.md); el detalle del motor va solo al log (DC-09).

## Referencias

- [db_utilsConn](../db/db_utilsConn.md) - Funciones que implementan estas rutas
- [DbConfigService](../services/DbConfigService.md) - Cliente del frontend
- [Componente ProfileSettings](../components/ProfileSettings.md)
