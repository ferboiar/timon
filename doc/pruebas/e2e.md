# Suite E2E con Playwright

Suite de pruebas de extremo a extremo de Timón. Vive en la carpeta `e2e/` del repositorio y se
ejecuta aparte del frontend y del backend: tiene su propio `package.json` y no forma parte
del despliegue.

## Qué prueba

| Spec | Qué valida |
|---|---|
| `tests/auth.spec.mjs` | Login incorrecto (401 y mensaje del servidor), login correcto (200, `/dashboard`, pie con el usuario y token de sesión) y cierre de sesión desde el menú de perfil |
| `tests/categorias.spec.mjs` | Listado y detección de categorías E2E de ejecuciones anteriores, alta, presencia en la tabla tras recargar, rechazo de duplicado, edición de la descripción y borrado |
| `tests/smoke.spec.mjs` | Que Timón carga en el navegador real y que el layout autenticado se pinta |
| `tests/erroresConexion.spec.mjs` | Pestaña Base de Datos: una prueba de conexión con una dirección inalcanzable (`127.0.0.1` y un puerto sin escuchar) muestra el mensaje de usuario completo, sin código del sistema, y no guarda nada |
| `tests/usuarios.spec.mjs` | Pestaña Usuarios: alta de un usuario `e2e_` y rechazo del nombre duplicado con el mensaje completo del servidor (409, `USUARIO_DUPLICADO`) |
| `tests/recibosBorrado.spec.mjs` | Recibos: el diálogo de borrado muestra el concepto del recibo y no un nombre vacío (F-31). No crea ni borra datos: abre el diálogo y cancela |

Las aserciones se apoyan en roles accesibles, etiquetas, textos únicos y estructura DOM estable
de la interfaz; cada spec documenta en comentarios de qué fichero de Timón sale cada selector.

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
- La prueba de conexión usa `POST /api/db-config/test`, que abre una conexión y la cierra: no escribe `.db_connection` ni crea `.db_connection.backup`, y el spec comprueba que no se emite ningún guardado ni restauración.

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
