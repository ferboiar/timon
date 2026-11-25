#!/usr/bin/env node
/**
 * Pasos mecánicos de una iteración (DC-69). No hace commit, push ni PR.
 *
 *   node scripts/iteracion.mjs previa   [--fix]              git, diff --check (±cached), sintaxis, lint y guardas.
 *   node scripts/iteracion.mjs pruebas  [--ejecuta]          Pruebas por impacto; con --ejecuta, las lanza.
 *   node scripts/iteracion.mjs cierre   <tema> --ficheros a,b  Manifiesto explícito, `git add --` y comparación con el índice.
 *   node scripts/iteracion.mjs ids      [--json]             Último ID asignado de cada familia (orden numérico).
 *
 * Opciones comunes: `--completo` (salida íntegra), `--ficheros a,b,c` y `--base <rama>`.
 * Nunca usa `git add -A` ni `git add .`, y rechaza `.db_connection`, `.env` y `node_modules`.
 * `--ejecuta` sin `--incluye-entorno` omite la E2E y las pruebas con base: eso NO es verde.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    cercasDesbalanceadas,
    compararManifiesto,
    esRutaProhibida,
    filtrarExistentes,
    lineasAnadidasConCR,
    necesitaBd,
    resumirSalida,
    seleccionarPruebas,
    ultimoIdPorFamilia,
    validarInvocacionCierre
} from './lib/iteracion.mjs';

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const orden = argv[0];
const opcion = (nombre) => {
    const i = argv.indexOf(nombre);

    return i === -1 ? null : (argv[i + 1] ?? '');
};
const bandera = (nombre) => argv.includes(nombre);
const git = (...args) => spawnSync('git', args, { cwd: RAIZ, encoding: 'utf8' });
const lineas = (texto) => texto.split('\n').map((l) => l.trim()).filter(Boolean);

/** Ficheros cambiados: respecto a la base, en el árbol y sin seguimiento. */
function ficherosCambiados() {
    const dados = opcion('--ficheros');

    if (dados) return dados.split(',').map((f) => f.trim()).filter(Boolean);

    const base = opcion('--base') || (git('rev-parse', '--verify', '-q', 'origin/main').status === 0 ? 'origin/main' : 'main');
    const conjunto = new Set();

    for (const f of lineas(git('diff', '--name-only', `${base}...HEAD`).stdout)) conjunto.add(f);
    for (const f of lineas(git('diff', '--name-only').stdout)) conjunto.add(f);
    for (const f of lineas(git('diff', '--name-only', '--cached').stdout)) conjunto.add(f);
    for (const f of lineas(git('ls-files', '--others', '--exclude-standard').stdout)) conjunto.add(f);

    return [...conjunto].filter((f) => fs.existsSync(path.join(RAIZ, f))).sort();
}

/** Ejecuta una orden; resume la salida salvo con `--completo`. */
const ejecutar = (cmd, args, extra = {}) => {
    console.log(`$ ${cmd} ${args.join(' ')}`);

    if (bandera('--completo')) {
        const r = spawnSync(cmd, args, { cwd: RAIZ, stdio: 'inherit', ...extra });

        console.log(`  \u2192 c\u00f3digo de salida ${r.status}`);

        return r.status ?? 1;
    }

    const r = spawnSync(cmd, args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...extra });
    const codigo = r.status ?? 1;
    const resumen = resumirSalida(`${r.stdout ?? ''}\n${r.stderr ?? ''}`, { codigo, esTest: args.includes('--test') || args.includes('test:backend:local') });

    if (resumen.trim()) console.log(resumen);
    console.log(`  \u2192 c\u00f3digo de salida ${codigo}`);

    return codigo;
};

/** Guardas de formato: solo avisan y no cambian el código de salida. */
function avisosDeFormato(cambiados) {
    const diffs = [git('diff', '-U0').stdout ?? '', git('diff', '--cached', '-U0').stdout ?? ''].join('\n');
    const conCR = lineasAnadidasConCR(diffs);

    for (const { ruta, texto } of conCR) console.warn(`Aviso: l\u00ednea con CRLF en ${ruta}: ${texto.slice(0, 80)}`);

    for (const f of cambiados.filter((x) => x.endsWith('.md'))) {
        const { total, impar } = cercasDesbalanceadas(fs.readFileSync(path.join(RAIZ, f), 'utf8'));

        if (impar) console.warn(`Aviso: cercas \u0060\u0060\u0060 desbalanceadas en ${f} (${total} en total); revisa el bloque`);
    }

    if (conCR.length) console.log('(los avisos de formato no bloquean)');
}

