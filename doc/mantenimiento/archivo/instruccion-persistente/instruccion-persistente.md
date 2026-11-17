# Instrucción persistente de funcionamiento: entrada

Este archivo es la entrada de la instrucción persistente del proyecto Timón. No contiene reglas: las reglas completas viven en las cuatro partes, que se leen enteras y en este orden: [parte 1 de 4](./instruccion-persistente_1de4.md) · [parte 2 de 4](./instruccion-persistente_2de4.md) · [parte 3 de 4](./instruccion-persistente_3de4.md) · [parte 4 de 4](./instruccion-persistente_4de4.md).

## Propósito y orden de lectura

La instrucción persistente fija cómo trabaja el asistente en el mantenimiento y desarrollo de ferboiar/timon. Se divide por apartados completos en 4 partes (DC-33) para que cada una pueda leerse entera con el conector. Una referencia a «el apartado N» se resuelve con la tabla siguiente. El texto completo es la concatenación de las cuatro partes en orden.

## Partes

| Parte | Archivo | Apartados | Contenido |
|---|---|---|---|
| 1 de 4 | [instruccion-persistente_1de4.md](./instruccion-persistente_1de4.md) | Función y alcance, axioma, 1 y 2 | Función, axioma, contexto y fuentes, acceso y lectura completa |
| 2 de 4 | [instruccion-persistente_2de4.md](./instruccion-persistente_2de4.md) | 3 y 4 | Iteraciones y modalidad de ejecución (fases A, A.n y B), ramas y estado local |
| 3 de 4 | [instruccion-persistente_3de4.md](./instruccion-persistente_3de4.md) | 5 a 8 | Objetivo, alcance y prioridades; entrega y utilidades reutilizables; documentación y seguimiento; auditorías |
| 4 de 4 | [instruccion-persistente_4de4.md](./instruccion-persistente_4de4.md) | 9 a 14 | Identificadores, informe y PR; pruebas y seguridad; reanudación; persistencia y adopción; respuestas y etiquetas; condiciones de avance |

## Reglas de mantenimiento

- Cada regla vive en una sola parte; esta entrada no duplica reglas y no se edita como fuente de reglas. No existe una copia monolítica.
- Cambiar las reglas es una iteración de proceso con aprobación y decisión registrada (apartado 12, parte 4 de 4). Este reparto no cambia ninguna regla.
- Las partes se dividen por apartados completos, sin cortar frases, filas ni bloques de código. Los tamaños son orientativos: el conector truncó la instrucción completa (33 416 bytes) hacia el apartado 11. Si una parte se acerca a los 20 000 bytes, se propone un nuevo reparto como tarea aparte y aprobada.
- Un cambio de reparto exige actualizar esta tabla, las referencias, `doc/index.md`, `docNavigation` en `Tech-documentation.vue`, el relevo y el registro (DC-33).
