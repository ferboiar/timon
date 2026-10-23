# Composable useLayout

Archivo: `src/layout/composables/layout.js`. Guarda el estado compartido del diseño (menú y apariencia) y lo expone a las pantallas y al resto de composables.

## Estado

| Objeto | Campos |
|--------|--------|
| `layoutConfig` | `preset`, `primary`, `surface`, `menuMode`, `colorScheme` (apariencia general: `system`, `light` o `dark`) y `darkTheme` (modo oscuro efectivo en este momento, deducido de `colorScheme`) |
| `layoutState` | Estado del menú: `staticMenuDesktopInactive`, `overlayMenuActive`, `staticMenuMobileActive`, `menuHoverActive`, `activeMenuItem` y otros |

## Valores devueltos por `useLayout()`

`layoutConfig`, `layoutState`, `toggleMenu`, `isSidebarActive`, `isDarkTheme`, `getPrimary`, `getSurface`, `setActiveMenuItem`, `toggleDarkMode` y `applyColorScheme`.

## Apariencia general (DC-26)

- `resolverModoOscuro(modo)` (exportada) indica si una apariencia equivale a modo oscuro ahora mismo. `system` consulta `prefers-color-scheme` del navegador.
- `aplicarApariencia(modo, recordar = false)` (exportada y disponible como `applyColorScheme`) actualiza `colorScheme` y `darkTheme` y la clase `app-dark` del documento. Con `recordar = true` guarda el modo en `localStorage` (`timon.colorScheme`).
- Si el modo es `system`, el módulo escucha los cambios de `prefers-color-scheme` y se actualiza en directo.
- Al cargar el módulo se aplica el modo recordado en el navegador, y `index.html` aplica la clase `app-dark` antes de pintar la página, para evitar el parpadeo. Cuando llegan las preferencias del servidor, estas mandan y actualizan la copia (`useAuth.applyUserPreferences`). Al guardar en Ajustes › Aspecto también se actualiza (`ProfileSettings.applyAndSaveStyles`).
- `toggleDarkMode()` (botón de la luna de la barra superior) alterna claro y oscuro de forma explícita. No recuerda el cambio: al recargar vuelve a lo guardado.

## Referencias

- [Composable useTheme](./useTheme.md)
- [Composable useAuth](./useAuth.md)
- [Componente ProfileSettings](../components/ProfileSettings.md)
