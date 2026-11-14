/**
 * Utilidades para la gestión de la base de datos.
 *
 * Incluye funciones para realizar copias de seguridad y restauraciones.
 *
 * S-02: la contraseña no viaja en la línea de comandos. Se entrega al cliente de MySQL
 * por un fichero de opciones temporal (modo 600) que se borra al terminar, así que no
 * aparece ni en `ps` ni en el log. Los comandos se ejecutan sin shell y con los
 * argumentos en un array.
 *
 * O-06: el volcado incluye rutinas y eventos (--routines --events). El estado del evento
 * viaja en su definición y el DEFINER se conserva: la copia y la restauración son fieles y
 * no se transforma el SQL. Si el DEFINER no coincide con la cuenta que restaura, MariaDB
 * exige el privilegio SET USER. O-08: la migración 0007 normaliza los objetos vivos para
 * que las copias nuevas se restauren con la misma cuenta sin SET USER.
 *
 * @module db/db_maintenance
 */

import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { pipeline } from 'stream/promises';
import { getDbConfig, getDbMaintPassword, getDbPassword } from './db_utilsConn.mjs';
import { detalleParaLog, ErrorDeNegocio, esErrorDeNegocio } from '../utils/errorDeNegocio.mjs';

/** Límite del volcado que se acepta restaurar (S-02). */
export const MAX_BYTES_VOLCADO = 100 * 1024 * 1024;

/** Texto del 413, compartido con la ruta de restauración (S-02). */
export const MENSAJE_VOLCADO_DEMASIADO_GRANDE = 'El fichero supera el límite de 100 MB. Reduce el tamaño o divide el volcado.';

/** Líneas que se revisan al validar un volcado: cabecera, DROP y CREATE aparecen antes. */
const MAX_LINEAS_VALIDACION = 10000;

/** Espacio libre mínimo exigido en el directorio temporal antes de la copia previa. */
const ESPACIO_MINIMO_TEMPORAL = 100 * 1024 * 1024;

/**
 * F-48: una configuración incompleta es un estado que el administrador puede corregir
 * (409), no un fallo del servidor. Se indica qué dato falta.
 *
 * S-02/DC-06: se comprueban las credenciales que se van a usar de verdad (las de
 * mantenimiento si están definidas), no siempre las de la aplicación.
 *
 * @param {Object} config Configuración de la conexión sin contraseñas.
 * @param {{ usuario?: string, contrasena?: string }} credenciales Credenciales efectivas.
 */
function exigirConfiguracionCompleta(config, credenciales = {}) {
    const faltan = [];

    if (!config.DB_HOST) faltan.push('host');
    if (!config.DB_PORT) faltan.push('puerto');
    if (!credenciales.usuario) faltan.push('usuario');
    if (!credenciales.contrasena) faltan.push('contraseña');
    if (!config.DB_DATABASE) faltan.push('base de datos');

    if (faltan.length > 0) {
        throw new ErrorDeNegocio('La configuración de la base de datos está incompleta: falta «' + faltan.join('», «') + '». Revísala en la pestaña Base de Datos.', 409, 'CONFIGURACION_INCOMPLETA');
    }
}

/**
 * S-02/DC-06: credenciales del mantenimiento.
 *
 * Se usan DB_MAINT_USER y DB_MAINT_PASSWORD cuando están definidas; si no, las de la
 * aplicación. Si solo está definida una de las dos, se avisa y se usan las de la
 * aplicación: es preferible una copia con el usuario de siempre a una que falle por una
 * configuración a medias.
 *
 * @param {Object} config Configuración de la conexión sin contraseñas.
 * @returns {Promise<{ usuario: string, contrasena: string }>}
 */
