# Estado del proyecto Timón

Este archivo es la entrada del relevo del proyecto Timón: léelo primero si retomas el proyecto o abres una conversación nueva. Se actualiza en cada PR (DC-27, DC-37).

## Propósito y orden de lectura

El contenido del relevo está dividido por secciones completas en 3 partes (DC-37, D-22) para que cada una se pueda leer entera con el conector. Léelas todas, completas y en este orden: [parte 1 de 3](./estado-del-proyecto_1de3.md) · [parte 2 de 3](./estado-del-proyecto_2de3.md) · [parte 3 de 3](./estado-del-proyecto_3de3.md). La fecha de la última actualización y el punto exacto de reanudación están al principio de la parte 1. Una referencia a «la sección N» del relevo se resuelve con la tabla «Dónde está cada sección».

## Partes

| Parte | Archivo | Secciones | Contenido |
|---|---|---|---|
| 1 de 3 | [estado-del-proyecto_1de3.md](./estado-del-proyecto_1de3.md) | 0 a 3 | Punto exacto de reanudación, qué es y cómo está montado, cómo se trabaja y cómo funciona hoy |
| 2 de 3 | [estado-del-proyecto_2de3.md](./estado-del-proyecto_2de3.md) | 4 a 7 | Historial de PR, siguiente paso operativo, mapa de `doc/` y cómo retomar en una conversación nueva |
| 3 de 3 | [estado-del-proyecto_3de3.md](./estado-del-proyecto_3de3.md) | 8 y cierres históricos | Relevo histórico de la limpieza (2026-10-27) y cierres de auditoría documental (2026-10-23, 2026-10-24 y D-13) |

## Dónde está cada sección

| Sección | Contenido | Parte |
|---|---|---|
| 0 | Punto exacto de reanudación | [1 de 3](./estado-del-proyecto_1de3.md) |
| 1 | Qué es y cómo está montado | [1 de 3](./estado-del-proyecto_1de3.md) |
| 2 | Cómo se trabaja | [1 de 3](./estado-del-proyecto_1de3.md) |
| 3 | Cómo funciona hoy | [1 de 3](./estado-del-proyecto_1de3.md) |
| 4 | Historial de PR | [2 de 3](./estado-del-proyecto_2de3.md) |
| 5 | Siguiente paso operativo | [2 de 3](./estado-del-proyecto_2de3.md) |
| 6 | Mapa de `doc/` | [2 de 3](./estado-del-proyecto_2de3.md) |
| 7 | Retomar en una conversación nueva | [2 de 3](./estado-del-proyecto_2de3.md) |
| 8 | Relevo histórico de la limpieza (2026-10-27) | [3 de 3](./estado-del-proyecto_3de3.md) |
| Cierres | Cierre de auditoría y fallos pendientes (2026-10-23), verificación del estado fusionado (2026-10-24) y alcance corregido de revisión D-13, sin numerar | [3 de 3](./estado-del-proyecto_3de3.md) |

## Reglas de mantenimiento

- Cada contenido vive en una sola parte; esta entrada no duplica estado, decisiones ni reglas y no se edita como fuente de datos. No existe una copia monolítica.
- Cada PR actualiza el relevo en la parte que contiene la sección afectada (DC-27): como mínimo el punto de reanudación (sección 0, parte 1) y, si procede, los identificadores libres (sección 2, parte 1), el historial de PR (sección 4, parte 2) y el siguiente paso (sección 5, parte 2).
- Las partes se dividen por secciones completas, sin cortar frases, filas, tablas ni bloques de código, y los números de sección no cambian. Los tamaños son orientativos: el relevo monolítico de 29 504 bytes llegó truncado con el conector, que cortó la lectura en la sección «Verificación del estado fusionado, 2026-10-24». Si una parte se acerca a los 20 000 bytes, se propone un nuevo reparto como tarea aparte y aprobada.
- Un cambio de reparto (partes nuevas o movidas) exige actualizar esta tabla, las referencias, `doc/index.md`, `docNavigation` en `Tech-documentation.vue`, el registro y la instrucción persistente si lo menciona (DC-37).
