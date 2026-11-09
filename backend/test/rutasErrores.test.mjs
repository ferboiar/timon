// F-47 y F-48: guarda estática de las rutas y módulos de datos incluidos. No necesita base de datos.
// Es complementaria: no sustituye a las pruebas unitarias ni a las de interfaz.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, test } from 'node:test';

/** Rutas incluidas en F-47 y F-48. */
const RUTAS = ['cuentas', 'ahorros', 'categorias', 'recibos', 'users', 'conexionDB', 'mantenimientoDB', 'anticipos', 'ajustes'];

/** Módulos de datos y utilidades que construyen mensajes visibles. */
const MODULOS = [
    'backend/src/db/db_utilsUsers.mjs',
    'backend/src/db/db_utilsAdv.mjs',
    'backend/src/db/db_utilsConn.mjs',
    'backend/src/db/db_maintenance.mjs',
    'backend/src/db/db_ajustes.mjs',
    'backend/src/utils/parametros.mjs',
    'backend/src/utils/catalogoErrores.mjs'
];

/** Prefijos técnicos que ya no deben aparecer en ninguna respuesta. */
const PREFIJOS = [
    'Error al insertar o actualizar la cuenta: ',
    'Error al insertar o actualizar el ahorro: ',
    'Error al insertar o actualizar el movimiento: ',
    'Error al insertar o actualizar la categoría: ',
    'Error al insertar o actualizar el recibo: ',
    'API. '
];

/** Textos prohibidos dentro de un mensaje visible. */
const CADENAS_PROHIBIDAS = [
    [/ER_[A-Z_]{3,}/, 'código del motor ER_*'],
    [/\b(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|EHOSTUNREACH|ECONNRESET|ENOENT|EACCES|ENOSPC)\b/, 'código del sistema'],
    [/PROTOCOL_CONNECTION_LOST/, 'código del sistema'],
    [/\b(errno|sqlMessage|sqlState|stack|stderr)\b/, 'término técnico'],
    [/\b(SELECT|INSERT|UPDATE|DELETE FROM|DROP TABLE|CREATE TABLE)\b/, 'sentencia SQL'],
    [/\b(users|users_style_preferences|anticipos_pagos|ajustes_sistema|fechas_cargo|recibos_historico|categorias)\b/, 'nombre de tabla'],
    [/\.db_connection/, 'ruta de fichero'],
    [/\/workspaces/, 'ruta del contenedor'],
    [/^Error en la operación\.?$/, 'mensaje vacío de contenido'],
    [/^Datos inválidos\.?$/, 'mensaje vacío de contenido']
];

function leer(relativa) {
    return fs.readFileSync(new URL('../../' + relativa, import.meta.url), 'utf8');
}

function leerRuta(nombre) {
    return leer('backend/src/routes/' + nombre + '.mjs');
}

/** Líneas que responden al cliente (se excluyen las trazas de consola). */
function lineasDeRespuesta(texto) {
    return texto
        .split('\n')
        .filter((linea) => !linea.includes('console.'))
        .filter((linea) => /\bres\.(status|json|send)\b/.test(linea));
}

/**
 * Mensajes que puede llegar a ver una persona: los que se lanzan como error de negocio,
 * los que se devuelven en el campo `error`/`message` y los que devuelve el catálogo.
 */
function mensajesVisibles(texto) {
    const mensajes = [];
    const patrones = [
        /ErrorDeNegocio\(\s*'([^']+)'/g,
        /errorHttp\(\s*\d+\s*,\s*'([^']+)'/g,
        /(?:^|[{,]\s*)(?:message|error):\s*'([^']+)'/gm,
        /return '([^']{15,})'/g
    ];

    for (const patron of patrones) {
        for (const coincidencia of texto.matchAll(patron)) {
            mensajes.push(coincidencia[1]);
        }
    }

    return mensajes;
}

describe('rutas incluidas en F-47 y F-48', () => {
    for (const nombre of RUTAS) {
        test(`${nombre}.mjs no responde con details: error.stack ni prefijos técnicos`, () => {
            const texto = leerRuta(nombre);

            assert.equal(texto.includes('details: error.stack'), false, 'queda details: error.stack');
            for (const prefijo of PREFIJOS) {
                assert.equal(texto.includes(prefijo), false, `queda el prefijo «${prefijo}»`);
            }
        });

        test(`${nombre}.mjs no devuelve error.message directamente al cliente`, () => {
            const sospechosas = lineasDeRespuesta(leerRuta(nombre)).filter((linea) => linea.includes('error.message'));
            assert.deepEqual(sospechosas, [], `respuestas con error.message: ${sospechosas.join(' | ')}`);
        });

        test(`${nombre}.mjs usa la utilidad compartida`, () => {
            const texto = leerRuta(nombre);
            assert.equal(texto.includes('responderError'), true, 'no usa responderError');
            assert.equal(/function responderError/.test(texto), false, 'define su propia responderError');
        });
    }

    test('mantenimientoDB.mjs ya no clasifica el fallo por el texto del mensaje', () => {
        const texto = leerRuta('mantenimientoDB');
        assert.equal(texto.includes("includes('fichero no parece ser un volcado')"), false);
        assert.equal(texto.includes('error.message.includes'), false);
    });

    test('cuentas.mjs conserva el 409 del IBAN sin doble respuesta', () => {
        const texto = leerRuta('cuentas');
        assert.equal(texto.includes("error.codigo === 'IBAN_DUPLICADO'"), true, 'no comprueba el código de negocio');
        assert.equal(texto.includes('return res.status(409)'), false, 'queda una respuesta propia del 409');
    });
});

describe('mensajes visibles (F-48)', () => {
    const ficheros = [...RUTAS.map((nombre) => 'backend/src/routes/' + nombre + '.mjs'), ...MODULOS];

    test('ningún mensaje visible contiene códigos, SQL, tablas ni rutas', () => {
        const problemas = [];

        for (const fichero of ficheros) {
            for (const mensaje of mensajesVisibles(leer(fichero))) {
                for (const [patron, etiqueta] of CADENAS_PROHIBIDAS) {
                    if (patron.test(mensaje)) problemas.push(`${fichero}: «${mensaje}» contiene ${etiqueta}`);
                }
            }
        }

        assert.deepEqual(problemas, []);
    });

    test('no queda el texto genérico que se retiró', () => {
        const prohibido = 'No se ha podido completar la operación por un problema del servidor';

        for (const fichero of ficheros) {
            assert.equal(leer(fichero).includes(prohibido), false, `${fichero} conserva el texto genérico retirado`);
        }
    });

    test('los mensajes de negocio superan una longitud mínima', () => {
        for (const fichero of MODULOS) {
            for (const mensaje of mensajesVisibles(leer(fichero))) {
                assert.ok(mensaje.trim().length >= 10, `${fichero}: mensaje demasiado corto «${mensaje}»`);
            }
        }
    });

    test('db_utilsUsers resuelve el duplicado por el nombre del índice', () => {
        const texto = leer('backend/src/db/db_utilsUsers.mjs');

        assert.equal(texto.includes('campoDuplicado'), true, 'no usa el catálogo para el duplicado');
        assert.equal(texto.includes("error.message.includes('email')"), false, 'sigue clasificando por subcadena');
        assert.equal(texto.includes("error.message.includes('username_UNIQUE')"), false, 'sigue clasificando por subcadena');
    });
});
