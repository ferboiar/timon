# Instrucción persistente de funcionamiento: parte 4 de 4

Parte 4 de 4 de la [instrucción persistente](./instruccion-persistente.md): apartados 9 a 14 (identificadores, informe y PR; pruebas y seguridad; reanudación; persistencia y adopción; respuestas y etiquetas; condiciones de avance). Se lee completa y en orden con las demás: [parte 1 de 4](./instruccion-persistente_1de4.md) · [parte 2 de 4](./instruccion-persistente_2de4.md) · [parte 3 de 4](./instruccion-persistente_3de4.md) · [parte 4 de 4](./instruccion-persistente_4de4.md).

9. IDENTIFICADORES, INFORME Y PR

Categorías:

DC: decisiones.
F: hallazgos funcionales.
S: seguridad.
R: requisitos y propuestas.
D: documentación y relevo.
U: interfaz.
O: operación.
Fases: organización.

Comprueba los IDs ya asignados en el registro antes de asignar uno nuevo. “Siguiente libre” no basta. Si el registro ha cambiado durante la iteración, actualiza la comprobación; no releas el registro completo en cada mensaje.

No renumeres ni cierres defectos por corregir solo su documentación.

Tipos de commit:

feat, fix, refactor, docs, test, chore, perf, security, revert.

Formato:

tipo(IDs): resumen breve

Si no existe un ID aplicable, usa tipo: resumen breve.

Cuerpo en español: qué cambia, por qué y qué queda pendiente.
No etiquetes docs un cambio funcional porque también modifique documentación.

En ejecución local entrega el mensaje en archivo (creado en el bloque de cierre) y git commit -F.
En ejecución remota usa el mecanismo equivalente de la herramienta, con el mismo mensaje y sin afirmar ejecución local.

INFORME

Un informe por PR, creado en B como archivo y preparado con el resto del manifiesto. Son cambios menores los de documentación o erratas sin código, esquema ni decisiones; para ellos usa el formato abreviado y no lo omitas.

doc/mantenimiento/informes_iteraciones/AAAA-MM-DD_ID_tema.md

Si se vuelve de B a A.n, se actualiza ese mismo informe al cerrar de nuevo.
No se crean informes por cada corrección o mensaje.

Formato abreviado, con solo cuatro secciones:
Objetivo e IDs, Archivos, Verificación y Continuidad.
No uses el formato completo en cambios menores.
El formato abreviado usa un título de nivel ## con el texto exacto «## Informe de cierre de iteración», seguido de exactamente estas cuatro secciones de nivel ### en este orden: ### Objetivo e IDs, ### Archivos, ### Verificación, ### Continuidad. La sección Archivos debe listar también el propio informe como archivo nuevo.
En Continuidad del informe abreviado incluye solo el siguiente trabajo y qué no asumir. Los hallazgos aparte van en la respuesta, no en el informe.

Formato completo:

## Informe de cierre de iteración

### Objetivo y alcance
- Objetivo, IDs, inclusiones y exclusiones.

### Base
- Rama y commit.
- PR anterior y estado comprobado.
- Cambios locales conocidos.

### Cambios
- Código, esquema, interfaz, API, pruebas, documentación y seguimiento.
- Indicar no aplicable sin inventar contenido.

### Documentación revisada
| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|

### Verificación
| Comprobación | Comando/entorno | Resultado real |
|---|---|---|

### No verificado
- Ausencias, motivo y consecuencias.

### Estado al preparar el informe
- Parche generado/aplicado.
- Verificación y prueba manual.
- Bloqueos o excepciones.
- Rama y archivos.

### Continuidad
- Siguiente trabajo.
- Qué leer.
- Qué no asumir.

En Verificación (informe) y en “Verificado” (PR) registra únicamente resultados que el usuario haya aportado.
Si solo declaró “sin errores”, escribe “declarado por el usuario” y no cites salidas de comandos que no recibiste.

Es una fotografía previa al commit, no un registro que deba actualizarse para incluir su propio hash o fusión.

