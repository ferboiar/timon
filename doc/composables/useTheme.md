# Composable useTheme

## Descripción General

Centraliza los temas de PrimeVue de la aplicación: presets, paletas de color primario y de superficie, y la aplicación de una configuración de estilo completa. Lo usan `ProfileSettings` (Ajustes › Aspecto) y `useAuth` al cargar las preferencias del usuario.

## Valores exportados

| Nombre | Descripción |
|--------|-------------|
| `presets` | Presets disponibles: `Aura` y `Lara` |
| `presetOptions` | Nombres de los presets, para el selector «Tema» |
| `menuModeOptions` | Opciones de «Funcionamiento del menú»: `static` y `overlay` |
| `colorSchemeOptions` | Opciones de «Apariencia general»: `system` (Sistema), `light` (Claro) y `dark` (Oscuro), cada una con su icono (`pi-desktop`, `pi-sun`, `pi-moon`) (DC-26) |
| `defaultConfig` | Valores por defecto: preset `Aura`, primario `emerald`, superficie `zinc`, menú `static`, `darkTheme: true` y `colorScheme: 'dark'` |
| `primaryColors` y `surfaces` | Paletas de color primario y de superficie disponibles |

## Funciones

| Función | Descripción |
|---------|-------------|
| `getPresetExt(color)` | Extensión del preset para un color primario (nombre u objeto). `noir` usa la superficie como primario |
| `applyTheme(type, color)` | Aplica un color `primary` o de `surface` |
| `applyFullTheme(layoutConfig)` | Aplica preset, primario y superficie, y fija la clase `app-dark` según `layoutConfig.colorScheme` (con `resolverModoOscuro`); si no trae `colorScheme`, usa `darkTheme` |
| `updatePreset`, `updateSurfacePalette` y `$t` | Reexportan las utilidades de `@primevue/themes` |

## Referencias

- [Composable useLayout](./useLayout.md)
- [Componente ProfileSettings](../components/ProfileSettings.md)
- [Composable useAuth](./useAuth.md)
