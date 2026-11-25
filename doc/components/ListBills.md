# Componente ListBills

Este documento proporciona documentación detallada sobre el componente `ListBills.vue`, encargado de gestionar los recibos periódicos y sus fechas de cargo en la aplicación Timon.

## Descripción General

El componente `ListBills` permite la administración completa de recibos periódicos, que representan pagos regulares con fechas de cargo asociadas. Proporciona funcionalidad para:
- Crear, editar y eliminar recibos
- Gestionar fechas de cargo asociadas a cada recibo
- Buscar texto en cada tabla, mostrar u ocultar inactivos y cambiar el año; las periodicidades se muestran en tablas separadas. Sin inactivos, el botón «Mostrar/Ocultar inactivos» queda deshabilitado (U-10, DC-34); los inactivos se muestran siempre en la tarjeta «Inactivos»
- Visualizar el estado de los recibos y sus fechas de cargo

## Características principales
- Listado de recibos organizados por periodicidad (anual, trimestral, bimestral, mensual)
- Creación y edición de recibos mediante diálogos modales específicos según periodicidad
- Eliminación individual de recibos completos o fechas de cargo específicas
- Visualización expandible de fechas de cargo asociadas a cada recibo trimestral, bimestral o mensual
- Búsqueda de texto por tabla y filtro de actividad; no hay un selector específico del estado de pago
- Selector de año en la barra superior: se muestran los cargos del año elegido (por defecto el actual) y, en el año en curso, los cargos pendientes de años anteriores marcados como «Atrasado» (DC-18)
- Importe propio en cada fecha de cargo, editable desde el lápiz de la fecha (DC-15)
- Ejercicio cerrado (año anterior al actual): no se puede añadir ni editar el recibo, y solo se pueden editar los cargos que siguen pendientes; los botones se ven deshabilitados (DC-20)
- Un cargo pagado solo se puede editar o borrar durante el mes en que vence; después queda cerrado, con el lápiz y la papelera deshabilitados (DC-21)
- Al añadir fechas, generarlas o actualizar la lista se conservan los recibos expandidos; solo el cambio de año los contrae
- «+» está activo si al recibo le falta cualquier fecha del año en curso (incluso una ya pasada, para añadirla a mano); «Generar nuevas fechas» solo si faltan fechas posteriores al último cargo o huecos cuya fecha aún no ha llegado (DC-22)
- Gestión diferenciada según la periodicidad del recibo (anual, trimestral, bimestral, mensual)
- Selección de cuenta bancaria asociada al recibo
- Exportación de datos a formato CSV
- Vocabulario de interfaz (DC-72): pies de diálogo «Cancelar»/«Guardar» y «No»/«Sí», título de confirmación «Confirmar» y avisos con resumen «Éxito», «Aviso» o «Error»
- «Hoy», el año y el mes en curso se calculan en la zona horaria de Ajustes (`useZonaHoraria`, DC-25)
- El flujo global «Actualizar fechas» (`updateAllDates`) se retiró el 2026-10-27 (F-11/F-23/F-32); «Generar nuevas fechas» (`generateDates`) sigue activo (DC-22)

## Datos y Propiedades

### Estados Principales

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `annualBills` | `ref([])` | Lista de recibos anuales recuperados de la base de datos |
| `quarterlyBills` | `ref([])` | Lista de recibos trimestrales recuperados de la base de datos |
| `bimonthlyBills` | `ref([])` | Lista de recibos bimestrales recuperados de la base de datos |
| `monthlyBills` | `ref([])` | Lista de cargos mensuales recuperados de la base de datos, agrupados por recibo en la tabla |
| `expandedRowsMensual` | `ref([])` | Filas expandidas de la tabla de mensuales |
| `selectedYear` | `ref(año actual)` | Año cuyos cargos se muestran; los atrasados solo aparecen si es el año en curso |
| `inactiveBills` | `ref([])` | Lista de recibos inactivos recuperados de la base de datos |
| `billOriginal` | `ref(null)` | Copia del recibo al abrir el diálogo de edición; permite detectar «guardar sin cambios» (DC-30) |
| `bill` | `ref({})` | Objeto que almacena los datos del recibo en edición |
| `categorias` | `ref([])` | Lista de categorías disponibles para asignar a los recibos |
| `cuentas` | `ref([])` | Lista de cuentas bancarias disponibles para asociar a los recibos |
| `modoFechas` | `ref('manual')` | Modo de programación de fechas del recibo en edición: `manual` (el usuario fija cada fecha) o `auto` (se generan desde `fecha_inicial`) |
| `anioReciboGuardado` | `ref(null)` | Año natural del recibo en edición, el de su `fecha_inicial` guardada (la fija `editBill`); `null` en un alta (DC-14) |

