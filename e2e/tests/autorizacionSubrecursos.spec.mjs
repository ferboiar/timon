/**
 * Autorización en subrecursos y permisos mixtos (S-18, U-18).
 * ===========================================================
 *
 * Deducciones (código de `main` tras este PR):
 * - `POST /api/anticipos/pagos` y `POST /api/ahorros/movimientos` resuelven el padre real
 *   del pago o movimiento cuando llega `id`; el `anticipo_id`/`ahorro_id` del cuerpo solo
 *   se usa al crear. Un padre que no coincide responde 400 (`PADRE_INCORRECTO`).
 * - `autorizar()` aplica la matriz DC-48: un `limited_user` solo edita sus registros.
 * - Las cuentas y categorías son compartidas, pero su lectura exige `perm_cuentas` y
 *   `perm_categorias`. `ListBills.vue` carga los catálogos por separado y avisa si fallan,
 *   sin romper la pantalla (U-18).
 *
 * Datos: usuarios `e2e_sub_*`, anticipos, pagos, ahorros y movimientos `e2e_sub_*`.
 * Todo se borra con la sesión de administrador en `afterAll`.
 */
import { test, expect } from './fixtures.mjs';
import { adjuntarDiagnostico } from './helpers/diagnostico.mjs';
import { iniciarSesion, urlDe } from './helpers/timon.mjs';
import { baseUrl } from '../scripts/entorno.mjs';

const dos = (n) => String(n).padStart(2, '0');

function marcaDeTiempo() {
    const ahora = new Date();

    return `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}_${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`;
}

const SUFIJO = marcaDeTiempo();
const ANIO = String(new Date().getFullYear());
const FIN = SUFIJO.slice(-6);

const ROLES = {
    limited: { username: `e2e_sub_limited_${SUFIJO}`, password: `E2e_${FIN}!aB3`, rol: 'limited_user' },
    mixto: { username: `e2e_sub_mixto_${SUFIJO}`, password: `E2e_${FIN}!aB3`, rol: 'user' }
};

const estado = { api: null, idsUsuarios: [], anticipos: [], ahorros: [] };

const nombre = (base) => `e2e_sub_${base}_${FIN}`;

/** Petición a la API desde el navegador, con el token de la sesión de esa página. */
async function peticion(page, { metodo, ruta, cuerpo = null }) {
    return page.evaluate(
        async ({ api, metodo, ruta, cuerpo }) => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const cabeceras = { Authorization: `Bearer ${token}` };

            if (cuerpo !== null) cabeceras['Content-Type'] = 'application/json';

            const respuesta = await fetch(`${api}${ruta}`, {
                method: metodo,
                headers: cabeceras,
                body: cuerpo === null ? undefined : JSON.stringify(cuerpo)
            });

            const texto = await respuesta.text();
            let datos = null;

            try {
                datos = texto ? JSON.parse(texto) : null;
            } catch {
                datos = null;
            }

            return { status: respuesta.status, datos, texto };
        },
        { api: estado.api, metodo, ruta, cuerpo }
    );
}

/** Abre un contexto aislado, inicia sesión con el usuario indicado y ejecuta la función. */
async function conRol(conexion, usuario, funcion) {
    const contexto = await conexion.newContext({ viewport: null, baseURL: baseUrl() });
    const page = await contexto.newPage();

    try {
        const respuesta = await iniciarSesion(page, { usuario: usuario.username, password: usuario.password });
        expect(respuesta.status(), `login de ${usuario.rol}`).toBe(200);

        return await funcion(page);
    } finally {
        await contexto.close().catch(() => {});
    }
}

/** Crea un usuario desde la sesión de administrador, con los permisos indicados. */
async function crearUsuario(pageAdmin, usuario, permisos = {}) {
    const respuesta = await peticion(pageAdmin, {
        metodo: 'POST',
        ruta: '/api/users',
        cuerpo: {
            username: usuario.username,
            email: `${usuario.username}@e2e.invalid`,
            password: usuario.password,
            rol: usuario.rol,
            ...permisos
        }
    });

    expect(respuesta.status, `alta de ${usuario.rol}: ${respuesta.texto}`).toBe(201);

    const id = (await peticion(pageAdmin, { metodo: 'GET', ruta: '/api/users' })).datos?.find((u) => u.username === usuario.username)?.id;
    expect(id, `id de ${usuario.username}`).toBeTruthy();
    estado.idsUsuarios.push(id);

    return id;
}

