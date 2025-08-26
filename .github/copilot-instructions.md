# Instrucciones para el Agente de Copilot

Gracias por ayudar a construir Timón. Esta guía te ayudará a empezar.

## Descripción General del Proyecto

Timón es una aplicación de gestión financiera personal de pila completa construida con el stack VEM (Vue, Express, MySQL). Permite a los usuarios realizar un seguimiento de sus cuentas, recibos, ahorros y más.

## Arquitectura

La aplicación está dividida en dos partes principales: un frontend de Vue.js y un backend de Node.js/Express.

### Frontend

- **Framework**: Vue.js 3 (con Composition API)
- **Ubicación**: `src/`
- **Componentes UI**: PrimeVue (`primevue`)
- **Estilos**: Tailwind CSS y Sass (`src/assets/styles.scss`)
- **Enrutamiento**: Vue Router (`src/router/index.js`)
- **Gestión de Estado**: Composables de Vue (`src/composables/`)
- **Punto de Entrada Principal**: `src/main.js`
- **Componente Raíz**: `src/App.vue`

El frontend es una Aplicación de Página Única (SPA) que se comunica con el backend a través de una API REST.

### Backend

- **Framework**: Node.js / Express
- **Ubicación**: `backend/`
- **Punto de Entrada**: `backend/src/server.mjs`
- **Rutas API**: `backend/src/routes/`. Cada archivo corresponde a una entidad del dominio (p.ej., `cuentas.mjs`, `recibos.mjs`).
- **Lógica de Base de Datos**: `backend/src/db/`. Los archivos `db_utils*.mjs` contienen las consultas SQL para cada entidad.
- **Middleware**: `backend/src/middleware/`. `auth.mjs` gestiona la autenticación basada en JWT.

### Base de Datos

- **Sistema**: MySQL
- **Esquema**: El esquema completo de la base de datos, incluyendo tablas y relaciones, se define en `DB_estructura.txt`.
- **Conexión**: La configuración de la conexión a la base de datos se gestiona en `backend/src/db/db_connection.mjs` y se configura a través de `backend/src/db/.db_connection`.

## Flujos de Trabajo del Desarrollador

Los scripts principales están definidos en `package.json`.

- **Desarrollo**:
  - `npm run dev`: Inicia tanto el frontend como el backend en modo de desarrollo con recarga en caliente. Este es el comando que probablemente usarás más.
  - `npm run dev:frontend`: Inicia solo el servidor de desarrollo de Vite para el frontend.
  - `npm run dev:backend`: Inicia solo el servidor de Node.js con `nodemon`.

- **Producción**:
  - `npm run build`: Construye la aplicación de frontend para producción.
  - `npm run start`: Inicia el servidor de backend en modo de producción.

- **Linting**:
  - `npm run lint:frontend`: Analiza y corrige automáticamente los archivos del frontend.

## Convenciones del Proyecto

- **Comunicación API**: El frontend se comunica con el backend a través de servicios dedicados en `src/service/`. Estos servicios usan `axios` para realizar peticiones HTTP a la API REST del backend.
- **Autenticación**: La autenticación se implementa usando JSON Web Tokens (JWT). El composable `src/composables/useAuth.js` gestiona el estado de autenticación en el frontend. El middleware `backend/src/middleware/auth.mjs` protege las rutas del backend.
- **Nomenclatura de Rutas**: Las rutas del backend siguen un patrón RESTful. Por ejemplo, para obtener todas las cuentas, la ruta es `GET /api/cuentas`.
- **Manejo de la Base de Datos**: La lógica de las consultas a la base de datos está encapsulada en funciones dentro de los archivos `db_utils` (p.ej., `getAllCuentas` en `db_utilsAcc.mjs`). Esto mantiene los controladores de ruta limpios y centrados en la lógica de negocio.

## Archivos Clave

- `package.json`: Define los scripts, dependencias y metadatos del proyecto.
- `vite.config.mjs`: Archivo de configuración para Vite, el empaquetador del frontend.
- `backend/src/server.mjs`: El punto de entrada que inicializa el servidor Express y sus middlewares.
- `DB_estructura.txt`: Contiene el DDL de SQL para crear la estructura completa de la base de datos.
- `src/router/index.js`: Define todas las rutas del frontend y sus guardias de navegación.
- `src/App.vue`: El componente principal de Vue que contiene la disposición general de la aplicación.
