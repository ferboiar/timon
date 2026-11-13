/**
 * Utilidades para la gestión del archivo de conexión de la base de datos.
 *
 * @module db_utilsConn
 */
import dotenv from 'dotenv';
import { mensajeDeCausa } from '../utils/catalogoErrores.mjs';
import { detalleParaLog, ErrorDeNegocio, esErrorDeNegocio } from '../utils/errorDeNegocio.mjs';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// S-03: la ruta se puede fijar con DB_CONFIG_PATH para que las pruebas y las E2E no
// toquen nunca el fichero real de credenciales
const rutaConfigurada = process.env.DB_CONFIG_PATH ? path.resolve(process.env.DB_CONFIG_PATH) : null;
const dbConfigPath = rutaConfigurada || path.join(__dirname, '.db_connection');
const dbBackupPath = rutaConfigurada ? dbConfigPath + '.backup' : path.join(__dirname, '.db_connection.backup');

/**
 * Lee la configuración de la base de datos desde el archivo .db_connection
 * @returns {Promise<Object>} - Objeto con la configuración (sin contraseña) y si existe backup.
 */
export const getDbConfig = async () => {
    try {
        const backupExists = await fs
            .access(dbBackupPath)
            .then(() => true)
            .catch(() => false);

        if (
            !(await fs
                .access(dbConfigPath)
                .then(() => true)
                .catch(() => false))
        ) {
            return { config: {}, backupExists };
        }

        const fileContent = await fs.readFile(dbConfigPath, 'utf-8');
        const config = dotenv.parse(fileContent);

        // S-03: no devolver la contraseña. S-02/DC-06: tampoco la del usuario de mantenimiento
        delete config.DB_PASSWORD;
        delete config.DB_MAINT_PASSWORD;

        return { config, backupExists };
    } catch (error) {
        console.error('db_utilsConn - lectura de la configuración: ' + detalleParaLog(error));
        throw new ErrorDeNegocio('No se ha podido leer el archivo de configuración de la base de datos. Comprueba que existe y que el servidor tiene permiso de lectura.', 500);
    }
};

/**
 * Lee y devuelve únicamente la contraseña de la base de datos.
 * @returns {Promise<string>} - La contraseña de la base de datos.
 */
export const getDbPassword = async () => {
    try {
        if (
            !(await fs
                .access(dbConfigPath)
                .then(() => true)
                .catch(() => false))
        ) {
            return ''; // Si no hay fichero, no hay contraseña
        }
        const fileContent = await fs.readFile(dbConfigPath, 'utf-8');
        const config = dotenv.parse(fileContent);
        return config.DB_PASSWORD || '';
    } catch (error) {
        console.error('db_utilsConn - lectura de la contraseña: ' + detalleParaLog(error));
        throw new ErrorDeNegocio('No se ha podido leer la contraseña guardada en la configuración. Comprueba el archivo de configuración.', 500);
    }
};

/**
 * S-02/DC-06: contraseña del usuario de mantenimiento.
 *
 * Es de uso interno (copia de seguridad y restauración) y no se devuelve nunca al cliente.
 * Manda el entorno si está definido; si no, el fichero de configuración.
 *
 * @returns {Promise<string>} Contraseña de mantenimiento, o cadena vacía si no está definida.
 */
export const getDbMaintPassword = async () => {
    try {
        if (process.env.DB_MAINT_PASSWORD) return process.env.DB_MAINT_PASSWORD;

        if (
            !(await fs
                .access(dbConfigPath)
                .then(() => true)
                .catch(() => false))
        ) {
            return '';
        }

        const fileContent = await fs.readFile(dbConfigPath, 'utf-8');
        const config = dotenv.parse(fileContent);

        return config.DB_MAINT_PASSWORD || '';
    } catch (error) {
        console.error('db_utilsConn - lectura de la contraseña de mantenimiento: ' + detalleParaLog(error));
        throw new ErrorDeNegocio('No se ha podido leer la contraseña de mantenimiento guardada en la configuración. Comprueba el archivo de configuración.', 500);
    }
};

/**
 * Prueba una nueva configuración de conexión a la base de datos.
 * @param {Object} config - Datos de conexión a probar.
 * @returns {Promise<boolean>} - True si la conexión es exitosa.
 */
