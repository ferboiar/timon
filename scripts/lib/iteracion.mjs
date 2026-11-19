/**
 * Lógica pura de los scripts de iteración (DC-69). Sin acceso a git ni al disco:
 * la prueba `backend/test/iteracion.test.mjs` la ejercita con datos.
 */
import path from 'node:path';

/** Rutas que nunca entran en un manifiesto ni en un commit (regla 00). */
export const RUTAS_PROHIBIDAS = [/(^|\/)\.db_connection(\.backup)?$/, /(^|\/)node_modules\//, /(^|\/)\.env$/];

/** Ficheros del backend cuyo cambio exige la suite completa. */
const NUCLEO_BACKEND = [
    /^backend\/src\/db\/migrations\//,
    /^backend\/src\/db\/db_connection\.mjs$/,
    /^backend\/src\/db\/db_utilsConn\.mjs$/,
    /^backend\/src\/middleware\//,
    /^backend\/src\/server\.mjs$/,
    /^package(-lock)?\.json$/
];

/**
 * Ficheros de la interfaz cuyo cambio afecta a todas las pantallas: E2E completa y build.
 * Sesión y estado compartido (F-54) y clientes de API (S-07).
 */
const NUCLEO_FRONTEND = [
    /^src\/(composables|config|layout|router|service|utils)\//,
    /^src\/main\.js$/,
    /^src\/App\.vue$/,
    /^vite\.config\.[cm]?js$/
];

const nombreBase = (ruta) => path.basename(ruta).replace(/\.[^.]+$/, '');
const esMd = (r) => r.endsWith('.md');

/** @param {string} ruta @returns {boolean} */
export const esRutaProhibida = (ruta) => RUTAS_PROHIBIDAS.some((er) => er.test(ruta));

/**
 * Compara el manifiesto con el índice.
 * @param {string[]} manifiesto
 * @param {string[]} indice
 * @returns {{faltan: string[], sobran: string[]}}
 */
export function compararManifiesto(manifiesto, indice) {
    const m = new Set(manifiesto);
    const i = new Set(indice);

    return { faltan: [...m].filter((r) => !i.has(r)).sort(), sobran: [...i].filter((r) => !m.has(r)).sort() };
}

/**
 * Elige las pruebas que corresponden a un conjunto de ficheros cambiados.
 * @param {string[]} cambiados Rutas relativas a la raíz.
 * @param {{testsBackend: Record<string,string>, specsE2e: Record<string,string>}} indice
 * @returns {{e2eCompleta: boolean, backendCompleto: boolean, backend: string[], e2e: string[], docs: boolean,
 *   lint: string[], sintaxis: string[], build: boolean, motivos: string[]}}
 */
export function seleccionarPruebas(cambiados, indice) {
    const r = { e2eCompleta: false, backendCompleto: false, backend: new Set(), e2e: new Set(), docs: false, lint: [], sintaxis: [], build: false, motivos: [] };
    const tests = Object.keys(indice.testsBackend);
    const specs = Object.keys(indice.specsE2e);
    const que = (conjunto, base) => conjunto.filter((f) => new RegExp(`\\b${base}\\b`).test(conjunto === tests ? indice.testsBackend[f] : indice.specsE2e[f]));

    for (const f of cambiados) {
        if (esRutaProhibida(f)) continue;

        if (/\.(mjs|cjs|js)$/.test(f) && !f.startsWith('src/')) r.sintaxis.push(f);
        if (/^(src|e2e)\/.*\.(vue|js|mjs|cjs)$/.test(f)) r.lint.push(f);

        if (NUCLEO_BACKEND.some((er) => er.test(f))) {
            r.backendCompleto = true;
            r.motivos.push(`${f}: núcleo o esquema, suite completa`);
        } else if (/^backend\/src\/.*\.mjs$/.test(f)) {
            const dentro = que(tests, nombreBase(f));

            if (dentro.length) {
                dentro.forEach((t) => r.backend.add(t));
                r.motivos.push(`${f}: pruebas que lo nombran (${dentro.length})`);
            } else {
                r.backendCompleto = true;
                r.motivos.push(`${f}: ninguna prueba lo nombra, suite completa`);
            }
        } else if (/^backend\/test\/.*\.test\.mjs$/.test(f)) {
            r.backend.add(f);
        } else if (NUCLEO_FRONTEND.some((er) => er.test(f))) {
            r.e2eCompleta = true;
            r.build = true;
            r.motivos.push(`${f}: sesión, configuración, estructura, servicios o rutas; E2E completa`);
        } else if (/^src\//.test(f)) {
            const dentro = que(specs, nombreBase(f));

            if (dentro.length) dentro.forEach((s) => r.e2e.add(s));
            else if (/^src\/(views|components|layout)\//.test(f)) r.e2e.add('e2e/tests/smoke.spec.mjs');
            if (/^src\/service\//.test(f) || /vite\.config|tailwind|postcss/.test(f)) r.build = true;
            r.motivos.push(`${f}: interfaz`);
        } else if (/^e2e\/tests\/.*\.spec\.mjs$/.test(f)) {
            r.e2e.add(f);
        } else if (/^(scripts|dev)\//.test(f)) {
            que(tests, nombreBase(f)).forEach((t) => r.backend.add(t));
            if (f.startsWith('dev/utils/')) r.backend.add('dev/utils/ayudas.test.mjs');
        } else if (esMd(f) || f.startsWith('.cline/') || f === '.clineignore') {
            r.docs = true;
        }
    }

    if (r.docs || r.backend.size || r.backendCompleto) {
        r.backend.add('backend/test/reglasCline.test.mjs');
        r.backend.add('backend/test/coherenciaDocumental.test.mjs');
    }

    return {
        ...r,
        backend: [...r.backend].sort(),
        e2e: r.e2eCompleta ? [] : [...r.e2e].sort(),
        lint: [...new Set(r.lint)].sort(),
        sintaxis: [...new Set(r.sintaxis)].sort()
    };
}

/** Pruebas que necesitan base de datos. */
export const necesitaBd = (texto) => /TEST_DB|crearBasePruebas|mysql2|conta_hogar|\.\.\/src\/db\//.test(texto);

/**
 * Reduce la salida de una orden a lo que importa para decidir.
 * @param {string} texto Salida combinada.
 * @param {{codigo: number, esTest?: boolean, max?: number}} opciones
 * @returns {string}
 */
export function resumirSalida(texto, { codigo, esTest = false, max = 25 }) {
    const lineas = texto.split('\n');

    if (esTest) {
        const resumen = lineas.filter((l) => /^# (tests|pass|fail|cancelled|skipped)\b/.test(l) || /^\s*not ok\b/.test(l));
        const errores = [];

        lineas.forEach((l, i) => {
            if (/^\s*error:/.test(l) || /^\s*(Error|AssertionError)\b/.test(l)) errores.push(...lineas.slice(i, i + 6));
        });

        return [...resumen, ...(codigo ? errores.slice(0, max) : [])].join('\n');
    }

    return codigo ? lineas.slice(-max).join('\n') : '';
}

/**
 * Líneas que el diff **añade** y terminan en CR (guarda de CRLF; solo avisa).
 * @param {string} diff Salida de `git diff -U0`.
 * @returns {{ruta: string, texto: string}[]}
 */
export function lineasAnadidasConCR(diff) {
    const salida = [];
    let ruta = '';

    for (const linea of String(diff).split('\n')) {
        if (linea.startsWith('+++ b/')) {
            ruta = linea.slice(6).trim();
            continue;
        }

        if (linea.startsWith('+') && !linea.startsWith('+++') && linea.endsWith('\r')) {
            salida.push({ ruta, texto: linea.slice(1).replace(/\r$/, '') });
        }
    }

    return salida;
}

/**
 * Cercas de código (```) de un documento; un total impar indica una cerca sin cerrar.
 * @param {string} contenido
 * @returns {{total: number, impar: boolean}}
 */
export function cercasDesbalanceadas(contenido) {
    const total = String(contenido).split('\n').filter((l) => /^\s*```/.test(l)).length;

    return { total, impar: total % 2 === 1 };
}

/**
 * Último ID asignado de cada familia, con orden numérico (equivale a `sort -V`).
 * Solo cuenta las filas `| ID |` del registro, no las menciones del texto.
 * @param {string[]|string} textos
 * @returns {Record<string, string>}
 */
export function ultimoIdPorFamilia(textos) {
    const fuentes = Array.isArray(textos) ? textos : [textos];
    const maximo = {};

    for (const texto of fuentes) {
        for (const [, familia, numero] of String(texto).matchAll(/^\| ([A-Z]{1,2})-(\d+) \|/gm)) {
            const n = Number(numero);

            if (!maximo[familia] || n > maximo[familia].n) maximo[familia] = { n, id: `${familia}-${numero}` };
        }
    }

    return Object.fromEntries(Object.entries(maximo).map(([familia, { id }]) => [familia, id]));
}

/**
 * Deja solo las rutas que existen (una prueba puede llegar en otra iteración).
 * @param {string[]} rutas
 * @param {(ruta: string) => boolean} existe
 * @returns {string[]}
 */
export const filtrarExistentes = (rutas, existe) => rutas.filter((r) => existe(r));

/**
 * Valida la invocación de `cierre` para dar mensajes distintos.
 * @param {string[]} argv `['cierre', tema, ...]`
 * @returns {'ok'|'falta-tema'|'tema-invalido'|'falta-lista'|'lista-vacia'}
 */
export function validarInvocacionCierre(argv) {
    const tema = argv[1];

    if (!tema || tema.startsWith('--')) return 'falta-tema';
    if (!/^[\w.-]+$/.test(tema)) return 'tema-invalido';

    const i = argv.indexOf('--ficheros');

    if (i === -1) return 'falta-lista';

    const valor = argv[i + 1];

    if (!valor || valor.startsWith('--')) return 'lista-vacia';
    if (!valor.split(',').map((f) => f.trim()).filter(Boolean).length) return 'lista-vacia';

    return 'ok';
}
