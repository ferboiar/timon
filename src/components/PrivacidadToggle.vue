<script setup>
/**
 * Control de privacidad de un registro (DC-75, F-49)
 * =================================================
 *
 * Solo pinta el interruptor, la etiqueta con el estado en palabras, la ayuda y el tooltip. **No**
 * decide si se muestra: eso lo hace cada vista con `v-if` sobre `usePrivacidad`, de modo que a
 * quien no puede cambiar la privacidad no se le renderiza el control (ni deshabilitado ni oculto).
 *
 * Emite 0 o 1, nunca un booleano: las rutas rechazan `true`/`false` con 400.
 */
import { computed } from 'vue';

const props = defineProps({
    /** 0 (compartido) o 1 (privado). */
    modelValue: { type: Number, default: 0 },
    /** Id del input, distinto en cada diálogo para no duplicar `id` en el DOM. */
    inputId: { type: String, required: true },
    /** El registro es del usuario que edita: la etiqueta habla en segunda persona. */
    esPropio: { type: Boolean, default: true },
    /** El usuario es administrador: adapta la etiqueta cuando el registro es de otro. */
    esAdmin: { type: Boolean, default: false },
    /** Módulo del registro (`recibos`, `anticipos`, `ahorros`): texto de ayuda. */
    modulo: { type: String, required: true }
});

const emit = defineEmits(['update:modelValue']);

const privado = computed(() => Number(props.modelValue) === 1);

const etiqueta = computed(() => {
    if (!privado.value) return 'Compartido con los usuarios con acceso';
    if (props.esPropio) return 'Privado: solo tú y los administradores lo veis';

    return 'Privado: solo su propietario y los administradores lo veis';
});

const ayuda = computed(() => {
    if (!privado.value) return `Lo ven los usuarios con permiso de ${props.modulo}.`;
    if (props.esPropio) return 'Solo tú y los administradores podéis verlo.';

    return 'Solo su propietario y los administradores pueden verlo.';
});
</script>

<template>
    <div class="flex flex-col gap-2">
        <div class="flex items-center gap-3">
            <ToggleSwitch :inputId="inputId" :modelValue="privado" @update:modelValue="(valor) => emit('update:modelValue', valor ? 1 : 0)" />
            <label :for="inputId" class="font-bold">{{ etiqueta }}</label>
            <i class="pi pi-question-circle" v-tooltip.top="ayuda"></i>
        </div>
        <small class="text-gray-500">{{ ayuda }}</small>
    </div>
</template>
