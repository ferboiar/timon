---
name: migraciones-bd
description: Prepara, ensaya y aplica migraciones de base de datos en Timón. Úsala al crear una migración, probar una transición de esquema, preparar su despliegue o aplicarla. No ejecuta nada sobre conta_hogar sin autorización expresa en el prompt. No lee .db_connection ni solicita contraseñas en claro. No publica ni fusiona cambios.
---

# Migraciones de base de datos

Cubre diseño, SQL, pruebas, prevuelo, copia, restauración ensayada, aplicación y verificación.
En Plan solo se lee y propone: no se conecta a `conta_hogar` ni cambia estado. La autorización
para pruebas o lectura no autoriza escritura, parada de servicios ni publicación.

Si la petición incluye tanto una migración como el cierre de la iteración, aplica `migraciones-bd`
para la parte de base de datos y `cierre-iteracion` para la publicación. No mezcles ambos flujos
en una sola secuencia sin separar claramente qué skill gobierna cada paso.

## 1. Alcance y diseño

- Desde `/workspaces/timon`, comprueba rama, `HEAD`, árbol y relevo. Declara IDs, base, fichero
  `NNNN_tema.sql`, objetos y datos afectados, pérdida de datos, compatibilidad del código
  anterior/nuevo, reversibilidad, ventana, servicios a detener, copia y pruebas.
- El esquema solo cambia con una migración nueva (DC-13). Cabecera con propósito, efecto y si es
  repetible. Usa `DATABASE()` y guardas en `information_schema`; no fijes la base en el SQL.
- Procura que sea repetible: añade nullable, rellena con guardas, valida, impone restricciones y
  retira al final. `IF [NOT] EXISTS` no garantiza tipo, nulabilidad ni definición correctos.
- Rutinas, eventos y triggers sin `DEFINER` explícito (DC-60). Consulta horarios antes de
  recrearlos. DDL hace commits implícitos: no prometas atomicidad; prevé diagnóstico y reanudación.
- Tras aplicarla con éxito a `conta_hogar`, el SQL es histórico: cualquier corrección es otra
  migración. Antes del despliegue sí se corrige y se repiten todos los ensayos.

## 2. Pruebas de la iteración

- Añade una prueba de transición desde el esquema anterior, no solo desde cero: fixtures `zz-`,
  aplicación, definición exacta e invariantes, segunda aplicación sin cambios y casos de rechazo.
  `fase0.test.mjs` ofrece ese patrón; una prueba focalizada puede ser más adecuada.
- La suite recrea `TEST_DB_NAME` y aplica todas las migraciones: no sustituye esa transición.
  Comprueba el destino efectivo y usa solo bases `*_test`, nunca `conta_hogar`.
- Edita con el contrato de `dev/utils`; ejecuta `node --check` de los módulos tocados, lint de los
  archivos afectados y `git diff --check`. Busca nombres retirados en código vivo; las referencias
  históricas documentadas no son restos.
- Ejecuta `npm run test:backend:local` y las E2E pertinentes según `30-tests`; build si toca
  frontend. Conserva código de salida y recuentos, incluidos skip/cancelled. Sin E2E, justifica por
  qué no hay flujo observable afectado. No ejecutes suites concurrentes sobre las mismas bases.

## 3. Credenciales sin exponer secretos

- No abras `.db_connection` ni `.backup`, no uses `.env.test` como credencial administrativa y no
  pidas contraseñas por chat, argumentos, logs o ficheros del repositorio.
- Preferido: el usuario crea en su terminal un fichero temporal fuera del repo, modo `600`, con
  `[client]`, host, puerto, usuario y contraseña. Solo comunica su ruta `CNF`, nunca su contenido.
- Cline únicamente comprueba que es un archivo regular, no symlink, propiedad del UID efectivo y
  con modo `600`, usando `test` y `stat -c '%a %F %u' "$CNF"`. Nunca ejecuta `cat`, `less`,
  `source`, editores, hashes ni otra lectura de su contenido.
- Los clientes reciben `--defaults-extra-file="$CNF"` como primera opción. La contraseña no viaja
  en argumentos. Borra ese fichero al terminar, también tras error, sin incluirlo en ningún diff.
