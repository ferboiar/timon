## Informe de cierre de iteración

> Informe creado en D-32: el PR #73 se fusionó sin el suyo (defecto detectado en la auditoría posterior).

### Objetivo e IDs

- **D-31**: informes de cierre retroactivos de los PR #70 (DC-46, entorno de pruebas cifrado) y #71 (arreglo de los permisos 600), que se fusionaron sin informe propio, con sus filas en el índice.
- Sin cambios de código, esquema ni decisiones.

### Archivos

- `doc/mantenimiento/informes_iteraciones/2026-11-09_DC-46_entorno-pruebas-cifrado.md` (nuevo en el PR #73).
- `doc/mantenimiento/informes_iteraciones/2026-11-09_DC-46_permisos-600.md` (nuevo en el PR #73).
- `doc/mantenimiento/informes_iteraciones/index.md` (dos filas).
- `doc/mantenimiento/informes_iteraciones/2026-11-09_D-31_informes-retroactivos.md` (**nuevo, este informe**).

### Verificación

| Comprobación | Comando | Resultado |
|---|---|---|
| Los dos informes existen y tienen las secciones del formato completo | `grep -c '^### '` | 8 secciones en cada uno |
| Filas en el índice | `grep -c '2026-11-09'` | 3 filas del 2026-11-09 tras el PR #73 (S-16, DC-46 y su arreglo) |
| Sin cambios de código | `git show --stat ff17256` | 3 ficheros, todos de `doc/` |

### Continuidad

- Siguiente trabajo: F-30/F-31 (PR #74).
- Qué no asumir: que el registro tuviera la fila de D-31; **no la tenía** y se añade en D-32.
