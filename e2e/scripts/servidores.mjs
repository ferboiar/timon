/**
 * Arranque y parada autónomos de front y back.
 * ============================================
 *
 * Reglas:
 * - Se comprueba `http://localhost:5173` y `http://localhost:3000` (no la IP del host:
 *   desde el contenedor da *Empty reply*). Cualquier respuesta HTTP cuenta como vivo.
 * - Si ambos responden, se reutilizan y **no se tocan**.
 * - Si falta alguno, antes de arrancar se lee **solo** `DB_DATABASE` de
 *   `backend/src/db/.db_connection` y se compara con `E2E_BASES_PERMITIDAS`. Si el fichero
 *   estuviera cifrado (cabecera de git-crypt), se descifra con `git-crypt smudge` en
 *   memoria, sin `unlock` y sin escribir nada.
 * - El proceso se lanza en un grupo propio (`detached`) y se anota su PID. Al terminar se
 *   para **solo** ese grupo; nunca procesos que ya existieran antes.
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { basesPermitidas, debeArrancarServidores, RAIZ_REPO, rutaRuntime } from './entorno.mjs';

/** Servicios que la suite necesita vivos. */
const SERVICIOS = [
    { nombre: 'frontend', url: 'http://localhost:5173/' },
    { nombre: 'backend', url: 'http://localhost:3000/api/auth/verify' }
];

/** Cabecera con la que git-crypt marca un fichero cifrado. */
const CABECERA_GITCRYPT = '\u0000GITCRYPT\u0000';

/** Ruta del estado de los servidores arrancados por la suite. */
export function rutaEstadoServidores() {
    return rutaRuntime('estado', 'servidores.json');
}

/** ¿Responde el servicio? Cualquier código HTTP cuenta como vivo. */
async function responde(url) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 2000);

    try {
        await fetch(url, { signal: controlador.signal, redirect: 'manual' });
        return true;
    } catch {
        return false;
    } finally {
        clearTimeout(temporizador);
    }
}

/** Estado de front y back. */
export async function estadoServidores() {
    const resultado = {};

    for (const servicio of SERVICIOS) {
        resultado[servicio.nombre] = await responde(servicio.url);
    }

    resultado.ambosVivos = Object.values(resultado).every((vivo) => vivo === true);

    return resultado;
}

/**
 * Nombre de la base configurada, leído **solo** de la línea `DB_DATABASE`.
 *
 * Si el fichero empieza por la cabecera de git-crypt, se descifra en memoria con el
 * filtro `smudge` (sin `unlock` y sin escribir nada en el árbol de trabajo).
 */
