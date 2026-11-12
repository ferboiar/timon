## Informe de cierre de iteración

### Objetivo y alcance

- **Objetivo**: que el visor de documentación (`src/views/pages/Tech-documentation.vue`) dibuje los diagramas nomnoml, cargando el motor desde npm y no desde unpkg, con error legible y legibilidad en tema claro y oscuro.
- **IDs**: U-24 (el visor no dibujaba los diagramas), DC-56 (nomnoml es el único motor y se carga desde npm; el tema se resuelve re-renderizando) y D-42 (página del visor y sincronización del seguimiento).
- **Inclusiones**: carga de nomnoml desde npm; retirada de `loadScript`, `loadedScripts`, la limpieza en `onBeforeUnmount`, el listener de `resize` y la segunda `loadDocument` de `onMounted`; `renderer` de `marked` registrado una sola vez, con delegación en el `code` original; render al terminar la carga en lugar del `setTimeout` de 200 ms; tema por re-render con `useLayout().isDarkTheme`; error legible por diagrama; retirada de `data-relation-label` y del CSS por atributos del SVG; `optimizeDeps.include: ['nomnoml']` en `vite.config.mjs`; dos tests E2E; página `doc/components/Tech-documentation.md`, índice, navegación y seguimiento.
- **Exclusiones**: Mermaid y cualquier otro motor; tipos de diagrama nuevos; backend, esquema y migraciones; los hallazgos abiertos del registro; borrado de ramas; documento de convenciones de diagramas; arreglos oportunistas (`console.log` masivos de S-05, U-02/U-20 del manual).
- **Sin cambios**: `package.json` y `package-lock.json`. `nomnoml@1.7.0` ya estaba declarado e instalado, con `graphre@0.1.3` como dependencia transitiva (`npm ls nomnoml graphre`), así que no hizo falta ninguna instalación.

### Base

- Rama `mantenimiento/DC-56-U-24-D-42-arreglo-nomnoml-documentacion`, creada desde `main` en `1c1c3de` (`git pull --ff-only` → *Already up to date*; `git fetch --prune` → `EXIT:0`).
- PR anterior: **#83 fusionado** (merge `83472a6`, D-41). Sin PR fusionados después.
- Cambio local ajeno y no preparado: `backend/src/db/.db_connection`.

### Cambios

- **Código** (`src/views/pages/Tech-documentation.vue`):
  - Nuevo bloque `<script>` de módulo con `nomnoml` importado de npm y el `renderer` de `marked` registrado **una sola vez**; la rama que no es `nomnoml` delega en `Renderer.prototype.code` (`codeOriginal.call(this, …)`), de modo que el resto de bloques conserva el HTML y el escapado originales.
  - `renderPendingDiagrams` pinta con `nomnoml.renderSvg`, guarda `pintadoCon` por diagrama y muestra un `.diagram-error` legible si el bloque no compila; se retira la rama `draw(canvas)` (inalcanzable con el módulo de npm).
  - Se **conservan las fuentes** de los diagramas: `diagrams` solo se vacía al cargar otro documento.
  - Tema: `watch(isDarkTheme)` vuelve a pintar; en claro se usan los colores por defecto y en oscuro se antepone `#fill: #4a5568` y `#stroke: #e5e7eb` al bloque (el `.md` no se modifica). Las etiquetas de relación usan el mismo color que las líneas.
  - `mensajeDeError` descuenta el desfase de líneas que introduce la cabecera de tema (`desfase` calculado con `cabecera.split('\n').length`), de modo que el número mostrado es el mismo en los dos temas.
  - Retirados: `loadScript`, `loadedScripts`, `onBeforeUnmount`, el listener de `resize`, el `setTimeout` de 200 ms, la segunda `loadDocument` de `onMounted`, el bloque `data-relation-label` (≈40 líneas) y las reglas CSS por atributo del SVG.
  - Nuevo `watch(isLoading)` con `flush: 'post'` y `nextTick`: el render se lanza cuando el contenido deja de estar oculto por `v-if="!isLoading"`.
  - CSS: se conserva el contenedor y el aviso de carga, se añade `svg { max-width: 100%; height: auto }` y el estilo de `.diagram-error` en claro y oscuro.
