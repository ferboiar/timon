/**
 * F-16: utilidades para preparar payloads de formularios sin mutar el modelo vivo.
 *
 * Convierte una fecha de calendario a texto YYYY-MM-DD usando sus componentes
 * locales, sin `getTimezoneOffset`, `toISOString` ni reinterpretación de textos.
 */

export function fechaIsoDeCalendario(valor) {
    if (!valor) return null;
    if (valor instanceof Date) {
        const anio = valor.getFullYear();
        const mes = String(valor.getMonth() + 1).padStart(2, '0');
        const dia = String(valor.getDate()).padStart(2, '0');
        return `${anio}-${mes}-${dia}`;
    }
    const texto = String(valor);
    return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}