No duplica el mensaje completo del commit ni la descripción completa del PR.
Estos quedan en Git/GitHub y se entregan en B.

No crees bucles de commits para registrar metadatos.
Consolida estados posteriores en la siguiente actualización sustantiva.

Los informes deben ser localizables desde mantenimiento y el relevo, con navegación razonable.

PR

La descripción usa tres secciones:

## Qué hace
IDs, objetivo, alcance, exclusiones, archivos y efecto documental.

## Verificado
Solo ejecución y evidencia reales, indicando entorno.

## Pendiente
Verificación ausente y motivo, riesgos, fallos abiertos y siguiente paso.

No inventes hash ni número de PR que aún no existan.
El cierre operativo de B es el definido en el apartado 3.

10. PRUEBAS Y SEGURIDAD

Selecciona sintaxis, lint, build, tests y prueba manual según la tarea.
Explica qué ejecutan y qué demuestran.

No confundas parche aplicado, fixture, análisis estático, test unitario, integración ni UI.

No declares pruebas superadas sin evidencia.
Describe fielmente el entorno utilizado y la correspondencia entre el contenido probado y el entregado.

La opción activa del backend procede del relevo y backend/test/README.md, no de este prompt.

Si falta o no coincide, acláralo antes de ejecutar.

Si el relevo confirma la opción mariadb01, timon_test y conta_hogar_test, el comando completo es:

cd /workspaces/timon
read -r -s -p "Contraseña timon_test: " TEST_DB_PASSWORD
echo
export TEST_DB_PASSWORD
TEST_DB_HOST=mariadb01 TEST_DB_PORT=3306 TEST_DB_USER=timon_test TEST_DB_NAME=conta_hogar_test npm run test:backend

Entrega el comando concreto de la opción confirmada.
Comprueba host, puerto, usuario y base; no heredes variables accidentalmente.

Pruebas destructivas solo en entorno autorizado y bases *_test, nunca conta_hogar. El sufijo no sustituye comprobar el destino.

Contraseñas en terminal, no en chat ni commits.
Logs saneados, sin secretos.

No confundas fallos de DNS/conexión/preparación con defectos funcionales.

Conserva el código de salida al capturar logs.
No lo ocultes con tuberías.

Ante cambios o fallos sustantivos, aplica A.n.

11. REANUDACIÓN

El relevo indica al principio:

- Fecha y base.
- Último trabajo incorporado a main, comprobado.
- Trabajo actual, separado de lo fusionado.
- Objetivo, estado, próxima acción y bloqueos.

Conserva archivos relevantes, exclusiones, decisiones, propuestas, verificación, límites, prioridades y arranque de otro chat.

No acumules mensajes indefinidamente ni dupliques todo el backlog.

Un PR no se presenta como incorporado dentro de su propio contenido antes de fusionarse.
Puede figurar como trabajo preparado en esa rama, pendiente de revisión y fusión.

Otro chat comprueba la situación actual antes de seguir un relevo antiguo.
No exige reaprobación de decisiones vigentes sin motivo.

12. PERSISTENCIA Y ADOPCIÓN

La versión aprobada vive en:

doc/mantenimiento/instruccion-persistente.md

y sus partes obligatorias, si existen.
No mantengas copias normativas independientes.

Cambiar las reglas es una iteración de proceso con aprobación, decisión registrada, referencias y navegación correspondientes.

Si el usuario entrega otra versión para revisarla, no la adoptes automáticamente en el repositorio.

Al adoptar una versión, reconcilia las reglas contradictorias del repositorio.
Las tareas de adopción —guardar, dividir, actualizar enlaces o integrar utilidades— se declaran en su plan y pueden repartirse en PR coherentes si hace falta.
No quedan como órdenes permanentes de reorganización automática.

MENSAJE DE ARRANQUE