export function nombreBaseConfigurada() {
    const ruta = path.join(RAIZ_REPO, 'backend/src/db/.db_connection');

    if (!fs.existsSync(ruta)) {
        throw new Error(`[servidores] No existe ${ruta}: no se puede confirmar la base de datos.`);
    }

    let contenido = fs.readFileSync(ruta, 'utf8');

    if (contenido.startsWith(CABECERA_GITCRYPT)) {
        contenido = execFileSync('git-crypt', ['smudge'], { cwd: RAIZ_REPO, input: contenido, encoding: 'utf8' });
    }

    for (const linea of contenido.split(/\r?\n/)) {
        const coincidencia = /^\s*DB_DATABASE\s*=\s*(.+?)\s*$/.exec(linea);

        if (coincidencia) return coincidencia[1].replace(/^['"]|['"]$/g, '');
    }

    throw new Error('[servidores] No se encontró DB_DATABASE en backend/src/db/.db_connection.');
}

/** Comprueba que la base configurada está permitida. Aborta si no. */
export function comprobarBasePermitida() {
    const base = nombreBaseConfigurada();
    const permitidas = basesPermitidas();

    if (!permitidas.includes(base)) {
        throw new Error(`[servidores] Base configurada «${base}» no permitida. Permitidas: ${permitidas.join(', ')}.`);
    }

    return base;
}

/** ¿Sigue vivo el proceso? */
function procesoVivo(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

/** Espera a que el proceso deje de existir. */
async function esperarMuerto(pid, milisegundos) {
    const limite = Date.now() + milisegundos;

    while (Date.now() < limite) {
        if (!procesoVivo(pid)) return true;
        await new Promise((resolver) => setTimeout(resolver, 250));
    }

    return !procesoVivo(pid);
}

/** Últimas líneas del log de un servidor, para el mensaje de error. */
function colaDelLog(ruta, lineas = 30) {
    try {
        return fs.readFileSync(ruta, 'utf8').split(/\r?\n/).slice(-lineas).join('\n');
    } catch {
        return '(sin log)';
    }
}

/**
 * Garantiza que front y back responden.
 *
 * - Si ya responden, no se toca nada y se informa.
 * - Si falta alguno, se confirma la base y se arranca `npm run nas` en un grupo propio.
 */
export async function asegurarServidores() {
    const estado = await estadoServidores();

    if (estado.ambosVivos) {
        console.log('[servidores] front y back ya estaban vivos: se reutilizan sin tocarlos.');
        return { arrancados: false };
    }

    if (!debeArrancarServidores()) {
        throw new Error(
            `[servidores] Falta algún servidor (frontend=${estado.frontend}, backend=${estado.backend}) y E2E_ARRANCAR_SERVIDORES=0.`
        );
    }

    const base = comprobarBasePermitida();
    console.log(`[servidores] base configurada permitida: ${base}`);

    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const rutaLog = rutaRuntime('logs', `servidor-${marca}.log`);

    fs.mkdirSync(path.dirname(rutaLog), { recursive: true });

    const descriptor = fs.openSync(rutaLog, 'a');
    const hijo = spawn('npm', ['run', 'nas'], {
        cwd: RAIZ_REPO,
        detached: true,
        stdio: ['ignore', descriptor, descriptor],
        env: { ...process.env }
    });

    hijo.unref();
    fs.closeSync(descriptor);

    fs.mkdirSync(path.dirname(rutaEstadoServidores()), { recursive: true });
    fs.writeFileSync(
        rutaEstadoServidores(),
        `${JSON.stringify({ pid: hijo.pid, arrancadoEn: new Date().toISOString(), log: rutaLog, base }, null, 4)}\n`,
        'utf8'
    );

    const limite = Date.now() + 90_000;

    while (Date.now() < limite) {
        if ((await estadoServidores()).ambosVivos) {
            console.log(`[servidores] front y back arrancados por la suite (grupo ${hijo.pid}).`);
            return { arrancados: true, pid: hijo.pid, log: rutaLog };
        }

        if (!procesoVivo(hijo.pid)) break;

        await new Promise((resolver) => setTimeout(resolver, 1000));
    }

    await pararServidores({ silencioso: true });

    throw new Error(`[servidores] 5173 y 3000 no respondieron en 90 s. Últimas líneas de ${rutaLog}:\n${colaDelLog(rutaLog)}`);
}

/**
 * Para **solo** el grupo que arrancó esta ejecución y verifica los puertos.
 *
 * Si al terminar sigue respondiendo algo, no se toca: puede ser de otro proceso (por
 * ejemplo, un `npm run nas` que ya estaba en marcha antes de la suite).
 */
export async function pararServidores({ silencioso = false } = {}) {
    const ruta = rutaEstadoServidores();

    if (!fs.existsSync(ruta)) {
        if (!silencioso) console.log('[servidores] esta ejecución no arrancó servidores: no se para nada.');
        return null;
    }

    let estado = null;

    try {
        estado = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    } catch {
        fs.rmSync(ruta, { force: true });
        return null;
    }

    const pid = estado?.pid;

    if (pid && procesoVivo(pid)) {
        if (process.platform === 'win32') {
            try {
                execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
            } catch {
                // El grupo ya no existía.
            }
        } else {
            try {
                process.kill(-pid, 'SIGTERM');
            } catch {
                try {
                    process.kill(pid, 'SIGTERM');
                } catch {
                    // El grupo ya no existía.
                }
            }

            if (!(await esperarMuerto(pid, 5000))) {
                try {
                    process.kill(-pid, 'SIGKILL');
                } catch {
                    try {
                        process.kill(pid, 'SIGKILL');
                    } catch {
                        // El grupo ya no existía.
                    }
                }
                await esperarMuerto(pid, 2000);
            }
        }

        if (!silencioso) console.log(`[servidores] grupo ${pid} detenido (SIGTERM/SIGKILL).`);
    }

    const final = await estadoServidores();

    if (!silencioso) {
        const vivos = [];

        if (final.frontend) vivos.push('5173');
        if (final.backend) vivos.push('3000');

        if (vivos.length > 0) {
            console.warn(`[servidores] AVISO: siguen respondiendo ${vivos.join(' y ')}; no se tocan (pueden ser de otro proceso).`);
        } else {
            console.log('[servidores] 5173 y 3000 ya no escuchan.');
        }
    }

    fs.rmSync(ruta, { force: true });

    return final;
}