export const testDbConnection = async (config) => {
    let connection;
    try {
        // S-03: sin CA se mantiene la conexión sin verificar, y queda el aviso en el log
        if (!config.DB_SSL_CA) console.warn('db_utilsConn - TLS sin verificación de CA; configura DB_SSL_CA para verificarlo');

        const connectionConfig = {
            host: config.DB_HOST,
            port: parseInt(config.DB_PORT, 10),
            user: config.DB_USER,
            password: config.DB_PASSWORD,
            database: config.DB_DATABASE,
            ssl: config.DB_SSL_CA ? { ca: config.DB_SSL_CA, rejectUnauthorized: true } : { rejectUnauthorized: false }
        };
        connection = await mysql.createConnection(connectionConfig);
        await connection.connect();
        return true;
    } catch (error) {
        // F-48: la causa se traduce a lenguaje de usuario; el detalle del motor va solo al log
        console.error('db_utilsConn - prueba de conexión: ' + detalleParaLog(error));
        const causa = mensajeDeCausa(error);
        throw new ErrorDeNegocio(
            causa || 'No se ha podido conectar con esos datos. La causa no se ha podido identificar; consulta el registro del servidor.',
            400
        );
    } finally {
        if (connection) await connection.end();
    }
};

/** Claves que admite el fichero de configuración (S-03). */
export const CLAVES_PERMITIDAS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'DB_SSL_CA', 'DB_MAINT_USER', 'DB_MAINT_PASSWORD'];


/** Salto de línea real y su representación guardada (barra invertida y ene). */
const SALTO = String.fromCharCode(10);
const ESCAPE_SALTO = String.fromCharCode(92) + 'n';

/** Lee las claves del fichero de configuración; objeto vacío si no existe (S-03). */
async function leerClavesDelFichero() {
    const existe = await fs
        .access(dbConfigPath)
        .then(() => true)
        .catch(() => false);

    if (!existe) return {};

    return dotenv.parse(await fs.readFile(dbConfigPath, 'utf-8'));
}

/**
 * S-03: rechaza claves que no formen parte del fichero de conexión.
 * @param {Object} config Claves recibidas.
 */
export function validarClaves(config) {
    const desconocidas = Object.keys(config || {}).filter((clave) => !CLAVES_PERMITIDAS.includes(clave));

    if (desconocidas.length > 0) {
        throw new ErrorDeNegocio(
            'La configuración incluye claves no admitidas: «' + desconocidas.join('», «') + '». Solo se guardan los parámetros de conexión, el certificado de la CA y las credenciales de mantenimiento.',
            400,
            'CLAVES_NO_ADMITIDAS'
        );
    }
}

/**
 * S-03: prepara un valor para el formato que lee dotenv.
 *
 * Probado con una tabla de casos: dotenv solo convierte el escape de salto de línea; no
 * deshace las barras invertidas ni las comillas escapadas, y corta el valor en la
 * almohadilla si no va entrecomillado. Por eso la barra invertida no se toca y el salto de
 * línea se guarda como dos caracteres.
 *
 * Se exporta para poder comprobarlo con una prueba de ida y vuelta.
 *
 * @param {string} clave Nombre de la clave.
 * @param {string} valor Valor recibido.
 * @returns {string} Valor listo para escribir.
 */
export function serializarValor(clave, valor) {
    const texto = String(valor ?? '');

    if (texto.includes(ESCAPE_SALTO)) {
        throw new ErrorDeNegocio(
            'El valor de «' + clave + '» contiene una secuencia que se confunde con un salto de línea guardado. Cámbialo o edita el fichero a mano.',
            400,
            'VALOR_AMBIGUO'
        );
    }

    const tieneSalto = texto.includes(SALTO);

    if (tieneSalto && clave !== 'DB_SSL_CA') {
        throw new ErrorDeNegocio(
            'El valor de «' + clave + '» no puede contener saltos de línea. El único campo que los admite es el certificado de la CA.',
            400,
            'VALOR_CON_SALTO'
        );
    }

    const sinComillas = !texto.includes('"') && !texto.includes("'");

    if (sinComillas && !texto.includes('#') && texto === texto.trim() && !tieneSalto) return texto;

    const comilla = texto.includes('"') ? "'" : '"';

    if (texto.includes(comilla)) {
        throw new ErrorDeNegocio(
            'El valor de «' + clave + '» mezcla comillas simples y dobles. Quita unas u otras para poder guardarlo.',
            400,
            'VALOR_CON_COMILLAS'
        );
    }

    return comilla + texto.split(SALTO).join(ESCAPE_SALTO) + comilla;
}

