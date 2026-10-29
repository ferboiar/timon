# Instrucción persistente de funcionamiento: parte 2 de 4

Parte 2 de 4 de la [instrucción persistente](./instruccion-persistente.md): apartados 3 y 4 (iteraciones y modalidad de ejecución; ramas y estado local). Se lee completa y en orden con las demás: [parte 1 de 4](./instruccion-persistente_1de4.md) · [parte 2 de 4](./instruccion-persistente_2de4.md) · [parte 3 de 4](./instruccion-persistente_3de4.md) · [parte 4 de 4](./instruccion-persistente_4de4.md).

3. ITERACIONES Y MODALIDAD DE EJECUCIÓN

Cada iteración corresponde a un PR, salvo organización distinta autorizada.

Modalidad habitual:
la IA entrega cambios y comandos; el usuario los ejecuta en su entorno.

Modalidad delegada:
si el usuario pide expresamente que la IA realice una operación y hay herramientas, la IA puede ejecutarla dentro del alcance autorizado.

La delegación:

- No convierte el acceso remoto en acceso al contenedor.
- No autoriza acciones distintas de las solicitadas.
- No elimina confirmaciones obligatorias de las herramientas.
- No autoriza fusión ni borrado remoto por haber autorizado un commit.
- Debe registrar el entorno real de ejecución.
- No exige al usuario repetir pruebas que la IA ya haya ejecutado de forma válida.

El flujo conserva dos fases.

FASE A — PREPARACIÓN Y VERIFICACIÓN

Incluye:

- Evidencia y base.
- Objetivo, alcance, exclusiones y aceptación.
- Preparación segura de rama.
- Archivos nuevos.
- Script o parche.
- Documentación y seguimiento preparados o previstos.
- Comprobaciones y resultados esperados.
- Prueba manual cuando corresponda.
- Hallazgos adicionales separados.

En modalidad habitual no incluyas git add, commit ni push.

Después de entregar las comprobaciones pendientes, termina con:

Esperando evidencia

Espera las salidas y la confirmación explícita de las pruebas de interfaz solicitadas.

Si la IA ejecuta las comprobaciones, sus resultados reales pueden constituir la evidencia automática; no sustituyen una prueba manual que siga siendo necesaria.

Solo puede continuar sin otra ronda de ejecución del usuario si la delegación incluye expresamente verificación y cierre, no falta prueba manual ni decisión y se cumplen las condiciones del apartado 14.
Las autorizaciones obligatorias de las herramientas siguen siendo necesarias.

FASES A.1, A.2…

Ante errores o matices:

- Explica evidencia y discrepancia.
- Distingue fallo de código, parche y entorno.
- Corrige dentro del alcance.
- Pide aprobación si lo amplías.
- Entrega solo pasos pendientes.
- No recrees ramas ni reapliques cambios.
- Repite las comprobaciones afectadas.
- Si procede, solicita de nuevo la prueba manual afectada.

Una excepción de verificación requiere autorización expresa y quedar documentada.
No se presenta como pruebas superadas.

Si un commit remoto delegado contiene contenido erróneo o un marcador no sustituido, no lo reintentes con otro marcador: corrige con un commit nuevo que incluya el contenido íntegro, y registra ambos SHA en el informe.

FASE B — CIERRE

Comienza cuando se cumplen las condiciones del apartado 14.

Incluye:

- Informe de cierre, creado como archivo e incluido en el manifiesto.
- Resultados y seguimiento completados con la evidencia recibida.
- Comprobaciones documentales.
- Preparación, commit y publicación (push) del contenido, con la guarda descrita abajo.
- Título y descripción completos del PR.

Si cambia código, comportamiento, esquema o verificación sustantiva en B, vuelve a A.n.

En ejecución local entrega, por defecto, un único bloque con guarda: el commit y el push solo se ejecutan si el conjunto de archivos preparados, incluido el informe, coincide exactamente con el manifiesto de nombres. La guarda no valida el contenido de los cambios.

El bloque crea primero el mensaje de commit y el informe, que deben existir antes de git add y git commit -F:

cd /workspaces/timon
mkdir -p doc/mantenimiento/informes_iteraciones
cat > /tmp/<mensaje-commit>.txt <<'EOF'
tipo(IDs): resumen breve

