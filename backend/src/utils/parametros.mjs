/**
 * Lectura y validación de parámetros de las rutas (F-43, DC-39)
 *
 * Las rutas reciben valores sin tipo: parámetros de la URL, de la consulta (?redistribuir=true) o del cuerpo JSON.
 * Estas funciones los convierten al tipo esperado o lanzan un Error con `status = 400` y un mensaje claro, de modo que
 * la ruta lo devuelva tal cual al cliente. Así un valor mal formado no llega a la base de datos, donde acabaría
 * en un error 500 poco explicativo.
 *
 * @module utils/parametros
 */

function errorParametro(mensaje) {
    const error = new Error(mensaje);
    error.status = 400;
    return error;
}

/**
 * Lee un booleano estricto: solo se admiten true y false, como booleano o como texto «true» / «false».
 * Si el parámetro no viene (undefined) se devuelve `porDefecto`. Cualquier otro valor lanza un 400: así una errata como
 * «?redistribuir=ture» no se interpreta en silencio como «no redistribuir».
 */
function leerBooleano(valor, nombre, porDefecto = false) {
    if (valor === undefined) return porDefecto;
    if (valor === true || valor === 'true') return true;
    if (valor === false || valor === 'false') return false;
    throw errorParametro('El parámetro ' + nombre + ' debe ser true o false');
}

/**
 * Lee un entero positivo (un id) desde texto o número. Rechaza decimales, signos, ceros a la izquierda, texto añadido
 * y valores que JavaScript no puede representar con exactitud.
 */
function leerEnteroPositivo(valor, nombre) {
    // Solo texto o número: un array como [3] se convertiría en «3» con String() y pasaría por válido
    if (typeof valor !== 'string' && typeof valor !== 'number') {
        throw errorParametro('El parámetro ' + nombre + ' debe ser un número entero positivo');
    }
    const texto = String(valor).trim();
    if (!/^[1-9][0-9]*$/.test(texto)) {
        throw errorParametro('El parámetro ' + nombre + ' debe ser un número entero positivo');
    }
    const numero = Number(texto);
    // Un entero demasiado grande pierde precisión y ya no identifica a ningún registro
    if (!Number.isSafeInteger(numero)) {
        throw errorParametro('El parámetro ' + nombre + ' debe ser un número entero positivo');
    }
    return numero;
}

/** Lee una lista no vacía de enteros positivos (por ejemplo, los ids de los anticipos a borrar). */
function leerListaEnterosPositivos(valor, nombre) {
    if (!Array.isArray(valor) || valor.length === 0) {
        throw errorParametro('El parámetro ' + nombre + ' debe ser una lista no vacía de números enteros positivos');
    }
    return valor.map((elemento) => leerEnteroPositivo(elemento, nombre));
}

export { leerBooleano, leerEnteroPositivo, leerListaEnterosPositivos };