function previa() {
    const cambiados = ficherosCambiados().filter((f) => !esRutaProhibida(f));

    console.log(`Rama: ${git('branch', '--show-current').stdout.trim()}`);
    console.log(git('status', '--short').stdout || '(\u00e1rbol limpio)');
    console.log(git('log', '--oneline', '-3').stdout);

    let fallos = 0;

    fallos += ejecutar('git', ['diff', '--check']) ? 1 : 0;
    fallos += ejecutar('git', ['diff', '--cached', '--check']) ? 1 : 0;

    for (const f of cambiados.filter((x) => /\.mjs$/.test(x) && !x.startsWith('src/'))) fallos += ejecutar('node', ['--check', f]) ? 1 : 0;

    const lint = cambiados.filter((f) => /^src\/.*\.(vue|js|mjs|cjs)$/.test(f));
    // `e2e/**` ya no está en `ignorePatterns` (O-12); `--no-ignore` queda como guarda ante un ignore que reaparezca.
    const lintE2e = cambiados.filter((f) => /^e2e\/.*\.(js|mjs|cjs)$/.test(f));
    // DC-76: backend, scripts y dev se comprueban sin --fix sobre los ficheros tocados
    const lintServidor = cambiados.filter((f) => /^(backend|scripts|dev)\/.*\.(js|mjs|cjs)$/.test(f));
    const arreglo = bandera('--fix') ? ['--fix'] : [];

    if (lint.length) fallos += ejecutar('npx', ['eslint', ...arreglo, ...lint]) ? 1 : 0;
    if (lintE2e.length) fallos += ejecutar('npx', ['eslint', '--no-ignore', ...arreglo, ...lintE2e]) ? 1 : 0;
    if (lintServidor.length) fallos += ejecutar('npx', ['eslint', ...arreglo, ...lintServidor]) ? 1 : 0;

    avisosDeFormato(cambiados);

    console.log(fallos ? `\nprevia: ${fallos} comprobaci\u00f3n(es) con fallo` : '\nprevia: todo correcto');
    process.exitCode = fallos ? 1 : 0;
}

function leerIndice(dir, sufijo) {
    const base = path.join(RAIZ, dir);

    if (!fs.existsSync(base)) return {};

    return Object.fromEntries(fs.readdirSync(base).filter((f) => f.endsWith(sufijo)).map((f) => [`${dir}/${f}`, fs.readFileSync(path.join(base, f), 'utf8')]));
}

