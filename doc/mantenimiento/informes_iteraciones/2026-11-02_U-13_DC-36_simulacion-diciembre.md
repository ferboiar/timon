## Informe de cierre de iteración

### Objetivo y alcance

- U-13 y DC-36: explicar la generación anual de recibos y ofrecer «Vista previa de hoy» y «Simular el próximo 1 de diciembre», sin selector ni fecha libre.
- El servidor calcula la fecha en la zona de Ajustes: antes del 1 de diciembre usa este año, ese día usa hoy y después el del año siguiente.
- La simulación proyecta los datos actuales, no crea recibos y nunca habilita «Generar ahora».
- La ejecución manual permanece independiente del interruptor automático. Los avisos generales se separan de los recibos y no cuentan como altas.
- Exclusiones: procedimiento SQL, migraciones, F-14, F-46 y auditoría integral del repositorio.

### Base

- Rama: `correccion/fase-1-U13-generar-recibos-anio`.
- Base local confirmada: `8142c2c3dc904efcd5e2e6f4e5000291c608b877`, merge del PR #49 (D-20).
- PR anterior: #49, fusionado y comprobado.
- Cambios locales excluidos: `backend/src/db/.db_connection` y `backend/src/db/.db_connection.backup`.

### Cambios

- Backend: `generarRecibosAnio` admite una referencia interna de diciembre solo en simulación y la convierte de mediodía en la zona de Ajustes a UTC.
- Utilidad nueva `generacionAnual.mjs`: cálculo de opciones y separación de recibos y avisos.
- Ruta de Ajustes: valida opciones, rechaza fechas libres y devuelve `simulacion`, `fecha_simulada`, `filas` y `avisos`.
- Servicio cliente: incorpora `proximoDiciembre`.
- Pantalla: dos consultas diferenciadas, textos explicativos, identificación de la simulación e invalidación de resultados anteriores. La ejecución real vuelve a calcular los candidatos.
- Pruebas: cuatro tests unitarios nuevos en `generacionAnual.test.mjs`.
- Documentación técnica y seguimiento actualizados en el mismo PR. Informe nuevo y enlace en el índice de informes.
- Sin cambios de esquema, migraciones ni procedimiento SQL.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo |
|---|---|---|---|
| doc/components/ProfileSettings.md | Contenido local del adjunto | Sí | Acciones, estados y control de ejecución |
| doc/services/AjustesService.md | Contenido local del adjunto | Sí | Llamadas y respuesta |
| doc/routes/ajustes.md | Contenido local del adjunto | Sí | Opciones, errores 400 y separación de avisos |
| doc/db/db_utilsBill.md | Contenido local del adjunto | Sí | Firma y referencia interna del procedimiento |
| doc/db/generar_recibos_anio.md | Contenido local del adjunto | Sí | Uso de ahora y simulación sin escrituras |
| doc/utils/tiempo.md | Contenido local del adjunto | Sí | Identificación de la utilidad independiente generacionAnual |
| backend/test/README.md | Contenido local del adjunto | Sí | Pruebas unitarias y sus límites |
| package.json.md | Contenido local del adjunto | Sí | Prueba independiente sin MariaDB |
| doc/index.md | Diff local | Sí | Dos consultas del proceso anual |
| Registro, partes 1 y 3 | Diffs y anclas de seguimiento | Sí | DC-36, U-13 y base tras D-20 |
| TODO | Diff y anclas de seguimiento | Sí | U-13 probado, D-20 incorporado y entorno de tests |
| estado-del-proyecto.md | Contenido local del adjunto | Sí | Cabecera, historial, estado activo y relevo histórico |
| informes_iteraciones/index.md | Índice incorporado por D-20 | Sí | Enlace a este informe |
| Instrucción persistente y sus cuatro partes | Leídas desde el repositorio en esta conversación | No | Se aplican sin cambiar sus reglas |
| README.md, README_en.md y .github/copilot-instructions.md | Sin nuevo contraste completo acreditado para U-13 | No | No se declara revisión completa |
| Tech-documentation.vue | Sin cambios en U-13 | No | Los documentos ya existen; el informe es accesible desde su índice |

La revisión no equivale a una auditoría completa de todo `doc/` ni del repositorio.

### Verificación

| Comprobación | Entorno | Resultado real |
|---|---|---|
| Parche principal | Contenedor del usuario | Plan de 19 ficheros validado y aplicado; copia previa creada |
| Pruebas unitarias nuevas | Contenedor del usuario | 4 pasadas, 0 fallos |
| Suite completa | mariadb01:3306, timon_test, conta_hogar_test | EXIT:0; 85 pruebas pasadas, 0 fallos, canceladas u omitidas |
| ESLint después de formato | Utilidad, tests nuevos, ruta, servicio y ProfileSettings | Sin avisos; bloque VERIFICACION_EXIT:0 |
| Avisos antiguos | db_utils.mjs | 5 avisos de prettier en líneas ajenas al cambio, registrados antes de la corrección de formato |
| Pantalla | Declaración del usuario y log | Seis casos correctos: botones y textos, hoy vacío, diciembre con candidatos, repetición sin altas, retorno a hoy e independencia del interruptor |
| Consultas reales de simulación | Log del backend | Hoy: 0 recibos y 0 avisos; 01/12/2026: 15 recibos y 0 avisos, repetible |
| Consolidación documental | Contenedor del usuario | 12 ficheros validados y aplicados; inicialmente dos avisos de línea vacía final |
| Normalización final | Contenedor del usuario | Los dos finales normalizados; DIFF_CHECK_EXIT:0 |

### No verificado

- No se ejercitó la generación real desde la pantalla nueva, porque la vista previa de hoy no tenía candidatos.
- No se reprodujo el bloqueo concurrente de MariaDB. La separación de avisos sí tiene prueba unitaria.
- No se ejecutó build ni una batería automatizada de interfaz.
- La proyección usa datos actuales; no predice cambios futuros de pagos, importes o recibos.
- No se acredita un contraste completo de README, Copilot y toda la documentación ajena al alcance.
- F-14 y F-46 siguen abiertos.

### Estado al preparar el informe

- Implementación y documentación aplicadas; pruebas unitarias, suite completa y simulación manual confirmadas.
- Comprobación de espacios correcta después de normalizar los dos finales de archivo.
- Rama de U-13; pendiente de commit, publicación, revisión y fusión.
- Manifiesto de 21 ficheros, incluidos este informe y el índice modificado.

### Continuidad

- Siguiente trabajo acordado: F-14, después de comprobar la fusión de este PR.
- Leer el relevo, TODO, registro con sus partes, este informe y el índice de informes.
- No asumir que U-13 está fusionado, que se ejercitó la generación real o el bloqueo concurrente ni que F-46 esté corregido.
