## Informe de cierre de iteración

### Objetivo e IDs

D-21: contraste documental solicitado por el usuario sobre los cambios de los últimos cinco días. Se amplió la ventana al 28 de octubre completo hasta el PR #50 para no excluir cambios del día inicial.

Base revisada: main en 65593df61997ff71d4d2e9ec3d51678d965d3d4c. Rama local: mantenimiento/D-21-contraste-documental-cinco-dias.

Se corrigen discrepancias confirmadas entre implementación, documentación técnica y seguimiento. No se modifican código, datos, migraciones ni decisiones funcionales; tampoco se sustituyen resultados históricos por resultados posteriores.

La revisión no certifica ausencia de defectos ni alineación integral de cada línea de todo el repositorio.

### Archivos

Modificados:
- README.md y README_en.md.
- TODO.
- doc/components/Advances.md y ListBills.md.
- doc/db/db_utilsAdv.md, db_utilsBill.md y db_utilsCats.md.
- doc/index.md.
- doc/mantenimiento/estado-del-proyecto.md.
- doc/mantenimiento/registro-hallazgos_1de3.md, _2de3.md y _3de3.md.
- doc/routes/recibos.md.
- doc/mantenimiento/informes_iteraciones/index.md.

Nuevos:
- doc/mantenimiento/informes_iteraciones/2026-10-29_D-17_DC-33_division-instruccion.md: informe retroactivo del PR #42.
- doc/mantenimiento/informes_iteraciones/2026-11-02_D-21_contraste-documental.md: este informe.

Diecisiete archivos en el manifiesto. Se excluyen .db_connection y su copia.

Matriz de cambios y fuentes contrastadas:

| Commit / PR | Contraste realizado | Resultado o límite |
|---|---|---|
| bd05e4f, axioma | Diff de la instrucción y partes vigentes | El axioma está presente; no se cambian reglas |
| 8dc089d / #38 | Inventario de reparto del registro y referencias vigentes | Entrada y tres partes identificadas; no se repitió conservación byte a byte |
| 632023f / #39 | Diff de validación anual, ruta, pantalla y docs de Recibos/Ajustes | DC-29 documentada; D-21 precisa payload, propietario y validaciones |
| 76b08b4 / #40 | Diff de return y retirada de saldoRestante; Advances y registro | Se corrige la fila F-17 que aún decía pendiente de fusión |
| c5151fa / #41 | Diff completo de Ahorros/Categorías, rutas, pruebas y documentos | D-21 precisa unicidad, validación de IDs y estados posteriores |
| 9859342 / #42 | Inventario del reparto de instrucciones, partes y referencias vigentes | Faltaba informe; se añade retroactivo sin inventar ejecución original |
| 1e52113 / #43 | Diff completo de DC-30, normalización, inactivos y tooltips | U-09/U-11 son parciales; se corrigen generalizaciones y exclusión de Cuentas |
| 5aa57e8 / #44 | Diff del cierre de revisión del ayudante | Cierre documental; no modifica el ayudante |
| 2e5ffb5 / #45 | Inventario de informes retroactivos y seguimiento vigente | Los informes son históricos; no se reescriben sus verificaciones |
| 46c4173 / #46 | Cambio de secuencia anclada, prueba y fila técnica de la función | Se distingue F-12 de Recibos del F-46 abierto en Anticipos |
| c4c7271 / #47 | Condición de guardar sin cambios, ListBills y seguimiento | El modo automático cuenta como cambio; U-09 global sigue parcial |
| 49c383d / #48 | Diff completo del pool, pruebas y contratos de fechas | DATE como texto; se completan excepciones de pruebas en README |
| dc37f7e / #49 | Documentos publicados, índice de informes y navegación examinada | No se atribuye a D-20 una auditoría integral |
| 4a77a9a / #50 | Cambio entregado, documentación, inventario publicado y evidencia del usuario | U-13 incorporado; ejecución real nueva y bloqueo concurrente no ejercitados |

