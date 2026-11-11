/**
 * Borrados bloqueados por FK y validación de cuerpos (F-10, F-43).
 * ================================================================
 *
 * Crea una categoría y una cuenta usadas por un recibo. Borrarlas desde la pantalla debe
 * responder 409 con mensaje de negocio, sin borrar la fila. También comprueba que los
 * cuerpos de borrado inválidos de cuentas y ahorros responden 400 antes de la base.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import {
    abrirCategorias,
    eliminarCategoria,
    nombreCategoriaUnico
} from './helpers/timon.mjs';
import { abrirCuentas, eliminarCuenta } from './helpers/timon.mjs';
import { origenApi, peticionApi } from './helpers/api.mjs';

const dos = (n) => String(n).padStart(2, '0');
const ahora = new Date();
const SUFIJO = `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}_${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`;
const ANIO = String(ahora.getFullYear());

const estado = {
    api: null,
    categoria: null,
    idCategoria: null,
    cuenta: `e2e_cuenta_${SUFIJO}`,
    idCuenta: null,
    recibo: `e2e_recibo_${SUFIJO}`,
    idRecibo: null
};

test.describe.configure({ timeout: 180_000, mode: 'serial' });

test.describe('Borrados en uso y validación de cuerpos (F-10, F-43)', () => {
    test.beforeAll(async ({ paginaSesion: page }) => {
        estado.api = await origenApi(page);
        estado.categoria = await nombreCategoriaUnico();

        const altaCategoria = await peticionApi(page, estado.api, {
            metodo: 'POST',
            ruta: '/api/categorias',
            cuerpo: { nombre: estado.categoria }
        });
        expect(altaCategoria.status, `alta de categoría: ${altaCategoria.texto}`).toBe(201);

        const categorias = await peticionApi(page, estado.api, { metodo: 'GET', ruta: '/api/categorias' });
        estado.idCategoria = (categorias.datos ?? []).find((fila) => fila.nombre === estado.categoria)?.id ?? null;
        expect(estado.idCategoria).toBeTruthy();

        const altaCuenta = await peticionApi(page, estado.api, {
            metodo: 'POST',
            ruta: '/api/cuentas',
            cuerpo: {
                nombre: estado.cuenta,
                tipo: 'corriente',
                iban: null,
                saldo_actual: 0,
                descripcion: '',
                activa: 1
            }
        });
        expect(altaCuenta.status, `alta de cuenta: ${altaCuenta.texto}`).toBe(201);

        const cuentas = await peticionApi(page, estado.api, { metodo: 'GET', ruta: '/api/cuentas' });
        estado.idCuenta = (cuentas.datos ?? []).find((fila) => fila.nombre === estado.cuenta)?.id ?? null;
        expect(estado.idCuenta).toBeTruthy();

        const altaRecibo = await peticionApi(page, estado.api, {
            metodo: 'POST',
            ruta: '/api/recibos',
            cuerpo: {
                concepto: estado.recibo,
                periodicidad: 'anual',
                importe: 10,
                categoria: estado.categoria,
                cuenta_id: estado.idCuenta,
                fecha_inicial: `${ANIO}-12-31`,
                modoFechas: 'auto',
                cargo: [],
                es_privado: 0
            }
        });
        expect(altaRecibo.status, `alta de recibo: ${altaRecibo.texto}`).toBe(201);

        const recibos = await peticionApi(page, estado.api, { metodo: 'GET', ruta: '/api/recibos' });
        estado.idRecibo = (recibos.datos ?? []).find((fila) => fila.concepto === estado.recibo)?.id ?? null;
        expect(estado.idRecibo).toBeTruthy();
    });

    test.afterAll(async ({ paginaSesion: page }) => {
        if (estado.idRecibo) {
            await peticionApi(page, estado.api, {
                metodo: 'DELETE',
                ruta: `/api/recibos/${estado.idRecibo}?periodicidad=anual`
            }).catch(() => {});
        }

        if (estado.idCategoria) {
            await peticionApi(page, estado.api, {
                metodo: 'DELETE',
                ruta: '/api/categorias',
                cuerpo: { categoriaIds: [estado.idCategoria] }
            }).catch(() => {});
        }

        if (estado.idCuenta) {
            await peticionApi(page, estado.api, {
                metodo: 'DELETE',
                ruta: '/api/cuentas',
                cuerpo: { accounts: [estado.idCuenta] }
            }).catch(() => {});
        }
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en los borrados en uso');
        }
    });

    test('borrar una categoría en uso responde 409 con mensaje de negocio', async ({ paginaSesion: page }) => {
        await abrirCategorias(page);

        const respuesta = await eliminarCategoria(page, estado.categoria);
        expect(respuesta).not.toBeNull();
        expect(respuesta.status()).toBe(409);
        await expect(page.getByRole('alert').filter({ hasText: 'No se puede eliminar la categoría porque está en uso' })).toBeVisible();

        const confirmacion = page.getByRole('dialog', { name: 'Confirm' });
        if (await confirmacion.isVisible()) await confirmacion.getByRole('button', { name: 'No' }).click();
    });

    test('borrar una cuenta en uso responde 409 con mensaje de negocio', async ({ paginaSesion: page }) => {
        await abrirCuentas(page);

        const respuesta = await eliminarCuenta(page, estado.cuenta);
        expect(respuesta).not.toBeNull();
        expect(respuesta.status()).toBe(409);
        await expect(page.getByRole('alert').filter({ hasText: 'No se puede eliminar la cuenta porque está en uso' })).toBeVisible();

        const confirmacion = page.getByRole('dialog', { name: 'Confirm' });
        if (await confirmacion.isVisible()) await confirmacion.getByRole('button', { name: 'No' }).click();
    });

    test('los cuerpos de borrado inválidos responden 400 antes de la base', async ({ paginaSesion: page }) => {
        const cuentas = await peticionApi(page, estado.api, { metodo: 'DELETE', ruta: '/api/cuentas', cuerpo: {} });
        expect(cuentas.status).toBe(400);
        expect(cuentas.datos?.error).toContain('accounts');

        const ahorros = await peticionApi(page, estado.api, {
            metodo: 'DELETE',
            ruta: '/api/ahorros',
            cuerpo: { savings: ['no-es-un-id'] }
        });
        expect(ahorros.status).toBe(400);
        expect(ahorros.datos?.error).toContain('savings');
    });
});
