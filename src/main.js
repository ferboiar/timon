import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import Aura from '@primevue/themes/aura';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { vRole } from './directives/vRole'; // Importar la directiva personalizada

import '@/assets/styles.scss';
import '@/assets/tailwind.css';

// Importar la localización de primelocale
//import esLocale from 'primelocale/es.json'; // no funciona

const app = createApp(App);

app.use(router);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.app-dark'
        }
    },
    //    locale: esLocale // no funciona
    locale: {
        firstDayOfWeek: 1,
        dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
        dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
        monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        today: 'Hoy',
        clear: 'Limpiar',
        weekHeader: 'Sem',
        dateFormat: 'dd/mm/yy'
    }
});
app.use(ToastService);
app.use(ConfirmationService);

// Registrar directivas
app.directive('role', vRole); // Registrar nuestra directiva de control de acceso

// Funciones globales
/**
 * Formatea una fecha en formato ISO 8601 a dd/mm/yy
 * @param {string} dateString - Fecha en formato 2025-02-11T00:00:00.000Z
 * @param {string} separator - Separador de fecha, por defecto '/'
 * @returns {string} - Fecha formateada en dd/mm/yy
 * En template se usa como $formatDate(bill.fecha)
 */
app.config.globalProperties.$formatDate = function (dateString, separator = '/') {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    if (separator === '-') {
        return `${date.getFullYear()}-${month}-${day}`;
    }
    return `${day}${separator}${month}${separator}${year}`;
};

app.mount('#app');
