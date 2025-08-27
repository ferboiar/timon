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
- **Navegación**: Vue Router (`src/router/index.js`). Este archivo define la estructura de navegación de la aplicación, incluyendo las rutas y sus componentes asociados.
- **Gestión de Estado**: Composables de Vue (`src/composables/`)
- **Punto de Entrada Principal**: `src/main.js`
- **Componente Raíz**: `src/App.vue`

El frontend es una Aplicación de Página Única (SPA) que se comunica con el backend a través de una API REST.

### Backend

- **Framework**: Node.js / Express
- **Ubicación**: `backend/`
- **Punto de Entrada**: `backend/src/server.mjs`
- **Rutas API**: `backend/src/routes/`. Cada archivo corresponde a una entidad del dominio (p.ej., `cuentas.mjs`, `recibos.mjs`).
- **Lógica de Base de Datos**: `backend/src/db/`. Los archivos `db_*.mjs` contienen las consultas SQL para cada entidad.
- **Middleware**: `backend/src/middleware/`. `auth.mjs` gestiona la autenticación basada en JWT.

### Base de Datos

- **Sistema**: MySQL
- **Esquema**: El esquema completo de la base de datos, incluyendo tablas y relaciones, se define en `DB_estructura.txt`.
- **Conexión**: La configuración de la conexión a la base de datos se gestiona en `backend/src/db/db_connection.mjs` y se configura a través de `backend/src/db/.db_connection`.

## Flujo de Datos
En `src/views/pages/` se definen las vistas de la aplicación. Cada vista corresponde a una página de la aplicación y se organiza en componentes de Vue.
En `src/service/` se definen los servicios que se encargan de la comunicación con la API del backend desde las distintas vistas de la aplicación en `src/views/pages/`.
En `backend/src/routes/` se definen las rutas de la API. Cada archivo proporciona endpoints para administrar las entidades del dominio (p.ej., cuentas, recibos, anticipos, ahorros, categorias, etc.).
En `backend/src/db/` se gestiona la lógica de acceso a los datos, incluyendo las consultas SQL y la conexión a la base de datos. Contiene las funciones últimas utilizadas por la API definidas en `backend/src/routes/`.

Por tanto el flujo es:
 `src/views/pages/` -> `src/service/` -> `backend/src/routes/` -> `backend/src/db/`

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
- **Manejo de la Base de Datos**: La lógica de las consultas a la base de datos está encapsulada en funciones dentro de los archivos `db_` (p.ej., `getAllCuentas` en `db_utilsAcc.mjs`). Esto mantiene los controladores de ruta limpios y centrados en la lógica de negocio.

## Archivos Clave

- `package.json`: Define los scripts, dependencias y metadatos del proyecto.
- `vite.config.mjs`: Archivo de configuración para Vite, el empaquetador del frontend.
- `backend/src/server.mjs`: El punto de entrada que inicializa el servidor Express y sus middlewares.
- `DB_estructura.txt`: Contiene el DDL de SQL para crear la estructura completa de la base de datos.
- `src/router/index.js`: Define todas las rutas del frontend y sus guardias de navegación.
- `src/App.vue`: El componente principal de Vue que contiene la disposición general de la aplicación.

## Nomenclatura de archivos

- **Archivos de Rutas**: Los archivos que definen las rutas de la API siguen el patrón `*.mjs` y se encuentran en `backend/src/routes/`. Por ejemplo, `cuentas.mjs` maneja las rutas relacionadas con las cuentas. El nombre está en español (minúsculas) y es descriptivo de las funciones que cubre.
- **Archivos de Base de Datos**: Los archivos que contienen la lógica de acceso a datos siguen el patrón `db_*.mjs` y se encuentran en `backend/src/db/`. Por ejemplo, `db_utilsAcc.mjs` contiene funciones para interactuar con la tabla de cuentas. El nombre del fichero es descriptivo de las funciones que cubre. En inglés y minúsculas.
- **Archivos de Middleware**: Los archivos de middleware siguen el patrón `*.mjs` y se encuentran en `backend/src/middleware/`. Por ejemplo, `auth.mjs` maneja la autenticación. El nombre del fichero es descriptivo de las funciones que cubre. En inglés y minúsculas.
- **Componentes de Vue**: Los componentes de Vue siguen el patrón `*.vue` y se encuentran en `src/views/pages/`. Por ejemplo, `Accounts.vue` es el componente para gestionar las cuentas. En inglés con la inicial mayúscula.
- **Archivos de Servicios**: Los archivos de servicios siguen el patrón `*Service.js` y se encuentran en `src/service/`. Por ejemplo, `AccService.js`. El nombre sigue el patrón [Abreviatura]Service.js, donde la abreviatura (en PascalCase) describe la entidad. Por ejemplo, AccService para Cuentas (Accounts) o BillService para Recibos (Bills).
