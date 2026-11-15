# Configuración de entorno (`config/env`)

Archivo: `backend/src/config/env.mjs`. Carga `backend/.env` (cifrado con git-crypt) con `dotenv` y exporta la configuración del servidor.

| Variable | Uso | Valor por defecto |
|----------|-----|-------------------|
| `JWT_SECRET` | Secreto con el que se firman los JWT | Ninguno: si falta, se avisa por consola |
| `JWT_EXPIRATION` | Caducidad del token | `24h` |
| `PORT_BACKEND` | Puerto del servidor | `3000` |
| `LOGIN_MAX_INTENTOS` | Fallos de `/login` permitidos por ventana | `5` |
| `LOGIN_VENTANA_MS` | Ventana del límite de intentos, en milisegundos | `900000` (15 min) |

## Exportaciones

- `config`: objeto con `jwt.secret`, `jwt.expiration`, `server.port` y `login.maxIntentos`/`login.ventanaMs`.
- `getEnv(clave, valorPorDefecto)`: lee cualquier variable de entorno con un valor por defecto.

La conexión a la base de datos no se configura aquí, sino en `backend/src/db/.db_connection` ([db_utilsConn](../db/db_utilsConn.md)).

## Referencias

- [Middleware de autenticación](../middleware/auth.md)
- [Caducidad del token](../auth/TokenExpiration.md)