function pruebas() {
    const testsBackend = leerIndice('backend/test', '.test.mjs');
    const specsE2e = leerIndice('e2e/tests', '.spec.mjs');
    const cambiados = ficherosCambiados();
    const p = seleccionarPruebas(cambiados, { testsBackend, specsE2e });
    const existe = (r) => fs.existsSync(path.join(RAIZ, r));
    const backend = filtrarExistentes(p.backend, existe);
    const e2e = filtrarExistentes(p.e2e, existe);
    const comandos = [];

    if (p.backendCompleto) {
        comandos.push({ etiqueta: 'backend completo (requiere base _test)', cmd: 'npm', args: ['run', 'test:backend:local'] });
    } else if (backend.length) {
        const sinBd = backend.filter((t) => !necesitaBd(testsBackend[t] ?? fs.readFileSync(path.join(RAIZ, t), 'utf8')));
        const conBd = backend.filter((t) => !sinBd.includes(t));

        if (sinBd.length) {
            const etiqueta = p.docs && !cambiados.some((f) => f.startsWith('backend/')) ? 'documentaci\u00f3n y reglas' : 'backend sin base de datos';

            comandos.push({ etiqueta, cmd: 'node', args: ['--test', ...sinBd] });
        }

        if (conBd.length) {
            comandos.push({ etiqueta: 'backend con base _test: entorno', cmd: 'node', args: ['scripts/comprobar-entorno-pruebas.mjs'] });
            comandos.push({ etiqueta: 'backend con base _test', cmd: 'node', args: ['--env-file=backend/test/.env.test', '--test', ...conBd] });
        }
    }

    if (p.e2eCompleta) comandos.push({ etiqueta: 'E2E completa (requiere Edge remoto, ver e2e/README.md)', cmd: 'npm', args: ['--prefix', 'e2e', 'run', 'e2e'] });
    else if (e2e.length) comandos.push({ etiqueta: 'E2E (requiere Edge remoto, ver e2e/README.md)', cmd: 'npm', args: ['--prefix', 'e2e', 'run', 'e2e', '--', ...e2e.map((s) => s.replace(/^e2e\//, ''))] });
    if (p.build) comandos.push({ etiqueta: 'build del frontend', cmd: 'npm', args: ['run', 'build:frontend'] });

    console.log(`Ficheros cambiados: ${cambiados.length}`);
    p.motivos.forEach((m) => console.log(`- ${m}`));
    console.log(comandos.length ? '\nPruebas propuestas:' : '\nNo hace falta ninguna prueba autom\u00e1tica: justif\u00edcalo en el PR.');
    comandos.forEach((c) => console.log(`- ${c.etiqueta}: ${c.cmd} ${c.args.join(' ')}`));
    console.log('\nSin --ejecuta no se ejecuta nada. Con --ejecuta y sin --incluye-entorno se omite la E2E y la base: eso no es verde.');

    if (!bandera('--ejecuta')) return;

    let fallos = 0;
    let omitidas = 0;

    for (const c of comandos) {
        if (/E2E|requiere base/.test(c.etiqueta) && !bandera('--incluye-entorno')) {
            omitidas += 1;
            console.log(`(omitido: ${c.etiqueta}; NO cuenta como verde: usa --incluye-entorno cuando el entorno est\u00e9 preparado)`);
            continue;
        }

        fallos += ejecutar(c.cmd, c.args) ? 1 : 0;
    }

    if (omitidas) console.log(`AVISO: ejecuci\u00f3n incompleta (${omitidas} omitidas); no es verde.`);
    process.exitCode = fallos ? 1 : 0;
}

function cierre() {
    const caso = validarInvocacionCierre(argv);

    if (caso === 'falta-tema') {
        console.error('Uso: node scripts/iteracion.mjs cierre <tema> --ficheros a,b,c');
        process.exit(2);
    }

    if (caso === 'tema-invalido') {
        console.error('El <tema> solo admite letras, n\u00fameros, punto, guion y guion bajo.');
        process.exit(2);
    }

    const tema = argv[1];
    const modificados = new Set([...lineas(git('diff', '--name-only').stdout), ...lineas(git('diff', '--name-only', '--cached').stdout)]);
    const sinSeguimiento = lineas(git('ls-files', '--others', '--exclude-standard').stdout);

    if (caso === 'falta-lista') {
        // Sin lista explícita no se añade nada: el manifiesto lo decide quien cierra (DC-69).
        console.log('Falta --ficheros. Propuesta (no se ha a\u00f1adido nada):');
        console.log(`  Con seguimiento y modificados: ${[...modificados].sort().join(', ') || '-'}`);
        console.log(`  Sin seguimiento (revisa cada uno): ${sinSeguimiento.join(', ') || '-'}`);
        process.exit(2);
    }

    if (caso === 'lista-vacia') {
        console.error('--ficheros no trae ninguna ruta. Uso: --ficheros a,b,c');
        process.exit(2);
    }

    const manifiesto = [...new Set(opcion('--ficheros').split(',').map((f) => f.trim()).filter(Boolean))].sort();
    const prohibidos = manifiesto.filter(esRutaProhibida);
    const inexistentes = manifiesto.filter((f) => !fs.existsSync(path.join(RAIZ, f)) && !modificados.has(f));

    if (prohibidos.length || inexistentes.length) {
        console.error(`Manifiesto rechazado.\n  Prohibidos: ${prohibidos.join(', ') || '-'}\n  Inexistentes: ${inexistentes.join(', ') || '-'}`);
        process.exit(1);
    }

    const salida = `/tmp/manifiesto-${tema}.txt`;

    fs.writeFileSync(salida, `${manifiesto.join('\n')}\n`);
    console.log(`Manifiesto (${manifiesto.length}) en ${salida}`);

    const r = spawnSync('git', ['add', '--', ...manifiesto], { cwd: RAIZ, encoding: 'utf8' });

    if (r.status !== 0) {
        console.error(r.stderr);
        process.exit(1);
    }

    const indice = lineas(git('diff', '--cached', '--name-only').stdout);
    const { faltan, sobran } = compararManifiesto(manifiesto, indice);
    const fuera = [...modificados].filter((f) => !manifiesto.includes(f) && !esRutaProhibida(f));

    console.log(git('diff', '--cached', '--stat').stdout);
    if (fuera.length) console.log(`Aviso: modificados y fuera del manifiesto: ${fuera.join(', ')}`);

    if (faltan.length || sobran.length) {
        console.error(`El \u00edndice no coincide con el manifiesto (puede haber ficheros a\u00f1adidos antes).\n  Faltan: ${faltan.join(', ') || '-'}\n  Sobran: ${sobran.join(', ') || '-'}`);
        process.exit(1);
    }

    console.log('\u00cdndice = manifiesto. No se ha hecho commit: redacta /tmp/mensaje-<tema>.txt y sigue la skill cierre-iteracion.');
}

function ids() {
    const partes = ['1de3', '2de3', '3de3'].map((p) => path.join('doc/mantenimiento', `registro-hallazgos_${p}.md`));
    const textos = partes.filter((p) => fs.existsSync(path.join(RAIZ, p))).map((p) => fs.readFileSync(path.join(RAIZ, p), 'utf8'));
    const ultimo = ultimoIdPorFamilia(textos);

    if (bandera('--json')) {
        console.log(JSON.stringify(ultimo, null, 2));

        return;
    }

    const ordenFamilias = ['DC', 'F', 'S', 'O', 'U', 'D', 'R'];

    console.log(ordenFamilias.filter((f) => ultimo[f]).map((f) => ultimo[f]).join('  '));
}

const ordenes = { previa, pruebas, cierre, ids };

if (!ordenes[orden]) {
    console.error('Uso: node scripts/iteracion.mjs previa|pruebas|cierre|ids [opciones] (ver cabecera del fichero)');
    process.exit(2);
}

ordenes[orden]();
