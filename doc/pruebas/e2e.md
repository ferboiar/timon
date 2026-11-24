# Suite E2E con Playwright

Suite de pruebas de extremo a extremo de Timón. Vive en la carpeta `e2e/` del repositorio y se
ejecuta aparte del frontend y del backend: tiene su propio `package.json` y no forma parte
del despliegue.

## Qué prueba

| Spec | Qué valida |
|---|---|
| `tests/auth.spec.mjs` | Login incorrecto (401 y mensaje del servidor), login correcto (200, `/dashboard`, pie con el usuario y token de sesión) y cierre de sesión desde el menú de perfil; tras el logout, el token anterior responde 401 (S-04a). Y que `useAuth` es único por aplicación: un solo intervalo de verificación compartido y un único `currentUser` entre invocaciones (F-54) |
| `tests/cambioPasswordPropia.spec.mjs` | Cambio de la propia contraseña (S-04a): crea un administrador desechable por API, inicia sesión en un contexto aislado, cambia la contraseña desde Ajustes › Usuarios, comprueba que el token guardado cambia, que `/api/auth/verify` con el token nuevo responde 200, que el token anterior responde 401 contra `/api/users` y que la sesión sigue activa; borra el usuario en `afterAll` |
| `tests/loginLimite.spec.mjs` | Límite de intentos (S-04b, DC-63): cinco fallos con un usuario inexistente y respuesta 429 con el mensaje en pantalla; el usuario legítimo de la suite sigue pudiendo entrar. No crea datos |
| `tests/categorias.spec.mjs` | Listado y detección de categorías E2E de ejecuciones anteriores, alta, presencia en la tabla tras recargar, rechazo de duplicado, rechazo de un nombre de más de 30 caracteres en la pantalla y en el servidor (F-55), edición de la descripción y borrado |
| `tests/smoke.spec.mjs` | Que Timón carga en el navegador real y que el layout autenticado se pinta |
| `tests/erroresConexion.spec.mjs` | Pestaña Base de Datos: una prueba de conexión con una dirección inalcanzable (`127.0.0.1` y un puerto sin escuchar) muestra el mensaje de usuario completo, sin código del sistema, y no guarda nada |
| `tests/usuarios.spec.mjs` | Pestaña Usuarios: alta de un usuario `e2e_` y rechazo del nombre duplicado con el mensaje completo del servidor (409, `USUARIO_DUPLICADO`) |
| `tests/recibosBorrado.spec.mjs` | Recibos: el diálogo de borrado muestra el concepto del recibo y no un nombre vacío (F-31; no crea ni borra datos: abre el diálogo y cancela) y la selección independiente de las tablas de anuales y mensuales con el borrado múltiple desde la barra (U-22): cancelar no envía peticiones y confirmar borra los dos recibos, con datos `e2e_anual_*` y `e2e_mensual_*` y limpieza por API |
| `tests/recibosTrimestrales.spec.mjs` | Recibos: crea un `e2e_trimestral_…` y siempre un `e2e_bimestral_…` de apoyo, comprueba que la selección de trimestrales es propia frente a la de bimestrales (F-30) y que el diálogo muestra el concepto (F-31), y los borra por la interfaz; limpieza por API si el test falla |
| `tests/guardadoYNormalizacion.spec.mjs` | Guardar sin cambios y normalización (U-21): cuenta las peticiones con `page.route` y comprueba que guardar un recibo o un ahorro sin tocar nada no envía ninguna (DC-30) y que pasar solo el modo de fechas a automático sí envía una con `modoFechas: auto` (F-45); edita un concepto a mayúsculas y da de alta un ahorro en mayúsculas y exige minúsculas exactas en la API, comparando la pantalla sin distinguir mayúsculas (F-44). Datos `e2e_f45_rec_*`, `e2e_f44_rec_*`, `e2e_dc30_aho_*` y `e2e_f44_aho_*` |
| `tests/verificacionesPendientesO10.spec.mjs` | Verificaciones pendientes (O-10): un 500 simulado en Ahorros y Anticipos deja el diálogo y sus fechas intactos y el segundo guardado envía la misma fecha (F-16); el borrado de un recibo con cargos pagados muestra el 409 y no borra (DC-18, DC-21); la ejecución real desde Ajustes (vista previa de hoy, «Generar ahora», 200) solo se ejecuta con `E2E_DB_CONFIG` sobre la réplica (U-13, DC-59). Datos `e2e_f16_aho_*`, `e2e_f16_ant_*`, `e2e_pag_rec_*` y `e2e_gen_rec_*` |
| `tests/autorizacion.spec.mjs` | Autorización (S-01, S-06, S-12, DC-48): crea usuarios `e2e_rol_*` (user, limited_user y reader) y comprueba la matriz sobre `/api/cuentas` y `/api/users`, las rutas de documentación con administrador y que un recibo privado solo lo ven su dueño y el admin; limpia usuarios, cuentas y recibos `e2e_` |
| `tests/autorizacionSubrecursos.spec.mjs` | Autorización de subrecursos y permisos mixtos (S-18, U-18): un `limited_user` intenta editar un pago y un movimiento ajenos enviando su propio padre (403 y fila ajena intacta), y un usuario con `perm_recibos = escritura` pero sin permisos de cuentas ni categorías carga los catálogos (DC-49), abre Recibos y crea un recibo; crea y borra usuarios, anticipos, pagos, ahorros y movimientos `e2e_sub_*` |
| `tests/privacidad.spec.mjs` | Privacidad (`es_privado`, F-49, DC-75): marca y desmarca desde el diálogo en Recibos, Anticipos y Ahorros; visibilidad entre roles (propietario, otro user, reader y admin); el control no existe en el DOM para quien no puede cambiarla; el admin cambia registros ajenos; 403 `PRIVACIDAD_NO_PERMITIDA` en la API; candado en las siete tablas y `es_privado_tb` en el diálogo agrupado; DC-30; ayuda con un solo tooltip en ratón, teclado y clic; diálogo en 1366×768. Datos `e2e_priv_*` |
| `tests/documentacionVisor.spec.mjs` | Documentación: el diagrama nomnoml de `doc/db/schema/presupuestos.md` se dibuja y se vuelve a pintar al cambiar de tema (U-24, DC-56). No crea ni borra datos: solo lee el DOM |
| `tests/configuracionBd.spec.mjs` | Pestaña Base de Datos (S-02, S-03, DC-06): valores guardados con las contraseñas vacías, obligatorios y puerto, tooltip del usuario de mantenimiento, dos columnas y una sola en pantalla pequeña, guardado sin cambiar la contraseña, respaldo descargable, 413 por encima de 100 MB, restauración con copia previa, CA TLS (g1-g3) y usuario de mantenimiento (h1-h3). 14 casos; solo sobre la réplica con `DB_CONFIG_PATH` (DC-59) |
| `tests/sesionCaducada.spec.mjs` | Sesión caducada (S-17, U-16, U-19): un token caducado lleva al login con el aviso de caducidad, limpia los dos almacenes y el servidor responde 401; el interceptor de `apiClient` avisa al recibir un 401 (S-07); el aviso de caducidad se consume una sola vez (U-16, U-19) y un 500 de `/api/auth/verify` conserva la sesión, el token y muestra el error (F-56). No crea ni borra datos |

