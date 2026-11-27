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
| `tests/auth.spec.mjs` | Login incorrecto, login correcto, cierre de sesión y revocación del token anterior (S-04a); instancia única de `useAuth` con un solo intervalo (F-54) |
| `tests/cambioPasswordPropia.spec.mjs` | Cambio de la propia contraseña: usuario desechable admin, token nuevo, sesión activa y token anterior revocado (S-04a) |
| `tests/loginLimite.spec.mjs` | Límite de intentos: cinco fallos con un usuario inexistente y 429 visible; un usuario legítimo sigue entrando (S-04b, DC-63) |
| `tests/categorias.spec.mjs` | Flujo serial sobre una sola sesión, con el límite de 30 caracteres del nombre (F-55) |
| `tests/smoke.spec.mjs` | Timón carga en el Edge del portátil |
| `tests/erroresConexion.spec.mjs` | Base de Datos: mensaje de usuario ante una conexión inalcanzable, sin guardar nada |
| `tests/usuarios.spec.mjs` | Usuarios: alta `e2e_` y duplicado con el mensaje completo del servidor |
| `tests/recibosBorrado.spec.mjs` | Recibos: el diálogo de borrado muestra el concepto del recibo (no crea ni borra datos) y la selección independiente de anuales y mensuales con el borrado múltiple desde la barra (U-22); crea y borra sus recibos `e2e_anual_…` y `e2e_mensual_…` |
| `tests/anticiposBorradoMultiple.spec.mjs` | Anticipos: borrado múltiple desde la barra (F-39); «No» no envía ninguna petición y conserva la selección, «Sí» borra los dos anticipos (uno con pago) con un único `DELETE /api/anticipos` y avisa «Éxito», y un 500 avisa «Error» y conserva las filas; crea y borra anticipos `e2e_f39_ant_…` |
| `tests/anticiposFechaPropuesta.spec.mjs` | Anticipos: la fecha propuesta de un pago manual respeta la periodicidad (F-40); un anticipo trimestral con `fecha_inicio` 2027-01-31 y un pago del 2027-03-31 propone 2027-06-30 (anclaje en el día 31) en «Añadir un pago» y en «Añadirlo en un nuevo»; crea y borra un `e2e_f40_ant_…` |
| `tests/recibosTrimestrales.spec.mjs` | Recibos: selección propia de trimestrales frente a bimestrales (F-30) y concepto en el diálogo (F-31); crea un `e2e_trimestral_…` y siempre un `e2e_bimestral_…` de apoyo, y los borra |
| `tests/guardadoYNormalizacion.spec.mjs` | Guardar sin cambios y normalización (U-21): sin petición al guardar sin tocar nada (DC-30) y con una al pasar a modo de fechas automático (F-45); concepto en mayúsculas guardado en minúsculas, con la API en minúsculas exactas y la pantalla comparada sin distinguir mayúsculas (F-44); datos `e2e_f45_rec_…`, `e2e_f44_rec_…`, `e2e_dc30_aho_…` y `e2e_f44_aho_…` |
| `tests/verificacionesPendientesO10.spec.mjs` | Verificaciones pendientes (O-10): reintento tras un 500 sin mutar el formulario en Ahorros y Anticipos (F-16), 409 al borrar un recibo con cargos pagados (DC-18, DC-21) y ejecución real desde Ajustes solo con `E2E_DB_CONFIG` sobre la réplica (U-13, DC-59); datos `e2e_f16_aho_…`, `e2e_f16_ant_…`, `e2e_pag_rec_…` y `e2e_gen_rec_…` |
| `tests/autorizacion.spec.mjs` | Autorización: matriz de roles, propiedad, privacidad y rutas de documentación (S-01, S-06, S-12); crea y borra usuarios, cuentas y recibos `e2e_` |
| `tests/autorizacionSubrecursos.spec.mjs` | Subrecursos: un `limited_user` no edita pagos ni movimientos ajenos usando su propio padre (S-18); permisos mixtos: catálogos legibles y recibo creado (U-18, DC-49); crea y borra datos `e2e_sub_*` |
| `tests/privacidad.spec.mjs` | Privacidad (`es_privado`, F-49, DC-75): el propietario marca y desmarca desde el diálogo en Recibos, Anticipos y Ahorros; el otro user y el reader no ven el registro y el control no existe en el DOM para ellos; el admin sí lo ve y lo cambia en registros ajenos; la API responde 403 `PRIVACIDAD_NO_PERMITIDA`; el candado aparece en las cinco tarjetas de Recibos y en las tablas de Anticipos y Ahorros; DC-30 al activar solo la privacidad; la ayuda se ve con ratón, teclado y clic con un solo tooltip; diálogo completo en 1366×768. Crea y borra datos `e2e_priv_*` |
| `tests/documentacionVisor.spec.mjs` | Documentación: el diagrama nomnoml se dibuja y se repinta al cambiar de tema (U-24, DC-56), sin datos |
| `tests/sesionCaducada.spec.mjs` | Sesión caducada: redirección al login con aviso y limpieza de almacenes (S-17, U-16), incluido el interceptor de `apiClient` (S-07), el consumo único del aviso (U-19) y la sesión que se mantiene ante un 500 de verificación (F-56), sin datos |

