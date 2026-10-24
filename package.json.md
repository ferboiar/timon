# Comandos y estructura definidos en package.json

Estado actualizado por D-13, 2026-10-24. Este documento sustituye el ejemplo antiguo que describía backend/src/index.js y una carpeta frontend/ inexistentes. No es un segundo manifiesto ejecutable. La fuente es package.json; actualizar esta página cuando cambien sus comandos.

## Estructura actual

- Backend: backend/src/server.mjs (Express, módulos .mjs).
- Frontend: src/, Vite desde la raíz; no se hace cd frontend.
- Pruebas: node --test backend/test/; requieren MariaDB de pruebas. No ejecutarlas contra la base de la aplicación.
- Node: requisito exacto del manifiesto `>=20.9.0-1003 <21.0.0`.
- Versión declarada del proyecto: `0.1.0`; no demuestra qué versión está desplegada.

## Scripts actuales

| Comando | Valor exacto del manifiesto |
|---|---|
| `npm run start:backend` | `NODE_ENV=production node backend/src/server.mjs` |
| `npm run dev:backend` | `NODE_ENV=development nodemon backend/src/server.mjs` |
| `npm run test:backend` | `node --test backend/test/` |
| `npm run dev:frontend` | `vite` |
| `npm run build:frontend` | `vite build` |
| `npm run preview:frontend` | `vite preview` |
| `npm run lint:frontend` | `eslint --fix . --ext .vue,.js,.jsx,.cjs,.mjs --fix --ignore-path .gitignore` |
| `npm run dev` | `concurrently "npm run dev:backend" "npm run dev:frontend"` |
| `npm run nas` | `concurrently "npm run dev:backend" "npm run dev:frontend -- --host"` |
| `npm run build` | `npm run build:frontend` |
| `npm run start` | `npm run start:backend` |
| `npm run prepush` | `node scripts/incrementVersion.js` |

lint:frontend incluye correcciones automáticas: no es un análisis de solo lectura. build construye el frontend; start inicia el backend y no demuestra por sí mismo que se estén sirviendo los archivos compilados.

El script prepush es una entrada de npm. Declararla no demuestra que exista un hook de Git que la ejecute automáticamente.

## Referencias

- [Instalación](README.md)
- [Pruebas del backend](backend/test/README.md)
- [Estado del proyecto](doc/mantenimiento/estado-del-proyecto.md)
