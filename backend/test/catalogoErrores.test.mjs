// F-48: catálogo compartido de causas de error. No necesita base de datos ni servidor.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    AUDIENCIA_ADMIN,
    AUDIENCIA_GENERAL,
    avisoDesconocido,
    campoDemasiadoLargo,
    campoDuplicado,
    codigoDeError,
    mensajeDeCausa,
    mensajeTecnico,
    nombreDeIndiceDuplicado
} from '../src/utils/catalogoErrores.mjs';

function errorCon(codigo, mensaje = 'fallo del motor', extra = {}) {
    const error = new Error(mensaje);
    error.code = codigo;
    return Object.assign(error, extra);
}

describe('código del error', () => {
    test('lee code, errno y la causa encadenada', () => {
        assert.equal(codigoDeError(errorCon('ECONNREFUSED')), 'ECONNREFUSED');
        assert.equal(codigoDeError({ errno: -111 }), '-111');
        assert.equal(codigoDeError({ cause: { code: 'ENOTFOUND' } }), 'ENOTFOUND');
        assert.equal(codigoDeError(new Error('sin código')), '');
        assert.equal(codigoDeError(null), '');
    });
});

describe('mensajeDeCausa', () => {
    test('base no accesible', () => {
        const esperado = 'No se puede acceder a la base de datos. Comprueba que el servicio esté en marcha y que la dirección y el puerto sean correctos.';
        for (const codigo of ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ECONNRESET']) {
            assert.equal(mensajeDeCausa(errorCon(codigo)), esperado, codigo);
        }
    });

    test('credenciales rechazadas', () => {
        assert.equal(
            mensajeDeCausa(errorCon('ER_ACCESS_DENIED_ERROR')),
            'El servidor de la base de datos ha rechazado el usuario o la contraseña de la configuración.'
        );
    });

    test('base inexistente', () => {
        assert.equal(mensajeDeCausa(errorCon('ER_BAD_DB_ERROR')), 'El servidor no tiene ninguna base de datos con ese nombre.');
    });

    test('dato referenciado', () => {
        const esperado = 'No se puede eliminar porque tiene datos asociados.';
        assert.equal(mensajeDeCausa(errorCon('ER_ROW_IS_REFERENCED_2')), esperado);
        assert.equal(mensajeDeCausa(errorCon('ER_ROW_IS_REFERENCED')), esperado);
    });

    test('base ocupada', () => {
        const esperado = 'La base de datos está ocupada. Inténtalo de nuevo en unos segundos.';
        assert.equal(mensajeDeCausa(errorCon('ER_LOCK_WAIT_TIMEOUT')), esperado);
        assert.equal(mensajeDeCausa(errorCon('ER_LOCK_DEADLOCK')), esperado);
    });

    test('disco o permisos', () => {
        const esperado = 'No hay espacio en disco o falta permiso de escritura en el servidor.';
        for (const codigo of ['ENOSPC', 'EACCES', 'EPERM']) {
            assert.equal(mensajeDeCausa(errorCon(codigo)), esperado, codigo);
        }
    });

    test('dato demasiado largo con el campo traducido', () => {
        const error = errorCon('ER_DATA_TOO_LONG', "Data too long for column 'descripcion' at row 1");
        assert.equal(campoDemasiadoLargo(error), 'descripcion');
        assert.equal(mensajeDeCausa(error), 'El valor de «descripción» es demasiado largo.');
    });

    test('dato demasiado largo con un campo sin traducir', () => {
        assert.equal(mensajeDeCausa(errorCon('ER_DATA_TOO_LONG', "Data too long for column 'raro' at row 1")), 'Uno de los datos es demasiado largo.');
    });

    test('herramienta de copia ausente por código de shell 127', () => {
        assert.equal(mensajeDeCausa(errorCon(127, 'Command failed: mysqldump …')), 'La herramienta de copia de seguridad no está instalada en el servidor.');
        assert.equal(mensajeDeCausa(errorCon('ENOENT')), 'La herramienta de copia de seguridad no está instalada en el servidor.');
    });

    test('causa desconocida o duplicado devuelven null', () => {
        assert.equal(mensajeDeCausa(errorCon('ER_NO_SUCH_TABLE')), null);
        assert.equal(mensajeDeCausa(new Error('sin código')), null);
        assert.equal(mensajeDeCausa(errorCon('ER_DUP_ENTRY', "Duplicate entry 'x' for key 'users.username_UNIQUE'")), null);
        assert.equal(mensajeDeCausa(null), null);
    });
});

