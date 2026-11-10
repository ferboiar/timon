# Suite E2E de Timón

Suite de extremo a extremo de Timón con Playwright. Conduce el Microsoft Edge real de
un equipo remoto a través de CDP: no lanza ni cierra navegadores locales.

Vive dentro del repositorio (`e2e/`) pero **no forma parte del despliegue**: se instala y
se ejecuta aparte, con su propio `package.json`.

## Requisitos

1. Edge arrancado con depuración remota y accesible desde donde se ejecuta la suite
   (`E2E_CDP_URL`, por ejemplo `http://<IP-del-portátil>:9222`).
2. La aplicación accesible **desde ese Edge** (`E2E_BASE_URL`). En el contenedor conviene
   comprobar `http://localhost:5173` y `http://localhost:3000`, porque la IP del host da
   *Empty reply* desde dentro.
3. Un usuario de la base de datos de desarrollo y su contraseña (`E2E_USER`,
   `E2E_PASSWORD`).
4. Node 20 y `npm ci` en `e2e/`. **No** hace falta `npx playwright install`: los tests se
   conectan a Edge, no lanzan un Chromium local.

## Configuración

```bash
cd e2e
cp .env.example .env
chmod 600 .env
# rellenar E2E_CDP_URL, E2E_BASE_URL, E2E_USER y E2E_PASSWORD
```

`dotenv` no sobrescribe variables ya definidas: si el portátil exporta `E2E_CDP_URL` y
`E2E_BASE_URL` antes de ejecutar, esas tienen prioridad sobre el fichero.

## Ejecución

```bash
cd e2e
npm run e2e                        # lanzador: prepara el runtime, ejecuta y limpia
npm run e2e -- --grep categorias   # argumentos para Playwright
```

Comprobación previa (obligatoria si el Edge es remoto):

```bash
curl -s --max-time 5 "$E2E_CDP_URL/json/version"
```

El lanzador (`lanzador.mjs`):

1. Crea el directorio de ejecución (`/tmp/timon-e2e` por defecto, `E2E_RUNTIME_DIR`).
2. Exporta `TMPDIR`, `TMP` y `TEMP` a `<runtime>/tmp` y
   `PLAYWRIGHT_TRANSFORM_CACHE_DIR` a `<runtime>/cache`.
3. Ejecuta Playwright heredando la salida y propagando el código de salida.
4. Al terminar siempre: para los servidores que haya arrancado la suite, vacía `tmp/`,
   borra `diagnostico/ejecucion-*` y `estado/`, rota `logs/` (últimos 5) y guarda
   `.last-green.json` si todo ha pasado.

## Estructura

| Ruta | Contenido |
|---|---|
| `playwright.config.mjs` | Configuración: `testDir ./tests`, `workers: 1`, artefactos en el runtime, `screenshot: only-on-failure`, `video: off`, `trace: off` |
| `lanzador.mjs` | Lanzador de `npm run e2e` (temporales, caché, limpieza) |
| `scripts/entorno.mjs` | Raíz del repo derivada, `.env`, runtime, credenciales y flags |
| `scripts/servidores.mjs` | Preflight de base de datos, arranque y parada de front y back |
| `scripts/setup.mjs` / `scripts/teardown.mjs` | `globalSetup` y `globalTeardown` de Playwright (entorno y parada ordenada) |
| `scripts/ultimo-verde.mjs` | Guarda y compara `.last-green.json` para el triage |
| `scripts/mapa-fuentes.mjs` | Mapa spec → ficheros de Timón que justifican cada aserción |
| `tests/fixtures.mjs` | Conexión CDP, contexto aislado de auth y contexto de sesión compartida |
| `tests/helpers/timon.mjs` | `asegurarSesion`, login, navegación y CRUD de categorías |
| `tests/helpers/diagnostico.mjs` | Adjuntos de fallo (`testInfo.attach`) sin secretos |
| `tests/auth.spec.mjs` | Login incorrecto, login correcto y cierre de sesión |
| `tests/categorias.spec.mjs` | Flujo serial sobre una sola sesión |
| `tests/smoke.spec.mjs` | Timón carga en el Edge del portátil |
| `tests/erroresConexion.spec.mjs` | Base de Datos: mensaje de usuario ante una conexión inalcanzable, sin guardar nada |
| `tests/usuarios.spec.mjs` | Usuarios: alta `e2e_` y duplicado con el mensaje completo del servidor |
| `tests/recibosBorrado.spec.mjs` | Recibos: el diálogo de borrado muestra el concepto del recibo (no crea ni borra datos) |
| `tests/recibosTrimestrales.spec.mjs` | Recibos: selección propia de trimestrales frente a bimestrales (F-30) y concepto en el diálogo (F-31); crea y borra sus recibos `e2e_…` |
| `tests/documentacionReglas.spec.mjs` | Documentación: los centinelas de las reglas no se ven en el visor y los bloques se pintan (DC-47), sin datos |
| `tests/sesionCaducada.spec.mjs` | Sesión caducada: redirección al login y limpieza de almacenes (S-17), sin datos |

## Aislamiento y sesión

- Cada ejecución abre un **contexto propio** (`browser.newContext`) sobre el Edge remoto,
  con `viewport: null` (se respeta el tamaño de la ventana) y sin tocar el perfil del
  usuario. Al terminar se cierra el contexto y la pestaña; nunca se llama a
  `browser.close()`.
