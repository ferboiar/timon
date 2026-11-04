## Informe de cierre de iteración

### Objetivo e IDs

- D-23 y DC-42: cerrar el resto del paso c de DC-38 —modo automático o manual del plan por anticipo y vista previa— como no aplicable, y cerrar F-14.
- Motivo: Anticipos funciona como una bolsa de dinero que se adelanta y se recupera poco a poco; sin periodicidad ya permite añadir pagos pendientes manualmente, y con periodicidad y pago sugerido conserva el plan automático. Un selector de modo añadiría complejidad sin aportar valor para el uso real.
- Exclusiones: cualquier cambio de código, esquema, migraciones, pruebas o comportamiento; F-39, F-40, permisos y DC-01/DC-02.

### Archivos

- TODO
- doc/mantenimiento/registro-hallazgos_1de3.md
- doc/mantenimiento/registro-hallazgos_2de3.md
- doc/mantenimiento/registro-hallazgos_3de3.md
- doc/mantenimiento/estado-del-proyecto_1de3.md
- doc/mantenimiento/estado-del-proyecto_2de3.md
- doc/mantenimiento/estado-del-proyecto_3de3.md
- doc/mantenimiento/informes_iteraciones/index.md
- doc/mantenimiento/informes_iteraciones/2026-11-04_D-23_DC-42_cierre-paso-c-anticipos.md

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Validación previa del parche | `node /tmp/d23-documentacion.mjs --check` | Plan válido: 8 ficheros; sin escrituras. |
| Aplicación del parche | `node /tmp/d23-documentacion.mjs --apply`, `git --no-pager diff --stat` y `git diff --check` | Cambios aplicados en 8 ficheros; copia `/tmp/timon-ayudas-backup-uIV6Ft`; `DIFFCHECK:0`. |

### Continuidad

- Siguiente trabajo: ninguno acordado; F-14 queda cerrado y el resto del paso c de DC-38 es no aplicable por DC-42.
- Qué no asumir: que este PR esté fusionado; que Anticipos tenga un selector de modo o vista previa; ni que el plan automático haya cambiado.
