import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import Aura from '@primevue/themes/aura';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { vRole } from './directives/vRole'; // Importar directiva personalizada. Ver src/directives/vRole.js

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
app.directive('role', vRole); // Registrar nuestra directiva de control de acceso. Ver src/directives/vRole.js

// Funciones globales
/**
 * Formatea una fecha en formato ISO 8601 a dd/mm/yy
 * @param {string} dateString - Fecha en formato 2025-02-11T00:00:00.000Z
 * @param {string} separator - Separador de fecha, por defecto '/'
 * @returns {string} - Fecha formateada en dd/mm/yy
 * En template se usa como $formatDate(bill.fecha)
 
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
*/
/**
 * Formatea una fecha con ajuste opcional de zona horaria
 * @param {Date|string} date - Fecha a formatear (objeto Date o string ISO (2025-02-11T00:00:00.000Z))
 * @param {string} separator - Separador de fecha, por defecto '/'
 * @param {boolean} adjustTimezone - Si es true, ajusta la zona horaria
 * @returns {string} - Fecha formateada
 * En template se usa como $formatDate(bill.fecha)
 */
app.config.globalProperties.$formatDate = function (date, separator = '/', adjustTimezone = false) {
    // Si la fecha es null o undefined, devolver cadena vacía
    if (!date) {
        console.log('Advertencia: Se recibió una fecha nula o indefinida en $formatDate');
        console.error('Error: Se intentó formatear una fecha null o undefined', {
            callerInfo: new Error().stack,
            separator,
            adjustTimezone
        });
        return '';
    }

    // Convertir a objeto Date si es un string
    let dateObj = typeof date === 'string' ? new Date(date) : date;

    // Ajustar zona horaria si se solicita
    if (adjustTimezone) {
        dateObj = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
    }

    // Formatear según el separador
    if (separator === '-') {
        // Formato YYYY-MM-DD para enviar al backend
        return dateObj.toISOString().split('T')[0];
    } else {
        // Formato DD/MM/YY para mostrar en la UI
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = String(dateObj.getFullYear()).slice(-2);
        return `${day}${separator}${month}${separator}${year}`;
    }
};

app.mount('#app');