- `auth.spec.mjs` usa su propio contexto: su logout no invalida la sesión compartida.
- Los demás specs comparten **una única sesión** por ejecución (`workers: 1`), creada por
  `asegurarSesion()` solo la primera vez.
- La ventana se maximiza por CDP al empezar y se restaura al terminar.

## Datos E2E

- Los nombres siguen el formato exacto `e2e_categoria_AAAAMMDD_HHMMSS` (29 caracteres:
  `categorias.nombre` es `varchar(30)`) y van en minúsculas porque el servidor las guarda
  así (DC-31).
- Cada ejecución crea sus propias categorías y las borra al final (`afterAll`), solo con
  ese formato. Si un borrado falla, la salida indica el nombre exacto que queda.
- Al empezar se informa de las categorías huérfanas con ese formato de ejecuciones
  anteriores. Por defecto se borran (solo las que no pertenecen a la ejecución en curso);
  con `E2E_LIMPIAR_HUERFANAS=0` solo se informa.
- Los usuarios de prueba siguen el formato exacto `e2e_usuario_AAAAMMDD_HHMMSS` (26 caracteres;
  `users.username` es `varchar(50)`) con correo `@e2e.invalid` y contraseña de un solo uso. Se borra
  en `afterAll` solo el usuario creado por la ejecución; los huérfanos con ese formato **solo se
  informan**, nunca se borran automáticamente (son cuentas, no categorías).
- Los recibos de prueba de U-15 siguen el formato exacto `e2e_trimestral_AAAAMMDD_HHMMSS` (30 caracteres, el máximo de `recibos.concepto`) y `e2e_bimestral_AAAAMMDD_HHMMSS` (29). Se crean desde la propia página, se borran por la interfaz y, si el test falla antes, se borran por API en `afterEach`.

## Servidores

- Antes de ejecutar se comprueba `http://localhost:5173` y `http://localhost:3000`. Si
  ambos responden (cualquier código HTTP cuenta), se reutilizan y no se tocan.
- Si falta alguno, se comprueba **solo el nombre** de la base configurada en
  `backend/src/db/.db_connection` (`E2E_BASES_PERMITIDAS=conta_hogar` por defecto) y se
  arranca `npm run nas` en la raíz, en un grupo de procesos propio, con log en
  `<runtime>/logs`.
- Al terminar se para **solo** lo que arrancó la suite (`SIGTERM` y, si hace falta,
  `SIGKILL` al grupo) y se verifica que 5173 y 3000 ya no escuchan.

## Triage de fallos

- `.last-green.json` guarda la rama, el HEAD y el `sha256` de los ficheros de Timón
  mapeados en `scripts/mapa-fuentes.mjs` tras una ejecución verde.
- Si un test falla, antes de tocar nada: se revisa el entorno, se comparan los ficheros
  mapeados con el último verde y se adjuntan diagnósticos (URL, tamaño de ventana,
  `ariaSnapshot`, botones visibles, errores de consola y respuestas no OK).
- **Regla anti-autocuración**: no se debilita una aserción ni se cambia un test para que
  pase sin explicar el motivo; un cambio de texto o idioma puede ser una regresión.

## `e2e/.env` cifrado

`e2e/.env` está versionado y **cifrado con git-crypt** (DC-45). El clon se desbloquea con la
clave del proyecto (`git-crypt unlock`); sin clave no se puede leer y el checkout falla a
propósito (`required=true`). No se ignora: `e2e/.gitignore` solo excluye `.last-green.json` y
`node_modules`.

Antes de publicar, los hooks `pre-commit` y `pre-push` (activados con
`core.hooksPath scripts/hooks`) rechazan cualquier secreto en claro mediante
`scripts/comprobar-cifrado.mjs`.

## Fallo observado durante la migración (2026-11-06)

**Síntoma.** Con el diseño anterior (una pestaña del perfil del usuario y un `prepararLogin`
con dos `page.goto` seguidos), el test de duplicado fallaba **siempre después** del de
creación y solo en secuencia: `TimeoutError: page.waitForResponse: Timeout 15000ms` en el
`beforeEach`, con la pestaña todavía en `edge://newtab`. Ejecutado aislado, el mismo test
pasaba.

**Causa probable.** Dos navegaciones consecutivas sobre una pestaña del perfil compartido (el
guard del router redirige a `/dashboard` si hay `token` en `localStorage`, y el segundo `goto`
interrumpe esa navegación) y, sobre todo, atar la espera del `GET /api/categorias` al
`actionTimeout` de una acción: si la primera navegación de una pestaña tarda más que ese
límite, la espera de red expira antes de que el DOM exista. El diagnóstico del fallo lo
confirmó: la pestaña seguía en la página de nueva pestaña cuando expiró la espera.

**Corrección.** Contexto propio por ejecución con `viewport: null`, una sola navegación en
`asegurarSesion` y esperas sobre el DOM (`getByRole`) en lugar de esperas de red para la
carga inicial. Ver la sección «Aislamiento y sesión».

## Límites conocidos

- Si `E2E_BASE_URL` no responde, la suite falla en `page.goto`
  (`net::ERR_EMPTY_RESPONSE` / `net::ERR_CONNECTION_RESET`).
- El ancho de la ventana cambia qué disparador del menú de perfil existe: el test cubre la
  vía directa y el botón de tres puntos.
- Algunos selectores dependen de textos y de la estructura actual de Timón; el mapa de
  fuentes y los comentarios de cada test indican de dónde salen.
