# Componente Tech-documentation

Archivo: `src/views/pages/Tech-documentation.vue`. Visor de la documentación técnica: pinta los documentos de `doc/` dentro de la aplicación, en `/tech-docs` (solo administradores).

## Qué muestra

- Un panel de navegación a la izquierda con el árbol `docNavigation`, escrito a mano en el propio componente, y el documento a la derecha.
- El documento indicado en la URL (`/tech-docs?doc=…`) convertido de Markdown a HTML con `marked`. Sin `?doc`, carga `index`.
- Los enlaces a otros documentos (`.md`) se resuelven con `resolvePath` y navegan dentro del visor; el resto de enlaces se comportan como enlaces normales.
- Los bloques `nomnoml` se dibujan como diagramas; el resto de bloques de código se muestran como código.

## Cómo carga los documentos

`import.meta.glob('/doc/**/*.md', { query: '?raw', import: 'default' })` registra todos los documentos en tiempo de compilación; `loadDocument(path)` compone `/doc/<path>.md` y lo busca en ese mapa. `currentPath` guarda la ruta activa y `watch(() => route.query.doc, …, { immediate: true })` recarga el documento al cambiar la URL. Los diagramas se pintan cuando termina la carga (`isLoading` pasa a `false` y el contenido deja de estar oculto por `v-if`).

La navegación se mantiene a mano: todo documento nuevo se añade a `docNavigation` y a [doc/index.md](../index.md), y los enlaces entre documentos son relativos a su carpeta para que funcionen también en GitHub.

## Diagramas nomnoml

El motor es **nomnoml**, declarado en `package.json` y cargado desde npm (no desde unpkg). Es el único motor de diagramas soportado. Un bloque con el lenguaje `nomnoml` se sustituye por un contenedor y se dibuja después, cuando el documento ya está en el DOM. Ejemplo mínimo copiable:

````md
```nomnoml
#direction: right
[a] -> [b]
```
````

- Las directivas de nomnoml (`#direction`, `#spacing`, `#font`, `#lineWidth`, `#background`…) se respetan tal cual; el fichero `.md` no se modifica.
- **Tema claro y oscuro**: nomnoml no tiene tema propio, así que el diagrama se **vuelve a dibujar** al cambiar la apariencia. En claro se usan sus colores por defecto y en oscuro se antepone al bloque `#fill: #4a5568` y `#stroke: #e5e7eb`. Las etiquetas de relación usan el mismo color que las líneas: no se distinguen.
- **Diagrama inválido**: se muestra el aviso «No se ha podido dibujar el diagrama nomnoml: …» en el lugar del diagrama y el resto de la página sigue funcionando. El mensaje indica la **línea dentro del bloque** (no la del fichero) y es la misma en los dos temas; en errores de bloque sin cerrar, nomnoml señala la última línea del bloque.
- El SVG trae `viewBox` y se adapta al ancho del contenedor.

## Bloques de código

Cualquier otro bloque delega en el renderer original de `marked`: mismo HTML, mismo escapado y sin clases añadidas, de modo que el resto de documentos se ve igual que antes de personalizar el renderer.

## Referencias

- [Registro de hallazgos: decisiones y hallazgos de interfaz](../mantenimiento/registro-hallazgos.md)
- [Índice de documentación](../index.md)
- [Componente Calendar](./Calendar.md)
