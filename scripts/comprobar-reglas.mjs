#!/usr/bin/env node
/**
 * Comprueba que los bloques de reglas con centinelas no divergen (DC-47).
 * ======================================================================
 *
 * La regla de edición de ficheros y la de publicación y fusiones viven, con el mismo texto,
 * en la instrucción persistente y en `.cline/rules/00-timon-obligatorio.md` (copia deliberada).
 * Este script localiza cada bloque entre sus centinelas y compara su contenido.
 *
 * Código de salida 0 si todas las copias son idénticas y 1 si falta un centinela, está
 * repetido, el bloque está vacío o el texto diverge.
 *
 * Uso: `node scripts/comprobar-reglas.mjs`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Raíz del repositorio, derivada de la ubicación de este script (`scripts/…`). */
export const RAIZ_REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Bloques con centinelas y los ficheros donde vive cada copia (DC-47). */
export const REGLAS = {
    'edicion-ficheros': ['doc/mantenimiento/instruccion-persistente_3de4.md', '.cline/rules/00-timon-obligatorio.md'],
    'publicacion-fusiones': ['doc/mantenimiento/instruccion-persistente_2de4.md', '.cline/rules/00-timon-obligatorio.md']
};

const normalizarSaltos = (texto) => String(texto).replace(/\r\n/g, '\n');

/** Contenido comparable: saltos normalizados y sin líneas ni espacios en los extremos. */
const normalizarContenido = (texto) => normalizarSaltos(texto).trim();

/**
 * Extrae el contenido de un bloque delimitado por `<!-- regla:NOMBRE -->` y `<!-- /regla:NOMBRE -->`.
 *
 * @param {string} texto Contenido del fichero.
 * @param {string} nombre Nombre del bloque.
 * @returns {{ contenido?: string, linea?: number, problemas: string[] }}
 */
export function extraerBloque(texto, nombre) {
    const lineas = normalizarSaltos(texto).split('\n');
    const apertura = `<!-- regla:${nombre} -->`;
    const cierre = `<!-- /regla:${nombre} -->`;
    const indices = (aguja) => lineas.flatMap((linea, i) => (linea.trim() === aguja ? [i] : []));
    const inicio = indices(apertura);
    const fin = indices(cierre);

    if (inicio.length !== 1) return { problemas: [`centinela de apertura ${apertura} encontrado ${inicio.length} veces (se esperaba 1)`] };
    if (fin.length !== 1) return { problemas: [`centinela de cierre ${cierre} encontrado ${fin.length} veces (se esperaba 1)`] };
    if (fin[0] < inicio[0]) return { problemas: [`el cierre ${cierre} aparece antes que la apertura`] };

    const contenido = lineas.slice(inicio[0] + 1, fin[0]).join('\n');

    if (!normalizarContenido(contenido)) return { problemas: [`el bloque ${nombre} está vacío`] };

    return { contenido: normalizarContenido(contenido), linea: inicio[0] + 1, problemas: [] };
}

/**
 * Compara todas las copias de cada bloque.
 *
 * @param {{ leer?: (ruta: string) => string, raiz?: string }} [opciones]
 * @returns {{ ok: boolean, problemas: string[], resumen: string[] }}
 */
export function compararReglas({ leer = (ruta) => fs.readFileSync(ruta, 'utf8'), raiz = RAIZ_REPO } = {}) {
    const problemas = [];
    const resumen = [];

    for (const [nombre, ficheros] of Object.entries(REGLAS)) {
        const copias = [];

        for (const fichero of ficheros) {
            let texto;

            try {
                texto = leer(path.resolve(raiz, fichero));
            } catch (error) {
                problemas.push(`${fichero}: no se pudo leer (${error.code || error.name})`);
                continue;
            }

            const { contenido, linea, problemas: delBloque } = extraerBloque(texto, nombre);

            if (delBloque.length > 0) {
                for (const problema of delBloque) problemas.push(`${fichero}: ${problema}`);
                continue;
            }

            copias.push({ fichero, linea, contenido });
        }

        if (copias.length < 2) {
            problemas.push(`regla ${nombre}: solo ${copias.length} copia(s) legible(s); se esperaban ${ficheros.length}`);
            continue;
        }

        const referencia = copias[0];
        const distintas = copias.filter((copia) => copia.contenido !== referencia.contenido);

        for (const copia of distintas) {
            problemas.push(`regla ${nombre}: el contenido de ${copia.fichero} diverge del de ${referencia.fichero} (línea ${copia.linea} frente a la ${referencia.linea})`);
        }

        if (distintas.length === 0) resumen.push(`regla ${nombre}: idéntica en ${copias.length} ficheros (${referencia.contenido.split('\n').length} líneas)`);
    }

    return { ok: problemas.length === 0 && resumen.length === Object.keys(REGLAS).length, problemas, resumen };
}

function main() {
    const { ok, problemas, resumen } = compararReglas();

    for (const linea of resumen) console.log(linea);
    for (const problema of problemas) console.error('  - ' + problema);

    if (!ok) {
        console.error('Reglas divergentes: corrige el texto hasta que las copias con centinelas coincidan (DC-47).');
        process.exit(1);
    }

    console.log('Reglas coherentes: los bloques con centinelas son idénticos en todas sus copias.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
