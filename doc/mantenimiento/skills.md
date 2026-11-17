# Skills de Cline en Timón

Última actualización: 2026-11-17. Enumera los procedimientos de trabajo que Cline carga bajo
demanda. No los sustituye ni los copia: el texto vigente de cada uno vive en su `SKILL.md`.

Una skill es una carpeta con un fichero `SKILL.md` y un frontmatter con `name` (igual al nombre de la
carpeta) y `description`. Cline carga siempre los metadatos y el cuerpo solo cuando la skill se
activa, porque la petición encaja con su descripción o porque se invoca con `/<nombre>`. Es la
diferencia con las reglas de `.cline/rules/`, que se cargan siempre o por `paths` (DC-64).

| Skill | Fichero | Qué hace | Invocación |
|---|---|---|---|
| `cierre-iteracion` | `.cline/skills/cierre-iteracion/SKILL.md` | Prepara el cierre: comprobaciones previas, manifiesto e índice, commit y publicación; PR con `Qué hace`, `Verificado` y `Pendiente`; fusión solo si está autorizada. | `/cierre-iteracion` o automática al pedir cerrar o publicar |
| `limpieza-ramas` | `.cline/skills/limpieza-ramas/SKILL.md` | Comprueba que una rama está fusionada e integrada en `main` y la borra en local y en remoto, solo si el prompt la nombra. | `/limpieza-ramas` o automática al pedir limpiar ramas |
| `auditoria-documental` | `.cline/skills/auditoria-documental/SKILL.md` | Ejecuta una auditoría con alcance declarado, inventario por archivo y evidencia real, distinguiendo implementación, diseño pendiente e histórico. | `/auditoria-documental` o automática al pedir una auditoría |

## Límites

- El documento resume; **no** reproduce el cuerpo de las skills. Cambiar un procedimiento es cambiar
  su `SKILL.md`, no este fichero.
- Las rutas de `.cline/skills/` no se publican en el visor de documentación, que solo carga
  `doc/**/*.md`; por eso se citan como rutas y no como enlaces.
- Los umbrales de tamaño de reglas y skills son los de DC-65: un procedimiento nuevo se crea como
  skill y no engordando las reglas.