“Retomamos ferboiar/timon. Lee instruccion-persistente.md y todas sus partes, el relevo, TODO, el registro (entrada y todas sus partes, en orden) y el informe pertinente. Comprueba primero el acceso. Si no puedes leer el contexto crítico completo, dímelo y no modifiques el proyecto: aportaré lo que falte. Mientras tanto: nada es verificado sin evidencia; sin secretos en el chat; no preparar .db_connection ni su copia; no git add -A, reset --hard ni push forzado; no escribas en el repositorio por conectores salvo que te lo pida expresamente. Reconstruye la fase actual y continúa con el siguiente paso acordado.”

13. RESPUESTAS Y ETIQUETAS

Responde en español; distingue hecho, inferencia, hipótesis, decisión, propuesta, acción hecha y pendiente.

Encabezados de Fase A. Usa solo los que tengan contenido; nunca escribas “Ninguno” bajo uno:

- Evidencia y base
- Qué incluye
- Preparar la rama
- Ficheros nuevos
- Script de cambios
- Documentación y seguimiento
- Verificaciones
- Probar en pantalla
- Un hallazgo aparte

Encabezados de Fase A.n:

- Resultado de la evidencia
- Qué hay que corregir
- Script de cambios
- Verificaciones
- Probar en pantalla, si procede
- Un hallazgo aparte, si procede

Encabezados de Fase B:

- Resultado de las verificaciones
- Documentación
- Informe de cierre
- Commit y publicación
- Título y descripción del PR

Omite los apartados sin contenido; no escribas “Ninguno” ni “No aplica”.
No incluyas cierre de B en una entrega A habitual.

Al recibir una salida, analízala y da solo el paso pendiente.
No repitas ramas o parches aplicados.

Identifica como esperado un git status que no hayas leído realmente.

No devuelvas el control solo anunciando que seguirás leyendo.
Si hay interrupción, indica qué está hecho, qué falta y si el usuario debe actuar.

No prometas trabajo en segundo plano.

Última etiqueta de respuestas operativas:

Esperando evidencia
Cuando falten salidas, confirmación manual, autorización o una decisión del usuario para resolver un bloqueo.
No la uses si lo pendiente puede hacerlo la IA con sus herramientas: hazlo en esa misma respuesta.

Listo para PR
Cuando B está preparada, sin afirmar que el usuario ya ejecutó sus comandos.

Entrega comprobada
Con commit y publicación comprobados. Indica el estado siguiente: PR pendiente de abrir, PR abierto pendiente de fusión o PR fusionado.

Iteración incorporada
Con fusión confirmada o verificada.

Añade una línea “Estado: …” justo antes de la etiqueta final si aporta información adicional, por ejemplo bloqueo o PR abierto pendiente de fusión.

Para “PR cerrado sin fusionar”, usa “Estado: PR cerrado sin fusionar” y la etiqueta Esperando evidencia, indicando qué falta para retomarlo.

Si confirmas una fusión y empiezas la siguiente iteración en la misma respuesta, informa al principio de la incorporación anterior y termina con la etiqueta de la fase nueva.

Si falla Git durante B, permanece en cierre y solicita la evidencia necesaria.
No reapliques el cambio funcional por un fallo de commit o push.

Las etiquetas no se exigen en una conversación dedicada a revisar el propio prompt o a discutir una propuesta.

14. CONDICIONES DE AVANCE

Puede avanzarse a B cuando:

- Lo implementado responde a lo aprobado.
- La evidencia automática aplicable es correcta.
- La prueba manual está confirmada si corresponde.
- Las discrepancias están resueltas o hay excepción explícita.
- Documentación y seguimiento están preparados para completarse con la evidencia recibida.

Distingue implementación terminada, entrega preparada, publicación, PR abierto (pendiente de fusión), PR cerrado sin fusionar e incorporación a main.
No uses una palabra genérica como “terminado” ocultando esas diferencias.

La iteración queda incorporada con la fusión comprobada.
No hace falta resolver todo el backlog para incorporarla, pero sí dejar registrados los defectos y límites relevantes abiertos.

Las garantías se limitan a lo observado.
Ni una auditoría ni un parche aplicado acreditan por sí solos ausencia de defectos o pruebas funcionales en verde.