/** Primera cuenta compartida, necesaria para crear pagos. */
async function cuentaParaPago(page) {
    const cuentas = await peticion(page, { metodo: 'GET', ruta: '/api/cuentas' });
    expect(cuentas.status).toBe(200);
    expect(Array.isArray(cuentas.datos) && cuentas.datos.length > 0, 'la base necesita cuentas').toBe(true);

    return cuentas.datos[0].id;
}

/** Crea un anticipo sin plan automático y devuelve su id. */
async function crearAnticipo(page, concepto) {
    const cuentaId = await cuentaParaPago(page);
    const alta = await peticion(page, {
        metodo: 'POST',
        ruta: '/api/anticipos',
        cuerpo: { concepto, importe_original: 100, fecha_inicio: `${ANIO}-01-01`, cuenta_origen_id: cuentaId, estado: 'activo' }
    });

    expect(alta.status, `alta de ${concepto}: ${alta.texto}`).toBe(201);

    const lista = await peticion(page, { metodo: 'GET', ruta: '/api/anticipos' });
    expect(lista.status).toBe(200);

    const fila = (lista.datos ?? []).find((anticipo) => anticipo.concepto === concepto);
    expect(fila, `el anticipo ${concepto} debe existir`).toBeTruthy();
    estado.anticipos.push(fila.id);

    return fila.id;
}

/** Crea un pago pendiente y devuelve su id. */
async function crearPago(page, anticipoId, importe) {
    const cuentaId = await cuentaParaPago(page);
    const alta = await peticion(page, {
        metodo: 'POST',
        ruta: '/api/anticipos/pagos',
        cuerpo: { anticipo_id: anticipoId, importe, fecha: `${ANIO}-06-30`, tipo: 'regular', estado: 'pendiente', cuenta_destino_id: cuentaId }
    });

    expect(alta.status, `alta del pago: ${alta.texto}`).toBe(201);

    const pagos = await peticion(page, { metodo: 'GET', ruta: `/api/anticipos/${anticipoId}/pagos` });
    expect(pagos.status).toBe(200);
    expect(pagos.datos.length, 'el pago debe existir').toBe(1);

    return pagos.datos[0];
}

/** Crea un ahorro y devuelve su id. */
async function crearAhorro(page, concepto) {
    const alta = await peticion(page, {
        metodo: 'POST',
        ruta: '/api/ahorros',
        cuerpo: {
            concepto,
            descripcion: null,
            ahorrado: 0,
            fecha_objetivo: null,
            periodicidad: null,
            importe_periodico: null,
            activo: 1
        }
    });

    expect(alta.status, `alta de ${concepto}: ${alta.texto}`).toBe(201);

    const lista = await peticion(page, { metodo: 'GET', ruta: '/api/ahorros' });
    expect(lista.status).toBe(200);

    const fila = (lista.datos ?? []).find((ahorro) => ahorro.concepto === concepto);
    expect(fila, `el ahorro ${concepto} debe existir`).toBeTruthy();
    estado.ahorros.push(fila.id);

    return fila.id;
}

/** Crea un movimiento y devuelve su id. */
async function crearMovimiento(page, ahorroId, importe) {
    const alta = await peticion(page, {
        metodo: 'POST',
        ruta: '/api/ahorros/movimientos',
        cuerpo: { ahorro_id: ahorroId, importe, fecha: `${ANIO}-06-30`, tipo: 'regular', descripcion: 'e2e' }
    });

    expect(alta.status, `alta del movimiento: ${alta.texto}`).toBe(201);

    const movimientos = await peticion(page, { metodo: 'GET', ruta: `/api/ahorros/${ahorroId}/movimientos` });
    expect(movimientos.status).toBe(200);
    expect(movimientos.datos.length, 'el movimiento debe existir').toBe(1);

    return movimientos.datos[0];
}

