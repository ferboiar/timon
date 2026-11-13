/**
 * Módulo de conexión a la base de datos
 *
 * Este módulo proporciona funcionalidades para establecer y gestionar conexiones
 * a la base de datos MySQL. Implementa un pool de conexiones para optimizar
 * el rendimiento y la gestión de recursos. Lee los parámetros de conexión
 * desde un archivo externo por seguridad.
 *
 * @module db_connection
 */

import dotenv from 'dotenv';
import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// S-03: misma ruta configurable que db_utilsConn (DB_CONFIG_PATH)
const dbConfigPath = process.env.DB_CONFIG_PATH ? path.resolve(process.env.DB_CONFIG_PATH) : path.join(__dirname, '.db_connection');

let pool;
let poolEnCurso = null;

// Configuración del pool a partir de las variables de entorno; se exporta para probarla sin base de datos (F-13, DC-05)
function construirConfiguracionPool(entorno = process.env, { ca = null } = {}) {
    return {
        host: entorno.DB_HOST,
        port: parseInt(entorno.DB_PORT, 10),
        user: entorno.DB_USER,
        password: entorno.DB_PASSWORD,
        database: entorno.DB_DATABASE,
        ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
        timezone: 'Z', // Las fechas y horas viajan en UTC; la zona horaria de la aplicación se aplica al calcular "hoy" y al mostrarlas (DC-25)
        dateStrings: ['DATE'], // F-13, DC-05: las columnas DATE llegan como texto YYYY-MM-DD, sin hora ni zona; TIMESTAMP y DATETIME siguen siendo instantes (Date)
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
}

/** Claves de conexión que pueden venir del entorno o del fichero (S-03, V6). */
const CLAVES_DE_CONEXION = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'DB_SSL_CA'];

/** Claves que identifican la conexión: si las define el entorno, el fichero no manda. */
const CLAVES_DE_IDENTIDAD = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_DATABASE'];

/** Salto de línea, sin escapes, para componer mensajes. */
const SALTO_LINEA = String.fromCharCode(10);

/** Lee el fichero de configuración sin tocar el entorno del proceso (S-03, V6). */
function leerConfiguracionDelFichero() {
    try {
        if (!fs.existsSync(dbConfigPath)) return {};

        return dotenv.parse(fs.readFileSync(dbConfigPath));
    } catch (error) {
        console.error('db_connection - lectura de la configuración: ' + (error && error.message ? error.message : 'error desconocido'));

        return {};
    }
}

/**
 * S-03/V6: configuración efectiva de la conexión.
 *
 * Manda el entorno: la clave que esté definida en el proceso se usa tal cual y el resto se
 * toma del fichero. No se usa dotenv.config, así que el fichero no contamina el entorno y
 * recrearPool puede releerlo sin reiniciar el proceso.
 *
 * @param {Object} entorno Variables de entorno a considerar.
 * @returns {{ valores: Object, ca: (string|null), delEntorno: string[] }}
 */
function configuracionEfectiva(entorno = process.env) {
    const fichero = leerConfiguracionDelFichero();
    const valores = {};
    const delEntorno = [];

    for (const clave of CLAVES_DE_CONEXION) {
        const delProceso = entorno[clave];

        if (delProceso !== undefined && delProceso !== '') {
            valores[clave] = delProceso;
            delEntorno.push(clave);
        } else {
            valores[clave] = fichero[clave];
        }
    }

    return { valores, ca: valores.DB_SSL_CA || null, delEntorno };
}

/** Crea el pool con la configuración efectiva en este momento. */
async function crearPool() {
    try {
        const { valores, ca } = configuracionEfectiva();

        if (!valores.DB_HOST && !fs.existsSync(dbConfigPath)) {
            throw new Error(
                'El archivo de configuración no existe: ' + dbConfigPath + SALTO_LINEA +
                    'Crea el fichero de conexión en esa ruta con el host, el puerto, el usuario, la contraseña y la base de datos.'
            );
        }

        const config = construirConfiguracionPool(valores, { ca });

        // Verificar que todos los parámetros necesarios estén definidos
        const requiredParams = ['host', 'port', 'user', 'password', 'database'];

        for (const param of requiredParams) {
            if (!config[param]) {
                throw new Error('Parámetro de conexión faltante: ' + param);
            }
        }

        if (!ca) console.warn('db_connection - TLS sin verificación de CA; configura DB_SSL_CA para verificarlo');

        pool = mysql.createPool(config);

        // Cada conexión trabaja en UTC, sea cual sea la configuración del servidor de base de datos (DC-25)
        pool.pool.on('connection', (conexion) => {
            conexion.query("SET time_zone = '+00:00'");
        });

        console.log('Conexión a la base de datos establecida correctamente');

        return pool;
    } catch (error) {
        console.error('Error al inicializar el pool de conexiones:', error);
        throw new Error('No se pudo configurar la conexión a la base de datos.');
    }
}