- **Configuración** (`vite.config.mjs`): `optimizeDeps.include: ['nomnoml']`. Necesario porque con `noDiscovery: true` Vite servía el UMD de nomnoml sin pre-bundlear y `import nomnoml from 'nomnoml'` fallaba al enlazar en dev (página en blanco).
- **Interfaz**: sin cambios de plantilla; `docNavigation` gana la entrada del visor (75 rutas).
- **Pruebas**: `e2e/tests/documentacionReglas.spec.mjs` con dos tests nuevos (el diagrama se dibuja; se vuelve a pintar al cambiar de tema, con `try/finally` para restaurar la sesión compartida) y `e2e/scripts/mapa-fuentes.mjs` con `doc/db/schema/presupuestos.md`. Se ajusta una aserción obsoleta: la regla de publicación pasó a `(DC-47, DC-54)` en `842b1c6` (D-41) y el test seguía esperando `(DC-47)`; ahora se comprueba `'Publicación y fusiones (DC-47'`, conservando la referencia a la regla original.
- **Documentación y seguimiento**: página nueva `doc/components/Tech-documentation.md`; entrada en `doc/index.md` («Otras pantallas»); `doc/pruebas/e2e.md` y `e2e/README.md`; TODO (punto 8 y P3); registro (DC-56, U-24, D-42 y §10); relevo (§0, §2, §4 y §5); este informe y su índice.
- **Esquema, API y backend**: no aplicable.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| `doc/components/Tech-documentation.md` | Sí | Sí (nuevo) | Página de la pantalla |
| `doc/index.md` | Sí | Sí | Entrada en «Otras pantallas» |
| `doc/pruebas/e2e.md` | Sí | Sí | Fila del spec |
| `e2e/README.md` | Sí | Sí | Fila del spec |
| `TODO` | Sí | Sí | Punto 8 y prioridad P3 |
| `doc/mantenimiento/registro-hallazgos_1de3.md` | Sí | Sí | DC-56 |
| `doc/mantenimiento/registro-hallazgos_3de3.md` | Sí | Sí | U-24, D-42 y §10 |
| `doc/mantenimiento/estado-del-proyecto_1de3.md` | Sí | Sí | §0 (base y trabajo en curso) y §2 (IDs libres) |
| `doc/mantenimiento/estado-del-proyecto_2de3.md` | Sí | Sí | §4 (fila #84) y §5 |
| `doc/mantenimiento/informes_iteraciones/index.md` | Sí | Sí | Fila de este informe |
| `doc/db/schema/presupuestos.md` | Sí | No | El diagrama se dibuja con el paquete de npm sin tocar sus directivas ni sus cardinalidades (D3) |
| `package.json` / `package-lock.json` | Sí | No | `nomnoml` ya estaba declarado e instalado |
| `package.json.md` | Sí | No | No cambian los scripts |
| `README.md` / `README_en.md` | Sí | No | No mencionan el visor ni nomnoml |
| `.cline/rules/40-documentacion.md` | Sí | No | La regla vigente ya cubre el caso |
| `backend/test/README.md` | Sí | No | No aplica |

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Edición del componente | `node /tmp/nomnoml-visor-lote1.mjs --check` → `--apply` (manifiesto de 1 fichero) | `Plan válido: 1 ficheros; sin escrituras.` · `Cambios aplicados en 1 ficheros.` · copia `/tmp/timon-ayudas-backup-byHCVA` |
| Formato (prettier vía eslint) | `node /tmp/nomnoml-visor-lote1b.mjs --check` → `--apply` | Un aviso de prettier corregido en el mismo fichero |
| Lint del componente | `npx eslint src/views/pages/Tech-documentation.vue` | `EXIT:0`; 0 errores y 0 avisos |
| Build | `npm run build:frontend` (raíz, Node 20.20.2), tres ejecuciones | `EXIT:0`; `Tech-documentation-*.js` **64,83 kB → 134,58 kB**; sin chunk nuevo; avisos `Module "fs"/"path" has been externalized for browser compatibility, imported by "…/nomnoml/dist/nomnoml.js"` |
| Sin unpkg en `src/` | `git grep -n -i -e unpkg -e 'window.nomnoml' -e data-relation-label -- src/` | Sin resultados (`EXIT:1` de grep) |
| `docNavigation` intacta | `git diff -U0 -- src/views/pages/Tech-documentation.vue \| grep -E '^[-+].*(title:\|path:)'` | Vacío |
| Reglas con centinelas (DC-47) | `node scripts/comprobar-reglas.mjs` | `EXIT:0`; «Reglas coherentes…» |
| Espacios y finales | `git diff --check` | `EXIT:0` |
| Recuentos | `grep -c '^| DC-'`, `'^| U-'`, `'^| D-'`; `find doc -name '*.md'`; `grep -c "path: '"` | DC **56**, U **24**, D **42**, **125** documentos, **75** rutas de navegación |
| **D4 (causa)** | `node` con `marked` 4.3.0 instalado | `setupMarkedRenderer()` no devuelve nada y `marked.setOptions({ renderer })` con `undefined` sustituía el renderer personalizado por el de por defecto: el bloque `nomnoml` salía como `<pre><code class="language-nomnoml">` |
| Delegación del resto de bloques | `node` con `marked` 4.3.0, antes/después | Idéntico: `<pre><code>a &amp; b &lt; c</code></pre>` y `<pre><code class="language-js">` |
| E2E, intento 1 | `cd e2e && E2E_LIMPIAR_HUERFANAS=0 npm run e2e -- tests/documentacionReglas.spec.mjs` | **4 failed**: `.documentation-content` no aparecía (página en blanco). Causa: `optimizeDeps.noDiscovery` servía el UMD de nomnoml sin pre-bundlear |
| E2E, intento 2 (tras `optimizeDeps.include`) | ídem | **3 passed, 1 failed**: el test de la regla de publicación esperaba `(DC-47)` y el documento dice `(DC-47, DC-54)` desde `842b1c6` (D-41, PR #83). No es una regresión de esta iteración |
| E2E, intento 3 (aserción ajustada) | ídem | **`4 passed (33.5s)`**: regla de edición ✓ (2,4 s), regla de publicación ✓ (1,7 s), diagrama nomnoml ✓ (1,7 s), re-pintado al cambiar de tema ✓ (3,8 s). `.last-green.json` guardado. Repetida sobre el árbol completo (código, documentación y seguimiento): **`4 passed (37.8s)`** |
| Diagrama roto y bloques de código (UI real) | Spec y documento **temporales** (`doc/tmp-roto.md`, `e2e/tests/tmp-roto.spec.mjs`), ejecutados y **borrados** después | **`1 passed (31.2s)`**: `.diagram-error` visible con «No se ha podido dibujar el diagrama nomnoml» y `Parse error at line 2`; el texto posterior al bloque roto sigue visible; `pre > code` = 2, `code.language-js` = `const a = 1 & 2;`, bloque sin lenguaje = `sin lenguaje & entidades <`, **sin** `pre.line-numbers` ni `language-undefined`; al cambiar de tema el error se vuelve a pintar y sigue diciendo `line 2`. `git status` posterior sin rastro de los temporales |
| **Bundle de producción** | `npm run build:frontend` y `node_modules/.bin/vite preview --port 5173 --host` (puerto publicado), abierto con el Edge real por CDP en `/tech-docs?doc=db/schema/presupuestos` | `rects: 8`, `nodos: 14`; relleno `#4a5568` → `#eee8d5` al cambiar de tema; sin `.diagram-loader` ni `.diagram-error`; **0 errores de consola** |
| **Prueba visual (usuario)** | Revisión en pantalla en claro y oscuro | **Correcta** en los dos temas (confirmado por el usuario el 2026-11-12) |

- **D4 en una línea**: confirmado que el diagrama no se dibujaba por la segunda `marked.setOptions({ renderer })` con `undefined`; este PR lo corrige registrando el renderer una sola vez.

### No verificado

- La E2E se ejecutó sobre la base de **desarrollo `conta_hogar`** (`E2E_BASES_PERMITIDAS=conta_hogar`) por decisión expresa del usuario, con `E2E_LIMPIAR_HUERFANAS=0`. Los cuatro tests de documentación **no crean ni borran datos**.
- El navegador es el Edge real del equipo del usuario por CDP (`10.0.1.2:9222`); no se ha probado en otros navegadores.
- No se ha probado el caso de un documento con **muchos** diagramas ni el coste del re-render en documentos largos.

### Estado al preparar el informe

- Cambios aplicados con `dev/utils/ayudas.mjs` (`--check` y `--apply`, manifiesto explícito por lote) y el fichero nuevo creado con `cat`.
- **13 ficheros modificados** (`src/views/pages/Tech-documentation.vue`, `vite.config.mjs`, `TODO`, `doc/index.md`, las dos partes del registro, las dos partes del relevo, `doc/pruebas/e2e.md`, `e2e/README.md`, `e2e/tests/documentacionReglas.spec.mjs`, `e2e/scripts/mapa-fuentes.mjs` y el índice de informes) y **2 nuevos** (`doc/components/Tech-documentation.md` y este informe). `backend/src/db/.db_connection` queda fuera.
- Lint, build, reglas, `git diff --check` y E2E en verde con la salida real citada arriba.
- Sin commit, sin push y sin PR: pendientes de confirmación expresa y separada.

### Continuidad

- **Siguiente trabajo**: sigue siendo la seguridad (S-02/S-03 con DC-06, S-04 desglosado, S-05, S-11 y S-21); este PR no altera ese orden ni la prioridad P0.
- La prueba visual del usuario quedó confirmada en claro y oscuro. Si esa revisión dejara algún ajuste de paleta, se cambia la constante `#4a5568`/`#e5e7eb`; no queda nada pendiente por ese lado.
- **Qué leer**: `doc/components/Tech-documentation.md`, DC-56 y U-24 en el registro, y `e2e/README.md` para repetir la suite.
- **Qué no asumir**: que el diagrama se ve bien en todos los tamaños de pantalla; que nomnoml respeta un tema propio (no lo tiene: se re-renderiza); que la línea del error coincide con la del fichero `.md` (es la del bloque); que este PR toca `package.json` (no lo hace).
