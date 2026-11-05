# Utilidad de CSV (`utils/csv`)

Archivo: `src/utils/csv.js`. Utilidad pura del frontend para construir las exportaciones CSV con escape y neutralización de fórmulas (F-19).

| Función o constante | Descripción |
|---|---|
| `SEPARADOR` | `;`, el separador de campos de todas las exportaciones |
| `BOM` | `\ufeff`, la marca UTF-8 que Excel necesita para los acentos |
| `FIN_DE_LINEA` | `\n`, el fin de línea que ya usaban las exportaciones |
| `valorCsv(valor)` | Convierte a texto, trata `null`/`undefined` como campo vacío y neutraliza con apóstrofo los valores que podrían interpretarse como fórmula |
| `ibanSeguro(iban)` | Prepara el IBAN como fórmula de texto (`="ES91…"`) para que Excel no lo convierta a notación científica ni pierda ceros iniciales. Si el valor contiene otros caracteres, se trata como texto normal y se neutraliza si resulta sospechoso |
| `escaparCampo(texto)` | Escape RFC 4180: entrecomilla solo cuando el campo contiene `;`, comillas, saltos de línea o espacios en los extremos, y duplica las comillas interiores |
| `filaCsv(campos)` | Aplica `valorCsv` y `escaparCampo` a cada campo y los une con `SEPARADOR` |
| `filaCsvCabecera(columnas)` | Igual para la cabecera, que es texto literal y no se neutraliza |
| `construirCsv(columnas, filas)` | Devuelve el fichero completo: BOM, cabecera y filas, sin salto de línea final |

La utilidad no toca el DOM ni el modelo de datos: recibe valores y devuelve texto, de modo que se prueba con `node --test` sin navegador.

## Neutralización de fórmulas

Un valor que, tras los espacios iniciales, empieza por `=`, `+`, `-`, `@`, tabulación o retorno de carro se exporta con un apóstrofo delante, para que Excel y LibreOffice lo muestren como texto y no lo evalúen. Los importes del formato exportado (`-12,34`, `1234,56`) no se neutralizan, de modo que siguen siendo números.

El entrecomillado por sí solo no protege: `"=1+1"` se sigue evaluando en ambas hojas de cálculo, por eso la neutralización es una capa aparte.

Una celda neutralizada puede verse con el apóstrofo en LibreOffice al importar el CSV y normalmente sin él en Excel. Es el comportamiento aceptado en F-19.

## Qué exporta cada pantalla

| Pantalla | Fichero | Columnas |
|---|---|---|
| [Recibos](../components/ListBills.md) | `allBills.csv`, `recibosAnuales.csv`, `recibosTrimestrales.csv`, `recibosBimestrales.csv`, `recibosMensuales.csv` | Periodicidad, Concepto, Importe, Fecha, Estado, Comentario |
| [Cuentas](../components/Accounts.md) | `accounts.csv` | Nombre, Tipo, IBAN, Saldo Actual, Descripción |
| [Ahorros](../components/Savings.md) | `savings.csv` | Concepto, Descripción, Ahorrado, Fecha Objetivo, Periodicidad, Ahorro sugerido, Fecha Movimiento, Tipo Movimiento, Importe Movimiento, Descripción Movimiento |
| [Categorías](../components/Categories.md) | `categories.csv` | Nombre, Descripción |
| [Anticipos](../components/Advances.md) | `anticipos.csv` | Concepto, Descripción, Importe, Pendiente, Fecha Inicio, Fecha Fin Prevista, Estado, Cuenta Origen, Periodicidad, Pago Sugerido |

Un ahorro sin movimientos genera una fila de seis campos frente a las diez columnas de la cabecera: es el comportamiento actual de Ahorros y se conserva.

## Fuera de esta utilidad

- La página `/pages/crud` usa la exportación de la plantilla de demostración (PrimeVue `DataTable.exportCSV`, separador `,` y datos de ejemplo). No pasa por esta utilidad y queda pendiente de U-08 (fase 4).
- Las páginas Presupuestos, Transacciones, Automatización y Préstamos tienen un botón «Exportar» sin controlador asociado (U-03); no exportan nada.
- La copia de seguridad de Ajustes › Base de Datos y la descarga de `mantenimientoDB` son ficheros SQL, no CSV.

## Pruebas

`backend/test/csv.test.mjs` prueba la utilidad sin base de datos ni DOM: `node --test backend/test/csv.test.mjs`.

## Referencias

- [Componente ListBills](../components/ListBills.md)
- [Componente Accounts](../components/Accounts.md)
- [Componente Savings](../components/Savings.md)
- [Componente Categories](../components/Categories.md)
- [Componente Advances](../components/Advances.md)