/** Nombres legibles de los campos obligatorios, para los mensajes. */
const NOMBRE_DE_CAMPO = {
    DB_HOST: 'host',
    DB_PORT: 'puerto',
    DB_USER: 'usuario',
    DB_DATABASE: 'base de datos'
};

/** Campos obligatorios de la conexión. */
const CAMPOS_OBLIGATORIOS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_DATABASE'];

/** Campos opcionales no secretos: vacío significa «eliminar la clave». */
const CLAVES_OPCIONALES = ['DB_SSL_CA', 'DB_MAINT_USER'];

/**
 * S-03: comprueba los campos obligatorios y el puerto.
 *
 * Se aplica también en el servidor, no solo en la pantalla: una llamada directa a la API no
 * puede guardar una conexión sin host, sin usuario o con un puerto imposible.
 *
 * @param {Object} config Configuración recibida.
 */
export function validarCamposObligatorios(config) {
    const datos = config || {};
    const vacios = CAMPOS_OBLIGATORIOS.filter((clave) => String(datos[clave] ?? '').trim() === '');

    if (vacios.length > 0) {
        throw new ErrorDeNegocio(
            'Faltan datos obligatorios de la conexión: «' + vacios.map((clave) => NOMBRE_DE_CAMPO[clave] || clave).join('», «') + '».',
            400,
            'CAMPOS_OBLIGATORIOS'
        );
    }

    const puerto = Number(String(datos.DB_PORT).trim());

    if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
        throw new ErrorDeNegocio('El puerto de la base de datos debe ser un número entre 1 y 65535.', 400, 'PUERTO_NO_VALIDO');
    }
}

/**
 * S-03: estado final que se guardaría, a partir de lo recibido y de lo que ya hay.
 *
 * - Los campos obligatorios se guardan sin espacios sobrantes.
 * - La CA y el usuario de mantenimiento son opcionales y no secretos: si llegan vacíos se
 *   elimina la clave; si la clave no llega, se conserva la que estaba.
 * - Las contraseñas no se tocan si llegan vacías o no llegan.
 * - Al quitar el usuario de mantenimiento se quita también su contraseña.
 * - Una contraseña de mantenimiento sin usuario, o un usuario nuevo sin contraseña, son
 *   errores de negocio: la contraseña anterior no sirve para otro usuario.
 *
 * `actual` permite fijar el estado guardado en las pruebas.
 *
 * @param {Object} config Cambios recibidos.
 * @param {{ actual?: Object|null }} [opciones] Estado guardado, para las pruebas.
 * @returns {Promise<Object>} Estado que se escribiría en el fichero.
 */