test.describe.serial('Autorización en subrecursos y permisos mixtos (S-18, U-18)', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeAll(async ({ paginaSesion: page }) => {
        const respuestas = [];
        page.on('response', (r) => {
            if (new URL(r.url()).pathname.startsWith('/api/')) respuestas.push(r);
        });

        await page.goto(urlDe('/dashboard'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);

        estado.api = new URL(respuestas[0].url()).origin;

        const usuarios = await peticion(page, { metodo: 'GET', ruta: '/api/users' });
        expect(usuarios.status, 'la sesión E2E debe ser administradora').toBe(200);

        await crearUsuario(page, ROLES.limited);
        await crearUsuario(page, ROLES.mixto, { perm_recibos: 'escritura', perm_cuentas: 'no', perm_categorias: 'no' });
    });

    test.afterAll(async ({ paginaSesion: page }) => {
        if (estado.anticipos.length > 0) {
            await peticion(page, { metodo: 'DELETE', ruta: '/api/anticipos', cuerpo: { advances: estado.anticipos } }).catch(() => {});
        }

        if (estado.ahorros.length > 0) {
            await peticion(page, { metodo: 'DELETE', ruta: '/api/ahorros', cuerpo: { savings: estado.ahorros } }).catch(() => {});
        }

        if (estado.idsUsuarios.length > 0) {
            await peticion(page, { metodo: 'DELETE', ruta: '/api/users', cuerpo: { userIds: estado.idsUsuarios } }).catch(() => {});
        }
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en subrecursos o permisos mixtos (S-18, U-18)');
        }
    });

    test('limited_user no edita un pago ajeno usando su propio anticipo como padre', async ({ conexion, paginaSesion: pageAdmin }) => {
        const anticipoAdmin = await crearAnticipo(pageAdmin, nombre('ant_admin'));
        const pagoAdmin = await crearPago(pageAdmin, anticipoAdmin, 10);

        let intento = null;

        await conRol(conexion, ROLES.limited, async (page) => {
            const anticipoLimited = await crearAnticipo(page, nombre('ant_limited'));
            const cuentaId = await cuentaParaPago(page);

            intento = await peticion(page, {
                metodo: 'POST',
                ruta: '/api/anticipos/pagos',
                cuerpo: {
                    id: pagoAdmin.id,
                    anticipo_id: anticipoLimited,
                    importe: 999,
                    fecha: `${ANIO}-06-30`,
                    tipo: 'regular',
                    estado: 'pendiente',
                    cuenta_destino_id: cuentaId
                }
            });
        });

        expect(intento.status, intento.texto).toBe(403);

        const pagosAdmin = await peticion(pageAdmin, { metodo: 'GET', ruta: `/api/anticipos/${anticipoAdmin}/pagos` });
        expect(pagosAdmin.status).toBe(200);
        expect(Number(pagosAdmin.datos[0].importe), 'el pago ajeno no cambia').toBe(Number(pagoAdmin.importe));
    });

    test('limited_user no edita un movimiento ajeno usando su propio ahorro como padre', async ({ conexion, paginaSesion: pageAdmin }) => {
        const ahorroAdmin = await crearAhorro(pageAdmin, nombre('aho_admin'));
        const movimientoAdmin = await crearMovimiento(pageAdmin, ahorroAdmin, 10);

        let intento = null;

        await conRol(conexion, ROLES.limited, async (page) => {
            const ahorroLimited = await crearAhorro(page, nombre('aho_limited'));

            intento = await peticion(page, {
                metodo: 'POST',
                ruta: '/api/ahorros/movimientos',
                cuerpo: { id: movimientoAdmin.id, ahorro_id: ahorroLimited, importe: 999, fecha: `${ANIO}-06-30`, tipo: 'regular' }
            });
        });

        expect(intento.status, intento.texto).toBe(403);

        const movimientosAdmin = await peticion(pageAdmin, { metodo: 'GET', ruta: `/api/ahorros/${ahorroAdmin}/movimientos` });
        expect(movimientosAdmin.status).toBe(200);
        expect(Number(movimientosAdmin.datos[0].importe), 'el movimiento ajeno no cambia').toBe(Number(movimientoAdmin.importe));
    });

    test('permisos mixtos: los catálogos compartidos se leen y el recibo se crea (U-18, DC-49)', async ({ conexion }) => {
        await conRol(conexion, ROLES.mixto, async (page) => {
            const recibos = await peticion(page, { metodo: 'GET', ruta: `/api/recibos?periodicidad=trimestral&a%C3%B1o=${ANIO}` });
            expect(recibos.status).toBe(200);

            const cuentas = await peticion(page, { metodo: 'GET', ruta: '/api/cuentas' });
            const categorias = await peticion(page, { metodo: 'GET', ruta: '/api/categorias' });
            expect(cuentas.status, cuentas.texto).toBe(200);
            expect(categorias.status, categorias.texto).toBe(200);
            expect(cuentas.datos.length).toBeGreaterThan(0);
            expect(categorias.datos.length).toBeGreaterThan(0);

            const errores = [];
            page.on('pageerror', (error) => errores.push(error.message));

            await page.goto(urlDe('/pages/bills'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await expect(page.getByText('Anuales', { exact: true })).toBeVisible({ timeout: 20_000 });
            expect(errores, 'la pantalla no debe romperse').toEqual([]);

            const concepto = nombre('rec_mixto');
            const alta = await peticion(page, {
                metodo: 'POST',
                ruta: '/api/recibos',
                cuerpo: {
                    concepto,
                    periodicidad: 'trimestral',
                    importe: 10,
                    categoria: categorias.datos[0].nombre,
                    cuenta_id: cuentas.datos[0].id,
                    fecha_inicial: `${ANIO}-12-31`,
                    modoFechas: 'auto',
                    cargo: []
                }
            });

            expect(alta.status, alta.texto).toBe(201);

            const filas = await peticion(page, { metodo: 'GET', ruta: `/api/recibos?periodicidad=trimestral&a%C3%B1o=${ANIO}` });
            const fila = (filas.datos ?? []).find((recibo) => recibo.concepto === concepto);
            expect(fila, 'el recibo creado debe existir').toBeTruthy();

            expect((await peticion(page, { metodo: 'DELETE', ruta: `/api/recibos/${fila.id}?periodicidad=trimestral` })).status).toBe(200);
        });
    });

    test('un usuario borrado recibe 401 y no 500 (F-51)', async ({ conexion, paginaSesion: pageAdmin }) => {
        const usuario = { username: `e2e_sub_borrado_${SUFIJO}`, password: `E2e_${FIN}!aB3`, rol: 'user' };

        const alta = await peticion(pageAdmin, {
            metodo: 'POST',
            ruta: '/api/users',
            cuerpo: { username: usuario.username, email: `${usuario.username}@e2e.invalid`, password: usuario.password, rol: usuario.rol }
        });
        expect(alta.status, alta.texto).toBe(201);

        const id = (await peticion(pageAdmin, { metodo: 'GET', ruta: '/api/users' })).datos?.find((u) => u.username === usuario.username)?.id;
        expect(id, 'id del usuario temporal').toBeTruthy();

        await conRol(conexion, usuario, async (page) => {
            expect((await peticion(page, { metodo: 'GET', ruta: '/api/recibos' })).status).toBe(200);

            const borrado = await peticion(pageAdmin, { metodo: 'DELETE', ruta: '/api/users', cuerpo: { userIds: [id] } });
            expect(borrado.status, borrado.texto).toBe(200);

            // F-51: el token sigue siendo válido, pero su usuario ya no existe: 401, no 500
            const respuesta = await peticion(page, { metodo: 'GET', ruta: '/api/cuentas' });
            expect(respuesta.status, respuesta.texto).toBe(401);
            expect(respuesta.datos?.message).toBe('Token inválido o expirado');
            expect(respuesta.texto).not.toContain('desconocido');
        });
    });
});
