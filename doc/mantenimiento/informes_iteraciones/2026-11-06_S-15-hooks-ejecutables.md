## Informe de cierre de iteración

### Objetivo y alcance

- **S-15**: los hooks de `scripts/hooks` quedaron en `100644` porque `core.fileMode=false` impide que git registre el bit de ejecución; en un clon git los **ignoraría**, de modo que la protección del PR #66 no habría actuado. Se fuerza `100755` en el índice y se reaplica el permiso en cada contenedor.
- Inclusiones: `.devcontainer/devcontainer.json` (`chmod +x scripts/hooks/*`), modo de los dos hooks en el índice, filas S-14 y S-15 del registro, relevo §0, `TODO` y este informe.
- Exclusiones: contenido de los hooks y del verificador (no cambian), código de la aplicación, esquema, S-11 y el resto del backlog.

### Base

- Rama `mantenimiento/S-09-fix-hooks-ejecutables`, creada desde `main` en `c419be2`.
- PR anterior: #66 (S-09 y DC-45), fusionado el 2026-11-06.
- Cambios locales conocidos y ajenos: `backend/src/db/.db_connection`. No se prepara.

### Cambios

- `git update-index --chmod=+x` sobre `scripts/hooks/pre-commit` y `scripts/hooks/pre-push`: el commit registra `mode change 100644 => 100755` y el índice queda en `100755`.
- `postCreateCommand` añade `chmod +x scripts/hooks/*` antes del `chmod 600` de los secretos, para que cada contenedor nuevo deje los hooks ejecutables.
- Registro: **S-14** precisada (el `600` se reaplica tras cada checkout) y **S-15** nueva.
- Esquema, API y código: no aplicable.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| `doc/mantenimiento/registro-hallazgos_3de3.md` | Sí | Sí | S-14 precisada y S-15 nueva |
| `doc/mantenimiento/estado-del-proyecto_1de3.md` | Sí | Sí | §0: base, trabajo activo e identificadores libres |
| `TODO` | Sí | Sí | Punto de reanudación y estado operativo |
| `doc/mantenimiento/informes_iteraciones/index.md` | Sí | Sí | Entrada de este informe |
| `doc/mantenimiento/instruccion-persistente_4de4.md` | Sí | No | La regla de §10 ya cubre el flujo; solo cambia el modo del fichero |
| `README.md`, `README_en.md`, `doc/pruebas/e2e.md`, `e2e/README.md` | Sí | No | Describen la política, que no cambia |
| `doc/index.md` y `docNavigation` | Sí | No | No hay documento nuevo |

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Modo en el índice | `git ls-files -s scripts/hooks/` | `100755` en `pre-commit` y `pre-push` |
| Modo en el commit | `git commit` | `mode change 100644 => 100755` en los dos |
| Clon nuevo | `git clone --no-hardlinks . /tmp/…` desde `2115daa` | Índice `100755` y disco `-rwxr-xr-x` en los dos hooks |
| El hook actúa en el commit | `git commit` con `core.hooksPath` activo | Mensaje `Cifrado: correcto (…)` antes de crear el commit |
| `devcontainer.json` válido | `JSON.parse` y `sh -n` del comando | `JSON_OK` y `SINTAXIS_OK` |
| Permisos locales | `ls -l` | Hooks `-rwxr-xr-x`; `e2e/.env` `-rw-------` |
| Verificador | `node scripts/comprobar-cifrado.mjs` | `exit=0` |

### No verificado

- **Reconstrucción de la imagen**: sin `docker` en el contenedor; el `chmod +x` del `postCreateCommand` no se ha ejecutado en un contenedor nuevo.
- **`git-crypt unlock`** con clave: sin clave disponible y sin ejecutar `lock` (dejaría el árbol ilegible).

### Estado al preparar el informe

- Rama `mantenimiento/S-09-fix-hooks-ejecutables` con la corrección commiteada y este informe preparado.
- Sin bloqueos. `backend/src/db/.db_connection` fuera del commit.

### Continuidad

- Siguiente trabajo: **F-30/F-31**; después, la sincronización posterior a la fusión de #66 y #67 (D-29).
- Qué leer: S-15, S-14 y la sección de secretos de `doc/pruebas/e2e.md`.
- Qué no asumir: que la imagen se reconstruyó o que el `postCreateCommand` se ejecutó.
