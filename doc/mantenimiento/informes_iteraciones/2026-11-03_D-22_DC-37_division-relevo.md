## Informe de cierre de iteración

### Objetivo y alcance

- D-22 y DC-37: dividir `doc/mantenimiento/estado-del-proyecto.md` en una entrada y tres partes por secciones completas, como el registro (DC-28) y la instrucción persistente (DC-33), porque el relevo monolítico de 29 504 bytes llegó truncado con el conector.
- Poner al día el relevo, `TODO` y el registro tras el PR #51 (D-21) y explicar la división en la documentación que lo referencia.
- Exclusiones: sin cambios de código de la aplicación, esquema, datos ni reglas funcionales; sin cambios en la instrucción persistente (cambiarla es una iteración de proceso aparte); los informes históricos no se reescriben.

### Base

- Rama: `mantenimiento/D-22-DC-37-dividir-estado-del-proyecto`, desde `main` en `eb5dad1b357ffbc76bc94e9e1aac395b369f2c03` (merge del PR #51), leído del conector. La salida local del `git rev-parse HEAD` tras el `pull` no se aportó.
- PR anterior: #51 (D-21), fusionado el 2026-11-02, comprobado en el repositorio remoto.
- Cambios locales conocidos y excluidos: `backend/src/db/.db_connection` (modificado) y `backend/src/db/.db_connection.backup` (sin rastrear).

### Cambios

- Relevo: `estado-del-proyecto.md` pasa a ser la entrada (propósito y orden de lectura, partes, dónde está cada sección y reglas de mantenimiento). Las secciones 0 a 3 pasan a `estado-del-proyecto_1de3.md`, las 4 a 7 a `estado-del-proyecto_2de3.md` y la 8 con los cierres históricos de auditoría a `estado-del-proyecto_3de3.md`. Tamaños: 3 549, 10 599, 7 842 y 13 075 bytes.
- Contenido del relevo actualizado: fecha, base (`eb5dad1`), D-21 incorporado, D-22 como trabajo activo, historial con el PR #51, identificadores libres (DC-38 y D-23) y las lecturas y el mensaje de arranque («entrada y sus tres partes»).
- Código: `docNavigation` de `src/views/pages/Tech-documentation.vue` pasa de una a cuatro entradas del relevo. No cambia ninguna otra línea del visor.
- Documentación y seguimiento: `TODO`, registro (entrada y partes 1 y 3: DC-37 nueva, D-22 nueva, D-21 incorporado y nota en D-17), `doc/index.md`, `README.md`, `README_en.md` y `.github/copilot-instructions.md`.
- API, esquema, migraciones y pruebas: no aplicable.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| doc/mantenimiento/estado-del-proyecto.md | Sí (completo, con el tramo final aportado) | Sí | Pasa a ser la entrada |
| doc/mantenimiento/estado-del-proyecto_1de3.md, _2de3.md y _3de3.md | Sí | Sí (nuevos) | Secciones 0 a 3, 4 a 7 y 8 con cierres |
| doc/mantenimiento/instruccion-persistente.md y sus 4 partes | Sí (completas) | No | Ya prevén «y sus partes»; cambiar reglas es proceso aparte |
| doc/mantenimiento/registro-hallazgos.md y partes 1 a 3 | Sí (completos) | Sí (entrada y partes 1 y 3) | DC-37, D-22, D-21, D-17 y sección 0; la parte 2 no se ve afectada |
| TODO | Sí (completo) | Sí | D-22, D-21 incorporado y referencia a las secciones del relevo |
| doc/index.md | Sí (completo) | Sí | Introducción y enlaces a las partes |
| README.md y README_en.md | Sí (fragmentos que citan el relevo) | Sí | Explican que el relevo se divide en tres partes |
| .github/copilot-instructions.md | Sí (fragmento) | Sí | Relevo: entrada y tres partes |
| src/views/pages/Tech-documentation.vue | Sí (fragmento de `docNavigation`) | Sí | Entrada y tres partes en la navegación |
| doc/mantenimiento/informes_iteraciones/index.md | Sí | Sí | Fila de este informe |
| package.json.md, auditoria-documentacion.md y DB_controlfinanciero.txt | Sí (fragmentos) | No | Sus enlaces a la entrada siguen siendo válidos |
| Informes anteriores | Sí (fragmentos) | No | Históricos: describen el relevo monolítico de su momento |
| backend/test/README.md | No | No | No figura entre las referencias localizadas |

### Verificación

Resultados aportados por el usuario en su contenedor:

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Sintaxis y validación previa | `node --check` y `--check` | 31 comprobaciones ✔; plan válido: 10 ficheros modificados y 3 nuevos; sin escrituras |
| Aplicación del reparto | `--apply` | 31 ✔; «Aplicado y verificado: el relevo se reconstruye exacto a partir de las tres partes»; copia previa en `/tmp/timon-d22-Aq1mMb` |
| Espacios | `git diff --check` y `grep` de espacios finales en los ficheros nuevos | `DIFF_CHECK_EXIT:0`; `GREP_EXIT:1` |
| Secciones y tamaños | `wc -lc` y `grep -n '^## '` | Entrada de 37 líneas y 3 549 bytes; partes de 68 líneas y 10 599 bytes, 81 y 7 842, y 117 y 13 075; cada parte con sus secciones |
| Conservación independiente | `git show HEAD:… \| grep -vxFf` sobre las partes | 15 líneas del original no literales: el título y las 14 líneas editadas a propósito |
| Lint | `npx eslint src/views/pages/Tech-documentation.vue` | `ESLINT_EXIT:0` |
| Enlaces relativos | bucle `grep` y `test -f` sobre la entrada y las tres partes | 16 enlaces únicos, todos `OK` |
| Restos desfasados | `grep` de «D-21 en curso» y similares | `RESTOS_EXIT:1`, sin coincidencias |
| Estado local | `git status --short` | 10 ficheros `M` y 3 `??`, más `.db_connection` y su copia |
| Prueba en pantalla | `/tech-docs` | Declarado por el usuario: «todo ok» |

### No verificado

- No se ejecutaron build ni pruebas del backend: el cambio es documental y una entrada de navegación.
- La prueba en pantalla consta solo como «todo ok» declarado, sin detalle por vista.
- La localización de las referencias al relevo se apoyó en la búsqueda de código del conector sobre `main` (30 ficheros) y en tus comprobaciones locales; no hubo un `grep` local exhaustivo del repositorio.
- La conservación del texto se verificó con la reconstrucción del script y el filtro de líneas, no con una comparación byte a byte independiente de cada parte.
- La lectura del relevo en las tres partes con el conector no se ha repetido todavía tras el commit.

### Estado al preparar el informe

- Reparto aplicado y verificado con las salidas aportadas; sin bloqueos ni excepciones de verificación.
- Rama `mantenimiento/D-22-DC-37-dividir-estado-del-proyecto`; 15 ficheros en el manifiesto, incluido este informe.

### Continuidad

- Siguiente trabajo: comprobar la fusión de D-22 y retomar F-14, en su propio PR. F-46 y los restos de U-09 y U-11 siguen abiertos.
- Qué leer: la entrada del relevo y sus tres partes en orden, la instrucción persistente y sus cuatro partes, el registro (entrada y partes), `TODO` y este informe.
- No asumir: que este PR esté fusionado, que ningún documento fuera del manifiesto mencione ya el relevo monolítico, ni que el reparto del registro tenga margen: `registro-hallazgos_3de3.md` ronda los 26 KB y su umbral (30 000 bytes) difiere del de la instrucción persistente (20 000).