export async function calcularConfiguracionFinal(config, { actual = null } = {}) {
    const datos = { ...(config || {}) };
    const guardado = actual ?? (await leerClavesDelFichero());
    const final = { ...guardado };

    validarCamposObligatorios(datos);

    for (const clave of CAMPOS_OBLIGATORIOS) final[clave] = String(datos[clave]).trim();

    for (const clave of CLAVES_OPCIONALES) {
        if (!Object.prototype.hasOwnProperty.call(datos, clave)) continue;

        const texto = String(datos[clave] ?? '').trim();

        if (texto === '') delete final[clave];
        else final[clave] = texto;
    }

    final.DB_PASSWORD = datos.DB_PASSWORD ? String(datos.DB_PASSWORD) : String(guardado.DB_PASSWORD ?? '');

    const usuarioGuardado = String(guardado.DB_MAINT_USER ?? '');
    const usuarioNuevo = String(final.DB_MAINT_USER ?? '');
    const contrasenaNueva = datos.DB_MAINT_PASSWORD ? String(datos.DB_MAINT_PASSWORD) : '';

    if (usuarioNuevo !== usuarioGuardado && usuarioNuevo !== '' && contrasenaNueva === '') {
        throw new ErrorDeNegocio(
            'El usuario de mantenimiento ha cambiado: escribe también su contraseña, porque la anterior no sirve para otro usuario.',
            400,
            'MANTENIMIENTO_SIN_CONTRASENA'
        );
    }

    if (contrasenaNueva !== '' && usuarioNuevo === '') {
        throw new ErrorDeNegocio(
            'Hay una contraseña de mantenimiento sin usuario de mantenimiento. Escribe el usuario o deja la contraseña vacía.',
            400,
            'MANTENIMIENTO_SIN_USUARIO'
        );
    }

    if (usuarioNuevo === '') {
        delete final.DB_MAINT_USER;
        delete final.DB_MAINT_PASSWORD;
    } else if (contrasenaNueva !== '') {
        final.DB_MAINT_PASSWORD = contrasenaNueva;
    }

    if (final.DB_MAINT_PASSWORD && !final.DB_MAINT_USER) {
        throw new ErrorDeNegocio(
            'La configuración guardada tiene una contraseña de mantenimiento sin usuario. Escribe el usuario o borra la contraseña.',
            400,
            'MANTENIMIENTO_SIN_USUARIO'
        );
    }

    return final;
}

/**
 * Guarda la nueva configuración de la base de datos en el archivo de conexión.
 *
 * S-03: valida los datos, calcula el estado final (fusionando con lo guardado) y escribe.
 * Crea una copia de seguridad del archivo anterior.
 *
 * @param {Object} config - Cambios a guardar.
 * @returns {Promise<void>}
 */
export const saveDbConfig = async (config) => {
    try {
        validarClaves(config);

        const guardado = await leerClavesDelFichero();
        const final = await calcularConfiguracionFinal(config, { actual: guardado });

        // DC-09: se registra el efecto, nunca los valores
        if (guardado.DB_SSL_CA && !final.DB_SSL_CA) {
            console.log('db_utilsConn - configuración: se ha eliminado la CA TLS; sin ella la conexión vuelve a no verificar el certificado');
        }

        if (guardado.DB_MAINT_USER && !final.DB_MAINT_USER) {
            console.log('db_utilsConn - configuración: se ha eliminado el usuario de mantenimiento; las copias usarán el de la aplicación');
        }

        const serializada = {};

        for (const [clave, valor] of Object.entries(final)) {
            serializada[clave] = serializarValor(clave, valor);
        }

        // Crear backup si el fichero existe
        if (
            await fs
                .access(dbConfigPath)
                .then(() => true)
                .catch(() => false)
        ) {
            await fs.copyFile(dbConfigPath, dbBackupPath);
        }

        const configString = Object.entries(serializada)
            .map(([key, value]) => key + '=' + value)
            .join(SALTO);

        await fs.writeFile(dbConfigPath, configString, { encoding: 'utf-8', mode: 0o600 });
    } catch (error) {
        if (esErrorDeNegocio(error)) throw error;
        console.error('db_utilsConn - guardado de la configuración: ' + detalleParaLog(error));
        throw new ErrorDeNegocio('No se ha podido guardar la configuración. Comprueba el permiso de escritura y el espacio en disco del servidor.', 500);
    }
};

/**
 * Restaura la configuración de la base de datos desde el archivo de backup.
 * @returns {Promise<void>}
 */
export const restoreDbConfig = async () => {
    // F-48: que no haya copia es un estado esperado, no un fallo del servidor
    if (
        !(await fs
            .access(dbBackupPath)
            .then(() => true)
            .catch(() => false))
    ) {
        throw new ErrorDeNegocio('No hay ninguna copia de la configuración guardada que se pueda restaurar.', 409, 'SIN_COPIA');
    }

    try {
        await fs.copyFile(dbBackupPath, dbConfigPath);
        await fs.unlink(dbBackupPath); // Eliminar el backup después de restaurar
    } catch (error) {
        console.error('db_utilsConn - restauración de la configuración: ' + detalleParaLog(error));
        throw new ErrorDeNegocio('No se ha podido restaurar la copia de la configuración. Comprueba los permisos del archivo.', 500);
    }
};
