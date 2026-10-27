## Informe de cierre de iteración

### Objetivo e IDs
- D-15: sincronizar el relevo, el TODO y el registro con main en 4d73e0692accd7e71c5c1e9e238b2c012f5910c4 (PR #35) e incorporar los PR #33, #34 y #35 al historial.
- Añadir en el apartado 3 de la instrucción persistente la regla sobre commits remotos delegados con contenido erróneo o marcador no sustituido.
- Origen de la regla: el PR #35 necesitó tres commits en la rama mantenimiento/instruccion-persistente. 86b0e71 y 5332cc7 contenían contenido erróneo o incompleto; 0417225 escribió el contenido íntegro (32.911 bytes).
- Exclusiones: sin cambios de código, esquema, API ni datos; no se abre la limpieza de Actualizar fechas.

### Archivos
- Modificados: doc/mantenimiento/estado-del-proyecto.md, doc/mantenimiento/instruccion-persistente.md, doc/mantenimiento/registro-hallazgos.md y TODO.
- Nuevo: doc/mantenimiento/informes_iteraciones/2026-10-27_D-15_actualizacion-relevo-instruccion.md (este informe).
- Excluidos: backend/src/db/.db_connection y backend/src/db/.db_connection.backup.

### Verificación
- Declarado por el usuario con salida pegada: el parche autocontenido pasó node --check y --check, y se aplicó sin errores. Un primer intento con dev/utils/ayudas.mjs falló en --check, antes de escribir, porque editor.reemplazar no existe.
- Recuentos aportados por el usuario tras el parche principal: 2 coincidencias de 4d73e06 en estado-del-proyecto, 1 de «commit remoto delegado» en la instrucción, 4 de D-15 en TODO y 2 en el registro. El diff mostró cuatro archivos documentales modificados.
- Corrección posterior: el PR #35 se había etiquetado D-15 por error. Un segundo parche lo corrige y no se ha incluido salida suya en este informe.
- No verificado: lint, build, pruebas del backend y UI (no aplican, solo documentación).

### Continuidad
- Siguiente trabajo: leer dev/utils/ayudas.mjs, dev/utils/ayudas.test.mjs y dev/utils/README.md y valorar si necesitan actualización o mejora. Después, el PR de limpieza de Actualizar fechas (F-11/F-23/F-32), con DC-14 y F-17 a continuación.
- No asumir: que la limpieza de Actualizar fechas ya está hecha, que F-12 se cierra con ella, ni que ayudas.mjs necesita cambios antes de leerlo.
