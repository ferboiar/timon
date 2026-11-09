#!/usr/bin/env node
/**
 * Comprueba que los ficheros sensibles van cifrados con git-crypt (DC-45).
 * ======================================================================
 *
 * Modos:
 * - `--indice`: revisa los blobs preparados (lo que va a entrar en el commit).
 * - `--rango <rev>`: revisa los blobs de los commits del rango (por defecto
 *   `@{u}..HEAD`), que es lo que publica un push.
 * - `--rutas`: comprueba que las rutas de `.gitattributes` aparecen en
 *   `git-crypt status -e` (requiere el repositorio desbloqueado).
 *
 * Sin argumentos hace `--indice` y `--rutas`.
 * Código de salida 0 si todo está cifrado y 1 si algo va en claro o no se puede verificar.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Cabecera que git-crypt escribe en cada blob cifrado. */
export const CABECERA_GITCRYPT = Buffer.from('\u0000GITCRYPT\u0000', 'binary');

/** Raíz del repositorio, derivada de la ubicación de este script (`scripts/…`). */
export const RAIZ_REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Patrones de nombres que se consideran sensibles aunque falten en `.gitattributes`. */
const PATRONES_SENSIBLES = [/\.env(\.[^/]+)?$/, /\.db_connection/, /\.key$/, /\.pem$/, /(^|\/)id_rsa$/];

/**
 * Rutas que encajan en los patrones pero no son secretas y están versionadas a propósito.
 * `.env` de la raíz solo contiene `VITE_API_URL` (S-10), `*.env.example` son plantillas y
 * `backend/test/.env.test` es sensible: va cifrado (DC-46).
 */
const RUTAS_NO_SECRETAS = new Set(['.env']);

/** ¿El nombre de la ruta es sensible? */
export function esSensible(ruta) {
    if (RUTAS_NO_SECRETAS.has(ruta) || ruta.endsWith('.env.example')) return false;

    const base = path.basename(ruta);
    return PATRONES_SENSIBLES.some((patron) => patron.test(base) || patron.test(ruta));
}

/** ¿El contenido empieza por la cabecera de git-crypt? */
export function estaCifrado(contenido) {
    return Buffer.isBuffer(contenido) && contenido.subarray(0, CABECERA_GITCRYPT.length).equals(CABECERA_GITCRYPT);
}

/** Rutas declaradas con `filter=git-crypt` en `.gitattributes`. */
export function rutasDeGitattributes(texto) {
    return texto
        .split(/\r?\n/)
        .map((linea) => linea.trim())
        .filter((linea) => linea && !linea.startsWith('#'))
        .map((linea) => linea.split(/\s+/))
        .filter((partes) => partes.includes('filter=git-crypt'))
        .map((partes) => partes[0]);
}

/** Ejecuta git y devuelve la salida como texto. */
function git(args) {
    return execFileSync('git', args, { cwd: RAIZ_REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** Ejecuta git y devuelve la salida como Buffer. */
function gitBuffer(args) {
    return execFileSync('git', args, { cwd: RAIZ_REPO, maxBuffer: 64 * 1024 * 1024 });
}
/** Blobs (`ruta` → `sha`) del índice. */
function blobsDelIndice() {
    return git(['ls-files', '-s', '-z'])
        .split('\0')
        .filter(Boolean)
        .map((linea) => linea.split('\t'))
        .filter((partes) => partes.length === 2)
        .map(([meta, ruta]) => ({ ruta, sha: meta.split(/\s+/)[1] }));
}

/** Blobs de todos los commits del rango indicado. */
function blobsDelRango(rango) {
    const commits = git(['rev-list', rango]).split('\n').filter(Boolean);
    const blobs = [];

    for (const commit of commits) {
        for (const linea of git(['ls-tree', '-r', commit]).split('\n').filter(Boolean)) {
            const [meta, ruta] = linea.split('\t');

            if (!ruta) continue;

            const [modo, tipo, sha] = meta.split(/\s+/);

            if (tipo === 'blob') blobs.push({ ruta, sha, commit: commit.slice(0, 8), modo });
        }
    }

    return blobs;
}

/** Revisa una lista de blobs y devuelve los sensibles que están en claro. */
export function blobsEnClaro(blobs) {
    return blobs.filter(({ ruta }) => esSensible(ruta)).filter(({ sha }) => !estaCifrado(gitBuffer(['cat-file', 'blob', sha])));
}

/** Comprueba que las rutas de `.gitattributes` están cifradas según git-crypt. */
function comprobarRutas() {
    const rutaAtributos = path.join(RAIZ_REPO, '.gitattributes');

    if (!fs.existsSync(rutaAtributos)) return ['No existe .gitattributes.'];

    const declaradas = rutasDeGitattributes(fs.readFileSync(rutaAtributos, 'utf8'));

    if (declaradas.length === 0) return ['`.gitattributes` no declara ninguna ruta con filter=git-crypt.'];

    let salida;

    try {
        salida = execFileSync('git-crypt', ['status', '-e'], { cwd: RAIZ_REPO, encoding: 'utf8' });
    } catch {
        return ['No se pudo ejecutar `git-crypt status -e`: el repositorio no está desbloqueado o falta git-crypt.'];
    }

    const cifradas = salida
        .split('\n')
        .map((linea) => linea.trim())
        .filter((linea) => linea.startsWith('encrypted:'))
        .map((linea) => linea.replace('encrypted:', '').trim());

    // Una ruta declarada pero no versionada (por ejemplo, el backup) no puede estar cifrada en
    // el índice: solo se exige cifrado a las rutas que git rastrea.
    const versionadas = new Set(git(['ls-files']).split('\n').filter(Boolean));

    return declaradas
        .filter((ruta) => versionadas.has(ruta))
        .filter((ruta) => !cifradas.includes(ruta))
        .map((ruta) => `Declarada, versionada y no cifrada: ${ruta}`);
}

/** Punto de entrada de la CLI. */
function main(argumentos) {
    const modo = argumentos[0] || '--todo';
    const problemas = [];

    if (modo === '--indice' || modo === '--todo') {
        for (const { ruta } of blobsEnClaro(blobsDelIndice())) {
            problemas.push(`En el índice y en claro: ${ruta}`);
        }
    }

    if (modo === '--rango') {
        const rango = argumentos[1] || '@{u}..HEAD';

        for (const { ruta, commit } of blobsEnClaro(blobsDelRango(rango))) {
            problemas.push(`En el rango ${rango} y en claro: ${ruta} (commit ${commit})`);
        }
    }

    if (modo === '--rutas' || modo === '--todo') problemas.push(...comprobarRutas());

    if (problemas.length > 0) {
        console.error('Cifrado: hay ficheros sensibles sin cifrar (DC-45):');
        for (const problema of problemas) console.error(`  - ${problema}`);
        console.error('No se publica: descifra en local con la clave, deja que git-crypt cifre al preparar y repite.');
        return 1;
    }

    console.log('Cifrado: correcto (rutas de .gitattributes cifradas y ningún secreto en claro en lo revisado).');
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        process.exit(main(process.argv.slice(2)));
    } catch (error) {
        console.error(`Cifrado: no se pudo verificar (${error.message}).`);
        process.exit(1);
    }
}
