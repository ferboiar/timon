<script setup>
import { useAuth } from '@/composables/useAuth';
import { useLayout } from '@/layout/composables/layout';
import { ref } from 'vue';
//import AppConfigurator from './AppConfigurator.vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const { currentUser, logout } = useAuth();
const menu = ref(null);

function toggleProfile(event) {
    menu.value.toggle(event);
}

const overlayMenuProfileItems = ref([
    {
        label: 'Perfil',
        icon: 'pi pi-user',
        command: () => {
            console.log('Perfil');
        }
    },
    {
        label: 'Ajustes',
        icon: 'pi pi-sliders-h',
        to: '/settings'
    },
    {
        label: 'Salir',
        icon: 'pi pi-power-off',
        command: logout // Asignamos nuestra función de cierre de sesión
    }
]);
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo">
                <svg viewBox="0 0 75 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Aro principal -->
                    <circle cx="37.5" cy="27.5" r="15" stroke="var(--primary-color)" stroke-width="3" />

                    <!-- Línea vertical superior -->
                    <line x1="37.5" y1="4.5" x2="37.5" y2="20" stroke="var(--primary-color)" stroke-width="3" />

                    <!-- Línea vertical inferior -->
                    <line x1="37.5" y1="35" x2="37.5" y2="50.5" stroke="var(--primary-color)" stroke-width="3" />

                    <!-- Línea horizontal izquierda -->
                    <line x1="14" y1="27.5" x2="30" y2="27.5" stroke="var(--primary-color)" stroke-width="3" />

                    <!-- Línea horizontal derecha -->
                    <line x1="45" y1="27.5" x2="61" y2="27.5" stroke="var(--primary-color)" stroke-width="3" />

                    <!-- Diagonal superior izquierda -->
                    <line x1="20.4" y1="11.2" x2="31.8" y2="22.6" stroke="var(--primary-color)" stroke-width="2.5" />

                    <!-- Diagonal inferior derecha -->
                    <line x1="41.6" y1="32.4" x2="53" y2="43.8" stroke="var(--primary-color)" stroke-width="2.5" />

                    <!-- Diagonal inferior izquierda -->
                    <line x1="20.4" y1="43.8" x2="31.8" y2="32.4" stroke="var(--primary-color)" stroke-width="2.5" />

                    <!-- Diagonal superior derecha -->
                    <line x1="41.6" y1="22.6" x2="53" y2="11.2" stroke="var(--primary-color)" stroke-width="2.5" />

                    <!-- Círculo central -->
                    <circle cx="37.5" cy="27.5" r="4.5" fill="var(--primary-color)" />
                </svg>
                <span>Timón</span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
                <!--
                <div class="relative">
                    <button
                        v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
                        type="button"
                        class="layout-topbar-action layout-topbar-action-highlight"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <AppConfigurator />
                </div>
                -->
            </div>

            <button
                class="layout-topbar-menu-button layout-topbar-action"
                v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
            >
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <Menu ref="menu" :model="overlayMenuProfileItems" :popup="true">
                        <template #item="slotProps">
                            <router-link v-if="slotProps.item.to" :to="slotProps.item.to" class="layout-menuitem">
                                <i :class="slotProps.item.icon" class="layout-menuitem-icon"></i>
                                <span class="layout-menuitem-text">{{ slotProps.item.label }}</span>
                            </router-link>
                            <a v-else @click="slotProps.item.command" class="layout-menuitem">
                                <i :class="slotProps.item.icon" class="layout-menuitem-icon"></i>
                                <span class="layout-menuitem-text">{{ slotProps.item.label }}</span>
                            </a>
                        </template>
                    </Menu>
                    <button type="button" class="layout-topbar-action" @click="toggleProfile">
                        <i class="pi pi-user layout-menuitem-icon"></i>
                        <span class="layout-menuitem-text">Perfil</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.layout-menuitem-icon {
    margin-right: 0.75rem;
}

.layout-menuitem {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    cursor: pointer; /* Esto aplica el cursor de tipo dedo a todos los ítems del menú */
}
</style>
