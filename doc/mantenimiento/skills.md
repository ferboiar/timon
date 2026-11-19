# Skills de Cline en Timón

Procedimientos que Cline carga solo cuando se usan: los metadatos siempre y el cuerpo al activarse
(DC-64). El texto vigente de cada uno está en su `SKILL.md`; este fichero no lo copia.

| Skill | Cuándo se usa | Qué produce |
|---|---|---|
| `cierre-iteracion` | Al cerrar la iteración, publicar o fusionar un PR | Commit, push y PR con sus tres secciones y, si se autoriza, la fusión; en nivel ligero, el PR de tres líneas |
| `limpieza-ramas` | Al borrar o comprobar ramas | Ramas nombradas borradas en local y remoto; el motivo de las que sobrevivan queda en su PR |
| `auditoria-documental` | Al pedir una auditoría o revisión exhaustiva | Inventario con evidencia real y hallazgos clasificados |
| `migraciones-bd` | Al diseñar, probar o aplicar una migración | SQL con guardas, pruebas de transición y despliegue en `conta_hogar` solo con autorización expresa |

Los umbrales de tamaño son los de DC-65: un procedimiento nuevo se crea como skill y no engordando
las reglas.
