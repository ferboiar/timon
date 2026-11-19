// Reglas y skills de Cline: estructura mínima (DC-64, DC-65). No necesita base de datos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR_REGLAS = path.join(RAIZ, '.cline/rules');
const DIR_SKILLS = path.join(RAIZ, '.cline/skills');
const SIEMPRE = ['00-timon-obligatorio.md', '01-proceso.md'];

// Cuerpo máximo de una skill: 12 000 B ≈ 3 000–3 400 tokens en español con markdown,
// por debajo de la guía de 5 000 tokens de Cline. Si se supera, el detalle va a docs/.
const LIMITE_CUERPO_SKILL = 12_000;

const ficheros = (dir) =>
    fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .sort();
const leer = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
const cuerpoSinFrontmatter = (texto) => texto.replace(/^---\n[\s\S]*?\n---\n/, '');

test('las reglas incondicionales existen y no llevan paths', () => {
    for (const f of SIEMPRE) {
        assert.ok(ficheros(DIR_REGLAS).includes(f), `falta ${f}`);
        assert.ok(!leer(DIR_REGLAS, f).startsWith('---'), `${f}: no debe llevar frontmatter`);
    }
});

test('cada regla tiene un único H1 y ninguna copia con centinelas', () => {
    for (const f of ficheros(DIR_REGLAS)) {
        const texto = leer(DIR_REGLAS, f);
        assert.equal(texto.match(/^# /gm)?.length, 1, `${f}: se esperaba un único H1`);
        assert.ok(!texto.includes('<!-- regla:'), `${f}: quedan centinelas de copia`);
    }
});

test('las reglas condicionales declaran paths no vacíos', () => {
    for (const f of ficheros(DIR_REGLAS).filter((n) => !SIEMPRE.includes(n))) {
        assert.match(leer(DIR_REGLAS, f), /^---\npaths:\n( {2}- ".+"\n)+---\n/, `${f}: falta paths`);
    }
});

test('cada skill tiene name igual a su carpeta y descripción válida', () => {
    for (const nombre of fs.readdirSync(DIR_SKILLS).sort()) {
        const texto = fs.readFileSync(path.join(DIR_SKILLS, nombre, 'SKILL.md'), 'utf8');
        const fm = texto.match(/^---\n([\s\S]*?)\n---\n/);

        assert.ok(fm, `${nombre}: falta frontmatter`);
        assert.match(fm[1], new RegExp(`^name: ${nombre}$`, 'm'), `${nombre}: name no coincide con la carpeta`);

        const descripcion = (fm[1].match(/^description: (.+)$/m)?.[1] ?? '').trim();

        assert.ok(descripcion.length > 0, `${nombre}: description vacía`);
        assert.ok(descripcion.length <= 1024, `${nombre}: description de ${descripcion.length} caracteres (máximo 1024)`);
    }
});

test('el cuerpo de cada skill no supera el límite de contexto', () => {
    for (const nombre of fs.readdirSync(DIR_SKILLS).sort()) {
        const texto = fs.readFileSync(path.join(DIR_SKILLS, nombre, 'SKILL.md'), 'utf8');
        const bytes = Buffer.byteLength(cuerpoSinFrontmatter(texto), 'utf8');

        assert.ok(bytes > 0, `${nombre}: cuerpo vacío`);
        assert.ok(bytes <= LIMITE_CUERPO_SKILL, `${nombre}: cuerpo de ${bytes} B (máximo ${LIMITE_CUERPO_SKILL} B); mueve el detalle a docs/`);
    }
});

test('las reglas respetan el presupuesto de contexto de DC-65', () => {
    const bytes = (f) => fs.statSync(path.join(DIR_REGLAS, f)).size;
    const total = ficheros(DIR_REGLAS).reduce((suma, f) => suma + bytes(f), 0);
    const incondicional = SIEMPRE.reduce((suma, f) => suma + bytes(f), 0);

    assert.ok(total <= 12_000, `reglas: ${total} B (máximo 12 000 B)`);
    assert.ok(incondicional <= 7_000, `incondicionales: ${incondicional} B (máximo 7 000 B)`);
});
