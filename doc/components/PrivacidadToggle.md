# Componente PrivacidadToggle

Fuente: `src/components/PrivacidadToggle.vue`. Revisión estática completa: 2026-11-22.

## Alcance

Pinta el control de privacidad de un registro (`es_privado`, DC-75): un `ToggleSwitch` con la
etiqueta del estado en palabras y un icono `pi-question-circle` con tooltip como ayuda. **No decide
si se muestra**: eso lo hace cada vista con `v-if` sobre [usePrivacidad](../composables/usePrivacidad.md),
de modo que a quien no puede cambiar la privacidad no se le renderiza el control (DC-75: ni
deshabilitado ni oculto).

## Props y eventos

| Prop | Tipo | Por defecto | Qué hace |
|---|---|---|---|
| `modelValue` | `Number` | `0` | Estado: `0` compartido, `1` privado |
| `inputId` | `String` | obligatoria | `id` del `input` del interruptor y destino del `<label for>`. Distinto en cada diálogo (`es_privado` en el anual de Recibos, `es_privado_tb` en el agrupado) para no duplicar `id` en el DOM |
| `esPropio` | `Boolean` | `true` | El registro es del usuario: la etiqueta habla en segunda persona |
| `modulo` | `String` | obligatoria | `recibos`, `anticipos`, `ahorros` o `presupuestos`: elige el texto de la ayuda |

Emite `update:modelValue` con **0 o 1**, nunca un booleano: las rutas rechazan `true`/`false` con 400.

## Etiqueta

| Estado | Texto |
|---|---|
| Compartido | «Compartido con los usuarios con acceso» |
| Privado y propio | «Privado: solo tú y los administradores lo veis» |
| Privado de otro (administrador) | «Privado: solo su propietario y los administradores lo veis» |

## Ayuda

Un icono con tooltip, sin línea de texto permanente, como los títulos de la aplicación. El texto no
repite la etiqueta: dice lo que ella no dice.

| Módulo | Texto |
|---|---|
| Recibos | «Se aplica a todos los años de este recibo, también a los que se generen después.» |
| Anticipos | «Si es privado, el resto de usuarios, salvo los administradores, no lo ve en su lista de anticipos.» |
| Ahorros | «Si es privado, el resto de usuarios, salvo los administradores, no lo ve en su lista de ahorros.» |
| Presupuestos | «Si es privado, el resto de usuarios, salvo los administradores, no lo ve en su lista de presupuestos.» |

## Accesibilidad

En PrimeVue 4.3.7 el modificador `focus` de `v-tooltip` **sustituye** a los eventos de ratón (son
excluyentes), así que el componente usa dos nodos: un `span` con `tabindex="0"`, `role="img"` y
`aria-label` con el texto (`v-tooltip.focus`), y el `<i>` dentro con `v-tooltip` de ratón y
`aria-hidden="true"`. Al hacer clic, PrimeVue oculta el tooltip del icono y queda el del `span`, que
recibe el foco: siempre hay un solo tooltip visible.

`e2e/tests/privacidad.spec.mjs` comprueba las tres vías (ratón, teclado y clic) con exactamente un
tooltip visible cada vez y el mismo texto en `aria-label`.

## Dónde se usa

`ListBills.vue` (diálogos anual y agrupado), `Advances.vue` y `Savings.vue`.

## Referencias

- [Composable usePrivacidad](../composables/usePrivacidad.md)
- [Componente ListBills](./ListBills.md), [Advances](./Advances.md) y [Savings](./Savings.md)
- [Registro de hallazgos, DC-75](../mantenimiento/registro-hallazgos_1de3.md)
