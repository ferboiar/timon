# Comandos y estructura definidos en package.json

Estado actualizado por D-13, 2026-10-24. Este documento sustituye el ejemplo antiguo que describía backend/src/index.js y una carpeta frontend/ inexistentes. No es un segundo manifiesto ejecutable. La fuente es package.json; actualizar esta página cuando cambien sus comandos.

## Estructura actual

- Backend: backend/src/server.mjs (Express, módulos .mjs).
- Frontend: src/, Vite desde la raíz; no se hace cd frontend.
- Pruebas: node --test backend/test/; requieren MariaDB de pruebas. No ejecutarlas contra la base de la aplicación. Excepción: `backend/test/fechas.test.mjs` (F-12), `backend/test/pool.test.mjs` (F-13) y `backend/test/generacionAnual.test.mjs` (U-13) no necesitan base de datos y se pueden ejecutar solas con `node --test <fichero>`.
- Node: requisito exacto del manifiesto `>=20.9.0-1003 <21.0.0`.
- Versión declarada del proyecto: `0.1.0`; no demuestra qué versión está desplegada.

## Scripts actuales

| Comando | Valor exacto del manifiesto |
|---|---|
| `npm run start:backend` | `NODE_ENV=production node backend/src/server.mjs` |
| `npm run dev:backend` | `NODE_ENV=development nodemon backend/src/server.mjs` |
| `npm run test:backend` | `node --test backend/test/` |
| `npm run test:backend:local` | `node scripts/comprobar-entorno-pruebas.mjs && node --env-file=backend/test/.env.test --test backend/test/` |
| `npm run dev:frontend` | `vite` |
| `npm run build:frontend` | `vite build` |
| `npm run preview:frontend` | `vite preview` |
| `npm run lint:frontend` | `eslint src --ext .vue,.js,.jsx,.cjs,.mjs` |
| `npm run lint:e2e` | `eslint e2e --ext .mjs,.js,.cjs` |
| `npm run lint:backend` | `eslint backend scripts dev --ext .mjs,.js,.cjs` |
| `npm run lint` | `npm run lint:frontend && npm run lint:e2e && npm run lint:backend` |
| `npm run format:frontend` | `eslint src e2e --ext .vue,.js,.jsx,.cjs,.mjs --fix` |
| `npm run dev` | `concurrently "npm run dev:backend" "npm run dev:frontend"` |
| `npm run nas` | `concurrently "npm run dev:backend" "npm run dev:frontend -- --host"` |
| `npm run build` | `npm run build:frontend` |
| `npm run start` | `npm run start:backend` |
| `npm run prepush` | `node scripts/incrementVersion.js` |
| `npm run iter:previa` | `node scripts/iteracion.mjs previa` |
| `npm run iter:pruebas` | `node scripts/iteracion.mjs pruebas` |
| `npm run iter:cierre` | `node scripts/iteracion.mjs cierre` |
| `npm run iter:ids` | `node scripts/iteracion.mjs ids` |

Los `lint:*` son de solo lectura: no escriben en el árbol. El autoformato está en `npm run format:frontend`, que aplica `--fix` solo a `src` y `e2e` (DC-76); `lint:backend` no impone Prettier a `backend` ni a `scripts`, y `_adjuntos/` queda excluido. `build` construye el frontend; `start` inicia el backend y no demuestra por sí mismo que se estén sirviendo los archivos compilados.

Los scripts `iter:*` son mecánicos: no hacen commit, push ni PR. `npm run iter:cierre -- <tema> --ficheros a,b` necesita el `--` para pasar las opciones. `iter:pruebas -- --ejecuta` sin `--incluye-entorno` omite la E2E y las pruebas con base `_test`: esa ejecución **no** es verde.

El script prepush es una entrada de npm. Declararla no demuestra que exista un hook de Git que la ejecute automáticamente.

## Referencias

- [Instalación](README.md)
- [Pruebas del backend](backend/test/README.md)
- [Estado del proyecto](doc/mantenimiento/estado-del-proyecto.md)

## Prueba independiente del proceso anual

`node --test backend/test/generacionAnual.test.mjs` ejecuta las pruebas puras de U-13 sin base de datos. No se añade ningún script a package.json.
