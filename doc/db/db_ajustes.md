# Ajustes del sistema (`db_ajustes`)

## Descripción General

Funciones de acceso a la tabla `ajustes_sistema` (clave y valor). Contiene la zona horaria de la aplicación y el interruptor de la creación automática de recibos (DC-24, DC-25).

## Zona horaria

Las horas se guardan siempre en UTC (las conexiones del pool trabajan en UTC). La clave `zona_horaria` (por defecto `Europe/Madrid`) indica la zona en la que se calculan «hoy», el mes y el año en curso, y en la que se mostrarán las horas. El cambio de hora de verano lo resuelve el nombre de la zona, sin tocar nada dos veces al año.

## Funciones

| Función | Descripción |
|---------|-------------|
| `getZonaHoraria()` | Zona horaria de los ajustes; si falta o no es válida, `Europe/Madrid`. Se guarda en memoria 60 s |
| `setZonaHoraria(zona)` | Valida el nombre (JavaScript y MariaDB) y lo guarda. Error con `status` 400 si no es válido |
| `hoyEnZona(ahora)` | Fecha de hoy en esa zona, como `Date` con los campos locales de la zona |
| `getCrearRecibosAutomaticamente()` / `setCrearRecibosAutomaticamente(activo)` | Interruptor del evento anual; persiste hasta que se cambie |
| `reiniciarCacheAjustes()` | Vacía la memoria de la zona (pruebas) |
| `getAjuste(clave)` / `guardarAjuste(clave, valor)` | Leen y escriben una clave de `ajustes_sistema` (el valor se guarda como texto; `getAjuste` devuelve `null` si falta). Los usan las funciones anteriores |
| `ErrorDeAjuste` | Error con `status` HTTP, que las rutas de ajustes devuelven tal cual |

Las utilidades puras (`esZonaValida`, `hoyEnZonaDe`, `hoyIsoEnZonaDe`) están en `backend/src/utils/tiempo.mjs` ([tiempo](../utils/tiempo.md)).

## Errores (F-48)

`ErrorDeAjuste` hereda de `ErrorDeNegocio` y conserva el nombre, así que `esErrorDeNegocio` la reconoce sin casos especiales. Los dos rechazos de zona horaria siguen siendo 400 y su texto indica qué hacer («La zona horaria elegida no es válida. Elige una de la lista, por ejemplo Europe/Madrid.» y «La aplicación no reconoce esa zona horaria. Elige otra de la lista.»); el detalle técnico va al log.

## Referencias

- [API de Ajustes](../routes/ajustes.md)
- [Procedimiento de recibos del año](generar_recibos_anio.md)