/**
 * S-03: inicializa el pool una sola vez.
 *
 * Las llamadas concurrentes comparten la misma promesa en curso, así que no se llegan a
 * crear dos pools.
 *
 * @returns {Promise<Object>} Pool de conexiones.
 */
function initPool() {
    if (pool) return Promise.resolve(pool);

    if (!poolEnCurso) {
        poolEnCurso = crearPool().finally(() => {
            poolEnCurso = null;
        });
    }

    return poolEnCurso;
}

/**
 * S-03: recrea el pool tras guardar cambios de configuración.
 *
 * Si el entorno define la conexión (por ejemplo, el fichero de pruebas), no hay nada que
 * recargar: se avisa y se conserva la conexión actual.
 *
 * Si la configuración viene del fichero, se crea el pool nuevo y se intercambia la
 * referencia: las peticiones que lleguen a partir de ese momento usan la conexión nueva y
 * las que estaban en curso terminan con la anterior. El pool anterior se cierra en segundo
 * plano, cuando sus conexiones se liberan, sin retener la petición que guarda.
 *
 * @returns {Promise<{ recreado: boolean, motivo: string }>}
 */
async function recrearPool() {
    const { delEntorno } = configuracionEfectiva();
    const deEntorno = CLAVES_DE_IDENTIDAD.filter((clave) => delEntorno.includes(clave));

    if (deEntorno.length === CLAVES_DE_IDENTIDAD.length) {
        console.log('db_connection - pool: la conexión viene del entorno (' + deEntorno.join(', ') + '); se conserva la conexión actual');

        return { recreado: false, motivo: 'entorno' };
    }

    // Si hay una creación en curso, se espera para no montar dos pools a la vez
    if (poolEnCurso) await poolEnCurso;

    const anterior = pool;
    const nuevo = await crearPool();

    if (anterior && anterior !== nuevo) {
        anterior.end().catch((error) => {
            console.error('db_connection - cierre del pool anterior: ' + (error && error.message ? error.message : 'error desconocido'));
        });
    }

    console.log('db_connection - pool: conexión recreada sin cortar las peticiones en curso');

    return { recreado: true, motivo: 'fichero' };
}

async function getConnection() {
    if (!pool) {
        await initPool();
    }
    return pool.getConnection();
}

/**
 * Ejecuta una operación dentro de una transacción de base de datos (F-27, DC-39).
 *
 * - Si conexionExterna es null: toma una conexión del pool, inicia la transacción y ejecuta la operación. Si termina
 *   bien, confirma (commit); si lanza un error, lo deshace todo (rollback) y relanza ese mismo error. La conexión se
 *   devuelve siempre al pool.
 * - Si conexionExterna ya existe: la operación forma parte de la transacción de quien la llama. Aquí no se abre otra
 *   ni se confirma nada: el commit o el rollback los decide quien abrió la transacción. Así una función interna, por
 *   ejemplo la que genera el plan de pagos, sirve igual suelta que dentro de una operación mayor.
 *
 * La operación recibe la conexión y debe usarla para todas sus consultas; las que hagan otra conexión del pool
 * quedarían fuera de la transacción.
 */
async function enTransaccion(conexionExterna, operacion) {
    if (conexionExterna) {
        return operacion(conexionExterna);
    }
    const connection = await getConnection();
    try {
        await connection.beginTransaction();
        const resultado = await operacion(connection);
        await connection.commit();
        console.log('enTransaccion - Transacción confirmada');
        return resultado;
    } catch (error) {
        try {
            await connection.rollback();
            console.log('enTransaccion - Transacción deshecha: ' + error.message);
        } catch (errorRollback) {
            // Si el rollback falla se conserva el error original, que es el que explica el problema
            console.error('enTransaccion - Error al deshacer la transacción:', errorRollback);
        }
        throw error;
    } finally {
        connection.release();
    }
}

// Cierra el pool (las pruebas lo usan para terminar limpiamente)
async function closePool() {
    if (pool) {
        await pool.end();
        pool = undefined;
    }

    poolEnCurso = null;
}

export { closePool, configuracionEfectiva, construirConfiguracionPool, enTransaccion, getConnection, initPool, recrearPool };