- Alternativa: el usuario ejecuta los comandos en su terminal con `read -r -s`, exporta
  `MYSQL_PWD`, hace `unset MYSQL_PWD` al final y devuelve salidas saneadas. Cline no simula ese
  prompt no interactivo.
- `command -v mariadb mariadb-dump`. Para `conta_hogar`, verifica `DATABASE()` y `CURRENT_USER()`.
  El hash de `.db_connection` antes y después es una guarda de no modificación, no lectura.

## 4. Prevuelo y ventana sin escrituras

- Toda conexión a `conta_hogar`, incluso de lectura, requiere autorización en el prompt. Registra
  columnas, índices, FK, rutinas, eventos, triggers, recuentos e invariantes. Evita muestras de
  datos personales en chat y PR.
- El prompt debe autorizar la ventana y nombrar expresamente los procesos o servicios que pueden
  detenerse. Solo se detienen los nombrados: `npm run nas`, backend, frontend o suites son
  ejemplos de lo que puede autorizarse, nunca una autorización genérica. Un cambio de
  `event_scheduler` o de eventos requiere autorización propia y una cuenta con privilegios.
- Registra estado, PID y PGID antes de parar. Detén únicamente el grupo exacto autorizado,
  primero con `SIGTERM`; no uses `pkill`, no mates por puerto ni toques procesos desconocidos.
  Si los servicios pertenecían a la sesión del usuario, es preferible que los detenga él mismo.
- Comprueba que 3000/5173 dejan de escuchar cuando corresponda (`ss -ltnp`), que no quedan suites
  activas y qué eventos están habilitados. `SHOW FULL PROCESSLIST` es auxiliar: sin privilegio
  `PROCESS` puede mostrar solo conexiones propias. Los recuentos previos/posteriores complementan,
  pero no prueban por sí solos que no hubo escritores.
- Con `event_scheduler=ON`, el usuario debe desactivarlo durante la ventana o justificar con los
  horarios consultados que ningún evento escribirá. Restablece después el estado anterior. Si hay
  clientes o escritores sin identificar, no apliques.
- Mantén la ventana hasta validar el resultado. Un despliegue en línea exige otro plan de
  compatibilidad, no esta secuencia.

## 5. Directorio persistente y copia completa

- Usa `BACKUP_DIR=/home/node/timon_backups` solo después de validarlo, u otra ruta aprobada. Debe
  estar fuera del repo. Si no existe, créalo únicamente en Act y dentro del alcance autorizado.
- Comprueba antes de volcar:

  ```bash
  realpath -e -- "$BACKUP_DIR"
  stat -c 'modo=%a tipo=%F uid=%u' -- "$BACKUP_DIR"
  findmnt -T "$BACKUP_DIR" -o TARGET,SOURCE,FSTYPE,OPTIONS
  df -P "$BACKUP_DIR"
  test -w "$BACKUP_DIR"
  ```

- Exige directorio real modo `700`, escritura y espacio. `findmnt` debe mostrar un montaje
  respaldado por el host; rechaza `overlay` y `tmpfs`. El usuario confirma la retención del
  volumen: `findmnt` no demuestra copias externas ni una política de borrado.
- Usa `umask 077`. Las copias contienen datos personales y nunca se preparan para Git.
- La copia previa es siempre completa, no solo de tablas afectadas:

  ```bash
  mariadb-dump --defaults-extra-file="$CNF" --single-transaction \
    --routines --events --triggers --no-tablespaces conta_hogar > "$COPIA.parcial"
  ```

- Puerta: `DUMP_EXIT=0`, fichero no vacío, marca `-- Dump completed` y renombre a nombre UTC final.
  Si falla, no apliques; el parcial no es copia válida. Registra ruta, bytes y SHA-256.

## 6. Restauración ensayada y retención

- Restaura el fichero literal en una base única `conta_hogar_mNNNN_<UTC>_test`. Verifica antes que
  el nombre exacto termina en `_test` y que no existe; no uses `conta_hogar_test` de otra suite.
