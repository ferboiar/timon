<script setup>
/**
 * Control de privacidad de un registro (DC-75, F-49)
 * =================================================
 *
 * Pinta el interruptor y la etiqueta con el estado en palabras. **No** decide si se muestra: eso lo
 * hace cada vista con `v-if` sobre `usePrivacidad`, de modo que a quien no puede cambiar la
 * privacidad no se le renderiza el control (ni deshabilitado ni oculto).
 *
 * Emite 0 o 1, nunca un booleano: las rutas rechazan `true`/`false` con 400.
 *
 * Etiqueta: «Privado: solo visible para admin y propietario» o «Compartido con los usuarios con
 * acceso». El texto de privado es el mismo para el propietario y para un administrador que edita un
 * registro ajeno: describe quién lo ve, no quién lo edita.
 *
 * Ayuda (F-49): un icono `pi-question-circle` con tooltip, sin línea de texto permanente, como los
 * títulos de la aplicación. El tooltip no repite la etiqueta: dice lo que ella no dice (el alcance
 * en Recibos, quién deja de verlo en Anticipos y Ahorros).
 *
 * Dos nodos a propósito: en PrimeVue 4.3.7 el modificador `focus` de `v-tooltip` sustituye a los
 * eventos de ratón (son excluyentes), así que el tooltip de ratón va en el icono y el de teclado en
 * un `span` enfocable con `aria-label`. Al hacer clic, es la propia directiva `v-tooltip` de
 * PrimeVue la que oculta el tooltip del icono (su `onClick`), y queda el del `span`, que recibe el
 * foco: no hay código propio para eso.
 */
import { computed } from 'vue';

const props = defineProps({
    /** 0 (compartido) o 1 (privado). */
    modelValue: { type: Number, default: 0 },
    /** Id del input, distinto en cada diálogo para no duplicar `id` en el DOM. */
    inputId: { type: String, required: true },
    /** Módulo del registro (`recibos`, `anticipos`, `ahorros`): texto de la ayuda. */
    modulo: { type: String, required: true }
});

const emit = defineEmits(['update:modelValue']);

/** Lo que la etiqueta no dice: el alcance del cambio o lo que otros dejan de ver. */
const TEXTOS = {
    recibos: 'Se aplica a todos los años de este recibo, también a los que se generen después.',
    anticipos: 'Si es privado, el resto de usuarios, salvo los administradores, no lo ve en su lista de anticipos.',
    ahorros: 'Si es privado, el resto de usuarios, salvo los administradores, no lo ve en su lista de ahorros.',
    presupuestos: 'Si es privado, el resto de usuarios, salvo los administradores, no lo ve en su lista de presupuestos.'
};

const privado = computed(() => Number(props.modelValue) === 1);

const etiqueta = computed(() => (privado.value ? 'Privado: solo visible para admin y propietario' : 'Compartido con los usuarios con acceso'));

const ayuda = computed(() => TEXTOS[props.modulo] ?? `Si es privado, el resto de usuarios, salvo los administradores, no lo ve en su lista de ${props.modulo}.`);
</script>

<template>
    <div class="flex items-center gap-3">
        <ToggleSwitch :inputId="inputId" :modelValue="privado" @update:modelValue="(valor) => emit('update:modelValue', valor ? 1 : 0)" />
        <label :for="inputId" class="font-bold">{{ etiqueta }}</label>
        <span class="inline-flex" tabindex="0" role="img" :aria-label="ayuda" v-tooltip.focus.top="ayuda">
            <i class="pi pi-question-circle" aria-hidden="true" v-tooltip.top="ayuda"></i>
        </span>
    </div>
</template>
