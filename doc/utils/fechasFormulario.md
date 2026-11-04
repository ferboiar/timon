# Utilidad de fechas de formulario (`utils/fechasFormulario`)

Archivo: `src/utils/fechasFormulario.js`. Utilidad pura del frontend para preparar payloads sin mutar el modelo del formulario (F-16).

| Función | Descripción |
|---|---|
| `fechaIsoDeCalendario(valor)` | Convierte un `Date` de calendario a `YYYY-MM-DD` usando sus componentes locales. Devuelve `null` si no hay valor o el texto no es una fecha ISO de calendario; conserva un texto `YYYY-MM-DD` ya válido |

La función no usa `getTimezoneOffset` ni `toISOString`. Las fechas `DATE` llegan como texto `YYYY-MM-DD` desde el pool de MariaDB (DC-05).

## Uso en formularios

`saveSaving`, `saveMovimiento`, `saveAdvance` y `savePago` construyen un payload nuevo con las fechas convertidas. El modelo del formulario permanece intacto hasta que el servidor confirma el guardado; tras un error, el reintento envía un payload válido.

## Referencias

- [Componente Savings](../components/Savings.md)
- [Componente Advances](../components/Advances.md)