describe('duplicado por campo', () => {
    test('resuelve el índice del nombre de usuario', () => {
        const error = errorCon('ER_DUP_ENTRY', "Duplicate entry 'e2e_usuario' for key 'users.username_UNIQUE'");
        assert.equal(nombreDeIndiceDuplicado(error), 'username_UNIQUE');
        assert.equal(campoDuplicado(error), 'nombre de usuario');
    });

    test('resuelve el índice del correo', () => {
        const error = errorCon('ER_DUP_ENTRY', "Duplicate entry 'a@b.c' for key 'users.email'");
        assert.equal(nombreDeIndiceDuplicado(error), 'email');
        assert.equal(campoDuplicado(error), 'correo');
    });

    test('admite el índice entre comillas invertidas', () => {
        const error = errorCon('ER_DUP_ENTRY', "Duplicate entry 'x' for key '`users`.`username_UNIQUE`'");
        assert.equal(nombreDeIndiceDuplicado(error), 'username_UNIQUE');
    });

    test('no inventa un campo cuando el índice es desconocido', () => {
        const error = errorCon('ER_DUP_ENTRY', "Duplicate entry 'x' for key 'otra_clave'");
        assert.equal(nombreDeIndiceDuplicado(error), 'otra_clave');
        assert.equal(campoDuplicado(error), null);
    });

    test('un error que no es de duplicado no devuelve índice', () => {
        assert.equal(nombreDeIndiceDuplicado(errorCon('ER_BAD_DB_ERROR')), null);
        assert.equal(campoDuplicado(null), null);
    });
});

describe('aviso por audiencia', () => {
    test('cada audiencia tiene su cierre', () => {
        assert.equal(avisoDesconocido(AUDIENCIA_ADMIN), 'La causa no se ha podido identificar; consulta el registro del servidor.');
        assert.equal(avisoDesconocido(AUDIENCIA_GENERAL), 'Inténtalo de nuevo y, si persiste, avisa al administrador.');
        assert.equal(avisoDesconocido('otra'), avisoDesconocido(AUDIENCIA_GENERAL));
    });
});

describe('mensajeTecnico', () => {
    test('compone mensaje propio y causa identificada', () => {
        assert.equal(
            mensajeTecnico('No se ha podido crear el usuario.', errorCon('ECONNREFUSED'), { audiencia: AUDIENCIA_ADMIN }),
            'No se ha podido crear el usuario. No se puede acceder a la base de datos. Comprueba que el servicio esté en marcha y que la dirección y el puerto sean correctos.'
        );
    });

    test('sin causa usa el aviso de la audiencia', () => {
        assert.equal(mensajeTecnico('No se ha podido guardar el anticipo.', new Error('raro')), 'No se ha podido guardar el anticipo. Inténtalo de nuevo y, si persiste, avisa al administrador.');
        assert.equal(
            mensajeTecnico('No se ha podido restaurar.', new Error('raro'), { audiencia: AUDIENCIA_ADMIN }),
            'No se ha podido restaurar. La causa no se ha podido identificar; consulta el registro del servidor.'
        );
    });

    test('el aviso literal de la ruta manda sobre el genérico', () => {
        assert.equal(
            mensajeTecnico('La restauración ha fallado.', new Error('raro'), { audiencia: AUDIENCIA_ADMIN, aviso: 'Comprueba el estado de la base de datos.' }),
            'La restauración ha fallado. Comprueba el estado de la base de datos.'
        );
    });
});

describe('nada del motor llega al mensaje visible', () => {
    test('ningún mensaje del catálogo contiene códigos, tablas ni rutas', () => {
        const errores = [
            errorCon('ECONNREFUSED'),
            errorCon('ER_ACCESS_DENIED_ERROR'),
            errorCon('ER_BAD_DB_ERROR'),
            errorCon('ER_ROW_IS_REFERENCED_2'),
            errorCon('ER_DATA_TOO_LONG', "Data too long for column 'descripcion' at row 1"),
            errorCon('ER_LOCK_DEADLOCK'),
            errorCon('ENOSPC'),
            errorCon(127)
        ];
        const prohibidas = [/ER_[A-Z_]+/, /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|EHOSTUNREACH/, /\bsql\b/i, /SELECT|INSERT|UPDATE|DELETE FROM/, /\/workspaces/, /\.db_connection/];

        for (const error of errores) {
            const mensaje = mensajeDeCausa(error);
            assert.ok(mensaje, 'el catálogo debe reconocer ' + codigoDeError(error));
            for (const prohibida of prohibidas) {
                assert.equal(prohibida.test(mensaje), false, `«${mensaje}» contiene ${prohibida}`);
            }
        }
    });
});
