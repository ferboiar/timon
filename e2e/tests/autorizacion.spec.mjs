/**
 * Autorización en servidor: matriz de roles, propiedad y privacidad (S-01, S-06, S-12, DC-48).
 * ==========================================================================================
 *
 * Deducciones (código de `main` tras este PR):
 * - `backend/src/utils/autorizacion.mjs` define la matriz y `middleware/auth.mjs` la aplica con
 *   `autorizar(modulo, accion)`; `backend/src/utils/propiedad.mjs` resuelve el propietario de
 *   cada registro.
 * - `POST /api/users` y `DELETE /api/users` exigen administrador (`verifyAdmin`).
 * - `POST /api/cuentas` (201) y `DELETE /api/cuentas` (200) usan `{ accounts: [ids] }`.
 * - `POST /api/recibos` acepta `es_privado` (0/1) y no reasigna `propietario_id` al editar.
 * - El guard de `src/router/index.js` redirige a `/auth/access` con `meta.requiresAdmin`
 *   (S-06), definido en `/documentation` y `/tech-docs`; `/manual` queda libre.
 *
 * Datos: crea cuatro usuarios `e2e_rol_*` (user, user, limited_user y reader), cuentas
 * `e2e_auth_cuenta_*` y recibos `e2e_auth_*`. Todo se borra al terminar; si un test falla,
 * `afterAll` vuelve a limpiar con la sesión de administrador.
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

const ROLES = {
    userA: { username: `e2e_rol_usera_${SUFIJO}`, password: `E2e_${SUFIJO.slice(-6)}!aB3`, rol: 'user' },
    userB: { username: `e2e_rol_userb_${SUFIJO}`, password: `E2e_${SUFIJO.slice(-6)}!aB3`, rol: 'user' },
    limited: { username: `e2e_rol_limited_${SUFIJO}`, password: `E2e_${SUFIJO.slice(-6)}!aB3`, rol: 'limited_user' },
    reader: { username: `e2e_rol_reader_${SUFIJO}`, password: `E2e_${SUFIJO.slice(-6)}!aB3`, rol: 'reader' }
};

const PREFIJO_RECIBO = 'e2e_auth_';
const PREFIJO_CUENTA = 'e2e_auth_cuenta_';

const estado = { api: null, idsUsuarios: [], idsCuentas: [], conceptos: [] };

function conceptoDe(etiqueta) {
    const concepto = `${PREFIJO_RECIBO}${etiqueta}_${SUFIJO.slice(-6)}`;
    estado.conceptos.push(concepto);

    return concepto;
}

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

/** Crea un usuario con el rol indicado desde la sesión de administrador. */
async function crearUsuario(pageAdmin, usuario) {
    const respuesta = await peticion(pageAdmin, {
        metodo: 'POST',
        ruta: '/api/users',
        cuerpo: { username: usuario.username, email: `${usuario.username}@e2e.invalid`, password: usuario.password, rol: usuario.rol }
    });

    expect(respuesta.status, `alta de ${usuario.rol}: ${respuesta.texto}`).toBe(201);

    const id = respuesta.datos?.id ?? (await peticion(pageAdmin, { metodo: 'GET', ruta: '/api/users' })).datos?.find((u) => u.username === usuario.username)?.id;

    expect(id, `id de ${usuario.username}`).toBeTruthy();
    estado.idsUsuarios.push(id);

    return id;
}

/** Primer dato de la lista que necesita un alta de recibo. */
async function datosParaRecibo(page) {
    const categorias = await peticion(page, { metodo: 'GET', ruta: '/api/categorias' });
    const cuentas = await peticion(page, { metodo: 'GET', ruta: '/api/cuentas' });

    expect(categorias.status).toBe(200);
    expect(cuentas.status).toBe(200);
    expect(Array.isArray(categorias.datos) && categorias.datos.length > 0, 'la base necesita categorías').toBe(true);
    expect(Array.isArray(cuentas.datos) && cuentas.datos.length > 0, 'la base necesita cuentas').toBe(true);

    return { categoria: categorias.datos[0].nombre, cuenta_id: cuentas.datos[0].id };
}

