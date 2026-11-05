/**
 * F-19: utilidades de exportación CSV seguras.
 *
 * Conserva el formato que ya usaban las pantallas: UTF-8 con BOM, separador
 * `;`, coma decimal en los importes y fin de línea `\n`. Añade dos capas que
 * antes no existían:
 *
 * 1. Escape RFC 4180: un campo solo se entrecomilla cuando contiene el
 *    separador, comillas, saltos de línea o espacios en los extremos; las
 *    comillas interiores se duplican.
 * 2. Neutralización de fórmulas: si un valor pudiera interpretarse como
 *    fórmula al abrirlo en una hoja de cálculo, se prefija un apóstrofo.
 *
 * El entrecomillado por sí solo no evita la ejecución de fórmulas: `"=1+1"`
 * se sigue evaluando en Excel y LibreOffice, por eso la capa 2 es necesaria.
 *
 * La utilidad no toca el DOM ni el modelo de datos: recibe valores y devuelve
 * texto, de modo que puede probarse con `node --test` sin navegador.
 */

/** Separador de campos que usan todas las exportaciones de Timón. */
export const SEPARADOR = ';';

/** Marca de orden de bytes (UTF-8) que Excel necesita para los acentos. */
export const BOM = '\ufeff';

/** Fin de línea que ya generaban las exportaciones. */
export const FIN_DE_LINEA = '\n';

/** Prefijo con el que se neutraliza una posible fórmula. */
const PREFIJO_NEUTRALIZADO = "'";

/** Marca interna: la celda ya trae un texto preparado (IBAN) y no se vuelve a procesar. */
const CELDA_PREPARADA = Symbol('celdaCsvPreparada');

/** Caracteres con los que Excel y LibreOffice pueden iniciar una fórmula. */
const INICIOS_PELIGROSOS = ['=', '+', '-', '@', '\t', '\r'];

/** Números que ya exportamos con coma decimal: no se neutralizan. */
const NUMERO_EXPORTABLE = /^-?\d+(,\d+)?$/;

/** Texto admitido dentro del envoltorio de texto seguro del IBAN. */
const IBAN_TEXTO_SEGURO = /^[A-Za-z0-9 ]+$/;

function aTexto(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor);
}

/**
 * Convierte un valor al texto que se va a exportar, neutralizando las posibles
 * fórmulas. Los números del formato exportado (`-12,34`, `1234,56`) se dejan
 * intactos para que sigan siendo números en la hoja de cálculo.
 */
export function valorCsv(valor) {
    const texto = aTexto(valor);
    if (texto === '') return '';
    if (NUMERO_EXPORTABLE.test(texto)) return texto;

    const sinEspacios = texto.replace(/^\s+/, '');
    if (sinEspacios !== '' && INICIOS_PELIGROSOS.includes(sinEspacios[0])) {
        return `${PREFIJO_NEUTRALIZADO}${texto}`;
    }

    return texto;
}

function celdaPreparada(texto) {
    return { [CELDA_PREPARADA]: true, texto };
}

/**
 * Prepara un IBAN como texto seguro para Excel (`="ES91 …"`), que es el efecto
 * que ya tenía la exportación de cuentas: evita la notación científica y la
 * pérdida de ceros. Si el valor contiene cualquier otra cosa, se trata como
 * texto normal y se neutraliza si resulta sospechoso.
 */
export function ibanSeguro(iban) {
    const texto = aTexto(iban);
    if (texto === '') return '';
    if (IBAN_TEXTO_SEGURO.test(texto)) return celdaPreparada(`="${texto}"`);
    return valorCsv(texto);
}

/** Escapa un campo según RFC 4180: solo entrecomilla cuando hace falta. */
export function escaparCampo(texto) {
    const campo = aTexto(texto);
    const necesitaComillas = /[";\n\r]/.test(campo) || /^\s/.test(campo) || /\s$/.test(campo);
    if (!necesitaComillas) return campo;
    return `"${campo.replace(/"/g, '""')}"`;
}

/**
 * Construye una fila de datos: aplica la neutralización de fórmulas y después
 * el escape CSV a cada campo.
 */
export function filaCsv(campos) {
    return campos
        .map((campo) => {
            if (campo && typeof campo === 'object' && campo[CELDA_PREPARADA] === true) {
                return escaparCampo(campo.texto);
            }
            return escaparCampo(valorCsv(campo));
        })
        .join(SEPARADOR);
}

/** Construye la fila de cabeceras: son texto literal, nunca fórmulas. */
export function filaCsvCabecera(columnas) {
    return columnas.map((columna) => escaparCampo(aTexto(columna))).join(SEPARADOR);
}

/**
 * Construye el contenido completo del fichero: BOM, cabecera y filas.
 * No añade salto de línea final, igual que las exportaciones anteriores.
 */
export function construirCsv(columnas, filas) {
    const lineas = [filaCsvCabecera(columnas), ...filas.map((fila) => filaCsv(fila))];
    return `${BOM}${lineas.join(FIN_DE_LINEA)}`;
}
