<script setup>
import { useAuth } from '@/composables/useAuth';
import { computed, ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

// Importar el composable de autenticación
const { hasRole } = useAuth();

// Modelo completo del menú con información de roles requeridos
const fullModel = ref([
    {
        label: 'Inicio',
        items: [
            { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/dashboard' },
            { label: 'Calendario', icon: 'pi pi-fw pi-calendar', to: '/pages/calendar' }
        ]
    },

    {
        label: 'Control Financiero',
        items: [
            { label: 'Recibos', icon: 'pi pi-fw pi-receipt', to: '/pages/bills' },
            //partidas de dinero destinadas a cubrir gastos fijos (comida, ocio, peluqueria)
            { label: 'Presupuestos', icon: 'pi pi-fw pi-money-bill', to: '/pages/budgets' },
            //dinero que adelanto y luego debo devolver mes a mes (veterinario, ropa niños, dentista, prestamos a elena)
            { label: 'Anticipos', icon: 'pi pi-fw pi-wallet', to: '/pages/advances' },
            //partidas de dinero que se guardan para un fin concreto (viaje, coche, reforma
            { label: 'Ahorros', icon: 'pi pi-fw pi-chart-line', to: '/pages/savings' }
            //{ label: 'Préstamos', icon: 'pi pi-fw pi-money-bill', to: '/pages/loans' }
        ]
    },
    {
        label: 'Contabilidad',
        items: [
            { label: 'Transacciones', icon: 'pi pi-fw pi-arrow-right-arrow-left', to: '/pages/transactions' },
            { label: 'Automatización', icon: 'pi pi-fw pi-cog', to: '/pages/automation' }
        ]
    },
    {
        label: 'Configuración',
        items: [
            { label: 'Categorías', icon: 'pi pi-fw pi-tags', to: '/pages/categories' },
            { label: 'Cuentas', icon: 'pi pi-fw pi-building-columns', to: '/pages/accounts' }
        ]
    },

    {
        label: 'Ayuda',
        items: [
            {
                label: 'Documentación',
                icon: 'pi pi-fw pi-book',
                items: [
                    {
                        label: 'Manual de usuario',
                        icon: 'pi pi-fw pi-book',
                        to: '/manual'
                    },
                    {
                        label: 'Documentación técnica',
                        icon: 'pi pi-fw pi-book',
                        to: '/tech-docs',
                        requiredRole: 'admin' // Solo visible para administradores
                    },
                    {
                        label: 'Guía de la plantilla',
                        icon: 'pi pi-fw pi-book',
                        to: '/documentation',
                        requiredRole: 'admin' // Solo visible para administradores
                    }
                ]
            },
            {
                label: 'Código',
                icon: 'pi pi-fw pi-github',
                items: [
                    {
                        label: 'Sakai Vue',
                        icon: 'pi pi-fw pi-desktop',
                        url: 'https://github.com/primefaces/sakai-vue',
                        target: '_blank'
                    },
                    {
                        label: 'Prime Vue',
                        icon: 'pi pi-fw pi-window-maximize',
                        url: 'https://primevue.org/introduction/',
                        target: '_blank'
                    },
                    {
                        label: 'Timón',
                        icon: 'pi pi-fw pi-github',
                        url: 'https://github.com/ferboiar/timon',
                        target: '_blank'
                    }
                ]
            }
        ]
    },

    {
        label: 'UI Components',
        items: [
            { label: 'Form Layout', icon: 'pi pi-fw pi-id-card', to: '/uikit/formlayout' },
            { label: 'Input', icon: 'pi pi-fw pi-check-square', to: '/uikit/input' },
            { label: 'Button', icon: 'pi pi-fw pi-mobile', to: '/uikit/button', class: 'rotated-icon' },
            { label: 'Table', icon: 'pi pi-fw pi-table', to: '/uikit/table' },
            { label: 'List', icon: 'pi pi-fw pi-list', to: '/uikit/list' },
            { label: 'Tree', icon: 'pi pi-fw pi-share-alt', to: '/uikit/tree' },
            { label: 'Panel', icon: 'pi pi-fw pi-tablet', to: '/uikit/panel' },
            { label: 'Overlay', icon: 'pi pi-fw pi-clone', to: '/uikit/overlay' },
            { label: 'Media', icon: 'pi pi-fw pi-image', to: '/uikit/media' },
            { label: 'Menu', icon: 'pi pi-fw pi-bars', to: '/uikit/menu' },
            { label: 'Message', icon: 'pi pi-fw pi-comment', to: '/uikit/message' },
            { label: 'File', icon: 'pi pi-fw pi-file', to: '/uikit/file' },
            { label: 'Chart', icon: 'pi pi-fw pi-chart-bar', to: '/uikit/charts' },
            { label: 'Timeline', icon: 'pi pi-fw pi-calendar', to: '/uikit/timeline' },
            { label: 'Misc', icon: 'pi pi-fw pi-circle', to: '/uikit/misc' }
        ]
    },
    {
        label: 'Pages',
        icon: 'pi pi-fw pi-briefcase',
        to: '/pages',
        items: [
            {
                label: 'Landing',
                icon: 'pi pi-fw pi-globe',
                to: '/landing'
            },
            {
                label: 'Auth',
                icon: 'pi pi-fw pi-user',
                items: [
                    {
                        label: 'Login',
                        icon: 'pi pi-fw pi-sign-in',
                        to: '/auth/login'
                    },
                    {
                        label: 'Error',
                        icon: 'pi pi-fw pi-times-circle',
                        to: '/auth/error'
                    },
                    {
                        label: 'Access Denied',
                        icon: 'pi pi-fw pi-lock',
                        to: '/auth/access'
                    }
                ]
            },
            {
                label: 'Crud',
                icon: 'pi pi-fw pi-pencil',
                to: '/pages/crud'
            },
            {
                label: 'Not Found',
                icon: 'pi pi-fw pi-exclamation-circle',
                to: '/pages/notfound'
            },
            {
                label: 'Empty',
                icon: 'pi pi-fw pi-circle-off',
                to: '/pages/empty'
            }
        ]
    },
    {
        label: 'Hierarchy',
        items: [
            {
                label: 'Submenu 1',
                icon: 'pi pi-fw pi-bookmark',
                items: [
                    {
                        label: 'Submenu 1.1',
                        icon: 'pi pi-fw pi-bookmark',
                        items: [
                            { label: 'Submenu 1.1.1', icon: 'pi pi-fw pi-bookmark' },
                            { label: 'Submenu 1.1.2', icon: 'pi pi-fw pi-bookmark' },
                            { label: 'Submenu 1.1.3', icon: 'pi pi-fw pi-bookmark' }
                        ]
                    },
                    {
                        label: 'Submenu 1.2',
                        icon: 'pi pi-fw pi-bookmark',
                        items: [{ label: 'Submenu 1.2.1', icon: 'pi pi-fw pi-bookmark' }]
                    }
                ]
            },
            {
                label: 'Submenu 2',
                icon: 'pi pi-fw pi-bookmark',
                items: [
                    {
                        label: 'Submenu 2.1',
                        icon: 'pi pi-fw pi-bookmark',
                        items: [
                            { label: 'Submenu 2.1.1', icon: 'pi pi-fw pi-bookmark' },
                            { label: 'Submenu 2.1.2', icon: 'pi pi-fw pi-bookmark' }
                        ]
                    },
                    {
                        label: 'Submenu 2.2',
                        icon: 'pi pi-fw pi-bookmark',
                        items: [{ label: 'Submenu 2.2.1', icon: 'pi pi-fw pi-bookmark' }]
                    }
                ]
            }
        ]
    }
]);

// Modelo filtrado según los roles de usuario
const model = computed(() => {
    // Función para filtrar elementos según roles
    const filterItemsByRole = (items) => {
        if (!items) return [];

        return (
            items
                .filter((item) => !item.requiredRole || hasRole(item.requiredRole))
                .map((item) => {
                    // Si el elemento tiene subelementos, aplicar filtrado recursivamente
                    if (item.items && item.items.length > 0) {
                        const filteredSubItems = filterItemsByRole(item.items);
                        return {
                            ...item,
                            items: filteredSubItems.length > 0 ? filteredSubItems : undefined
                        };
                    }
                    return item;
                })
                // Eliminar secciones que quedaron sin elementos
                .filter((item) => !item.items || item.items.length > 0)
        );
    };

    // Aplicar el filtrado a cada sección del menú
    return fullModel.value.map((section) => {
        if (section.items) {
            const filteredItems = filterItemsByRole(section.items);
            return {
                ...section,
                items: filteredItems
            };
        }
        return section;
    });
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="i">
            <app-menu-item v-if="!item.separator && item.items && item.items.length > 0" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
