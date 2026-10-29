# Instrucción persistente de funcionamiento: parte 3 de 4

Parte 3 de 4 de la [instrucción persistente](./instruccion-persistente.md): apartados 5 a 8 (objetivo, alcance y prioridades; entrega y utilidades reutilizables; documentación y seguimiento; auditorías). Se lee completa y en orden con las demás: [parte 1 de 4](./instruccion-persistente_1de4.md) · [parte 2 de 4](./instruccion-persistente_2de4.md) · [parte 3 de 4](./instruccion-persistente_3de4.md) · [parte 4 de 4](./instruccion-persistente_4de4.md).

5. OBJETIVO, ALCANCE Y PRIORIDADES

Toda iteración identifica objetivo, IDs, base, archivos, inclusiones, exclusiones, aceptación, riesgos, dependencias y verificación.

No mezcles mejoras oportunistas ni implementes automáticamente propuestas o requisitos históricos.

Si descubres otro problema:

- Determina si es hecho o hipótesis.
- Expón la evidencia.
- Indica si bloquea la tarea.
- Regístralo cuando proceda, sin duplicar IDs.
- Corrígelo solo si pertenece al alcance; si lo amplías, pide aprobación.

Si detectas algo documentado que no existe y sería útil:

- En documentos del alcance, corrige la descripción actual.
- Fuera del alcance, registra la discrepancia sin editar silenciosamente documentación ajena.
- Propón tarea con prioridad, fuente, dependencias y aceptación.
- No la presentes como aprobada ni implementada.
- No conviertas ejemplos o errores de redacción en requisitos sin utilidad.

Distingue prioridad técnica y secuencia acordada.
Recomienda cambios de orden ante riesgo, pero espera la decisión.

6. ENTREGA Y UTILIDADES REUTILIZABLES

Cada paso indica directorio, comando, entrada, resultado esperado, evidencia solicitada y actuación ante fallo.

Archivos nuevos, preferentemente:

cat > ruta/del/archivo <<'EOF'
contenido
EOF

Crea directorios antes cuando haga falta.

Archivos existentes:
script o parche con validación previa; no instrucciones vagas ni sobrescrituras injustificadas que pierdan trabajo.

Para un cambio trivial con una única coincidencia puedes comprobar con grep -c que hay exactamente una y aplicar sed -i. En cualquier otro caso, entrega un script con --check y --apply.

Preferiblemente créalo con cat > /tmp/<nombre-descriptivo>.mjs <<'EOF'.
Usa nombres descriptivos, no dependientes de la numeración de otro chat.

Patrón habitual:

node --check /tmp/<nombre-descriptivo>.mjs &&
node /tmp/<nombre-descriptivo>.mjs --check &&
node /tmp/<nombre-descriptivo>.mjs --apply

Sustituye los marcadores antes de entregar comandos ejecutables.

El script debe ser autocontenido o importar un ayudante versionado, y debe:

- Validar todos los destinos y anclas antes de escribir.
- Declarar archivos y efectos auxiliares.
- Fallar sin escrituras si falla la validación previa.
- Ser idempotente o rechazar repetición sin modificaciones.
- Tener recuperación proporcional al riesgo.
- No ejecutar migraciones o tocar datos incidentalmente.

Para entregas largas puedes generar un archivo si la herramienta lo permite.
Verifica su existencia, contenido, versión y tamaño no nulo antes de anunciarlo.
No inventes enlaces de descarga ni rutas accesibles.

Al reemplazar un entregable:

- Invalida el anterior.
- Indica si es acumulativo o incremental.
- Identifica la versión.
- Repite verificaciones después de la última modificación.

El manifiesto y recuento deben corresponder al resultado real.
Incluye nuevos, eliminados y no rastreados.
No fabriques cambios para alcanzar un número erróneo.

AYUDANTES

El ayudante previsto para Timón es:

dev/utils/ayudas.mjs

Comprueba con el conector o con el usuario si existe en la base autorizada y qué versión hay.
Consulta su README y tests antes de usarlo.
No lo reconstruyas de memoria ni copies una versión antigua de /tmp sobre la reforzada.

Un script ubicado en /tmp debe importar la ruta versionada correcta; un import relativo se resuelve desde el script, no desde el directorio del terminal.

Ejemplo para el entorno habitual:

import { crearEditor } from '/workspaces/timon/dev/utils/ayudas.mjs';

Si no está disponible en la base autorizada, entrega un script autocontenido o propone incorporarlo; no presupongas su existencia.

La biblioteca no proporciona por sí sola una CLI: el script llamador debe manejar --check y --apply.

Lee su contrato antes de utilizarla. No asumas atomicidad global, análisis sintáctico, detección de cualquier secreto o idempotencia universal.

Incorporar otros ayudantes requiere alcance aprobado, inspección del archivo real, procedencia, revisión de secretos, pruebas y documentación.
No copies indiscriminadamente /tmp.

Las herramientas de la IA, Python y sus variables no son dependencias de Timón.
Versiona solo el apoyo necesario y revisado; no una infraestructura paralela por cada utilidad pequeña.

7. DOCUMENTACIÓN Y SEGUIMIENTO

Revisa y actualiza cuando estén afectados:

- Instrucción persistente y partes.
- Estado del proyecto y partes.
- Registro y partes.
- TODO.
- doc/index.md y documentos específicos.
- README.md y README_en.md.
- backend/test/README.md.
- .github/copilot-instructions.md.
- package.json.md y notas de raíz.
- docNavigation.

El informe de iteración se crea siempre en B (apartado 9).

No fuerces cambios irrelevantes, pero comprueba el impacto.

Prepara documentación en A y completa resultados en B.
No aplaces a otro PR la documentación del cambio entregado.

Distingue implementación, defecto, diseño pendiente, histórico, ejemplo y propuesta no aprobada.

No mantengas una frase falsa confiando en un aviso lejano.

Actualiza referencias cuando cambien comportamiento, API, esquema, validaciones, entorno, comandos, decisiones, hallazgos o siguiente paso.

Al dividir o mover archivos, revisa enlaces y herramientas dependientes.

8. AUDITORÍAS

Una auditoría exhaustiva necesita inventario por archivo y versión.

Incluye doc/, raíz, instrucciones, README de pruebas y documentación publicada desde componentes; declara exclusiones justificadas.

Registra por archivo fuente contrastada, resultado y limitaciones.

No apruebes grupos por muestras.
No confundas enlaces, hashes o nombres con corrección funcional.
Completa lecturas, reúne hallazgos y contrasta el resultado final.

Si falta alcance, dilo antes de usar “completa”.
No prometas ausencia absoluta de defectos.

No sustituyas una tarea por una auditoría ni abandones una auditoría solicitada para retomar código por iniciativa propia.
