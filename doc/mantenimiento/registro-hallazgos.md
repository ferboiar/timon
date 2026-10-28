# Registro de hallazgos y plan de mantenimiento

Línea base de la fase 0 (2026-10-17). Documento vivo: se actualiza en cada iteración, y cada corrección cita su ID en el commit y actualiza `doc/`, `TODO`, el plan de la sección 10 y [estado-del-proyecto.md](./estado-del-proyecto.md) en el mismo PR.

## Propósito y orden de lectura

Este archivo es la entrada del registro. El contenido está dividido por secciones completas en 3 partes (DC-28) para que cada una se pueda leer entera. Léelas todas, completas y en este orden: [parte 1 de 3](./registro-hallazgos_1de3.md) · [parte 2 de 3](./registro-hallazgos_2de3.md) · [parte 3 de 3](./registro-hallazgos_3de3.md). Una referencia a «la sección N» del registro se resuelve con la tabla siguiente.

## Partes

| Parte | Archivo | Secciones | Contenido |
|---|---|---|---|
| 1 de 3 | [registro-hallazgos_1de3.md](./registro-hallazgos_1de3.md) | 0 a 4 | Reanudación operativa, método, decisiones (DC), entorno de referencia y casos de aceptación |
| 2 de 3 | [registro-hallazgos_2de3.md](./registro-hallazgos_2de3.md) | 5 | Hallazgos funcionales (F) |
| 3 de 3 | [registro-hallazgos_3de3.md](./registro-hallazgos_3de3.md) | 6 a 10 | Seguridad y operación (S, O), interfaz y documentación (U, D), hoja de ruta (R), cobertura de la revisión y plan por fases |

## Dónde está cada sección

| Sección | Contenido | Parte |
|---|---|---|
| 0 | Reanudación operativa | [1 de 3](./registro-hallazgos_1de3.md) |
| 1 | Método | [1 de 3](./registro-hallazgos_1de3.md) |
| 2 | Decisiones (DC) | [1 de 3](./registro-hallazgos_1de3.md) |
| 3 | Entorno de referencia | [1 de 3](./registro-hallazgos_1de3.md) |
| 4 | Casos de aceptación (Excel del usuario) | [1 de 3](./registro-hallazgos_1de3.md) |
| 5 | Hallazgos funcionales (F) | [2 de 3](./registro-hallazgos_2de3.md) |
| 6 | Seguridad y operación (S, O) | [3 de 3](./registro-hallazgos_3de3.md) |
| 7 | Interfaz y documentación (U, D) | [3 de 3](./registro-hallazgos_3de3.md) |
| 8 | Hoja de ruta funcional (R) | [3 de 3](./registro-hallazgos_3de3.md) |
| 9 | Cobertura de la revisión | [3 de 3](./registro-hallazgos_3de3.md) |
| 10 | Plan por fases | [3 de 3](./registro-hallazgos_3de3.md) |

Familias de identificadores: DC en la parte 1; F en la parte 2; S, O, U, D y R en la parte 3. Antes de asignar un ID nuevo, comprueba la parte que corresponde a su familia.

## Reglas de mantenimiento

- Cada contenido vive en una sola parte; esta entrada no duplica filas ni decisiones y no se edita como fuente de datos. No existe una copia monolítica.
- Los cambios del registro (decisiones, hallazgos, plan) se hacen en la parte que contiene la sección, en el mismo PR que el código, junto con `doc/`, `TODO` y `estado-del-proyecto.md`.
- Las partes se dividen por secciones completas, sin cortar filas, decisiones ni bloques de código. Los tamaños son orientativos: en las lecturas del conector se ha observado truncamiento hacia los 40 000 caracteres. Si una parte se acerca a los 30 000, se propone un nuevo reparto como tarea aparte y aprobada.
- Un cambio de reparto (partes nuevas o movidas) exige actualizar esta tabla, las referencias, `doc/index.md`, `docNavigation` en `Tech-documentation.vue`, el relevo y la instrucción persistente.
- Las referencias a secciones numeradas se mantienen válidas gracias a la tabla de arriba.
