# Skills de Cline en Timón

Última actualización: 2026-11-17. Enumera los procedimientos de trabajo que Cline carga bajo
demanda. No los sustituye ni los copia: el texto vigente de cada uno vive en su `SKILL.md`.

Una skill es una carpeta con un fichero `SKILL.md` y un frontmatter con `name` (igual al nombre de la
carpeta) y `description`. Cline carga siempre los metadatos y el cuerpo solo cuando la skill se
activa, porque la petición encaja con su descripción o porque se invoca con `/<nombre>`. Es la
diferencia con las reglas de `.cline/rules/`, que se cargan siempre o por `paths` (DC-64).

## cierre-iteracion

**Cuándo se usa:** al pedir cerrar una iteración, preparar o abrir un PR, hacer commit y push,
fusionar, o comprobar el estado de un PR.

**Qué hace, paso a paso:**
1. Comprobaciones previas: rama, estado, últimos commits, diff real, lint, sintaxis y pruebas que
   correspondan.
2. Índice: manifiesto completo en `/tmp/manifiesto-<tema>.txt`, `git add -- <rutas>`, comprobación
   de coincidencia con `git diff --cached --name-only`.
3. Commit: mensaje en `/tmp/mensaje-<tema>.txt`, `git commit -F`, verificación con
   `git log --oneline -1`.
4. Publicación y PR, solo si está autorizado: `git push -u origin <rama>`, cuerpo del PR en
   `/tmp/pr-<tema>.md`, `gh pr create`, `gh pr view` y `gh pr checks`.
5. Fusión y después, solo si está autorizado y los checks están verdes: `gh pr merge`, actualización
   del relevo §0 y cierre del issue en el mismo acto.

**Qué no hace:**
- No ejecuta ninguna operación de publicación sin autorización en el prompt.
- No usa `git add -A` ni `git add .`; nunca incluye `.db_connection` ni su `.backup`.
- No declara una fusión sin `gh pr view`; no inventa números de PR ni SHA.

**Qué produce:** commit, push, PR abierto con las tres secciones (`Qué hace`, `Verificado`,
`Pendiente`), y, si se autoriza, fusión y cierre del issue.

**Invocación:** `/cierre-iteracion` o automática al pedir cerrar o publicar.

## limpieza-ramas

**Cuándo se usa:** al pedir borrar o limpiar ramas, comprobar si una rama está integrada, o retomar
la limpieza pendiente (O-09).

**Qué hace, paso a paso:**
1. Comprobación: `git fetch --prune`, `git branch -vv`, `git log --oneline -1 <rama>`,
   `git branch --merged main` y `gh pr view <rama> --json state,mergedAt,mergeCommit`.
2. Local: `git branch -d`; si rechaza por upstream atrasado, comprobar integración, retirar upstream
   con `git branch --unset-upstream` y repetir `-d`; solo si el PR consta fusionado y la punta es la
   del PR, pedir autorización y usar `-D`.
3. Remota: `git push origin --delete <rama>`, solo con rama nombrada y autorizada; después
   `git fetch --prune`.
4. Registro: anotar en el relevo §0 o en el issue O-09 qué ramas quedan y por qué.

**Qué no hace:**
- Solo borra las ramas nombradas en el prompt; el criterio general no amplía la lista.
- Si el prompt no nombra ninguna, pregunta antes de tocar nada.
- No usa `-D` sin autorización expresa.

**Qué produce:** ramas locales y remotas borradas (solo las nombradas), verificación de que no
quedan, y registro en el issue O-09.

**Invocación:** `/limpieza-ramas` o automática al pedir limpiar ramas.

## auditoria-documental

**Cuándo se usa:** al pedir una auditoría, una revisión exhaustiva, o comprobar que la
documentación coincide con la implementación.

**Qué hace, paso a paso:**
1. Alcance antes de empezar: declara qué se audita (documentación, módulo, seguridad) y qué queda
   fuera.
2. Inventario: una fila por archivo con fuente contrastada, resultado y limitación; incluye `doc/`,
   raíz, `.cline/`, README de pruebas y documentación publicada desde componentes; justifica
   exclusiones.
3. Evidencia: comandos y salidas reales con código de salida; distingue implementación, diseño
   pendiente, histórico, ejemplo y propuesta no aprobada.
4. Cierre: hallazgos viables se corrigen en el mismo PR (DC-58); el resto se registra con ID nuevo;
   no promete ausencia absoluta de defectos.

**Qué no hace:**
- No aprueba por muestras ni por enlaces, hashes o nombres; exige corrección funcional comprobada.
- No promete ausencia absoluta de defectos; las garantías se limitan a lo observado.

**Qué produce:** informe de auditoría con inventario, evidencia y hallazgos clasificados
(corregidos en el PR o registrados con ID nuevo).

**Invocación:** `/auditoria-documental` o automática al pedir una auditoría.

## migraciones-bd

**Cuándo se usa:** al crear una migración, ensayar una transición de esquema o preparar y ejecutar
su despliegue en `conta_hogar`.

**Qué hace:** prepara el SQL y sus pruebas, realiza el prevuelo, crea una copia completa en un
directorio persistente validado, comprueba su restauración en una base `_test`, aplica el archivo
versionado solo con autorización expresa y verifica esquema, datos y flujos afectados.

**Qué no hace:**
- No publica, fusiona ni cierra issues.
- No detiene procesos o servicios que el prompt no nombre explícitamente.
- No lee `.db_connection` ni pide contraseñas en claro.
- No ejecuta nada sobre `conta_hogar` sin autorización en el prompt.
- No reintenta migraciones fallidas a ciegas ni restaura copias automáticamente.
- No borra automáticamente la copia previa: su retención y borrado requieren una decisión separada
  del usuario.

**Interacción:** para commit, push, PR, fusión y cierre de issue, invoca `/cierre-iteracion`;
no duplica ese procedimiento.

**Trabajo derivado:** se propone evaluar un ejecutor o registro de migraciones. `O-12` es un ID
provisional que debe revalidarse al crear el registro y su issue.

**Invocación:** `/migraciones-bd` o automática al preparar o aplicar una migración.

## Límites

- El documento resume; **no** reproduce el cuerpo de las skills. Cambiar un procedimiento es cambiar
  su `SKILL.md`, no este fichero.
- Las rutas de `.cline/skills/` no se publican en el visor de documentación, que solo carga
  `doc/**/*.md`; por eso se citan como rutas y no como enlaces.
- Los umbrales de tamaño de reglas y skills son los de DC-65: un procedimiento nuevo se crea como
  skill y no engordando las reglas.