Cuerpo en español.
EOF
cat > doc/mantenimiento/informes_iteraciones/<AAAA-MM-DD_ID_tema>.md <<'EOF'
<contenido del informe>
EOF
git add -- <archivo-1> doc/mantenimiento/informes_iteraciones/<AAAA-MM-DD_ID_tema>.md &&
git status --short &&
git diff --cached --stat &&
test "$(git diff --cached --name-only | sort)" = "$(printf '%s\n' <archivo-1> doc/mantenimiento/informes_iteraciones/<AAAA-MM-DD_ID_tema>.md | sort)" &&
git commit -F /tmp/<mensaje-commit>.txt &&
git push -u origin <rama>

git status --short y git diff --cached --stat son informativos; la única condición que detiene el commit es el test del manifiesto.
Si la guarda falla no se hace commit; pide la salida y analízala.
Si el manifiesto es dudoso o hay cambios locales ajenos, entrega dos bloques:
primero git add y comprobación, y después commit y push tras analizar la salida.

No afirmes haber revisado una salida que el usuario aún no ha enviado.

En ejecución remota delegada, comprueba el conjunto exacto de archivos, el contenido y el resultado del commit con las herramientas disponibles.
No finjas que has ejecutado git add o git commit -F en un contenedor.

No abras, fusiones ni borres ramas remotas sin autorización específica.

“PR hecho” no demuestra fusión:
comprueba PR abiertos y cerrados, buscando también por rama o título, o pregunta si la diferencia afecta a la continuación.

Con “PR hecho, seguimos”, “siguiente” o “continúa”:

- Reconstruye el estado de la iteración activa.
- Si ya está fusionada y no hay bloqueo, sigue el siguiente punto acordado.
- Si el PR sigue abierto, informa; no empieces trabajo dependiente como si estuviera incorporado, salvo autorización explícita.
- Si la tarea está todavía en A o B, continúa por el paso pendiente, no presupongas un cierre.
- No reinicies auditorías ni reabras decisiones por rutina.

4. RAMAS Y ESTADO LOCAL

Antes de modificar archivos locales, conoce o solicita directorio, rama, HEAD, git status --short y diferencias relevantes.

Directorio habitual:

cd /workspaces/timon

Patrones de rama:

correccion/fase-<n>-<tema>   (trabajo de fase)
mantenimiento/<tema>         (proceso, documentación o utilidades sin fase)

Obtén la fase del seguimiento.
Para proceso o documentación, incluye el nombre propuesto en el plan.
Pregunta aparte solo si hay una ambigüedad real.

La limpieza de la rama anterior pertenece a la preparación siguiente, tras comprobar la fusión.

La secuencia empieza por git switch main porque pull integra en la rama activa.
--ff-only evita introducir una fusión no prevista.

Secuencia habitual:

git switch main &&
git pull --ff-only origin main &&
git branch -d <rama-anterior> &&
git fetch --prune &&
git switch -c <rama-nueva>

No añadas || true ni operadores que permitan continuar tras un fallo. Si la rama anterior no existe, omite ese comando.
Cita SHA solo tras leerlos de la referencia concreta: la punta de una rama no es la de main.
Si la última evidencia local es de un mensaje anterior a otros pasos, pide un git status --short nuevo antes de la secuencia.
Esto aplica también cuando la última evidencia local procede de un mensaje anterior del mismo chat, aunque el usuario haya declarado que no cambió nada: la declaración no sustituye la lectura.

Entrega nombres completos y adapta la secuencia al estado comprobado:

- Revisar cambios locales.
- Confirmar que es seguro cambiar de rama.
- Verificar existencia e integración de la anterior.
- Omitir justificadamente un borrado que ya no procede.
- No recrear una rama existente.

Ante rechazo de -d por upstream atrasado:

- No usar -D automáticamente.
- Comprobar integración en origin/main y HEAD.
- Solo entonces retirar upstream y repetir -d si corresponde.

Si -d rechaza una rama cuyo PR consta como fusionado en GitHub (por ejemplo, por squash o rebase), comprueba que la punta de la rama es la del PR y pide autorización antes de usar -D.

Distingue rama local, rama remota y referencia de seguimiento.

Al preparar la limpieza, comprueba si la rama remota sigue existiendo e indica cómo eliminarla: botón de GitHub o, con autorización específica, git push origin --delete <rama>. Después, git fetch --prune retira la referencia de seguimiento local. Si el conector no ofrece borrar ramas, indícalo y no lo simules.

Nunca uses git add -A ni git add . para preparar una entrega.

No uses reset --hard, git clean, cambios de rama forzados, push forzado o reescritura publicada sin petición expresa y explicación del riesgo y alternativas más seguras.

Nunca prepares:

backend/src/db/.db_connection
backend/src/db/.db_connection.backup

No descartes sus cambios ni ignores otros cambios locales por ser esos dos conocidos.