Matriz de documentos corregidos:

| Archivo | Fuente contrastada | Resultado |
|---|---|---|
| README.md | Descripción de Anticipos, exportación y pruebas existentes | No prometer informes estructurados; distinguir suite y unitarios |
| README_en.md | Mismo contrato funcional y de pruebas | Correcciones equivalentes en inglés |
| TODO | Registro, commits fusionados y evidencia de pruebas | Parciales abiertos, U-13 incorporado y base actual |
| components/Advances.md | Calendario de Anticipos y F-46 | Añadir desbordamiento pendiente sin atribuirle F-12 |
| components/ListBills.md | Modelo y payload de guardarRecibo | categoria por nombre, fecha de formulario/API y ejemplo Composition API |
| db/db_utilsAdv.md | Algoritmo setMonth y registro | Explicar F-46 abierto |
| db/db_utilsBill.md | Consultas y escritura de Recibos | No prometer privacidad ni validación exhaustiva |
| db/db_utilsCats.md | Módulo de Categorías completo y DC-02 | Rechazo de duplicados no es índice único; Number no es validación |
| doc/index.md | Vistas implementadas y registro | Acotar DC-30 y DC-31 |
| estado-del-proyecto.md | PR #50 y trabajo local D-21 | Base y siguiente paso actualizados sin afirmar fusión propia |
| registro parte 1 | Decisiones y código de Accounts | Precisar activa sin cambiar la exclusión funcional de DC-34 |
| registro parte 2 | Cierres y tratamiento de errores | F-08, F-17 y F-28 alineados |
| registro parte 3 | Casillas, plan y evidencia posterior | Parciales, suite histórica/actual y fila D-21 dentro de la tabla |
| routes/recibos.md | Ruta y pushRecibo | Presencia de cuenta y asignación de propietario no garantizan permisos |

También se leyeron documentos técnicos relacionados de componentes, servicios, rutas, conexión, entorno e instrucciones durante el contraste. No se modificaron solo para aumentar el manifiesto. El índice existente permite acceder a los dos informes nuevos sin cambiar docNavigation.

### Verificación

Resultados aportados por el usuario en su contenedor:
- Parche principal: plan de 10 ficheros validado y aplicado, copia previa y DOCUMENTACION_EXIT:0.
- Complemento de Categorías: 1 fichero, 2 anclas, aplicado y DOCUMENTACION_EXIT:0.
- Complemento de Recibos: 3 ficheros, 8 anclas, aplicado y DOCUMENTACION_EXIT:0.
- Diff acumulado de los 14 documentos recibido y revisado; DIFF_CHECK_EXIT:0; sin archivos preparados.
- Corrección de F-28 y tabla D-21: 2 ficheros, aplicada y DOCUMENTACION_EXIT:0; filas resultantes aportadas.
- Informe retroactivo de #42 e índice: plan validado y aplicado, DOCUMENTACION_EXIT:0; estado local aportado.

No se ejecutaron tests, lint ni build nuevos para D-21: los cambios son documentales. Las 85 pruebas y los seis casos manuales citados pertenecen a U-13, no son pruebas ejecutadas en esta auditoría.

Límites:
- Parte de los commits de organización documental se contrastó mediante inventario y referencias vigentes, no con reconstrucción byte a byte.
- No se hizo una auditoría funcional integral ni una inspección exhaustiva de código ajeno a los cambios examinados.
- El informe retroactivo de #42 declara que no se dispone aquí de sus salidas locales originales.
- Siguen abiertos los defectos y alcances parciales que constan en TODO; corregir su documentación no los resuelve.

### Continuidad

Tras comprobar la fusión de D-21, retomar F-14 en su propio PR. F-46 y los restos de U-09/U-11 siguen pendientes.

No asumir que D-21 esté fusionado, que el repositorio esté libre de discrepancias fuera del alcance contrastado ni que S-01, F-22/DC-02 o F-46 estén corregidos.
