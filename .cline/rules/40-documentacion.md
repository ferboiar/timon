---
paths:
  - "doc/**"
  - "**/*.md"
  - ".cline/**"
---

# Documentación y seguimiento

- En el mismo PR: el `doc/` afectado, el registro (decisión o hallazgo) y el issue del Project. El
  relevo se actualiza en su sección 0 (corte) y en las decisiones vigentes (DC-27, DC-64).
- No se crean informes de iteración: el detalle vive en el PR, sus commits y sus comentarios.
- Documento nuevo: añádelo a `doc/index.md` y a `docNavigation` en
  `src/views/pages/Tech-documentation.vue`. Enlaces relativos dentro de `doc/`.
- Distingue diseño pendiente, implementación actual, evidencia observada y límites de la verificación.
- No conviertas propuestas `R-nn`, hipótesis o especificaciones históricas en decisiones aprobadas, ni
  marques un hallazgo como corregido por actualizar su documentación.
- Los procedimientos de trabajo viven como skills en `.cline/skills/`; no se duplican en `doc/`.
- Reglas del proyecto: una sola copia en `.cline/rules/`. Cambiarlas es una iteración de proceso con
  aprobación y decisión registrada.
