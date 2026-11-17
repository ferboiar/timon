# Configuración de entorno (`config/env`)

Archivo: `backend/src/config/env.mjs`. Carga `backend/.env` (cifrado con git-crypt) con `dotenv` y exporta la configuración del servidor.

| Variable | Uso | Valor por defecto |
|----------|-----|-------------------|
| `JWT_SECRET` | Secreto con el que se firman los JWT | Ninguno: si falta, se avisa por consola |
| `JWT_EXPIRATION` | Caducidad del token | `24h` |
| `PORT_BACKEND` | Puerto del servidor | `3000` |
| `LOGIN_MAX_INTENTOS` | Fallos de `/login` permitidos por ventana | `5` |
| `LOGIN_IP_MAX_INTENTOS` | Fallos por IP permitidos en `/login` por ventana | `30` |
| `LOGIN_VENTANA_MS` | Ventana del límite de intentos, en milisegundos | `900000` (15 min) |
| `CORS_ALLOWED_ORIGINS` | Nombres de host permitidos por CORS (dominios o `localhost`), separados por comas | Ninguno |
| `CORS_ALLOWED_NETWORKS` | Redes CIDR de IPs permitidas por CORS, separadas por comas | Ninguna |

## CORS (`config/cors`)

Archivo: `backend/src/config/cors.mjs`. La política se valida al arrancar: si una entrada no es válida,
el arranque falla con un mensaje claro. Sin ninguna de las dos variables, CORS queda cerrado (ningún
origen permitido); nunca se aceptan `*` ni `true`.

- **`CORS_ALLOWED_ORIGINS` es para nombres de host** (dominios o `localhost`), no para IPs. Se compara
  el host del `Origin` sin exigir esquema ni puerto.
- **`CORS_ALLOWED_NETWORKS` es para rangos de IPs** (redes CIDR como `192.168.0.0/24`), no para nombres.
  Solo se aplica cuando el host del `Origin` es una **IP literal**; un nombre de host que resuelva a una
  IP de la red **no** se valida contra la red (los nombres van en `CORS_ALLOWED_ORIGINS`).
- Si un host es una IP dentro de una red permitida, basta con `CORS_ALLOWED_NETWORKS`; no hace falta
  repetirlo en `CORS_ALLOWED_ORIGINS`.
- `CORS_ALLOWED_ORIGINS` existe para cubrir hosts que no son IPs: `localhost` ahora y el dominio público
  del futuro proxy inverso después. El host público de la app va en `CORS_ALLOWED_ORIGINS`; la red Docker
  no es un origen CORS.

Valores recomendados para desarrollo:

```env
CORS_ALLOWED_ORIGINS=localhost
CORS_ALLOWED_NETWORKS=192.168.0.0/24
```

## Exportaciones

- `config`: objeto con `jwt.secret`, `jwt.expiration`, `server.port` y `login.maxIntentos`/`login.ventanaMs`.
- `getEnv(clave, valorPorDefecto)`: lee cualquier variable de entorno con un valor por defecto.

La conexión a la base de datos no se configura aquí, sino en `backend/src/db/.db_connection` ([db_utilsConn](../db/db_utilsConn.md)).

## Referencias

- [Middleware de autenticación](../middleware/auth.md)
- [Caducidad del token](../auth/TokenExpiration.md)