### Estados de Diálogos

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `billDialog` | `ref(false)` | Controla la visibilidad del diálogo principal de edición de recibos |
| `billDialogTB` | `ref(false)` | Controla la visibilidad del diálogo del recibo trimestral, bimestral o mensual |
| `billDialogTB_FC` | `ref(false)` | Controla la visibilidad del diálogo de una fecha de cargo (fecha, estado, comentario e importe) de trimestrales, bimestrales y mensuales |
| `deleteBillDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para eliminar recibos |
| `deleteSelectedBillsDialog` | `ref(false)` | Controla la visibilidad del diálogo para eliminar recibos seleccionados |

### Propiedades Principales del Objeto Recibo

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `concepto` | String | Nombre o descripción del recibo |
| `periodicidad` | String | Frecuencia del recibo (mensual, bimestral, trimestral o anual) |
| `importe` | Number | Importe del recibo |
| `categoria` | String | Nombre de categoría enviado por el formulario; el servidor resuelve su ID. No confundir con categoria_id de la tabla recibos |
| `cuenta_id` | Number | ID de la cuenta bancaria asociada al recibo |
| `cargo` | Array | Lista de fechas de cargo asociadas al recibo |
| `fecha_inicial` | Date / String / null | En el formulario puede ser Date; la API devuelve DATE como texto YYYY-MM-DD (DC-05). El payload se normaliza antes de enviar |

## Funciones Principales

### Gestión de Recibos

| Función | Descripción |
|---------|-------------|
| `updateBills(periodicity)` | Actualiza los recibos de la periodicidad especificada |
| `fetchBills(periodicity)` | Carga los cargos de una periodicidad para el año elegido y, en el año en curso, añade los atrasados marcados con `atrasado` |
| `reloadBills()` | Recarga en silencio todas las periodicidades (la usan los botones de año) |
| `changeYear(delta)` / `resetYear()` | Cambian el año mostrado o vuelven al año en curso |
| `puedeEditarCargo(cargo)` | Indica si el lápiz y la papelera de un cargo están activos: siempre si está pendiente; si está pagado, solo durante su mes o con la opción de sesión «Permitir editar/borrar recibos pagados» de Ajustes (DC-21) |
| `puedeAnadirFecha(grupo)` / `puedeGenerarFechas(grupo)` | Activan el «+» (falta cualquier fecha) y «Generar nuevas fechas» (faltan fechas generables); replican `fechasFaltantes` del backend |
| `openNew(periodicity)` | Inicializa un nuevo objeto recibo para la periodicidad indicada, en modo manual y sin fecha inicial (F-18) |
| `guardarRecibo()` | Guarda un recibo nuevo o actualiza uno existente; si no ha cambiado nada y `modoFechas` sigue en manual, avisa «No se ha cambiado nada.» y no envía la petición (DC-30); elegir el modo automático cuenta como cambio (F-45). Antes de enviar comprueba que todas las fechas sean del año del recibo (DC-14) y envía `permitirFueraDeAnio` (DC-29). El servidor guarda el concepto en minúsculas (DC-31) y la pantalla lo capitaliza al mostrarlo |
| `editBill(prod, openFCDialog)` | Carga los datos de un recibo existente para su edición, siempre en modo de fechas manual (F-04); guarda el año de su `fecha_inicial` en `anioReciboGuardado` (DC-14) |
| `confirmDeleteBill(prod)` | Prepara la eliminación de un recibo |
| `deleteBill()` | Elimina un recibo seleccionado |
| `confirmDeleteSelected()` | Prepara la eliminación de recibos seleccionados |
| `deleteSelectedBills()` | Elimina los recibos seleccionados |

### Carga de Datos Relacionados

| Función | Descripción |
|---------|-------------|
| `onMounted` | Carga primero los recibos y después, en bloques `try/catch` separados, las categorías con `CatsService.getCategorias()` y las cuentas con `AccService.getAccounts()`. Si un catálogo falla al cargar, la pantalla sigue funcionando y muestra un aviso (U-18); la lectura de cuentas y categorías está disponible con cualquier sesión válida (DC-49); no existen funciones `fetchCategories` ni `fetchAccounts` |

## Asociación con Cuentas Bancarias

El componente permite asociar cada recibo a una cuenta bancaria específica mediante el campo `cuenta_id`:

1. **Selección de cuenta**: En los formularios de creación y edición de recibos, se muestra un desplegable que permite seleccionar una cuenta de la lista de cuentas disponibles.

2. **Carga de cuentas**: Al montar el componente, `onMounted` obtiene las cuentas con `AccService.getAccounts()`.

3. **Persistencia**: El campo `cuenta_id` se incluye al guardar recibos nuevos o actualizarlos:

```javascript
// Ejemplo simplificado del payload; presupone el modelo validado y normalizado.
// No sustituye las validaciones ni el tratamiento del diálogo de un cargo individual.
await BillService.saveBill({
  ...bill.value,
  cuenta_id: bill.value.cuenta_id,
  modoFechas: modoFechas.value,
  permitirFueraDeAnio: permitirFechasFueraDeAnio.value
});
```

## Modo de programación de fechas

Los diálogos de recibo ofrecen dos modos para las fechas de cargo (`modoFechas`):

- Manual: el usuario fija cada fecha. Es el modo de partida al crear un recibo y siempre al editar uno (DC-11); nunca se deduce de que el recibo tenga `fecha_inicial`.
- Automático: las fechas se generan desde `fecha_inicial` según la periodicidad. Solo se activa si el usuario lo elige. Al editar un recibo existente, el diálogo avisa de que se reescribirán las fechas pendientes; las ya pagadas (estado `cargado`) se conservan.

`guardarRecibo()` envía `modoFechas` al backend; elegir el modo automático cuenta como cambio aunque no se toque ningún otro campo (F-45). El diálogo de una fecha individual (`billDialogTB_FC`) fuerza siempre el modo manual y envía solo esa fecha.

Si en modo automático se ha conservado alguna fecha pagada, el aviso de guardado pasa de «Éxito» a una advertencia que indica cuántas fechas pagadas no se han modificado y cuántas pendientes se han actualizado. Para corregir una fecha pagada hay que editarla en modo manual.

### Estado de un cargo (DC-01)

Cada cargo se marca con un desplegable de tres valores: `Pendiente`, `Cargado` y `Rechazado`. Está en el diálogo del recibo (un control por fecha de cargo) y en el diálogo de una fecha individual; antes era una casilla binaria pagado/pendiente. En las tablas, la columna «Estado» pinta un icono por valor: check verde (`Cargado`), reloj naranja (`Pendiente`) y aspa roja (`Rechazado`). Cambiar solo el estado cuenta como cambio: el diálogo envía la petición y no muestra «Sin cambios» (DC-30). Un rechazado puede volver a `Pendiente` y sigue apareciendo en los atrasados.

## Privacidad del recibo (DC-75, F-49)

Los diálogos que editan el recibo (el anual y el agrupado de trimestrales, bimestrales y mensuales)
muestran, al final de los campos propios y antes de las rejillas de fechas de cargo, dos
interruptores apilados: primero el de **activo** («Recibo activo» / «Recibo inactivo», con el mismo
patrón que en Ahorros) y debajo el de privacidad. Hasta F-49 el de activo estaba en la cabecera de la
columna «Cuenta», que ahora solo lleva su etiqueta, alineada con «Concepto». El diálogo de una sola
fecha de cargo no tiene ninguno de los dos. El `inputId` de privacidad es `es_privado` en el anual y
`es_privado_tb` en el agrupado, para no duplicar `id` en el DOM; el de activo sigue siendo `activo`,
con la misma conversión 1/0 y la misma propagación a las fechas.

- **Quién lo ve:** el propietario del recibo y un administrador; un `user` con un recibo ajeno y un
  `reader` no lo ven ([usePrivacidad](../composables/usePrivacidad.md)). El control no se renderiza:
  no aparece deshabilitado ni oculto.
- **Qué envía:** `es_privado` (0/1) solo cuando el control se ha renderizado; si no, la clave no
  viaja y el servidor conserva el valor. `propietario_id` no se envía nunca.
- **DC-30:** la copia de edición incluye `es_privado`, así que activar solo la privacidad cuenta como
  cambio y se guarda; no avisa de «Sin cambios».
- **Alcance del cambio:** el servidor lo aplica a todos los años del mismo recibo (cadena
  `recibo_origen_id`), también a los que genere después el procedimiento anual. El tooltip de la
  ayuda lo avisa.
- **Indicador:** un `pi-lock` delante del concepto en las cinco tablas de la pantalla (Anuales,
  Trimestrales, Bimestrales, Mensuales e Inactivos). Solo lo ven el propietario y el administrador,
  que son los únicos que reciben registros privados.

## Gestión de Propiedad de Recibos

La propiedad de los recibos se maneja automáticamente a través del sistema de autenticación:

1. **Asignación automática**: El campo `propietario_id` no se maneja explícitamente en el frontend, sino que se asigna automáticamente en el backend basándose en el token JWT del usuario autenticado.

2. **Autorización en servidor**: los endpoints aplican la matriz DC-48. Un `admin` ve y edita todo; `user` ve lo que permiten sus `perm_*` y edita lo visible con escritura; `limited_user` edita solo sus registros y no borra; `reader` solo lee. `es_privado = 1` queda para su propietario y el admin (S-01 y S-12 corregidas el 2026-11-10). El **cambio** de `es_privado` tiene su propia regla (DC-75): solo el propietario del recibo o un administrador, y el servidor no escribe la privacidad de un registro ajeno ni siquiera cuando el valor pedido coincide con el leído.

3. **Propietario intacto**: editar un recibo no reasigna `propietario_id` a quien lo guarda; los dos `UPDATE` de `pushRecibo` conservan el propietario original.

## Eventos y Estados

- **Expansión/contracción**: El componente permite expandir filas individuales o todas las filas para mostrar las fechas de cargo
- **Filtrado**: búsqueda global de texto por tabla y filtro activo. La periodicidad se representa mediante tarjetas separadas
- **Selección**: Permite seleccionar múltiples recibos para operaciones en lote

## Ciclo de vida

En el evento `onMounted`, el componente primero carga la zona horaria de los ajustes (`cargarZonaHoraria`) y fija el año en curso (`anioEnCurso`, DC-25) y después:
1. Carga los recibos de todas las periodicidades
2. Obtiene la lista de categorías disponibles 
3. Carga la lista de cuentas bancarias disponibles
4. Configura el estado inicial de filtros y expansión

## Estructura del Template

El template está estructurado en varias secciones:

1. **Barra superior y selector de año**: no existen pestañas de periodicidad. Las vistas se muestran en tarjetas separadas
2. **Tarjetas**: Anuales, Trimestrales, Bimestrales, Mensuales e Inactivos. Las cuatro primeras tienen un menú de tres puntos; Inactivos muestra 8 filas por página cuando hay más de 8
3. **Tablas de recibos**: Muestran los recibos con sus datos principales, con la opción de expandir para ver las fechas de cargo
4. **Diálogos de edición**: Varios diálogos específicos según la periodicidad y operación (crear, editar, eliminar)
5. **Selectores de cuenta**: En los diálogos de creación/edición para asociar el recibo a una cuenta bancaria

## Validaciones

Antes de enviar, `guardarRecibo()` comprueba concepto, periodicidad, importe (mayor que 0), categoría y cuenta, y muestra un aviso con los campos que faltan. El servidor repite la comprobación y también nombra los que faltan. El propietario no se introduce: lo asigna el servidor a partir del usuario autenticado.

Antes de enviar, `guardarRecibo()` comprueba también que todas las fechas sean del mismo año (DC-14): en un recibo que se edita, el de su `fecha_inicial` guardada (`anioReciboGuardado`); en un alta, el de la primera fecha. Si alguna cae fuera, muestra un aviso con esas fechas y no envía nada. El servidor repite la comprobación, también para el modo automático, cuyas fechas la pantalla no calcula. Con el interruptor de sesión «Permitir declarar fechas fuera del año en curso» (`permitirFechasFueraDeAnio` de [useAjustesSesion](../composables/useAjustesSesion.md), DC-29) la pantalla no avisa y la petición lleva `permitirFueraDeAnio: true`; el servidor solo lo respeta si quien guarda es administrador.

## Selección y borrado (F-30, F-31)

Cada tabla de periodicidad mantiene **su propia** selección: `selectedAnualBills`, `selectedQuarterlyBills`, `selectedBimonthlyBills` y `selectedMonthlyBills`. La de trimestrales usa `selectedQuarterlyBills` desde F-30; antes compartía el estado de bimestrales, de modo que seleccionar en una tabla afectaba a la otra. El botón «Borrar» de la barra reúne las cuatro selecciones.

El diálogo de confirmación muestra el **concepto** del recibo (`bill.concepto`). Hasta F-31 usaba `bill.name`, un campo que no existe en los datos, así que el nombre salía vacío. Lo cubren la guarda estática `backend/test/plantillasRecibos.test.mjs` y el spec `e2e/tests/recibosBorrado.spec.mjs`, que abre el diálogo de un recibo real y cancela sin borrar nada.

U-22 amplía la cobertura del mismo spec: crea un `e2e_anual_…` y un `e2e_mensual_…`, activa la multiselección de las dos tarjetas, comprueba que las selecciones son independientes (`selectedAnualBills` frente a `selectedMonthlyBills`), que cancelar el borrado múltiple no envía ninguna petición y que confirmarlo borra los dos recibos. `e2e/tests/recibosTrimestrales.spec.mjs` crea siempre su `e2e_bimestral_…` de apoyo y filtra las tarjetas por el buscador. El guardado sin cambios y el paso a modo de fechas automático (F-45, DC-30) y la normalización a minúsculas (F-44) se cubren en `e2e/tests/guardadoYNormalizacion.spec.mjs`, que cuenta las peticiones con `page.route`.

## Referencias

- [BillService](../services/BillService.md) - Servicio que gestiona la comunicación con la API de recibos
- [API de Recibos](../routes/recibos.md) - Endpoints del backend para la gestión de recibos
- [Utilidades de Base de Datos](../db/db_utilsBill.md) - Funciones de acceso a datos de recibos
- [Composable useZonaHoraria](../composables/useZonaHoraria.md) - Zona horaria de la aplicación
- [Composable useAjustesSesion](../composables/useAjustesSesion.md) - Opción de sesión para recibos pagados

## Comportamiento auxiliar de la pantalla

- toggleCardMenu construye las opciones Añadir, Actualizar, Multiselección y Exportar; en trimestrales, bimestrales y mensuales añade Expandir y Contraer.
- La plantilla monta un único `<Menu id="config_menu" ref="menuRef">` para las cuatro tarjetas (U-17); antes había uno por tarjeta con el mismo `id` y el mismo `ref`.
- showSelector alterna la columna de selección múltiple. Las tablas trimestral y bimestral mantienen selecciones independientes (F-30).
- agruparPorRecibo agrupa filas por ID y controla la visibilidad de inactivos; groupedInactiveBills se construye aparte.
- copiarExpansion y restaurarExpansion conservan las filas abiertas al recargar; el cambio de año las contrae.
- expandir, contraer, toggleExpandCollapseAll y checkGlobalExpandState controlan la expansión global y por tabla.
- toggleComment, saveComment y hideComment gestionan las ventanas emergentes de comentarios.
- exportCSV admite una periodicidad o all; el botón superior exporta todas a allBills.csv. Usa el importe del cargo si existe, BOM UTF-8, separador punto y coma y coma decimal. Desde F-19 construye el fichero con la utilidad común ([utils/csv](../utils/csv.md)): escape de `;`, comillas y saltos de línea, neutralización de fórmulas y `null`/`undefined` como campo vacío.
- El botón Actualizar fechas y el botón Cargar están comentados en la plantilla.
- El diálogo de borrado muestra `bill.concepto` (F-31).
