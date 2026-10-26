import test from 'node:test';
import a from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {crearEditor,bloque,ErrorDeEdicion,VERSION} from './ayudas.mjs';

function fixture(t, files={'a':'AAA\n','b':'BBB\n'}, options={}) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'timon-ayudas-test-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 for(const [f,text] of Object.entries(files)){const p=path.join(dir,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);}
 const editor=crearEditor({raiz:dir,logger:{log(){},warn(){}},...options});
 return {dir,editor,read:f=>fs.readFileSync(path.join(dir,f),'utf8'),apply(){try {const r=editor.aplicar();if(r.copia)t.after(()=>fs.rmSync(r.copia,{recursive:true,force:true}));return r;}catch(e){if(e.copia)t.after(()=>fs.rmSync(e.copia,{recursive:true,force:true}));throw e;}}};
}
const casos=[
 ['literal',{},e=>e.sustituir('a','AAA','$&'),null,'$&\n'],
 ['borrado literal',{},e=>e.sustituir('a','AAA',''),null,'\n'],
 ['ancla ausente',{},e=>e.sustituir('a','NO','X'),/hay 0/],
 ['ancla duplicada',{a:'A A\n'},e=>e.sustituir('a','A','X'),/hay 2/],
 ['texto vacío',{},e=>e.sustituir('a','','X'),/no vacío/],
 ['regex global obligatoria',{},e=>e.regexUnico('a',/AAA/,'X',1),/bandera g/],
 ['regex recuento',{},e=>e.regexUnico('a',/A/g,'X',2),/hay 3/],
 ['regex grupos',{},e=>e.regexUnico('a',/(A)AA/g,'$1X',1),null,'AX\n'],
 ['regex cero',{},e=>e.regexUnico('a',/Z/g,'X',0),null,'AAA\n'],
 ['regex lastIndex',{},e=>{const r=/AAA/g;r.lastIndex=50;e.regexUnico('a',r,'X',1);},null,'X\n'],
 ['regex función CRLF',{a:'AAA\r\n'},e=>e.regexUnico('a',/AAA/g,()=> 'X\nY',1),null,'X\r\nY\r\n'],
 ['interior ausente',{a:'<x>marca</x>\n'},e=>e.reemplazarEnElementos('a',/<x>.*?<\/x>/g,'marca','NO','X',1),/interiores/],
 ['interior múltiple',{a:'<x>marca A A</x>\n'},e=>e.reemplazarEnElementos('a',/<x>.*?<\/x>/g,'marca','A','B',1,{porElemento:2}),null,'<x>marca B B</x>\n'],
 ['recuento de elementos',{a:'<x>marca A</x>\n'},e=>e.reemplazarEnElementos('a',/<x>.*?<\/x>/g,'marca','A','B',2),/hay 1/],
 ['línea y sangría',{a:'  A\n  Z\n'},e=>e.reemplazarLinea('a','A',['B','C']),null,'  B\n  C\n  Z\n'],
 ['inserción CRLF',{a:'  A\r\n  Z\r\n'},e=>e.insertarTrasLinea('a','A',['B','']),null,'  A\r\n  B\r\n\r\n  Z\r\n'],
 ['sin newline final',{a:'A'},e=>e.insertarTrasLinea('a','A',['B']),null,'A\nB'],
 ['inserción repetida',{a:'A\nB\n'},e=>e.insertarTrasLinea('a','A',['B']),/ya está presente/],
 ['salto incrustado',{},e=>e.reemplazarLinea('a','AAA',['B\nC']),/sin saltos/],
 ['bloque genérico',{a:'INI\n}\n'},e=>e.reemplazarBloque('a','INI','}',['X']),/genérico/],
 ['bloque antes inválido',{a:'INI\nFIN\n'},e=>e.reemplazarBloque('a','INI','FIN',['X'],{antes:1}),/principio/],
 ['bloque final ambiguo',{a:'INI\nFIN\nFIN\n'},e=>e.reemplazarBloque('a','INI','FIN',['X']),/hay 2/],
 ['bloque final ausente',{a:'INI\nOTRO\n'},e=>e.reemplazarBloque('a','INI','FIN',['X']),/hay 0/],
 ['bloque col0',{a:'INI\n FIN\nFIN\n'},e=>e.reemplazarBloque('a','INI','FIN',['X'],{col0:true}),null,'X\n'],
 ['mezcla de saltos',{a:'A\r\nB\n'},e=>e.sustituir('a','A','X'),/mezclados/],
 ['CR aislado',{a:'A\rB'},e=>e.sustituir('a','A','X'),/Saltos/],
 ['BOM',{a:'\ufeffAAA\n'},e=>e.sustituir('a','AAA','X'),null,'\ufeffX\n'],
 ['ruta fuera de raíz',{},e=>e.sustituir('../fuera','A','X'),/fuera de la raíz/]
];
for(const [name,files,edit,error,result] of casos)test(name,t=>{
 const f=fixture(t,Object.keys(files).length?files:undefined);const original=f.read('a');edit(f.editor);
 if(error){a.throws(()=>f.apply(),error);a.equal(f.read('a'),original);}else{f.apply();a.equal(f.read('a'),result);}
});
test('versión, bloque y argumentos de constructor',t=>{const f=fixture(t);a.equal(VERSION,'1.0.0');a.deepEqual(bloque('A\r\nB\r\n'),['A','B']);a.throws(()=>bloque(null));a.throws(()=>crearEditor({raiz:f.dir,permitidos:[]}));a.throws(()=>crearEditor({raiz:f.dir,logger:{}}));});
test('plan, comprobar y avisos cuentan solo diferencias reales',t=>{const f=fixture(t);f.editor.sustituir('a','AAA','X');f.editor.sustituir('b','NO','Y',true);const p=f.editor.terminar({comprobar:true});a.equal(p.archivos.length,1);a.equal(p.avisos.length,1);a.equal(f.read('a'),'AAA\n');f.apply();a.equal(f.read('a'),'X\n');});
test('error obligatorio bloquea todos los archivos',t=>{const f=fixture(t);f.editor.sustituir('a','AAA','X');f.editor.sustituir('b','NO','Y');a.throws(()=>f.apply(),ErrorDeEdicion);a.equal(f.read('a'),'AAA\n');a.equal(f.read('b'),'BBB\n');});
test('cargados sin diferencia no se reescriben',t=>{const f=fixture(t);const before=fs.statSync(path.join(f.dir,'a'));f.editor.sustituir('a','NO','X',true);const r=f.apply();a.equal(r.aplicados,0);a.equal(r.copia,null);a.equal(fs.statSync(path.join(f.dir,'a')).ino,before.ino);a.equal(fs.statSync(path.join(f.dir,'a')).mtimeMs,before.mtimeMs);});
test('protección de secretos y git',t=>{for(const name of ['.env','.env.local','backend/.db_connection','backend/.db_connection.backup','.git/config','clave.pem']){const f=fixture(t,{[name]:'A'});f.editor.sustituir(name,'A','X');a.throws(()=>f.apply(),/protegido/);a.equal(f.read(name),'A');}});
test('manifiesto y raíz como destino',t=>{const f=fixture(t);const e=crearEditor({raiz:f.dir,permitidos:['a']});e.sustituir('b','BBB','X');a.throws(()=>e.planificar(),/manifiesto/);f.editor.sustituir('.','A','X');a.throws(()=>f.apply(),/no es un archivo/);});
test('symlinks y hardlinks rechazados',{skip:process.platform==='win32'},t=>{const f=fixture(t);fs.symlinkSync('a',path.join(f.dir,'enlace'));f.editor.sustituir('enlace','AAA','X');a.throws(()=>f.apply(),/simbólicos/);const e=crearEditor({raiz:f.dir});fs.linkSync(path.join(f.dir,'a'),path.join(f.dir,'duro'));e.sustituir('a','AAA','X');a.throws(()=>e.aplicar(),/enlaces duros/);});
test('contenido e identidad modificados desde lectura',t=>{const f=fixture(t);f.editor.sustituir('a','AAA','X');fs.writeFileSync(path.join(f.dir,'a'),'ajeno');a.throws(()=>f.apply(),/cambió/);a.equal(f.read('a'),'ajeno');});
test('aplicación, alias, modo y copia',t=>{const f=fixture(t);fs.chmodSync(path.join(f.dir,'a'),0o640);f.editor.sustituir('./a','AAA','X');f.editor.sustituir('a','X','Y');const r=f.apply();a.equal(r.aplicados,1);a.equal(f.read('a'),'Y\n');a.equal(fs.readFileSync(path.join(r.copia,'a'),'utf8'),'AAA\n');if(process.platform!=='win32')a.equal(fs.statSync(path.join(f.dir,'a')).mode&0o777,0o640);a.throws(()=>f.apply(),/ya fue aplicado/);});
for(const scenario of ['preparación','restauración','rollback fallido','modificación ajena'])test('fallo simulado: '+scenario,{concurrency:false},t=>{
 const f=fixture(t);f.editor.sustituir('a','AAA','X');f.editor.sustituir('b','BBB','Y');const rename=fs.renameSync,write=fs.writeFileSync;let n=0;
 fs.writeFileSync=(p,...args)=>{if(scenario==='preparación'&&String(p).endsWith(path.sep+'contenido')&&++n===2)throw new Error('simulado');return write(p,...args);};
 fs.renameSync=(src,dst)=>{if(scenario!=='preparación'&&dst===path.join(f.dir,'b')){if(scenario==='modificación ajena')write(path.join(f.dir,'a'),'tercero');throw new Error('simulado');}if(scenario==='rollback fallido'&&dst===path.join(f.dir,'a')&&++n>1)throw new Error('simulado');return rename(src,dst);};
 try{a.throws(()=>f.apply(),e=>{a.ok(e.copia);a.equal(e.noRestaurados.length,['rollback fallido','modificación ajena'].includes(scenario)?1:0);return true;});}finally{fs.renameSync=rename;fs.writeFileSync=write;}
 a.equal(f.read('b'),'BBB\n');a.equal(f.read('a'),scenario==='rollback fallido'?'X\n':scenario==='modificación ajena'?'tercero':'AAA\n');
});

test('fallo de limpieza no oculta éxito',{concurrency:false},t=>{
 const f=fixture(t);f.editor.sustituir('a','AAA','X');const rm=fs.rmSync;let fallo=false;let r;
 fs.rmSync=(p,...args)=>{if(!fallo&&String(p).includes('.timon-ayudas-')){fallo=true;throw new Error('simulado');}return rm(p,...args);};
 try{r=f.apply();}finally{fs.rmSync=rm;}a.equal(r.aplicados,1);a.equal(r.avisos.length,1);a.equal(f.read('a'),'X\n');
});
test('binario y sustitución por otra inode',{skip:process.platform==='win32'},t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.dir,'a'),Buffer.from([255,0]));f.editor.sustituir('a','A','X');a.throws(()=>f.apply(),/UTF-8/);
 const g=fixture(t);g.editor.sustituir('a','AAA','X');fs.writeFileSync(path.join(g.dir,'nuevo'),'AAA\n');fs.renameSync(path.join(g.dir,'nuevo'),path.join(g.dir,'a'));a.throws(()=>g.apply(),/cambió/);
});
