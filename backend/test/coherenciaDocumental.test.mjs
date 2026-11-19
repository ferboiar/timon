// Coherencia documental (DC-69): sustituye a la revisión manual de enlaces, índices y relevo.
// No necesita base de datos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (ruta) => fs.readFileSync(path.join(RAIZ, ruta), 'utf8');
const existe = (ruta) => fs.existsSync(path.join(RAIZ, ruta));

/** Enlaces relativos a `.md` de un fichero (sin anclas ni URL). */
function enlacesMd(ruta) {
    const dir = path.dirname(ruta);
    const salida = [];

    for (const [, destino] of leer(ruta).matchAll(/\]\((?!https?:|mailto:|#)([^)\s]+?\.md)(?:#[^)]*)?\)/g)) {
        salida.push({ destino, resuelto: path.posix.normalize(path.posix.join(dir, destino)) });
    }

    return salida;
}

test('los enlaces .md de doc/index.md y del seguimiento apuntan a ficheros existentes', () => {
    const ficheros = ['doc/index.md', 'doc/mantenimiento/README.md', 'doc/mantenimiento/skills.md', 'doc/mantenimiento/estado-del-proyecto.md', 'doc/mantenimiento/registro-hallazgos.md', 'doc/mantenimiento/registro-hallazgos_1de3.md', 'doc/mantenimiento/registro-hallazgos_2de3.md', 'doc/mantenimiento/registro-hallazgos_3de3.md', 'doc/mantenimiento/archivo/registro-cerrados.md'];
    const rotos = ficheros.flatMap((f) => enlacesMd(f).filter((e) => !existe(e.resuelto)).map((e) => `${f} → ${e.destino}`));

    assert.deepEqual(rotos, []);
});

test('docNavigation solo cita documentos que existen', () => {
    const rutas = [...leer('src/views/pages/Tech-documentation.vue').matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
    const faltan = rutas.filter((r) => !existe(`doc/${r}.md`));

    assert.ok(rutas.length > 20, 'no se leyó docNavigation');
    assert.deepEqual(faltan, []);
});

test('todo documento de doc/ (salvo los congelados) está enlazado desde otro documento', () => {
    const congelados = /^doc\/mantenimiento\/(archivo|informes_iteraciones)\//;
    const todos = [];
    const recorre = (dir) => {
        for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
            const r = `${dir}/${e.name}`;

            if (e.isDirectory()) recorre(r);
            else if (r.endsWith('.md')) todos.push(r);
        }
    };

    recorre('doc');

    const enlazados = new Set(todos.flatMap((f) => enlacesMd(f).map((e) => e.resuelto)));
    const huerfanos = todos.filter((r) => !congelados.test(r) && r !== 'doc/index.md' && !enlazados.has(r));

    assert.deepEqual(huerfanos, []);
});

test('las decisiones del relevo existen en el registro', () => {
    const registro = leer('doc/mantenimiento/registro-hallazgos_1de3.md');
    const ids = [...leer('doc/mantenimiento/estado-del-proyecto.md').matchAll(/^\| (DC-\d+)(?: \/ (DC-\d+))? \|/gm)].flatMap((m) => [m[1], m[2]].filter(Boolean));
    const faltan = ids.filter((id) => !new RegExp(`^\\| ${id} \\|`, 'm').test(registro));

    assert.ok(ids.length >= 15, 'no se leyó la tabla de decisiones');
    assert.deepEqual(faltan, []);
});

test('el relevo no copia PR, SHA ni ramas, salvo la evidencia de la 0005 (DC-69)', () => {
    const texto = leer('doc/mantenimiento/estado-del-proyecto.md');
    // Excepción documentada: el matiz de la 0005 cita el PR donde se observó el esquema.
    const sinEvidencia = texto.replace(/según el esquema observado en el PR #\d+/g, 'según el esquema observado');

    assert.ok(!/\bPR #\d+/.test(sinEvidencia), 'el relevo cita un PR');
    assert.ok(!/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b(?=[^\w-])/.test(sinEvidencia.replace(/`[^`]*`/g, '').replace(/sha-?\d+/gi, '')), 'el relevo cita un SHA');
    assert.ok(!/snyk-|correccion\/fase|mantenimiento\//.test(texto), 'el relevo cita ramas');
});

test('cada fila archivada sigue existiendo una sola vez entre el registro activo y el archivo', () => {
    const activo = ['1de3', '2de3', '3de3'].map((p) => leer(`doc/mantenimiento/registro-hallazgos_${p}.md`)).join('\n');
    const archivo = leer('doc/mantenimiento/archivo/registro-cerrados.md');
    const id = (t) => [...t.matchAll(/^\| ([A-Z]+-\d+) /gm)].map((m) => m[1]);
    const duplicados = id(archivo).filter((x) => id(activo).includes(x));

    assert.deepEqual(duplicados, []);
});

test('.clineignore protege el histórico congelado', () => {
    const texto = leer('.clineignore');

    assert.match(texto, /^doc\/mantenimiento\/archivo\/$/m);
    assert.match(texto, /^doc\/mantenimiento\/informes_iteraciones\/$/m);
    const reglas = texto.split('\n').filter((l) => l.trim() && !l.startsWith('#'));

    assert.deepEqual(reglas.filter((l) => /test-results|playwright-report/.test(l)), [], 'el triage de la E2E necesita sus resultados');
});
