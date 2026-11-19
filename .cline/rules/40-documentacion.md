---
paths:
  - "doc/**"
  - "**/*.md"
  - ".cline/**"
---

# Documentación y seguimiento

- Nivel ligero: solo el `doc/` afectado, si lo hay. Nivel completo: además, el registro (decisión o
  hallazgo) y el issue del Project. El relevo solo se toca si cambia una decisión vigente o el mapa
  (DC-69).
- Lo que no se cierre antes de fusionar se registra con su ID e issue en el mismo PR, explicando el
  motivo (DC-66).
- No se crean informes de iteración: el detalle vive en el PR.
- Documento nuevo: añádelo a `doc/index.md` y a `docNavigation` en
  `src/views/pages/Tech-documentation.vue`. Enlaces relativos dentro de `doc/`.
- Distingue diseño pendiente, implementación actual, evidencia observada y límites de la verificación.
- No conviertas propuestas `R-nn` ni hipótesis en decisiones, ni marques un hallazgo como corregido
  por actualizar su documentación.
- Los procedimientos viven como skills en `.cline/skills/` y las reglas solo en `.cline/rules/`;
  cambiarlas es una iteración de proceso con aprobación y decisión registrada.
