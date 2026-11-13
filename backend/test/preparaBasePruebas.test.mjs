// Seguridad del script de preparación de las E2E: solo puede tocar bases *_test.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

describe('e2e/scripts/prepara-base-pruebas.mjs', () => {
    test('se niega a usar una base que no termine en _test', () => {
        const resultado = spawnSync(process.execPath, ['e2e/scripts/prepara-base-pruebas.mjs'], {
            cwd: RAIZ,
            env: { ...process.env, E2E_TEST_DB_NAME: 'conta_hogar' },
            encoding: 'utf8',
            timeout: 30_000
        });

        assert.equal(resultado.status, 1, 'debe terminar con error');
        assert.match(resultado.stderr + resultado.stdout, /_test/, 'el mensaje debe explicar la regla');
    });
});