## Specs de la Fase A (F-50, F-42, F-10, F-43)

- tests/recibosTrazabilidad.spec.mjs: un user edita un recibo público del admin; comprueba que propietario_id no cambia, que modificado_por es el user y que updated_at avanza. Usa datos e2e_traz_* y espera más de un segundo entre alta y edición.
- tests/usuariosValidacion.spec.mjs: la pantalla deshabilita Guardar con correo o contraseña inválidos; la API responde 400; la edición acepta contraseña omitida y valida la que llegue (F-42, DC-51).
- tests/borradosEnUso.spec.mjs: una categoría y una cuenta usadas por un recibo responden 409 con mensaje de negocio; los cuerpos de borrado inválidos de cuentas y ahorros responden 400 (F-10, F-43).

Comandos: npm run e2e:trazabilidad, npm run e2e:validacionUsuarios y npm run e2e:borrados. Los tres declaran timeout de 180 s y se ejecutan con --repeat-each=2 en la verificación de la Fase A.

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
- Los datos de U-22, U-21 y O-10 usan prefijos cortos por el límite de 30 caracteres (`e2e_anual_`, `e2e_mensual_`, `e2e_f45_rec_`, `e2e_f44_rec_`, `e2e_f16_aho_`, `e2e_f16_ant_`, `e2e_dc30_aho_`, `e2e_f44_aho_`, `e2e_pag_rec_`, `e2e_gen_rec_`, `e2e_f39_ant_` y `e2e_f40_ant_`), seguidos de `AAAAMMDD_HHMMSS`. Se crean por API o por la interfaz y se borran por API en `afterEach`; los sucesores anuales de U-13 se borran del año más nuevo al más antiguo.

## Servidores

- Antes de ejecutar se comprueba `http://localhost:5173` y `http://localhost:3000`. Si
  ambos responden (cualquier código HTTP cuenta), se reutilizan y no se tocan.
- Si falta alguno, se comprueba **solo el nombre** de la base configurada en
  `backend/src/db/.db_connection` (`E2E_BASES_PERMITIDAS=conta_hogar` por defecto) y se
  arranca `npm run nas` en la raíz, en un grupo de procesos propio, con log en
  `<runtime>/logs`.
- Los specs de la pestaña **Base de Datos** necesitan una base `*_test` y un arranque manual
  con `DB_CONFIG_PATH` (ver «Base de datos de las pruebas»). En ese caso la suite encuentra
  5173 y 3000 ya levantados, los reutiliza y **no** comprueba `E2E_BASES_PERMITIDAS`.
- Al terminar se para **solo** lo que arrancó la suite (`SIGTERM` y, si hace falta,
  `SIGKILL` al grupo) y se verifica que 5173 y 3000 ya no escuchan.

## Arranque en frío (O-14)

Con los servidores recién arrancados, el primer `goto` de un contexto nuevo compila la ruta en Vite y
puede agotar las esperas de la primera prueba. Por eso `scripts/setup.mjs` **calienta** el entorno
antes de la primera prueba, en un contexto desechable por CDP: carga `/auth/login`, inicia sesión con
el usuario de la suite y espera las pestañas de `/settings`. El calentamiento no crea ni modifica
datos y su contexto se cierra al terminar; nunca se cierra el navegador (con CDP cerraría Edge).

`retries` sigue en **0**: no se reintenta un test para que pase. El calentamiento sí reintenta hasta
tres veces, porque los servidores se acaban de arrancar y el primer `goto` puede llegar antes de que
Vite atienda en la dirección que ve el Edge. Si aun así no se completa, solo avisa con
`[calentamiento]` y la suite continúa; las esperas de cada test dicen qué falta.

El calentamiento **es** la espera a `E2E_BASE_URL` tal y como la ve el Edge: desde el contenedor esa
misma dirección responde `ECONNRESET` (ver «Requisitos»), así que una espera desde el proceso de la
suite no demuestra lo que ve el Edge (O-16).

## Base de datos de las pruebas (pestaña Base de Datos)

