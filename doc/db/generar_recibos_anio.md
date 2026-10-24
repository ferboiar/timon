# Procedimiento `generar_recibos_anio` y evento

## Descripción General

`generar_recibos_anio(simular, forzar, ahora)` crea los recibos del año siguiente y pone al día los que falten. Solo inserta: nunca modifica ni borra. Lo lanza cada hora el evento `generar_recibos_anio_evento`, y el procedimiento solo actúa a las 03:00 de la zona horaria configurada. También se puede ejecutar a mano (DC-17, DC-24, DC-25).

## Parámetros

| Parámetro | Descripción |
|-----------|-------------|
| `simular` | 1 devuelve lo que crearía, sin escribir nada |
| `forzar` | 1 ignora el interruptor `crear_recibos_automaticamente` y la restricción de las 03:00 (ejecución manual) |
| `ahora` | Instante de referencia en UTC; `NULL` usa el actual (existe para poder probarlo) |

## Zona horaria

Las horas se guardan en UTC. El ajuste `zona_horaria` de `ajustes_sistema` (por defecto `Europe/Madrid`) indica la zona en la que se calculan «hoy», el año y la hora de ejecución, con el cambio de hora de verano incluido. Si el nombre no es válido, se usa UTC.

## Reglas

- **Candidatos:** el último recibo de cada serie (sin sucesor), con `replicar = 1`, cuyo año (el de su fecha inicial) es anterior al límite. El límite es el año en curso, o el siguiente desde el 1 de diciembre.
- **Puesta al día:** si faltan varios años, se crean uno tras otro sin pasar del límite.
- **Contenido:** copia concepto, categoría, cuenta, propietario, periodicidad y privacidad. El importe es el del último cargo pagado, o el del recibo si no hay ninguno. `recibo_origen_id` apunta al origen.
- **Cadencia:** los meses salen de la secuencia anclada en la fecha inicial del origen; el día del mes es el del último cargo pagado (si no hay ninguno, el de la fecha inicial), ajustado al último día del mes cuando no existe. La fecha inicial del recibo nuevo es la primera de las fechas del año nuevo, con lo que la cadencia se conserva año tras año.
- **Estado:** los cargos nacen pendientes y con el mismo `activo` que el último cargo del origen.
- **Seguridad:** un recibo tiene como mucho un sucesor (restricción única), un bloqueo (`GET_LOCK`) evita ejecuciones simultáneas y cada serie va en su propia transacción.
- **Rastro:** solo se registra una ejecución real, no simulada, si crea recibos, cuenta errores o se ejecuta con forzar=1.

## Vista previa

Con `simular = 1` devuelve una fila por recibo y año a crear: `origen_id`, `concepto`, `anio_nuevo`, `fechas`, `primera`, `ultima` y `aviso`. El aviso indica que el mes del último pago no encaja con la cadencia de la fecha inicial.

## Interruptor

La clave `crear_recibos_automaticamente` de `ajustes_sistema` (1 por defecto) activa o desactiva el evento. Desactivado, el evento no hace nada hasta que se vuelva a activar; la ejecución manual sigue funcionando.

## Referencias

- [Utilidades de Base de Datos para Recibos](db_utilsBill.md)

## Resultados sin generación

También puede devolver una sola fila con aviso, sin las columnas ordinarias: automatización desactivada, fuera de la hora o bloqueo ocupado. Las dos primeras condiciones se omiten con forzar=1; el bloqueo no. No debe interpretarse cualquier fila como un recibo creado.
