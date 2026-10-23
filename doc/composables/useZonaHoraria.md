# Composable useZonaHoraria

## Descripción General

Mantiene en toda la aplicación la zona horaria de los ajustes (por defecto `Europe/Madrid`) y calcula con ella «hoy», el año y el mes en curso (DC-25). Las horas se guardan en UTC y solo se convierten al mostrarlas o al calcular el día actual.

## Funciones

| Función | Descripción |
|---------|-------------|
| `cargarZonaHoraria(forzar)` | Pide la zona al servidor una sola vez (`GET /api/ajustes/general`). Si falla, mantiene la actual |
| `establecerZonaHoraria(zona)` | Actualiza la zona en memoria tras guardarla |
| `hoyEnZona(ahora)` | Fecha de hoy en esa zona, como `Date` con los campos locales de la zona |
| `anioEnCurso(ahora)` | Año en curso en esa zona |
| `fechaDeCalendario(valor)` | Convierte una columna DATE (ISO o YYYY-MM-DD) en un `Date` a medianoche local del mismo día, para que el día no se desplace según la zona del navegador |
| `formatearFechaHora(valor)` | Formatea un instante UTC en la zona de la aplicación; disponible en las plantillas como `$formatDateTime` |

Las fechas sin hora (columnas DATE) no se convierten a ninguna zona: `$formatDate` las muestra tal cual.

## Referencias

- [Ajustes del sistema (db_ajustes)](../db/db_ajustes.md)
- [API de Ajustes](../routes/ajustes.md)
- [AjustesService](../services/AjustesService.md)
