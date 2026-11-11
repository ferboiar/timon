/**
 * Trazabilidad de autor en recibos (F-50, DC-50).
 * ================================================
 *
 * Crea un recibo público como administrador y lo edita como `user` con permiso de
 * escritura. Comprueba que `propietario_id` sigue siendo el admin, que
 * `modificado_por` es el usuario que edita y que `updated_at` avanza.
 *
 * Datos: `e2e_traz_user_*` y `e2e_traz_recibo_*`; se borran en afterAll. Espera más de
 * un segundo entre el alta y la edición porque TIMESTAMP tiene precisión de segundos.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { iniciarSesion, urlDe } from './helpers/timon.mjs';
import { idDeSesion, origenApi, peticionApi } from './helpers/api.mjs';
import { baseUrl } from '../scripts/entorno.mjs';

const dos = (n) => String(n).padStart(2, '0');
const ahora = new Date();
const SUFIJO = `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}_${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`;
const ANIO = String(ahora.getFullYear());

const USUARIO = {
    username: `e2e_traz_user_${SUFIJO}`,
    email: `e2e_traz_user_${SUFIJO}@e2e.invalid`,
    password: `E2e_${SUFIJO.slice(-6)}!aB3`,
    rol: 'user'
};

const estado = {
    api: null,
    idAdmin: null,
    idUsuario: null,
    idRecibo: null,
    concepto: `e2e_traz_${SUFIJO}`,
    conceptoEditado: `e2e_traz_ed_${SUFIJO}`,
    categoria: null,
    cuentaId: null
};

test.describe.configure({ timeout: 180_000, mode: 'serial' });

test.describe('Trazabilidad de recibos (F-50, DC-50)', () => {
    test.beforeAll(async ({ paginaSesion: page }) => {
        estado.api = await origenApi(page);
        estado.idAdmin = await idDeSesion(page);
        expect(estado.idAdmin, 'la sesión E2E debe tener id').toBeTruthy();

        const alta = await peticionApi(page, estado.api, { metodo: 'POST', ruta: '/api/users', cuerpo: USUARIO });
        expect(alta.status, `alta del usuario: ${alta.texto}`).toBe(201);
        estado.idUsuario = alta.datos?.id;
        expect(estado.idUsuario).toBeTruthy();

        const categorias = await peticionApi(page, estado.api, { metodo: 'GET', ruta: '/api/categorias' });
        const cuentas = await peticionApi(page, estado.api, { metodo: 'GET', ruta: '/api/cuentas' });
        expect(categorias.status).toBe(200);
        expect(cuentas.status).toBe(200);
        expect(categorias.datos.length).toBeGreaterThan(0);
        expect(cuentas.datos.length).toBeGreaterThan(0);
        estado.categoria = categorias.datos[0].nombre;
        estado.cuentaId = cuentas.datos[0].id;

        const recibo = await peticionApi(page, estado.api, {
            metodo: 'POST',
            ruta: '/api/recibos',
            cuerpo: {
                concepto: estado.concepto,
                periodicidad: 'anual',
                importe: 10,
                categoria: estado.categoria,
                cuenta_id: estado.cuentaId,
                fecha_inicial: `${ANIO}-12-31`,
                modoFechas: 'auto',
                cargo: [],
                es_privado: 0
            }
        });
        expect(recibo.status, `alta del recibo: ${recibo.texto}`).toBe(201);

        const fila = await leerRecibo(page, estado.concepto);
        expect(fila, 'el recibo debe existir').toBeTruthy();
        estado.idRecibo = fila.id;

        expect(fila.propietario_id).toBe(estado.idAdmin);
        expect(fila.modificado_por).toBe(estado.idAdmin);
        expect(fila.created_at).toBeTruthy();
        expect(fila.updated_at).toBeTruthy();
    });

    test.afterAll(async ({ paginaSesion: page }) => {
        if (estado.idRecibo) {
            await peticionApi(page, estado.api, {
                metodo: 'DELETE',
                ruta: `/api/recibos/${estado.idRecibo}?periodicidad=anual`
            }).catch(() => {});
        }

        if (estado.idUsuario) {
            await peticionApi(page, estado.api, {
                metodo: 'DELETE',
                ruta: '/api/users',
                cuerpo: { userIds: [estado.idUsuario] }
            }).catch(() => {});
        }
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la trazabilidad de recibos');
        }
    });

    test('un user edita un recibo del admin sin cambiar el propietario y deja su autor', async ({ conexion, paginaSesion: pageAdmin }) => {
        const antes = await leerRecibo(pageAdmin, estado.concepto);
        expect(antes).toBeTruthy();

        await pageAdmin.waitForTimeout(1_100);

        const contexto = await conexion.newContext({ viewport: null, baseURL: baseUrl() });
        const pageUser = await contexto.newPage();

        try {
            const login = await iniciarSesion(pageUser, { usuario: USUARIO.username, password: USUARIO.password });
            expect(login.status(), 'login del user').toBe(200);

            const edicion = await peticionApi(pageUser, estado.api, {
                metodo: 'POST',
                ruta: '/api/recibos',
                cuerpo: {
                    id: estado.idRecibo,
                    concepto: estado.conceptoEditado,
                    periodicidad: 'anual',
                    importe: 11,
                    categoria: estado.categoria,
                    cuenta_id: estado.cuentaId,
                    fecha_inicial: `${ANIO}-12-31`,
                    modoFechas: 'auto',
                    cargo: [],
                    es_privado: 0
                }
            });
            expect(edicion.status, `edición del recibo: ${edicion.texto}`).toBe(201);
        } finally {
            await contexto.close().catch(() => {});
        }

        const despues = await leerRecibo(pageAdmin, estado.conceptoEditado);
        expect(despues, 'el recibo editado debe existir').toBeTruthy();
        expect(despues.propietario_id).toBe(estado.idAdmin);
        expect(despues.modificado_por).toBe(estado.idUsuario);
        expect(new Date(despues.updated_at).getTime()).toBeGreaterThan(new Date(antes.updated_at).getTime());

        estado.concepto = estado.conceptoEditado;
    });
});

/** Lee la fila del listado correspondiente al concepto. */
async function leerRecibo(page, concepto) {
    const respuesta = await peticionApi(page, estado.api, { metodo: 'GET', ruta: '/api/recibos' });
    expect(respuesta.status).toBe(200);
    return (respuesta.datos ?? []).find((fila) => fila.concepto === concepto) ?? null;
}

void urlDe;
