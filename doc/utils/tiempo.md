# Utilidades de tiempo (`utils/tiempo`)

Archivo: `backend/src/utils/tiempo.mjs`. Utilidades puras de fecha y hora con zona horaria (DC-25). Las horas se guardan en UTC; «hoy», el mes y el año en curso se calculan en la zona horaria de los ajustes (por defecto `Europe/Madrid`).

| Función | Descripción |
|---------|-------------|
| `esZonaValida(zona)` | Indica si es un nombre de zona IANA que reconoce el motor de JavaScript |
| `hoyEnZonaDe(zona, ahora)` | Fecha de hoy en la zona, como `Date` con los campos locales (año, mes y día) de esa zona. `ahora` permite probarla |
| `hoyIsoEnZonaDe(zona, ahora)` | La misma fecha en formato `YYYY-MM-DD` |

## Referencias

- [Ajustes del sistema (db_ajustes)](../db/db_ajustes.md): lee la zona de los ajustes y usa estas utilidades
- [Composable useZonaHoraria](../composables/useZonaHoraria.md): equivalente del frontend

## Utilidad independiente del proceso anual (U-13)

`backend/src/utils/generacionAnual.mjs` contiene las funciones puras `opcionesGeneracion(simular, proximoDiciembre, hoy)` y `separarResultado(filas)`. La primera valida opciones y calcula diciembre desde una fecha de calendario; la segunda separa recibos y avisos globales. No acceden a datos. Estas dos funciones pertenecen a `generacionAnual.mjs`, no se exportan desde `tiempo.mjs`; este último aporta `hoyIsoEnZonaDe` para obtener la fecha de calendario en la zona de Ajustes.
