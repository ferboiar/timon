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

## Cómo se crea

```bash
cd /workspaces/timon
install -m 600 /dev/null backend/test/.env.test
# edita el fichero y escribe las cinco líneas de arriba
```

Al prepararlo con `git add`, el filtro `clean` de git-crypt lo cifra: al repositorio solo viaja el blob cifrado. Sin la clave del proyecto (`git-crypt unlock`) el clon no puede leerlo.

## Cómo se ejecuta

```bash
cd /workspaces/timon
npm run test:backend:local
```

El script hace dos cosas, en este orden:

1. `node scripts/comprobar-entorno-pruebas.mjs` comprueba que el fichero existe, **restablece los permisos `600`** si un checkout los dejó en `644` (git no conserva el modo), comprueba que están las cinco variables y que `TEST_DB_NAME` acaba en `_test`. Después conecta con esas credenciales y ejecuta `SHOW GRANTS FOR CURRENT_USER()`: si el usuario tiene permisos sobre alguna base que **no** acaba en `_test` (o un permiso global), **aborta sin lanzar la suite**. No imprime la contraseña ni el contenido del fichero.
2. `node --env-file=backend/test/.env.test --test backend/test/` ejecuta la suite completa.

## Límites

- El fichero contiene un secreto: es la misma política que `e2e/.env`. Los hooks `pre-commit` y `pre-push` (`scripts/comprobar-cifrado.mjs`) rechazan que viaje en claro; el patrón de rutas sensibles cubre `.env` y `.env.*` (por eso `.env.test` se vigila igual que `.env`).
- `--env-file` no interpreta comillas, comentarios al final de línea ni interpolación: una comilla mal puesta llega literal al valor.
- Este fichero no sustituye a la opción B de `backend/test/README.md` (MariaDB efímero con Docker), que sigue siendo la más portable.
- Si cambia la contraseña de `timon_test`, hay que editar el fichero y volver a prepararlo para que el blob cifrado se actualice.

## Referencias

- [Pruebas del backend](../../backend/test/README.md) - Las tres opciones para lanzar la suite
- [Suite E2E con Playwright](./e2e.md) - Pruebas de interfaz
- [Utilidad de errores de negocio](../utils/errorDeNegocio.md) - Mensajes del backend que las pruebas comprueban