- Usa la cuenta del `DEFINER` —normalmente `timon_admin`—, no `timon_test`, y no neutralices el
  `DEFINER`. Si hiciera falta `SET USER`, para y acuerda la cuenta adecuada.
- Compara tablas, filas, FK, rutinas, eventos, estados y triggers con el origen. Aplica ahí el mismo
  archivo dos veces y valida resultado e invariantes. Esto ensaya restauración y transición real.
- Elimina únicamente la base `_test` cuyo nombre exacto hayas comprobado. La copia previa no se
  borra automáticamente, ni siquiera después de una restauración ensayada o una migración
  correcta. Su ubicación definitiva, plazo de retención y eventual borrado son una decisión
  separada del usuario, nunca parte implícita del cierre.

## 7. Aplicación autorizada y diagnóstico de fallos

- Justo antes, presenta migración y SHA-256, copia y SHA-256, ensayo, estado previo y ventana. Exige
  autorización expresa para aplicar ese archivo a `conta_hogar`; «continúa» no basta.
- Verifica de nuevo destino, cuenta, escrituras detenidas y hash del archivo. Aplica el versionado,
  sin heredoc, copias pegadas ni `--force`:

  ```bash
  mariadb --defaults-extra-file="$CNF" conta_hogar < "$MIGRACION"
  rc=$?
  printf 'MIGRACION_EXIT=%s\n' "$rc"
  test "$rc" -eq 0
  ```

- Si falla, no reintentes. Conserva salida, código, hash y estado de la ventana. Mantén las
  escrituras detenidas y no restaures automáticamente.
- Identifica qué pasos se aplicaron: compara columnas, índices, FK, rutinas, eventos, triggers,
  recuentos e invariantes con el prevuelo y con el orden del SQL. Busca también objetos auxiliares
  temporales. No deduzcas el último paso únicamente por la línea del error.
- Presenta al usuario los pasos aplicados, los pendientes y las invariantes rotas. Decide con él:
  reanudación controlada si las guardas la hacen segura, nueva migración compensatoria o
  restauración autorizada. Cualquier nueva ejecución exige repetir el ensayo pertinente.

## 8. Verificación y reapertura

- Repite las consultas posteriores y compara con el prevuelo: definición exacta, objetos, recuentos
  e invariantes. Comprueba backend y flujos afectados antes de reabrir; incluye login si cambia
  sesión o seguridad. E2E en el entorno adecuado; humo en `conta_hogar` solo autorizado.
- Repone los servicios y eventos al estado acordado. Para solo procesos que hayas arrancado.
  Comprueba de nuevo `.db_connection`, limpia credenciales y elimina las bases de ensayo.
- Restaurar una copia devuelve a un punto temporal y pierde escrituras posteriores: requiere nueva
  ventana y autorización. No es un rollback automático ni se ejecuta dentro de esta skill sin ese
  alcance expreso.

## 9. Traspaso a cierre-iteracion

- `migraciones-bd` no ejecuta `git add`, commit, push, PR, fusión ni cierre de issue. Aplicar SQL
  no concede ninguna autorización de publicación.
- Al llegar al cierre, invoca `/cierre-iteracion` y proporciona:
  1. Manifiesto exacto de archivos, sin copias, credenciales ni `.db_connection`.
  2. Mensaje de commit con IDs y cuerpo en español.
  3. Cuerpo del PR con `Qué hace`, `Verificado` y `Pendiente`, incluyendo comandos, códigos,
     recuentos, hashes, copia, restauración, aplicación y límites reales.
- `cierre-iteracion` valida el diff, el índice y las autorizaciones; no acepta el paquete a ciegas.
  Documentación, registro y relevo se preparan en el mismo alcance, sin informe de iteración.
- Distingue versionada, ensayada, aplicada y verificada: fusionar no equivale a aplicar.
- Como trabajo derivado, propón evaluar un ejecutor o tabla de control con nombre, SHA-256,
  fecha de aplicación y cuenta. La referencia `O-12` es una propuesta, no una asignación
  definitiva: al crear el registro y su issue, comprueba el último ID de la familia y usa el
  siguiente libre. La idempotencia no cierra ese trabajo y esta skill no implementa ese mecanismo.
