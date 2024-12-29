# Timón

Una aplicación de gestión financiera domestica

## Interfaz web

### Estructura

Los templates consisten en un par de carpetas, las demos y el layout se han separado para que puedas eliminar fácilmente lo que no es necesario para tu aplicación.

- `src/layout`: Archivos principales del layout, deben estar presentes.
- `src/views`: Páginas demo como el Dashboard.
- `public/demo`: Recursos utilizados en las demo.
- `src/assets/demo`: Estilos utilizados en las demo.
- `src/assets/layout`: Archivos SCSS del layout principal.

### Menú

El menú principal está definido en el archivo `src/layout/AppMenu.vue`. Actualiza la propiedad `model` para definir tus propios elementos de menú.

### Layout Composable

El archivo `src/layout/composables/layout.js` es un componible (composable) que gestiona los cambios de estado del layout, incluyendo el modo oscuro, el tema de PrimeVue, los modos y estados del menú. Si cambias los valores iniciales como el preset o los colores, asegúrate de aplicarlos también en la configuración de PrimeVue en `main.js`.

En el contexto de desarrollo de interfaces de usuario un "Layout Composable" se refiere a una función que define la estructura visual y la disposición de los elementos dentro de una interfaz. En esencia, se encarga de organizar cómo se muestran los componentes en la pantalla.

Por lo tanto, un "Layout Composable" es una función que define un diseño específico y que puede ser reutilizada y combinada con otros composables para construir la interfaz completa.

### Tailwind CSS

Las páginas de demostración están desarrolladas con Tailwind CSS, sin embargo, la estructura principal de la aplicación utiliza principalmente CSS personalizado.

### Variables

Las variables CSS utilizadas en el template derivan sus valores de los presets de modo estilizado de PrimeVue. Utiliza los archivos bajo `assets/layout/_variables.scss` para personalizarlos según tus requisitos.