async function resolverCredenciales(config) {
    const usuarioMantenimiento = String(process.env.DB_MAINT_USER || config.DB_MAINT_USER || '').trim();
    const contrasenaMantenimiento = await getDbMaintPassword();

    if (usuarioMantenimiento && contrasenaMantenimiento) {
        return { usuario: usuarioMantenimiento, contrasena: contrasenaMantenimiento };
    }

    if (usuarioMantenimiento || contrasenaMantenimiento) {
        console.warn('db_maintenance - credenciales: DB_MAINT_USER y DB_MAINT_PASSWORD deben definirse juntos; se usan las de la aplicación');
    }

    return { usuario: config.DB_USER, contrasena: await getDbPassword() };
}

/** Valor listo para un fichero de opciones de MySQL: entrecomillado y con sus escapes. */
function valorDeOpcion(valor) {
    return '"' + String(valor).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/**
 * S-02: prepara las credenciales sin exponerlas en la línea de comandos.
 *
 * Lo normal es un fichero de opciones temporal con modo 600 (--defaults-extra-file), que
 * se borra al terminar. Los ficheros de opciones recortan los espacios del final del
 * valor, así que una contraseña que acabe en espacio se pasa por la variable MYSQL_PWD
 * del proceso del cliente, que tampoco aparece en ps.
 *
 * @returns {Promise<{ argumentos: string[], entorno: Object, limpiar: Function }>}
 */
async function prepararCredenciales(config, credenciales) {
    if (/\s$/.test(credenciales.contrasena)) {
        console.warn('db_maintenance - credenciales: la contraseña termina en un espacio; se pasa por el entorno del cliente de MySQL');
        return { argumentos: [], entorno: { MYSQL_PWD: credenciales.contrasena }, limpiar: async () => {} };
    }

    const ruta = path.join(os.tmpdir(), 'timon-mysql-' + crypto.randomUUID() + '.cnf');
    const contenido = ['[client]', 'host=' + valorDeOpcion(config.DB_HOST), 'port=' + valorDeOpcion(config.DB_PORT), 'user=' + valorDeOpcion(credenciales.usuario), 'password=' + valorDeOpcion(credenciales.contrasena), ''].join('\n');

    await fsp.writeFile(ruta, contenido, { mode: 0o600 });

    return {
        argumentos: ['--defaults-extra-file=' + ruta],
        entorno: {},
        limpiar: async () => {
            await fsp.unlink(ruta).catch(() => {});
        }
    };
}

/** Error técnico de una herramienta externa: conserva el código de salida para el catálogo. */
function errorDeHerramienta(herramienta, codigo, detalle) {
    const limpio = String(detalle || '').trim();
    const error = new Error(herramienta + ' terminó con código ' + codigo + (limpio ? ': ' + limpio : ''));

    error.code = String(codigo);

    return error;
}

/** Argumentos del volcado. O-06: incluye rutinas y eventos; MariaDB 11.8 no tiene --skip-definer. */
function argumentosDeVolcado(config, credenciales) {
    return [...credenciales.argumentos, '--single-transaction', '--routines', '--events', config.DB_DATABASE];
}

/** Argumentos de la restauración. */
function argumentosDeRestauracion(config, credenciales) {
    return [...credenciales.argumentos, config.DB_DATABASE];
}

/** Vuelca la base en `destino` con mysqldump, sin shell y sin contraseña en los argumentos. */
async function volcarBase(config, credenciales, destino) {
    const proceso = spawn('mysqldump', argumentosDeVolcado(config, credenciales), {
        env: { ...process.env, ...credenciales.entorno },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let errores = '';

    proceso.stderr.on('data', (trozo) => {
        errores += trozo.toString();
    });

    const cerrado = new Promise((resolver, rechazar) => {
        proceso.on('close', resolver);
        proceso.on('error', rechazar);
    });

    await pipeline(proceso.stdout, fs.createWriteStream(destino, { mode: 0o600 }));

    const codigo = await cerrado;

    if (codigo !== 0) throw errorDeHerramienta('mysqldump', codigo, errores);
}

/** Restaura el volcado con mysql, sin shell y sin contraseña en los argumentos. */
async function restaurarVolcado(config, credenciales, fichero) {
    const proceso = spawn('mysql', argumentosDeRestauracion(config, credenciales), {
        env: { ...process.env, ...credenciales.entorno },
        stdio: ['pipe', 'ignore', 'pipe']
    });

    let errores = '';

    proceso.stderr.on('data', (trozo) => {
        errores += trozo.toString();
    });

    const cerrado = new Promise((resolver, rechazar) => {
        proceso.on('close', resolver);
        proceso.on('error', rechazar);
    });

    try {
        await pipeline(fs.createReadStream(fichero), proceso.stdin);
    } catch (error) {
        // Si mysql cierra la entrada antes de tiempo (credenciales rechazadas), manda su código
        if (error.code !== 'EPIPE') throw error;
    }

    const codigo = await cerrado;

    if (codigo !== 0) {
        // O-06: el SQL incluye DEFINER. Sin SET USER, MariaDB responde 1227 y la carga se corta.
        if (/\bERROR 1227\b/.test(errores)) {
            throw new ErrorDeNegocio(
                'La copia contiene rutinas o eventos con un DEFINER de otra cuenta. La restauración reproduce el DEFINER tal cual y la cuenta actual no tiene SET USER. Restaura con la cuenta que creó los objetos o con una que tenga SET USER; las copias antiguas con DEFINER=root@% seguirán necesitándolo.',
                409,
                'RESTAURACION_SIN_SET_USER'
            );
        }

        throw errorDeHerramienta('mysql', codigo, errores);
    }
}

/** Comprueba que el directorio temporal tiene espacio para la copia previa (S-02). */
async function comprobarEspacioTemporal() {
    try {
        const datos = await fsp.statfs(os.tmpdir());
        const libre = Number(datos.bavail) * Number(datos.bsize);

        if (libre < ESPACIO_MINIMO_TEMPORAL) {
            throw new ErrorDeNegocio('No hay espacio suficiente en el directorio temporal del servidor para guardar la copia previa. Libera espacio e inténtalo de nuevo.', 507, 'SIN_ESPACIO_TEMPORAL');
        }
    } catch (error) {
        if (esErrorDeNegocio(error)) throw error;
        console.warn('db_maintenance - espacio temporal: no se ha podido comprobar; se continúa (' + detalleParaLog(error) + ')');
    }
}

/**
 * Realiza un backup de la base de datos usando mysqldump.
 * @param {string} backupFilePath - La ruta donde se guardará el archivo de backup.
 */
export const backupDb = async (backupFilePath) => {
    let credenciales;
    let iniciado = false;

    try {
        const { config } = await getDbConfig();
        const efectivas = await resolverCredenciales(config);

        exigirConfiguracionCompleta(config, efectivas);

        credenciales = await prepararCredenciales(config, efectivas);

        // DC-09: base y servidor; nunca usuario ni contraseña
        console.log('db_maintenance - backup: base ' + config.DB_DATABASE + ' en ' + config.DB_HOST + ':' + config.DB_PORT);

        iniciado = true;
        await volcarBase(config, credenciales, backupFilePath);

        const { size } = await fsp.stat(backupFilePath);

        console.log('db_maintenance - backup: volcado generado (' + size + ' bytes)');
    } catch (error) {
        // F-48: el detalle va al log; la ruta compone el mensaje con el catálogo de causas
        if (!esErrorDeNegocio(error)) console.error('db_maintenance - copia de seguridad: ' + detalleParaLog(error));
        if (iniciado) await fsp.unlink(backupFilePath).catch(() => {});
        throw error;
    } finally {
        if (credenciales) await credenciales.limpiar();
    }
};

/**
 * Valida si un fichero parece ser un volcado SQL válido de mysqldump.
 *
 * S-02: primero se comprueba el tamaño (límite de 100 MB, respuesta 413) y después se
 * leen hasta 10 000 líneas buscando cabecera, DROP TABLE y CREATE TABLE. Antes solo se
 * miraban las 50 primeras.
 *
 * @param {string} filePath - La ruta al archivo .sql.
 * @returns {Promise<boolean>} - True si el fichero es válido, de lo contrario lanza un error.
 */
const validateSqlDump = async (filePath) => {
    const informacion = await fsp.stat(filePath);

    if (informacion.size > MAX_BYTES_VOLCADO) {
        throw new ErrorDeNegocio(MENSAJE_VOLCADO_DEMASIADO_GRANDE, 413, 'VOLCADO_DEMASIADO_GRANDE');
    }

    const fileStream = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity
    });

    let lineCount = 0;
    let foundDumpHeader = false;
    let foundDropTable = false;
    let foundCreateTable = false;

    for await (const line of fileStream) {
        lineCount++;
        // 1. Aceptar tanto MySQL como MariaDB
        if (line.includes('MySQL dump') || line.includes('MariaDB dump')) {
            foundDumpHeader = true;
        }
        // 2. Comprobar que existen sentencias DROP y CREATE
        if (line.includes('DROP TABLE IF EXISTS')) {
            foundDropTable = true;
        }
        if (line.includes('CREATE TABLE')) {
            foundCreateTable = true;
        }

        if (lineCount >= MAX_LINEAS_VALIDACION) {
            break;
        }
    }

    // 3. Devolver errores más específicos
    if (!foundDumpHeader) {
        throw new ErrorDeNegocio('El archivo no es una copia de seguridad de Timón: no contiene una cabecera de volcado de MySQL o MariaDB.', 400, 'VOLCADO_NO_VALIDO');
    }
    if (!foundDropTable || !foundCreateTable) {
        throw new ErrorDeNegocio('La copia de seguridad está incompleta: faltan las sentencias que crean las tablas.', 400, 'VOLCADO_INCOMPLETO');
    }

    return true;
};

/**
 * Restaura la base de datos desde un archivo de volcado SQL.
 *
 * S-02: orden estricto validar (incluye el tamaño) -> copia previa -> restaurar. Si la
 * restauración falla, la copia previa se conserva y su ruta queda en el log; si va bien,
 * se borra.
 *
 * @param {string} dumpFilePath - La ruta al archivo .sql que se va a restaurar.
 */
export const restoreDb = async (dumpFilePath) => {
    let credenciales;
    let copiaPrevia = null;

    try {
        // 1. Validar el fichero (tamaño incluido) antes de hacer nada
        await validateSqlDump(dumpFilePath);

        // 2. Configuración y credenciales efectivas
        const { config } = await getDbConfig();
        const efectivas = await resolverCredenciales(config);

        exigirConfiguracionCompleta(config, efectivas);

        credenciales = await prepararCredenciales(config, efectivas);

        // 3. Copia previa antes de sobrescribir nada
        await comprobarEspacioTemporal();

        const rutaCopia = path.join(os.tmpdir(), 'timon-pre-restore-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sql');

        try {
            await volcarBase(config, credenciales, rutaCopia);
        } catch (error) {
            // Un volcado parcial no sirve como copia previa
            await fsp.unlink(rutaCopia).catch(() => {});
            throw error;
        }

        copiaPrevia = rutaCopia;
        console.log('db_maintenance - copia previa: ' + copiaPrevia);

        // 4. Restaurar
        console.log('db_maintenance - restore: base ' + config.DB_DATABASE + ' desde ' + path.basename(dumpFilePath));

        await restaurarVolcado(config, credenciales, dumpFilePath);

        // 5. Retención: la copia se borra solo si la restauración ha ido bien
        try {
            await fsp.unlink(copiaPrevia);
            copiaPrevia = null;
        } catch (error) {
            console.error('db_maintenance - borrado de la copia previa: ' + detalleParaLog(error));
        }

        console.log('db_maintenance - restore: completada');
    } catch (error) {
        if (copiaPrevia) console.error('db_maintenance - restore: fallida; se conserva la copia previa en ' + copiaPrevia);
        // Re-lanzar el error para que el controlador de la ruta lo capture
        if (!esErrorDeNegocio(error)) console.error('db_maintenance - restauración: ' + detalleParaLog(error));
        throw error;
    } finally {
        if (credenciales) await credenciales.limpiar();
    }
};
