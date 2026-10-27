# Editor de parches

Herramienta de desarrollo, no de la aplicación. Deriva del ayudante temporal de 98 líneas, SHA-256 `d4b92207dfc849c7b58ada97d9dfea97b89bdbfa28f6515cd4dd5b870257acc5`.

## Uso

```js
import { crearEditor } from './dev/utils/ayudas.mjs';
const modo = process.argv[2];
if (!['--check', '--apply'].includes(modo)) throw new Error('Indica --check o --apply');
const e = crearEditor({ raiz: process.cwd(), permitidos: ['doc/ejemplo.md'] });
e.sustituir('doc/ejemplo.md', 'ancla anterior única', 'texto nuevo');
try { e.terminar({ comprobar: modo === '--check' }); }
catch (error) { console.error(error); process.exitCode = 1; }
```

El ejemplo requiere archivo/ancla reales. Si el parche está en /tmp, importar la ubicación versionada real, no otro ayudante temporal. No reaplicar los parches históricos.

## Contrato

Conserva las operaciones originales: sustituir, regexUnico, reemplazarEnElementos, reemplazarLinea, insertarTrasLinea, reemplazarBloque y terminar. `bloque(texto)` convierte un bloque en líneas. Añade planificar/aplicar y ErrorDeEdicion. `crearEditor({raiz,permitidos,logger})` usa cwd por defecto y recomienda manifiesto explícito; logger requiere log/warn.

- Sustitución literal única; regex global con recuento exacto y lastIndex independiente.
- Elementos: recuento exterior e interior, con `{porElemento=1}`.
- Líneas: array sin saltos incrustados y sangría conservada. Inserción repetida inmediata rechazada.
- Bloques: final único posterior, índices válidos y cierres genéricos como `}` rechazados; `{antes=0,col0=false}`.
- Opcional omite la operación con aviso; no usarlo para requisitos obligatorios.
- planificar o terminar({comprobar:true}) no escriben. terminar() aplica por compatibilidad; no llama process.exit.
- Solo diferencias reales cuentan o se escriben. Las configuraciones inválidas y los errores de edición se notifican, no terminan el proceso desde la biblioteca.

## Protección y límites

Rechaza escape de raíz, symlinks/hardlinks, binario/UTF-8 inválido y saltos mezclados/CR aislados. Bloquea .git, .env/.env.*, .db_connection y variantes, pem/key/p12/pfx. No detecta todos los secretos: siguen haciendo falta manifiesto y revisión.

Comprueba contenido e identidad/atributos del original. Prepara modo/propietario/grupo cuando puede; ante falta de permisos falla antes de reemplazar. Crea copias privadas `timon-ayudas-backup-*` en el temporal del sistema y prepara archivos en `.timon-ayudas-*` junto al destino.

Si falla, intenta recuperar; informa copia/restaurados/noRestaurados si procede y no pisa modificaciones ajenas detectadas. Un rollback puede fallar: las copias se conservan. Fallos de limpieza son avisos.

No es una transacción global ante apagados ni protección frente a escritores hostiles entre comprobaciones. No analiza sintaxis ni garantiza idempotencia universal; el parche debe fijar sus precondiciones y ejecutar sus controles. Es más estricto que el original: revisar scripts antiguos antes de reutilizarlos.

## Errores comunes

- **`TypeError: editor.reemplazar is not a function`**: el método correcto para sustitución literal única es `sustituir(archivo, de, a, opcional)`, no `reemplazar`. Revisa la lista completa de métodos en «Contrato».
- **`Se esperaba 1 coincidencia, hay 0`**: el texto de búsqueda no existe en el archivo. Comprueba mayúsculas, espacios y saltos de línea.
- **`Se esperaba 1 coincidencia, hay N`**: el ancla aparece más de una vez. Hazla única o usa `regexUnico` con recuento explícito.
- **`Destino sensible/protegido`**: la ruta apunta a `.git`, `.env*`, `.db_connection*` o un certificado. El ayudante lo bloquea por diseño.
- **`Ruta fuera de la raíz`**: el archivo está fuera del directorio raíz indicado en `crearEditor({ raiz })` o la ruta usa `../`.
- **`El archivo cambió desde la lectura`**: algo modificó el archivo entre la carga y la aplicación. Revisa el diff antes de reintentar; el ayudante no sobrescribe cambios ajenos.
- **Importación desde `/tmp`**: usa la ruta absoluta versionada, por ejemplo `import { crearEditor } from '/workspaces/timon/dev/utils/ayudas.mjs';`. Un import relativo se resuelve desde el script, no desde el directorio del terminal.

## Pruebas

`node --test dev/utils/ayudas.test.mjs`; sintaxis con `node --check` de módulo/tests.

43 tests ejecutados con Node 20.20.1/Linux en entorno aislado del asistente: 43 pasan, 0 omitidos, incluidos fallos simulados. No ejecutados en el contenedor del usuario ni lint/build/backend/MariaDB/UI. No cambia aplicación ni datos.