Las aserciones se apoyan en roles accesibles, etiquetas, textos únicos y estructura DOM estable
de la interfaz; cada spec documenta en comentarios de qué fichero de Timón sale cada selector.

## Specs de la Fase A (F-50, F-42, F-10, F-43)

| Spec | Qué valida |
|---|---|
| tests/recibosTrazabilidad.spec.mjs | Un user edita un recibo público del admin: propietario_id intacto, modificado_por = user y updated_at avanza (F-50, DC-50). Datos e2e_traz_* |
| tests/usuariosValidacion.spec.mjs | Validación de usuarios en pantalla y API, edición sin contraseña y con contraseña inválida (F-42, DC-51) |
| tests/borradosEnUso.spec.mjs | Categoría y cuenta en uso responden 409; cuerpos de borrado inválidos responden 400 (F-10, F-43) |

Los tres usan datos e2e_ y limpieza en afterAll/afterEach. Se ejecutan con npm run e2e:trazabilidad, npm run e2e:validacionUsuarios y npm run e2e:borrados.

## Cómo se ejecuta

- Navegador: el Microsoft Edge real de un equipo remoto, gobernado por CDP
  (`chromium.connectOverCDP`). No se instalan navegadores en el contenedor y no se cierra Edge.
- Aislamiento: un contexto propio por ejecución (`browser.newContext`) con `viewport: null`; la
  ventana se maximiza por CDP y se restaura al terminar. `auth.spec.mjs` usa un contexto por
  test, de modo que su logout no afecta a la sesión compartida.
