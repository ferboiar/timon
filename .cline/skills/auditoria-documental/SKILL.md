---
name: auditoria-documental
description: Ejecuta una auditoría de documentación o de código de Timón con inventario y evidencia. Úsala cuando se pida una auditoría, una revisión exhaustiva o comprobar que la documentación coincide con la implementación.
---

# Auditoría

## 1. Alcance antes de empezar
- Declara qué se audita (documentación, módulo, seguridad) y qué queda fuera.
- Si falta alcance para llamarla «completa», dilo antes de usarla.

## 2. Inventario
- Una fila por archivo: fuente contrastada, resultado y limitación.
- Incluye `doc/`, la raíz, `.cline/`, los README de pruebas y la documentación publicada desde
  componentes; justifica las exclusiones.
- No apruebes por muestras ni por enlaces, hashes o nombres: exige corrección funcional comprobada.

## 3. Evidencia
- Comandos y salidas reales, con su código de salida.
- Distingue implementación, diseño pendiente, histórico, ejemplo y propuesta no aprobada.

## 4. Cierre
- Los hallazgos viables se corrigen en el mismo PR (DC-58); el resto se registra con ID nuevo.
- No prometas ausencia absoluta de defectos: las garantías se limitan a lo observado.
