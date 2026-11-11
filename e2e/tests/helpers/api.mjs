/**
 * Utilidades de API para los specs E2E que necesitan comprobar respuestas del servidor.
 * La sesión del fixture guarda el token en localStorage o sessionStorage; se reutiliza
 * desde la propia página para no duplicar credenciales ni abrir sesiones nuevas.
 */
import { expect, urlDe } from './timon.mjs';

/** Origen real de la API, a partir de la primera respuesta /api/ de la aplicación. */
export async function origenApi(page) {
    const respuestas = [];
    const escuchar = (respuesta) => {
        if (new URL(respuesta.url()).pathname.startsWith('/api/')) respuestas.push(respuesta);
    };

    page.on('response', escuchar);
    try {
        await page.goto(urlDe('/dashboard'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await expect.poll(() => respuestas.length, { timeout: 20_000 }).toBeGreaterThan(0);
        return new URL(respuestas[0].url()).origin;
    } finally {
        page.off('response', escuchar);
    }
}

/** Petición a la API con el token de la sesión de la página. */
export async function peticionApi(page, api, { metodo, ruta, cuerpo = null }) {
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
        { api, metodo, ruta, cuerpo }
    );
}

/** Id del usuario de la sesión guardada. */
export async function idDeSesion(page) {
    return page.evaluate(() => {
        const guardado = localStorage.getItem('user') || sessionStorage.getItem('user');
        return guardado ? JSON.parse(guardado)?.id ?? null : null;
    });
}