- Sesión: una sola sesión por ejecución (`workers: 1`); `asegurarSesion()` solo hace login si
  falta.
- Servidores: antes de ejecutar se comprueba `http://localhost:5173` y
  `http://localhost:3000`. Si ya responden, se reutilizan y no se tocan; si falta alguno, se
  comprueba **solo el nombre** de la base configurada en `backend/src/db/.db_connection`
  (`E2E_BASES_PERMITIDAS=conta_hogar`) y se arranca `npm run nas` en un grupo de procesos
  propio, que se detiene al terminar.
- Temporales: todo va a `/tmp/timon-e2e` (`E2E_RUNTIME_DIR`), con `TMPDIR` y la caché de
  transformación de Playwright redirigidos; no se escribe en la raíz de `/tmp` ni en el repo.
- Arranque en frío (O-14): `scripts/setup.mjs` calienta Vite antes de la primera prueba en un contexto
  desechable por CDP (`/auth/login` con el formulario montado, sesión iniciada y las pestañas de
  `/settings` visibles), con hasta tres intentos porque los servidores acaban de arrancar. `retries`
  sigue en 0: la intermitencia se mitiga, no se reintenta. Ese calentamiento es la espera a
  `E2E_BASE_URL` tal como la ve el Edge: desde el contenedor esa dirección responde `ECONNRESET`,
  así que esperarla desde el proceso de la suite no es concluyente (O-16).
- Lint (O-15, DC-71, DC-76): `npx eslint e2e --ext .mjs,.js,.cjs` (0 errores y 0 avisos) y `npx prettier --check "e2e/**/*.mjs"`. `npm run lint:e2e` es la comprobación de solo lectura; el autoformato vive en `npm run format:frontend`, que aplica `--fix` a `src` y `e2e`. `lint:frontend` ya no recorre el árbol ni reescribe ficheros.

Comandos (desde `e2e/`, tras `npm ci`):

```bash
npm run e2e                       # suite completa
npm run e2e -- tests/auth.spec.mjs
npm run e2e -- --grep categorias
npm run e2e:lista                 # lista los tests sin ejecutarlos
```

## Datos de prueba

- Nombres con el formato exacto `e2e_categoria_AAAAMMDD_HHMMSS` (29 caracteres;
  `categorias.nombre` es `varchar(30)`), en minúsculas porque el servidor las guarda así
  (DC-31).
- Cada ejecución crea sus propias categorías y las borra al final, solo con ese formato.
- Al empezar se informan las categorías huérfanas con ese formato de ejecuciones anteriores.
  Por defecto se borran (solo las que no pertenecen a la ejecución en curso); con
  `E2E_LIMPIAR_HUERFANAS=0` solo se informa.