/** Crea un recibo trimestral (público o privado) y devuelve su id. */
async function crearRecibo(page, concepto, esPrivado) {
    const { categoria, cuenta_id } = await datosParaRecibo(page);

    const respuesta = await peticion(page, {
        metodo: 'POST',
        ruta: '/api/recibos',
        cuerpo: {
            concepto,
            periodicidad: 'trimestral',
            importe: 10,
            categoria,
            cuenta_id,
            fecha_inicial: `${ANIO}-12-31`,
            modoFechas: 'auto',
            cargo: [],
            es_privado: esPrivado ? 1 : 0
        }
    });

    expect(respuesta.status, `alta de ${concepto}: ${respuesta.texto}`).toBe(201);

    const filas = await filasDeRecibo(page, concepto);
    expect(filas.length, `el recibo ${concepto} debe existir`).toBeGreaterThan(0);

    return filas[0].id;
}

/** Filas del listado para un concepto (una por fecha de cargo). */
async function filasDeRecibo(page, concepto) {
    const respuesta = await peticion(page, { metodo: 'GET', ruta: `/api/recibos?periodicidad=trimestral&a%C3%B1o=${ANIO}` });

    expect(respuesta.status).toBe(200);

    return (respuesta.datos ?? []).filter((fila) => fila.concepto === concepto);
}

/** Edita un recibo existente. */
async function editarRecibo(page, id, concepto, esPrivado) {
    const { categoria, cuenta_id } = await datosParaRecibo(page);

    return peticion(page, {
        metodo: 'POST',
        ruta: '/api/recibos',
        cuerpo: {
            id,
            concepto,
            periodicidad: 'trimestral',
            importe: 11,
            categoria,
            cuenta_id,
            fecha_inicial: `${ANIO}-12-31`,
            modoFechas: 'auto',
            cargo: [],
            es_privado: esPrivado ? 1 : 0
        }
    });
}

/** Borra un recibo completo. */
function borrarRecibo(page, id) {
    return peticion(page, { metodo: 'DELETE', ruta: `/api/recibos/${id}?periodicidad=trimestral` });
}

