# Componente Calendar

Archivo: `src/views/pages/Calendar.vue`. Vista anual de los cargos de recibos y totales por mes.

## Qué muestra

- Selector de año con flechas; pulsar el año vuelve al año en curso en la zona horaria de los ajustes (`useZonaHoraria`, DC-25).
- Doce calendarios mensuales (`vue-cal`) con un evento por cada cargo de los recibos activos anuales, trimestrales y bimestrales, con el título «concepto: importe€». Los mensuales no se pintan (U-07).
- Una tabla de totales por mes y periodicidad (mensual, bimestral, trimestral, anual) y total, con pie de totales. Cada cargo cuenta con su importe real (`importe_cargo`) o, si no lo tiene, el del recibo.
- Aspecto oscuro con la clase `calendar-dark` cuando `isDarkTheme` (ver [useLayout](../composables/useLayout.md)).

## Datos

Al montar carga la zona horaria y pide los recibos del año con `BillService.getBillsByYear(año)`. El resultado se guarda en una caché en memoria por año, que se reinicia al recargar la página. Las fechas de las columnas DATE se normalizan con `fechaDeCalendario`.

## Referencias

- [BillService](../services/BillService.md)
- [Composable useZonaHoraria](../composables/useZonaHoraria.md)
- [Componente ListBills](./ListBills.md)
