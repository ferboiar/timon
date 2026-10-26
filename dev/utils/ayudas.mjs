import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export const VERSION = '1.0.0';
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const normalizar = (texto) => texto.replace(/\r\n/g, '\n');
const textoValido = (texto, nombre, vacio = false) => {
  if (typeof texto !== 'string' || (!vacio && texto.length === 0) || /\r(?!\n)/.test(texto)) throw new TypeError(`${nombre}: debe ser texto${vacio ? '' : ' no vacío'}, sin CR aislados`);
  return texto;
};
const entero = (n, nombre) => {
  if (!Number.isSafeInteger(n) || n < 0) throw new TypeError(`${nombre}: debe ser entero no negativo`);
  return n;
};
export class ErrorDeEdicion extends Error {
  constructor(errores, { avisos = [], ...detalles } = {}) {
    super(errores.join('\n')); this.name = 'ErrorDeEdicion';
    this.errores = [...errores]; this.avisos = [...avisos]; Object.assign(this, detalles);
  }
}
export function bloque(texto) {
  textoValido(texto, 'bloque', true); return normalizar(texto).trimEnd().split('\n');
}
export function crearEditor({ raiz = process.cwd(), permitidos = null, logger = console } = {}) {
  if (!logger || typeof logger.log !== 'function' || typeof logger.warn !== 'function') throw new TypeError('logger requiere log y warn');
  const base = fs.realpathSync(raiz);
  const errores = [], avisos = [], archivos = new Map();
  let aplicado = false;
  const nombreRelativo = (absoluto) => path.relative(base, absoluto).split(path.sep).join('/');
  const validarRuta = (nombre) => {
    textoValido(nombre, 'ruta');
    if (nombre.includes('\0')) throw new Error('Ruta con carácter nulo');
    const absoluto = path.resolve(base, nombre), rel = path.relative(base, absoluto);
    if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw new Error(`Ruta fuera de la raíz o no es un archivo: ${nombre}`);
    const partes = rel.split(path.sep);
    if (partes.some((s) => s === '.git' || /^\.env(?:\.|$)/i.test(s) || /^\.db_connection(?:\.|$)/i.test(s)) || /\.(?:pem|key|p12|pfx)$/i.test(rel)) throw new Error(`Destino sensible/protegido: ${nombre}`);
    let actual = base;
    for (const [i, parte] of partes.entries()) {
      actual = path.join(actual, parte); const st = fs.lstatSync(actual);
      if (st.isSymbolicLink()) throw new Error(`No se permiten enlaces simbólicos: ${nombre}`);
      if (i < partes.length - 1 && !st.isDirectory()) throw new Error(`Ancestro no es directorio: ${nombre}`);
      if (i === partes.length - 1 && (!st.isFile() || st.nlink !== 1)) throw new Error(`Se requiere archivo regular sin enlaces duros: ${nombre}`);
    }
    return absoluto;
  };
  if (permitidos !== null && (!Array.isArray(permitidos) || permitidos.length === 0)) throw new TypeError('permitidos debe ser null o un array no vacío');
  const lista = permitidos === null ? null : new Set(permitidos.map(validarRuta));
  function cargar(f) {
    const ruta = validarRuta(f);
    if (lista && !lista.has(ruta)) throw new Error(`Destino fuera del manifiesto: ${f}`);
    if (!archivos.has(ruta)) {
      const bytes = fs.readFileSync(ruta), texto = bytes.toString('utf8');
      if (!Buffer.from(texto, 'utf8').equals(bytes) || texto.includes('\0')) throw new Error(`No es texto UTF-8 admisible: ${f}`);
      if (/\r(?!\n)/.test(texto) || (/\r\n/.test(texto) && /(?<!\r)\n/.test(texto))) throw new Error(`Saltos de línea mezclados/no admitidos: ${f}`);
      archivos.set(ruta, { ruta, original: bytes, texto, stat: fs.lstatSync(ruta), eol: texto.includes('\r\n') ? '\r\n' : '\n' });
    }
    return archivos.get(ruta);
  }
  function editar(f, operacion, opcional = false) {
    if (aplicado) throw new ErrorDeEdicion(['El editor ya fue aplicado; crea otro para un parche nuevo']);
    if (typeof opcional !== 'boolean') throw new TypeError('opcional debe ser booleano');
    try { const archivo = cargar(f), nuevo = operacion(archivo); textoValido(nuevo, 'resultado', true); archivo.texto = nuevo; }
    catch (e) { (opcional ? avisos : errores).push(`${f}: ${e.message}`); }
  }
  const adaptar = (a, t) => normalizar(t).replace(/\n/g, a.eol);
  function sustituir(f, de, a, opcional = false) {
    editar(f, (e) => {
      textoValido(de, 'de'); textoValido(a, 'a', true);
      const buscar = adaptar(e, de), veces = e.texto.split(buscar).length - 1;
      if (veces !== 1) throw new Error(`Se esperaba 1 coincidencia, hay ${veces}: ${de.slice(0, 80)}`);
      return e.texto.replace(buscar, () => adaptar(e, a));
    }, opcional);
  }
  function expresion(regex) {
    if (!(regex instanceof RegExp) || !regex.global) throw new TypeError('El patrón debe ser RegExp con bandera g');
    return new RegExp(regex.source, regex.flags);
  }
  function regexUnico(f, regex, reemplazo, esperadas) {
    editar(f, (e) => {
      entero(esperadas, 'esperadas'); const n = [...e.texto.matchAll(expresion(regex))].length;
      if (n !== esperadas) throw new Error(`Se esperaban ${esperadas} coincidencias, hay ${n}`);
      if (typeof reemplazo !== 'string' && typeof reemplazo !== 'function') throw new TypeError('reemplazo debe ser texto o función');
      const reemplazar = typeof reemplazo === 'function' ? (...args) => { const resultado = reemplazo(...args); textoValido(resultado, 'resultado de reemplazo', true); return adaptar(e, resultado); } : adaptar(e, reemplazo);
      return e.texto.replace(expresion(regex), reemplazar);
    });
  }
  function reemplazarEnElementos(f, patron, contiene, de, a, esperados, { porElemento = 1 } = {}) {
    editar(f, (e) => {
      entero(esperados, 'esperados'); entero(porElemento, 'porElemento');
      if (porElemento === 0) throw new TypeError('porElemento debe ser mayor que cero');
      textoValido(contiene, 'contiene'); textoValido(de, 'de'); textoValido(a, 'a', true);
      const marca = adaptar(e, contiene), buscar = adaptar(e, de); let n = 0;
      const nuevo = e.texto.replace(expresion(patron), (m) => {
        if (!m.includes(marca)) return m; n++;
        const interiores = m.split(buscar).length - 1;
        if (interiores !== porElemento) throw new Error(`Elemento ${n}: se esperaban ${porElemento} sustituciones interiores, hay ${interiores}`);
        return m.split(buscar).join(adaptar(e, a));
      });
      if (n !== esperados) throw new Error(`Se esperaban ${esperados} elementos, hay ${n}`); return nuevo;
    });
  }
  function nuevasLineas(nuevas, sangria) {
    if (!Array.isArray(nuevas) || nuevas.some((l) => typeof l !== 'string' || /[\r\n]/.test(l))) throw new TypeError('nuevas debe ser un array de líneas sin saltos incrustados');
    return nuevas.map((l) => l === '' ? '' : sangria + l);
  }
  function indiceUnico(ls, texto) {
    textoValido(texto, 'ancla');
    if (/[\r\n]/.test(texto) || !texto.trim()) throw new TypeError('El ancla debe ser una línea no vacía');
    const idx = ls.flatMap((l, i) => l.trim() === texto.trim() ? [i] : []);
    if (idx.length !== 1) throw new Error(`Ancla de línea: se esperaba 1 coincidencia, hay ${idx.length}: ${texto.slice(0, 80)}`); return idx[0];
  }
  function reemplazarLinea(f, texto, nuevas, opcional = false) {
    editar(f, (e) => { const ls = normalizar(e.texto).split('\n'), i = indiceUnico(ls, texto); ls.splice(i, 1, ...nuevasLineas(nuevas, ls[i].match(/^[ \t]*/)[0])); return ls.join(e.eol); }, opcional);
  }
  function insertarTrasLinea(f, texto, nuevas, opcional = false) {
    editar(f, (e) => {
      const ls = normalizar(e.texto).split('\n'), i = indiceUnico(ls, texto), insertadas = nuevasLineas(nuevas, ls[i].match(/^[ \t]*/)[0]);
      if (!insertadas.length) throw new Error('La inserción no puede estar vacía');
      if (insertadas.every((l, k) => ls[i + 1 + k] === l)) throw new Error('La inserción ya está presente junto al ancla');
      ls.splice(i + 1, 0, ...insertadas); return ls.join(e.eol);
    }, opcional);
  }
  function reemplazarBloque(f, inicio, finTexto, nuevas, { antes = 0, col0 = false } = {}) {
    editar(f, (e) => {
      entero(antes, 'antes'); textoValido(finTexto, 'finTexto');
      if (typeof col0 !== 'boolean' || /[\r\n]/.test(finTexto) || !finTexto.trim()) throw new TypeError('finTexto/col0 no válidos');
      if (/^[\s}\]);,]+$/.test(finTexto)) throw new Error('Final genérico inseguro: utiliza una línea final inequívoca, no una llave/cierre aislado');
      const ls = normalizar(e.texto).split('\n'), i = indiceUnico(ls, inicio), ini = i - antes;
      if (ini < 0) throw new Error('antes rebasa el principio del archivo');
      const finales = ls.flatMap((l, k) => k > i && (col0 ? l === finTexto : l.trim() === finTexto.trim()) ? [k] : []);
      if (finales.length !== 1) throw new Error(`El final debe ser único tras el inicio; hay ${finales.length}`);
      ls.splice(ini, finales[0] - ini + 1, ...nuevasLineas(nuevas, ls[ini].match(/^[ \t]*/)[0])); return ls.join(e.eol);
    });
  }
  function entradasCambiadas() { return [...archivos.values()].filter((a) => !a.original.equals(Buffer.from(a.texto, 'utf8'))); }
  function verificar(a) {
    validarRuta(a.ruta); const st = fs.lstatSync(a.ruta);
    if (st.ino !== a.stat.ino || st.dev !== a.stat.dev || st.mode !== a.stat.mode || st.uid !== a.stat.uid || st.gid !== a.stat.gid || !fs.readFileSync(a.ruta).equals(a.original)) throw new Error(`El archivo cambió desde la lectura: ${nombreRelativo(a.ruta)}`);
  }
  function planificar() {
    if (errores.length) throw new ErrorDeEdicion(errores, { avisos });
    for (const a of archivos.values()) verificar(a);
    return { archivos: entradasCambiadas().map((a) => ({ ruta: nombreRelativo(a.ruta), antes: hash(a.original), despues: hash(Buffer.from(a.texto, 'utf8')) })), avisos: [...avisos] };
  }
  function limpiarTemporal(dir) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { avisos.push(`No se pudo limpiar el temporal ${dir}: ${e.message}`); }
  }
  function prepararArchivo(a, bytes) {
    validarRuta(a.ruta); const dir = fs.mkdtempSync(path.join(path.dirname(a.ruta), '.timon-ayudas-')), temporal = path.join(dir, 'contenido');
    try {
      fs.writeFileSync(temporal, bytes, { flag: 'wx', mode: 0o600 });
      if (typeof process.getuid === 'function') { const st = fs.statSync(temporal); if (st.uid !== a.stat.uid || st.gid !== a.stat.gid) fs.chownSync(temporal, a.stat.uid, a.stat.gid); }
      fs.chmodSync(temporal, a.stat.mode & 0o777); return { dir, temporal };
    } catch (e) { limpiarTemporal(dir); throw e; }
  }
  function aplicar() {
    if (aplicado) throw new ErrorDeEdicion(['El editor ya fue aplicado']);
    const plan = planificar(), cambios = entradasCambiadas();
    if (!cambios.length) { aplicado = true; return { ...plan, aplicados: 0, copia: null }; }
    let copia = null; const preparados = [], escritos = [], restaurados = [], noRestaurados = [];
    try {
      copia = fs.mkdtempSync(path.join(os.tmpdir(), 'timon-ayudas-backup-'));
      for (const a of cambios) { const b = path.join(copia, nombreRelativo(a.ruta)); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.writeFileSync(b, a.original, { flag: 'wx', mode: 0o600 }); preparados.push({ a, ...prepararArchivo(a, Buffer.from(a.texto, 'utf8')) }); }
      for (const a of archivos.values()) verificar(a);
      for (const p of preparados) { verificar(p.a); fs.renameSync(p.temporal, p.a.ruta); escritos.push(p.a); }
      aplicado = true; return { ...plan, avisos, aplicados: cambios.length, copia };
    } catch (error) {
      for (const a of escritos.reverse()) {
        let r = null;
        try {
          validarRuta(a.ruta);
          if (!fs.readFileSync(a.ruta).equals(Buffer.from(a.texto, 'utf8'))) throw new Error('Modificación posterior detectada; no se sobrescribe');
          r = prepararArchivo(a, a.original); fs.renameSync(r.temporal, a.ruta); restaurados.push(nombreRelativo(a.ruta));
        } catch (fallo) { noRestaurados.push({ ruta: nombreRelativo(a.ruta), error: fallo.message }); }
        finally { if (r) limpiarTemporal(r.dir); }
      }
      throw new ErrorDeEdicion([`No se pudo aplicar: ${error.message}`], { avisos, copia, restaurados, noRestaurados });
    } finally { for (const p of preparados) limpiarTemporal(p.dir); }
  }
  function terminar({ comprobar = false } = {}) {
    if (typeof comprobar !== 'boolean') throw new TypeError('comprobar debe ser booleano');
    const resultado = comprobar ? planificar() : aplicar(); resultado.avisos = [...avisos];
    if (resultado.avisos.length) logger.warn('Avisos:\n' + resultado.avisos.join('\n'));
    logger.log(comprobar ? `Plan válido: ${resultado.archivos.length} ficheros; sin escrituras.` : `Cambios aplicados en ${resultado.aplicados} ficheros.`);
    if (!comprobar && resultado.copia) logger.log('Copia anterior: ' + resultado.copia); return resultado;
  }
  return { sustituir, regexUnico, reemplazarEnElementos, reemplazarLinea, insertarTrasLinea, reemplazarBloque, planificar, aplicar, terminar };
}