Los specs de la pestaña **Base de Datos** guardan la configuración y restauran un volcado, así
que **no pueden ejecutarse contra la base de desarrollo**. El procedimiento es:

1. `node e2e/scripts/prepara-base-pruebas.mjs [ruta]` recrea `conta_hogar_test` **de cero**
   (tolera restos de ejecuciones fallidas), crea el usuario de las E2E como administrador y
   escribe el fichero de configuración, incluidas las credenciales de mantenimiento que usa el
   caso `h1`. Sin `E2E_CLONAR`, aplica las migraciones y siembra una cuenta y una categoría. Con `E2E_CLONAR=1` replica `conta_hogar` en `conta_hogar_test`:

   ```bash
   E2E_CLONAR=1 node e2e/scripts/prepara-base-pruebas.mjs /tmp/timon-e2e-db-connection
   ```

   El volcado del origen es de solo lectura (`mariadb-dump --single-transaction`, sin
   `--routines` ni `--events`: el evento horario no debe actuar en la base de pruebas y,
   desde la migración 0007, los objetos de `conta_hogar` quedan a nombre de `timon_admin`,
   que `timon_test` no puede recrear sin `SET USER`), la
   carga va por la entrada estándar del cliente `mariadb` con un fichero de opciones 600, la
   contraseña nunca viaja en los argumentos y nunca se escribe en `conta_hogar`. El script
   comprueba que la base destino termina en `_test`.

   **`E2E_CLONAR=1` no aplica migraciones:** la réplica hereda el esquema de `conta_hogar`. Si el
   origen no tiene desplegada una migración (por ejemplo la 0008 de S-04), la réplica clonada no
   sirve para el código de la rama y el backend responde 500 `ER_BAD_FIELD_ERROR`. En ese caso,
   usa el script sin `E2E_CLONAR`, que aplica todas las migraciones.

   **`E2E_CLONAR=1` tampoco copia rutinas ni eventos**, así que la réplica no tiene
   `generar_recibos_anio` y los casos que la ejecutan (la ejecución real de U-13 desde Ajustes)
   responden 500 hasta aplicar esa migración. Para verificar U-13 en pantalla sobre la réplica,
   aplica la migración `0007` (recrea los procedimientos sin `DEFINER` y es idempotente) con los
   servidores parados; después arranca la aplicación y ejecuta la suite como siempre. La réplica se
   destruye al terminar.


2. Arranca la aplicación apuntando a ese fichero, nunca al real:
   `DB_CONFIG_PATH=<ruta> npm run nas`.
3. Ejecuta la suite con `E2E_DB_CONFIG=<ruta>` (para el caso que siembra y borra una CA) y, si
   se quieren cubrir las reglas de mantenimiento, `E2E_MANT_USER` y `E2E_MANT_PASSWORD`.
   Las variables que evitan skips silenciosos son tres: `E2E_MANT_USER` y
   `E2E_MANT_PASSWORD` (caso `b)`) y `E2E_LOG_SERVIDOR`, que apunta al log del backend y habilita
   `g2)`. Sin ellas, esos dos casos de `configuracionBd.spec.mjs` se saltan sin fallar y el
   recuento de la pasada baja sin que nada lo indique.
4. La suite del backend (`npm run test:backend:local`) **borra `conta_hogar_test`** al
   terminar: vuelve a ejecutar el paso 1 antes de la siguiente tanda.

   **No lances la suite del backend con un servidor e2e vivo ni con un clon a medio cargar**:
   los fallos de esquema que aparecen así no son defectos del código. Para el servidor y
   vuelve a empezar por el paso 1.

Con DC-59, el resto de la suite puede ejecutarse sobre `conta_hogar`, siempre que todo lo que
cree lleve prefijo `e2e_` o sufijo `_test`; la réplica es el modo recomendado y el único
válido para los specs de la pestaña Base de Datos.

`DB_CONFIG_PATH` es una variable de entorno del backend (`db_utilsConn` y `db_connection`): si
está definida, la aplicación lee y escribe ahí su configuración. Así las E2E no tocan
`backend/src/db/.db_connection`.

## Lint

`npx eslint e2e --ext .mjs,.js,.cjs` analiza los ficheros versionados de `e2e/` con la configuración
raíz: 0 errores y 0 avisos `prettier/prettier`, porque la suite está formateada con `.prettierrc.json`
(DC-71). `npm run lint:e2e` es el comando de solo lectura. `npm run iter:previa` analiza los `e2e/` que
cambian. El autoformato está en `npm run format:frontend`, que aplica `--fix` solo a `src` y `e2e`
(DC-76); `npm run lint:frontend` ya no recorre el árbol ni reescribe ficheros.

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
