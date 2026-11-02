// F-13 y DC-05: configuración del pool de MariaDB. No necesita base de datos.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { construirConfiguracionPool } from '../src/db/db_connection.mjs';

describe('configuración del pool (F-13, DC-05)', () => {
    const entorno = { DB_HOST: 'servidor', DB_PORT: '3307', DB_USER: 'usuario', DB_PASSWORD: 'clave', DB_DATABASE: 'base' };

    test('las columnas DATE llegan como texto y no se convierten TIMESTAMP ni DATETIME', () => {
        assert.deepEqual(construirConfiguracionPool(entorno).dateStrings, ['DATE']);
    });

    test('la conexión sigue trabajando en UTC (DC-25)', () => {
        assert.equal(construirConfiguracionPool(entorno).timezone, 'Z');
    });

    test('toma los parámetros de conexión del entorno', () => {
        const config = construirConfiguracionPool(entorno);
        assert.equal(config.host, 'servidor');
        assert.equal(config.port, 3307);
        assert.equal(config.user, 'usuario');
        assert.equal(config.password, 'clave');
        assert.equal(config.database, 'base');
    });
});
