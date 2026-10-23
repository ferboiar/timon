# Configuración de entorno (`config/env`)

Archivo: `backend/src/config/env.mjs`. Carga `backend/.env` (cifrado con git-crypt) con `dotenv` y exporta la configuración del servidor.

| Variable | Uso | Valor por defecto |
|----------|-----|-------------------|
| `JWT_SECRET` | Secreto con el que se firman los JWT | Ninguno: si falta, se avisa por consola |
| `JWT_EXPIRATION` | Caducidad del token | `24h` |
| `PORT_BACKEND` | Puerto del servidor | `3000` |

## Exportaciones

- `config`: objeto con `jwt.secret`, `jwt.expiration` y `server.port`.
- `getEnv(clave, valorPorDefecto)`: lee cualquier variable de entorno con un valor por defecto.

La conexión a la base de datos no se configura aquí, sino en `backend/src/db/.db_connection` ([db_utilsConn](../db/db_utilsConn.md)).

## Referencias

- [Middleware de autenticación](../middleware/auth.md)
- [Caducidad del token](../auth/TokenExpiration.md)