- La suite no borra ninguna otra categoría.
- Los usuarios de prueba siguen el formato exacto `e2e_usuario_AAAAMMDD_HHMMSS` (26 caracteres; `users.username` es `varchar(50)`) con correo `…@e2e.invalid` (38 caracteres; `varchar(100)`) y una contraseña de un solo uso. Cada ejecución crea y borra solo su usuario; los huérfanos con ese formato solo se informan.
- Los recibos de prueba de U-15 siguen el formato exacto `e2e_trimestral_AAAAMMDD_HHMMSS` (30 caracteres, el máximo de `recibos.concepto`) y `e2e_bimestral_AAAAMMDD_HHMMSS` (29). Se crean desde la propia página, se borran por la interfaz y, si el test falla antes, se borran por API en `afterEach`. No se toca ningún otro recibo.
- Los datos de U-21 y O-10 usan prefijos cortos por el límite de 30 caracteres: `e2e_f45_rec_` (27), `e2e_f44_rec_` (27), `e2e_f16_aho_` (27), `e2e_f16_ant_` (27), `e2e_dc30_aho_` (28), `e2e_f44_aho_` (27), `e2e_pag_rec_` (27), `e2e_gen_rec_` (27), `e2e_anual_` (25) y `e2e_mensual_` (27), seguidos de `AAAAMMDD_HHMMSS`. Se crean por API o por la interfaz y se borran por API en `afterEach`; los sucesores anuales de U-13 se borran del año más nuevo al más antiguo.
- La prueba de conexión usa `POST /api/db-config/test`, que abre una conexión y la cierra: no escribe `.db_connection` ni crea `.db_connection.backup`, y el spec comprueba que no se emite ningún guardado ni restauración.
- Bases desechables: una base creada para una verificación puntual lleva el sufijo **`_test`** (`conta_hogar_dump_test`, `conta_hogar_test`, …) y se elimina al terminar la comprobación. Nunca se usa `conta_hogar` para una prueba destructiva (regla 30-tests).

## Triage de fallos

- `.last-green.json` (no versionado) guarda la rama, el HEAD y el `sha256` de los ficheros de
  Timón mapeados en `e2e/scripts/mapa-fuentes.mjs` tras una ejecución verde.
- Cada ejecución informa del drift respecto a ese registro y deja el detalle en
  `<runtime>/estado/drift.json`.
- Si un test falla, se adjuntan URL, tamaño de ventana, `ariaSnapshot` recortado, botones
  visibles, errores de consola y respuestas HTTP no OK, sin secretos.
- Regla anti-autocuración: no se debilita una aserción ni se cambia un test para que pase sin
  explicar el motivo; un cambio de texto o idioma puede ser una regresión.

## Secretos

`e2e/.env` está versionado y **cifrado con git-crypt** (DC-45), junto con `backend/.env`,
`backend/src/db/.db_connection` y `backend/src/db/.db_connection.backup`. El clon se
desbloquea en local con la clave del proyecto (`git-crypt unlock`); sin clave no se puede
leer, y el checkout de esos ficheros falla a propósito (`required=true`). `e2e/.env.example`
solo contiene nombres de variables y no se cifra.

Antes de publicar: el filtro `clean` cifra al preparar el commit y
`scripts/comprobar-cifrado.mjs` (invocado por los hooks `pre-commit` y `pre-push`) rechaza
cualquier secreto que pretenda viajar en claro.

## Límites

- Necesita la aplicación arrancada o la posibilidad de arrancarla; si `E2E_BASE_URL` no
  responde, la suite falla en `page.goto`.
- El ancho de la ventana condiciona qué disparador del menú de perfil existe: el test cubre la
  vía directa y el botón de tres puntos.
- Los selectores dependen de textos y estructura actuales; si la interfaz cambia de forma
  intencionada, hay que actualizar el test y dejar constancia del cambio.

El detalle operativo (variables, comandos, rotación de logs y diagnóstico) está en
`e2e/README.md` del repositorio.
