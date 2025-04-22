import { useAuth } from '@/composables/useAuth';
import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            redirect: '/dashboard' // Redirigir la raíz al dashboard para usuarios autenticados
        },
        {
            path: '/app',
            component: AppLayout,
            children: [
                {
                    path: '/dashboard',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue')
                },
                {
                    path: '/pages/bills',
                    name: 'listado',
                    component: () => import('@/views/pages/ListBills.vue')
                },
                {
                    path: '/pages/calendar',
                    name: 'calendario',
                    component: () => import('@/views/pages/Calendar.vue')
                },
                {
                    path: '/pages/loans',
                    name: 'prestamos',
                    component: () => import('@/views/pages/Loans.vue')
                },
                {
                    path: '/pages/advances',
                    name: 'anticipos',
                    component: () => import('@/views/pages/Advances.vue')
                },
                {
                    path: '/pages/budgets',
                    name: 'presupuestos',
                    component: () => import('@/views/pages/Budgets.vue')
                },
                {
                    path: '/pages/savings',
                    name: 'ahorros',
                    component: () => import('@/views/pages/Savings.vue')
                },
                {
                    path: '/pages/transactions',
                    name: 'transacciones',
                    component: () => import('@/views/pages/Transactions.vue')
                },
                {
                    path: '/pages/automation',
                    name: 'automatización',
                    component: () => import('@/views/pages/Automation.vue')
                },
                {
                    path: '/pages/categories',
                    name: 'categorías',
                    component: () => import('@/views/pages/Categories.vue')
                },
                {
                    path: '/pages/accounts',
                    name: 'cuentas',
                    component: () => import('@/views/pages/Accounts.vue')
                },
                {
                    path: '/settings',
                    name: 'ProfileSettings',
                    component: () => import('@/views/pages/ProfileSettings.vue')
                },
                {
                    path: '/documentation',
                    name: 'documentation',
                    component: () => import('@/views/pages/Documentation.vue')
                },
                {
                    path: '/tech-docs',
                    name: 'tech-docs',
                    component: () => import('@/views/pages/Tech-documentation.vue')
                },
                {
                    path: '/manual',
                    name: 'manual',
                    component: () => import('@/views/pages/Documentation.vue')
                },
                {
                    path: '/uikit/formlayout',
                    name: 'formlayout',
                    component: () => import('@/views/uikit/FormLayout.vue')
                },
                {
                    path: '/uikit/input',
                    name: 'input',
                    component: () => import('@/views/uikit/InputDoc.vue')
                },
                {
                    path: '/uikit/button',
                    name: 'button',
                    component: () => import('@/views/uikit/ButtonDoc.vue')
                },
                {
                    path: '/uikit/table',
                    name: 'table',
                    component: () => import('@/views/uikit/TableDoc.vue')
                },
                {
                    path: '/uikit/list',
                    name: 'list',
                    component: () => import('@/views/uikit/ListDoc.vue')
                },
                {
                    path: '/uikit/tree',
                    name: 'tree',
                    component: () => import('@/views/uikit/TreeDoc.vue')
                },
                {
                    path: '/uikit/panel',
                    name: 'panel',
                    component: () => import('@/views/uikit/PanelsDoc.vue')
                },
                {
                    path: '/uikit/overlay',
                    name: 'overlay',
                    component: () => import('@/views/uikit/OverlayDoc.vue')
                },
                {
                    path: '/uikit/media',
                    name: 'media',
                    component: () => import('@/views/uikit/MediaDoc.vue')
                },
                {
                    path: '/uikit/message',
                    name: 'message',
                    component: () => import('@/views/uikit/MessagesDoc.vue')
                },
                {
                    path: '/uikit/file',
                    name: 'file',
                    component: () => import('@/views/uikit/FileDoc.vue')
                },
                {
                    path: '/uikit/menu',
                    name: 'menu',
                    component: () => import('@/views/uikit/MenuDoc.vue')
                },
                {
                    path: '/uikit/charts',
                    name: 'charts',
                    component: () => import('@/views/uikit/ChartDoc.vue')
                },
                {
                    path: '/uikit/misc',
                    name: 'misc',
                    component: () => import('@/views/uikit/MiscDoc.vue')
                },
                {
                    path: '/uikit/timeline',
                    name: 'timeline',
                    component: () => import('@/views/uikit/TimelineDoc.vue')
                },
                {
                    path: '/pages/empty',
                    name: 'empty',
                    component: () => import('@/views/pages/Empty.vue')
                },
                {
                    path: '/pages/crud',
                    name: 'crud',
                    component: () => import('@/views/pages/Crud.vue')
                }
            ]
        },
        // Rutas que están fuera del layout principal (sin menú lateral, etc.)
        {
            path: '/landing',
            name: 'landing',
            component: () => import('@/views/pages/Landing.vue')
        },
        {
            path: '/pages/notfound',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue')
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue')
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/views/pages/auth/Access.vue')
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue')
        }
    ]
});

// Agregar guard de navegación para proteger rutas y redireccionar a login si no hay autenticación
router.beforeEach((to, from, next) => {
    // Si la ruta no es login ni alguna ruta pública, verificar autenticación
    const publicPages = ['/auth/login', '/auth/access', '/auth/error', '/landing', '/pages/notfound'];
    const authRequired = !publicPages.includes(to.path);

    // Buscar token en localStorage y sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // Si requiere autenticación y no hay token, redirigir a login
    if (authRequired && !token) {
        return next('/auth/login');
    }

    // Si va a login y ya está autenticado, redirigir a dashboard
    if (to.path === '/auth/login' && token) {
        return next('/dashboard');
    }

    // Verificar restricciones de rutas por roles
    if (to.meta.requiresAdmin) {
        const { isAdmin } = useAuth();
        if (!isAdmin.value) {
            return next('/dashboard'); // Redirigir si no es admin
        }
    }

    // En cualquier otro caso, continuar normalmente
    next();
});

export default router;
