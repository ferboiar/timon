# Entorno de pruebas del backend (DC-46)

Cómo se guardan las credenciales de la base de pruebas para que la suite del backend se pueda ejecutar sin exportar variables a mano, y qué comprobaciones hay antes de lanzarla.

## El problema

`npm run test:backend` necesita `TEST_DB_HOST`, `TEST_DB_USER` y `TEST_DB_PASSWORD`. Si no se definen, las pruebas usan los valores por defecto de la opción B (`mariadb-test`, `root`), que dan `ENOTFOUND` en el contenedor y no demuestran nada. Hasta DC-46 esas variables se exportaban en cada sesión, así que la suite solo la podía lanzar la persona que tenía la contraseña.

## El fichero

| Dato | Valor |
|---|---|
| Ruta | `backend/test/.env.test` |
| Permisos | `600` |
| Versionado | **Sí, cifrado con git-crypt** (DC-45): `.gitattributes` declara `filter=git-crypt diff=git-crypt` |
| Formato | El de `node --env-file`: `CLAVE=valor`, sin comillas, sin `export` ni interpolación |

Variables:

```text
TEST_DB_HOST=mariadb01
TEST_DB_PORT=3306
TEST_DB_USER=timon_test
TEST_DB_PASSWORD=…
TEST_DB_NAME=conta_hogar_test
```

`TEST_DB_NAME` debe acabar en `_test`: la suite **borra y recrea** esa base.

La prueba de volcado con rutinas y eventos (O-06) usa dos bases dedicadas, `conta_hogar_o06_origen_test` y `conta_hogar_o06_destino_test`. Con la opción C, `timon_test` necesita `ALL PRIVILEGES` sobre ambas; sin esos permisos la prueba se omite (no es evidencia). El detalle está en `backend/test/README.md`.

La prueba de objetos de esquema y DEFINER (O-08) usa `conta_hogar_o08_origen_test` y `conta_hogar_o08_destino_test`; el patrón `GRANT ALL PRIVILEGES ON `conta\_hogar\_%\_test`.*` ya las cubre. Sin esos permisos la prueba se omite y no se presenta como evidencia.

## Cómo se crea

```bash
cd /workspaces/timon
install -m 600 /dev/null backend/test/.env.test
# edita el fichero y escribe las cinco líneas de arriba
```

Al prepararlo con `git add`, el filtro `clean` de git-crypt lo cifra: al repositorio solo viaja el blob cifrado. Sin la clave del proyecto (`git-crypt unlock`) el clon no puede leerlo.

## Credenciales administrativas para migraciones (precisión de DC-59)

Las operaciones que escriben en el esquema —aplicar una migración, volcar o restaurar una base— usan
una cuenta administrativa (`timon_admin`) con un fichero de opciones de cliente **fuera del
repositorio**. No son credenciales de la suite: `backend/test/.env.test` y sus `TEST_DB_*` siguen
siendo las de las pruebas y no se usan como credencial administrativa. Como DC-59 exige para operar
sobre bases reales, cada conexión se autoriza por prompt y no se comparten credenciales entre suite y
operación.

| Dato | Valor |
|---|---|
| Ruta estándar del operador | `/home/node/.timon/admin.cnf` |
| Permisos | directorio `700`, fichero `600` |
| Contenido | sección `[client]` con `host`, `port`, `user` y `password` (y lo que exija TLS) |
| Versionado | **No**: nunca entra en Git, ni en `doc/`, ni en un chat, un log o un PR |

Cómo se genera (terminal del operador):

```bash
install -d -m 700 /home/node/.timon
install -m 600 /dev/null /home/node/.timon/admin.cnf
# editar y escribir:
# [client]
# host=mariadb01
# port=3306
# user=timon_admin
# password=…
```

Comprobación previa al uso, **sin leer el contenido**:

```bash
test -f "$CNF" && test ! -L "$CNF" && test -O "$CNF"
stat -c 'modo=%a tipo=%F uid=%u' "$CNF"   # esperado: 600 regular <uid efectivo>
```

Los clientes lo reciben como primera opción (`--defaults-extra-file="$CNF"`); la contraseña no viaja
en argumentos y no se ejecuta `cat`, `head` ni `source` sobre él.

Cuándo regenerarlo: al rotar la contraseña, al cambiar host, puerto o cuenta, si se pierde o se
corrompe, y ante cualquier sospecha de exposición. Se borra al terminar la operación si así se acuerda;
mientras exista, cada conexión —también de solo lectura— requiere autorización expresa en el prompt.

## Cómo se ejecuta

```bash
cd /workspaces/timon
npm run test:backend:local
```

El script hace dos cosas, en este orden:

1. `node scripts/comprobar-entorno-pruebas.mjs` comprueba que el fichero existe, **restablece los permisos `600`** si un checkout los dejó en `644` (git no conserva el modo), comprueba que están las cinco variables y que `TEST_DB_NAME` acaba en `_test`. Después conecta con esas credenciales y ejecuta `SHOW GRANTS FOR CURRENT_USER()`: si el usuario tiene permisos sobre alguna base que **no** acaba en `_test` (o un permiso global), **aborta sin lanzar la suite**. No imprime la contraseña ni el contenido del fichero.
2. `node --env-file=backend/test/.env.test --test backend/test/` ejecuta la suite completa.

## Límites

- La contraseña de pruebas **no** es un secreto del proyecto, pero el fichero se cifra igual que `e2e/.env` por la política de ficheros de entorno (DC-45). Los hooks `pre-commit` y `pre-push` (`scripts/comprobar-cifrado.mjs`) rechazan que viaje en claro; el patrón de rutas sensibles cubre `.env` y `.env.*` (por eso `.env.test` se vigila igual que `.env`).
- `--env-file` no interpreta comillas, comentarios al final de línea ni interpolación: una comilla mal puesta llega literal al valor.
- Este fichero no sustituye a la opción B de `backend/test/README.md` (MariaDB efímero con Docker), que sigue siendo la más portable.
- Si cambia la contraseña de `timon_test`, hay que editar el fichero y volver a prepararlo para que el blob cifrado se actualice.

## Referencias

- [Pruebas del backend](../../backend/test/README.md) - Las tres opciones para lanzar la suite
- [Suite E2E con Playwright](./e2e.md) - Pruebas de interfaz
- [Utilidad de errores de negocio](../utils/errorDeNegocio.md) - Mensajes del backend que las pruebas comprueban