test.describe.serial('Autorización en servidor (S-01, S-06, S-12, DC-48)', () => {
    // Cada caso abre varios contextos con login; el límite por defecto (60 s) no alcanza
    test.describe.configure({ timeout: 180_000 });
    test.beforeAll(async ({ conexion, paginaSesion: page }) => {
        // Origen de la API a partir de una respuesta real de la aplicación
        const respuestas = [];
        page.on('response', (r) => {
            // Solo respuestas de la API: los módulos del front también llevan '/api/' en su ruta
            if (new URL(r.url()).pathname.startsWith('/api/')) respuestas.push(r);
        });

        await page.goto(urlDe('/dashboard'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);

        estado.api = new URL(respuestas[0].url()).origin;

        const usuarios = await peticion(page, { metodo: 'GET', ruta: '/api/users' });
        expect(usuarios.status, 'la sesión E2E debe ser administradora para crear usuarios').toBe(200);

        for (const usuario of Object.values(ROLES)) {
            await crearUsuario(page, usuario);
        }

        void conexion;
    });

    test.afterAll(async ({ paginaSesion: page }) => {
        // Recibos y cuentas primero: las claves foráneas impiden borrar sus propietarios
        for (const concepto of estado.conceptos) {
            const filas = await filasDeRecibo(page, concepto).catch(() => []);
            const ids = [...new Set(filas.map((fila) => fila.id))];

            for (const id of ids) await borrarRecibo(page, id).catch(() => {});
        }

        if (estado.idsCuentas.length > 0) {
            await peticion(page, { metodo: 'DELETE', ruta: '/api/cuentas', cuerpo: { accounts: estado.idsCuentas } }).catch(() => {});
        }

        if (estado.idsUsuarios.length > 0) {
            await peticion(page, { metodo: 'DELETE', ruta: '/api/users', cuerpo: { userIds: estado.idsUsuarios } }).catch(() => {});
        }
    });

    test.afterEach(async ({ paginaSesion: page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await adjuntarDiagnostico(testInfo, page, 'fallo en la autorización (S-01, S-06, S-12)');
        }
    });

    test('la matriz de roles se aplica en las rutas de datos', async ({ conexion, paginaSesion: pageAdmin }) => {
        const crearCuenta = async (page, nombre) => {
            const respuesta = await peticion(page, {
                metodo: 'POST',
                ruta: '/api/cuentas',
                cuerpo: { nombre, tipo: 'corriente', saldo_actual: 0, activa: 1 }
            });

            if (respuesta.status === 201) {
                const cuentas = await peticion(page, { metodo: 'GET', ruta: '/api/cuentas' });
                const creada = (cuentas.datos ?? []).find((c) => c.nombre === nombre);
                if (creada) estado.idsCuentas.push(creada.id);
            }

            return respuesta;
        };

        // admin
        expect((await peticion(pageAdmin, { metodo: 'GET', ruta: '/api/cuentas' })).status).toBe(200);
        expect((await peticion(pageAdmin, { metodo: 'GET', ruta: '/api/users' })).status).toBe(200);

        // user: lee, crea y borra
        await conRol(conexion, ROLES.userA, async (page) => {
            expect((await peticion(page, { metodo: 'GET', ruta: '/api/cuentas' })).status).toBe(200);
            expect((await peticion(page, { metodo: 'GET', ruta: '/api/users' })).status).toBe(403);

            const nombre = `${PREFIJO_CUENTA}user_${SUFIJO}`;
            const alta = await crearCuenta(page, nombre);
            expect(alta.status).toBe(201);

            const id = estado.idsCuentas[estado.idsCuentas.length - 1];
            expect((await peticion(page, { metodo: 'DELETE', ruta: '/api/cuentas', cuerpo: { accounts: [id] } })).status).toBe(200);
        });

        // limited_user: lee y crea, pero no borra
        await conRol(conexion, ROLES.limited, async (page) => {
            expect((await peticion(page, { metodo: 'GET', ruta: '/api/cuentas' })).status).toBe(200);
            expect((await peticion(page, { metodo: 'GET', ruta: '/api/users' })).status).toBe(403);

            const alta = await crearCuenta(page, `${PREFIJO_CUENTA}limited_${SUFIJO}`);
            expect(alta.status).toBe(201);

            const id = estado.idsCuentas[estado.idsCuentas.length - 1];
            expect((await peticion(page, { metodo: 'DELETE', ruta: '/api/cuentas', cuerpo: { accounts: [id] } })).status).toBe(403);
        });

        // reader: solo lectura
        await conRol(conexion, ROLES.reader, async (page) => {
            expect((await peticion(page, { metodo: 'GET', ruta: '/api/cuentas' })).status).toBe(200);
            expect((await peticion(page, { metodo: 'GET', ruta: '/api/users' })).status).toBe(403);
            expect((await peticion(page, { metodo: 'POST', ruta: '/api/cuentas', cuerpo: { nombre: `${PREFIJO_CUENTA}reader_${SUFIJO}`, tipo: 'corriente', saldo_actual: 0, activa: 1 } })).status).toBe(403);
            expect((await peticion(page, { metodo: 'DELETE', ruta: '/api/cuentas', cuerpo: { accounts: [1] } })).status).toBe(403);
        });
    });

    test('las rutas de documentación exigen administrador y /manual queda libre', async ({ conexion }) => {
        await conRol(conexion, ROLES.userA, async (page) => {
            await page.goto(urlDe('/tech-docs'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await expect(page).toHaveURL(/\/auth\/access$/, { timeout: 20_000 });

            await page.goto(urlDe('/documentation'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await expect(page).toHaveURL(/\/auth\/access$/, { timeout: 20_000 });

            await page.goto(urlDe('/manual'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await expect(page).not.toHaveURL(/\/auth\/access$/);
        });
    });

    test('propiedad y privacidad: propietario intacto, ajenos según matriz y privados solo para su dueño y admin', async ({ conexion, paginaSesion: pageAdmin }) => {
        const conceptoAdmin = conceptoDe('deladmin');
        const idAdmin = await crearRecibo(pageAdmin, conceptoAdmin, false);

        // user edita un recibo del admin: permitido y sin reasignar el propietario
        const idAdminUsuario = estado.idsUsuarios[0];
        await conRol(conexion, ROLES.userA, async (page) => {
            const edicion = await editarRecibo(page, idAdmin, conceptoAdmin, false);
            expect(edicion.status, edicion.texto).toBe(201);
        });

        const trasEdicion = (await filasDeRecibo(pageAdmin, conceptoAdmin))[0];
        expect(Number(trasEdicion.propietario_id), 'el propietario no cambia al editar').not.toBe(idAdminUsuario);

        // limited_user no puede editar un recibo ajeno ni borrarlo
        await conRol(conexion, ROLES.limited, async (page) => {
            expect((await editarRecibo(page, idAdmin, conceptoAdmin, false)).status).toBe(403);
            expect((await borrarRecibo(page, idAdmin)).status).toBe(403);
        });

        // reader no edita ni borra
        await conRol(conexion, ROLES.reader, async (page) => {
            expect((await editarRecibo(page, idAdmin, conceptoAdmin, false)).status).toBe(403);
            expect((await borrarRecibo(page, idAdmin)).status).toBe(403);
        });

        // limited_user edita lo suyo y no puede borrarlo
        const conceptoLimited = conceptoDe('limited');
        let idLimited = null;
        await conRol(conexion, ROLES.limited, async (page) => {
            idLimited = await crearRecibo(page, conceptoLimited, false);
            expect((await editarRecibo(page, idLimited, conceptoLimited, false)).status, 'limited edita lo propio').toBe(201);
            expect((await borrarRecibo(page, idLimited)).status, 'limited no borra').toBe(403);
        });

        // Elena (user) crea un recibo privado: solo ella y el admin lo ven
        const conceptoPrivado = conceptoDe('privado');
        let idPrivado = null;
        await conRol(conexion, ROLES.userA, async (page) => {
            idPrivado = await crearRecibo(page, conceptoPrivado, true);
            expect((await filasDeRecibo(page, conceptoPrivado)).length).toBeGreaterThan(0);
        });

        await conRol(conexion, ROLES.userB, async (page) => {
            expect((await filasDeRecibo(page, conceptoPrivado)).length, 'otro user no ve el privado').toBe(0);
            expect((await editarRecibo(page, idPrivado, conceptoPrivado, true)).status).toBe(403);
            expect((await borrarRecibo(page, idPrivado)).status).toBe(403);
        });

        await conRol(conexion, ROLES.reader, async (page) => {
            expect((await filasDeRecibo(page, conceptoPrivado)).length, 'reader no ve el privado').toBe(0);
        });

        expect((await filasDeRecibo(pageAdmin, conceptoPrivado)).length, 'el admin sí ve el privado').toBeGreaterThan(0);
        expect((await editarRecibo(pageAdmin, idPrivado, conceptoPrivado, true)).status, 'el admin edita el privado').toBe(201);

        // user borra un recibo visible
        await conRol(conexion, ROLES.userA, async (page) => {
            expect((await borrarRecibo(page, idAdmin)).status).toBe(200);
        });

        // Limpieza de los recibos que quedan
        await borrarRecibo(pageAdmin, idPrivado);
        await borrarRecibo(pageAdmin, idLimited);
    });
});
