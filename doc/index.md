# Documentación del Sistema Timon

Si retomas el proyecto, empieza por el [estado del proyecto](./mantenimiento/estado-del-proyecto.md).

## Introducción

Timon es una aplicación financiera integral diseñada para la gestión eficiente de recursos económicos personales. Esta plataforma permite a los usuarios administrar sus finanzas a través de seis sistemas interconectados: recibos, anticipos, ahorros, categorías, cuentas y usuarios.

### Propósito de la aplicación

La aplicación Timon surge como respuesta a la necesidad de contar con una herramienta especializada para:
- Gestionar recibos periódicos con fechas de cargo y estados de pago
- Administrar préstamos y adelantos de dinero a través de planes de pago estructurados
- Planificar y controlar objetivos de ahorro con seguimiento de aportaciones
- Categorizar gastos e ingresos para un mejor análisis financiero
- Gestionar múltiples cuentas financieras con seguimiento de saldos y movimientos
- Proporcionar control de acceso y seguridad mediante gestión de usuarios y autenticación

### Sistemas principales

La plataforma está organizada en seis sistemas interconectados que trabajan conjuntamente:

1. **Sistema de Recibos**: Facilita el control de pagos periódicos (mensuales, bimestrales, trimestrales) con seguimiento detallado de fechas de cargo y estados de pago.

2. **Sistema de Anticipos**: Permite la gestión de préstamos o adelantos de dinero, con funcionalidades para configurar planes de pago, consulta del saldo restante y exportación CSV; los informes estructurados son una propuesta pendiente (R-07).

3. **Sistema de Ahorros**: Permite la creación y seguimiento de objetivos de ahorro con fechas objetivo, periodicidades configurables y registro detallado de movimientos de aportación.

4. **Sistema de Categorías**: Proporciona una estructura para clasificar los movimientos financieros, permitiendo un análisis detallado de gastos e ingresos según su naturaleza.

5. **Sistema de Cuentas**: administra las cuentas y un saldo introducido manualmente; no registra automáticamente el efecto de todos los módulos (F-21).

6. **Sistema de Usuarios y Autenticación**: Proporciona control de acceso y seguridad para la aplicación, incluyendo gestión de usuarios, autenticación, autorización basada en roles y personalización de la interfaz.

### Integración entre sistemas

Los sistemas funcionan de manera interconectada:
- Los **recibos** ayudan a controlar pagos periódicos que afectan a las **cuentas** y se clasifican mediante **categorías**
- Los **anticipos** se vinculan a **cuentas** específicas para registrar origen y destino de los fondos
- Los **ahorros** permiten una planificación financiera organizada que complementa la gestión de **cuentas**
- Las categorías se asignan a recibos. Anticipos, cuentas y movimientos de ahorros no tienen clasificación por categoría implementada (R-06)
- La integración de movimientos y conciliación entre cuentas sigue pendiente (R-02); las relaciones entre módulos no actualizan automáticamente saldo_actual
- El sistema de **usuarios** controla qué personas pueden acceder a los diferentes recursos según sus roles

Esta documentación técnica está dirigida principalmente a desarrolladores y administradores del sistema, proporcionando información detallada sobre la arquitectura, componentes, servicios y APIs que conforman cada uno de estos sistemas.

## Sistema de Recibos

El sistema de recibos permite gestionar pagos periódicos con sus respectivas fechas de cargo y estados de pago, facilitando el seguimiento y control de gastos recurrentes.

### Estructura del Sistema de Recibos

El sistema de recibos sigue una arquitectura de cuatro capas:

1. **Interfaz de Usuario** - Componente Vue para la gestión de recibos y sus fechas de cargo
2. **Servicios Cliente** - Clase que maneja la comunicación con el backend
3. **Backend** - API REST y funciones de acceso a la base de datos
4. **Persistencia de datos** - Base de datos ([SGBD](./db/schema/index.md))

### Documentación de Recibos

#### Interfaz de Usuario

- [Componente ListBills](./components/ListBills.md) - Gestión completa de recibos y fechas de cargo

#### Servicios Cliente

- [BillService](./services/BillService.md) - Cliente para la API de recibos

#### Backend

- [API de Recibos](./routes/recibos.md) - Rutas REST para recibos y fechas de cargo
- [Utilidades de Base de Datos](./db/db_utilsBill.md) - Funciones de acceso a datos de recibos

## Sistema de Anticipos

El sistema de anticipos permite gestionar préstamos o adelantos que se devuelven gradualmente a través de planes de pago configurables.

### Estructura del Sistema de Anticipos

El sistema de anticipos está organizado en tres capas principales:

1. **Interfaz de Usuario** - Componentes Vue que permiten la interacción del usuario
2. **Servicios Cliente** - Clases que manejan la comunicación entre la UI y el backend
3. **Backend** - API REST y funciones de acceso a la base de datos

### Documentación de Anticipos

#### Interfaz de Usuario

- [Componente Advances](./components/Advances.md) - Gestión completa de anticipos y pagos

#### Servicios Cliente

- [AdvService](./services/AdvService.md) - Cliente para la API de anticipos

#### Backend

- [API de Anticipos](./routes/anticipos.md) - Rutas REST para anticipos y pagos
- [Utilidades de Base de Datos](./db/db_utilsAdv.md) - Funciones de acceso y lógica de negocio

## Sistema de Ahorros

El sistema de ahorros permite gestionar objetivos de ahorro con sus respectivos movimientos de aportación y consultar el importe acumulado y la fecha objetivo; el cálculo de progreso es una propuesta pendiente (R-05).

### Estructura del Sistema de Ahorros

El sistema de ahorros sigue la misma arquitectura de tres capas:

1. **Interfaz de Usuario** - Componente Vue para la gestión de ahorros y sus movimientos
2. **Servicios Cliente** - Clase que maneja la comunicación con el backend
3. **Backend** - API REST y funciones de acceso a la base de datos

### Documentación de Ahorros

#### Interfaz de Usuario

- [Componente Savings](./components/Savings.md) - Gestión completa de ahorros y movimientos

#### Servicios Cliente

- [SavService](./services/SavService.md) - Cliente para la API de ahorros

#### Backend

- [API de Ahorros](./routes/ahorros.md) - Rutas REST para ahorros y movimientos
- [Utilidades de Base de Datos](./db/db_utilsSav.md) - Funciones de acceso a datos de ahorros

## Sistema de Categorías

El sistema de categorías permite gestionar las diferentes categorías utilizadas para clasificar elementos en la aplicación.

### Estructura del Sistema de Categorías

El sistema de categorías sigue la misma arquitectura de tres capas:

1. **Interfaz de Usuario** - Componente Vue para la gestión de categorías
2. **Servicios Cliente** - Clase que maneja la comunicación con el backend
3. **Backend** - API REST y funciones de acceso a la base de datos

### Documentación de Categorías

#### Interfaz de Usuario

- [Componente Categories](./components/Categories.md) - Gestión completa de categorías

#### Servicios Cliente

- [CatsService](./services/CatsService.md) - Cliente para la API de categorías

#### Backend

- [API de Categorías](./routes/categorias.md) - Rutas REST para categorías
- [Utilidades de Base de Datos](./db/db_utilsCats.md) - Funciones de acceso a datos de categorías

## Sistema de Cuentas

El sistema de cuentas permite gestionar diferentes tipos de cuentas financieras con sus saldos y movimientos asociados.

### Estructura del Sistema de Cuentas

El sistema de cuentas sigue la misma arquitectura de tres capas:

1. **Interfaz de Usuario** - Componentes Vue para gestionar cuentas
2. **Servicios Cliente** - Clases que manejan la comunicación con el backend
3. **Backend** - API REST y funciones de acceso a la base de datos

### Documentación de Cuentas

#### Interfaz de Usuario

- [Componente Accounts](./components/Accounts.md) - Gestión completa de cuentas financieras

#### Servicios Cliente

- [AccService](./services/AccService.md) - Cliente para la API de cuentas

#### Backend

- [API de Cuentas](./routes/cuentas.md) - Rutas REST para cuentas
- [Utilidades de Base de Datos](./db/db_utilsAcc.md) - Funciones de acceso a datos de cuentas

## Sistema de Usuarios y Autenticación

El sistema de usuarios y autenticación proporciona la capa de seguridad y control de acceso a la aplicación Timon, permitiendo además la gestión de usuarios y personalización de la interfaz.

### Estructura del Sistema de Usuarios y Autenticación

Este sistema sigue una arquitectura multicapa:

1. **Interfaz de Usuario** - Componentes Vue para login y gestión de usuarios
2. **Composables** - Hooks reutilizables para gestión del estado de autenticación
3. **Directivas** - Control de acceso declarativo en plantillas
4. **Router Guards** - Protección de rutas según estado de autenticación y roles
5. **Servicios Cliente** - Comunicación con los endpoints de API
6. **Backend** - API REST y middleware de autenticación
7. **Base de Datos** - Almacenamiento y validación de credenciales

### Documentación de Usuarios y Autenticación

#### Flujo de Autenticación
- [Flujo Completo de Autenticación](./auth/AuthenticationFlow.md) - Proceso detallado de inicio de sesión y autorización

#### Interfaz de Usuario
- [Componente Login](./components/Login.md) - Interfaz de inicio de sesión
- [Componente ProfileSettings](./components/ProfileSettings.md) - Gestión de usuarios y personalización

#### Gestión de Estado y Autorización
- [Composable useAuth](./composables/useAuth.md) - Hook para gestión del estado de autenticación
- [Directiva vRole](./directives/vRole.md) - Control de acceso declarativo en plantillas
- [Composable useTheme](./composables/useTheme.md) y [useLayout](./composables/useLayout.md) - Temas y apariencia general

#### Navegación Segura
- [Guardias de Rutas](./router/routeGuards.md) - Protección de navegación basada en autenticación y roles

#### Servicios Cliente
- [UsersService](./services/UsersService.md) - Cliente para la API de usuarios

#### Backend
- [API de Autenticación](./routes/auth.md) - Endpoints para autenticación
- [API de Usuarios](./routes/users.md) - Endpoints para gestión de usuarios
- [Middleware de Autenticación](./middleware/auth.md) - Protección de rutas en el backend
- [Utilidades de Base de Datos](./db/db_utilsUsers.md) - Funciones de acceso y verificación

### Características Clave

#### Control de Acceso
- Sistema de roles (admin, user, limited_user, reader)
- Autorización basada en roles para rutas y componentes
- Directiva personalizada para control de acceso declarativo
- Middleware para protección de endpoints de API

#### Autenticación
- Autenticación basada en tokens JWT
- Doble persistencia (localStorage/sessionStorage)
- Opción "Recordarme" para sesiones persistentes
- Verificación automática de sesiones existentes
- Manejo de tokens expirados

#### Gestión de Usuarios
- Creación y edición de usuarios con diferentes roles
- Cambio de contraseñas con validación de seguridad
- Eliminación individual y múltiple de usuarios
- Listado de usuarios con operaciones en lote, sin paginación (R-08)

#### Personalización de Interfaz
- Preferencias de estilo por usuario
- Apariencia general: Sistema (sigue al navegador), Claro u Oscuro; se guarda por usuario y se recuerda en el navegador
- Selección de colores primarios y de superficie
- Configuración del modo de menú
- Persistencia de preferencias en servidor

## Funcionalidades Clave

### Recibos
- Creación y gestión de recibos periódicos
- Configuración de periodicidades (mensual, bimestral, trimestral, anual)
- Seguimiento de fechas de cargo y sus estados (pendiente y cargado; `rechazado` queda pendiente de la migración de DC-01)
- Filtrado avanzado por periodicidad, año y estado
- Cada recibo es el de un año natural; el del año siguiente lo crea un proceso diario enlazado con el anterior (DC-14, DC-17)
- Importe propio en cada fecha de cargo y ejercicio cerrado para los años anteriores (DC-15, DC-20)
- Visualización expandible de fechas de cargo por recibo
- Programación de fechas manual o automática (desde una fecha inicial); la edición parte siempre en manual y el modo automático solo reescribe las fechas pendientes
- Exportación de datos a CSV

### Anticipos
- Creación y gestión de anticipos
- Generación automática de planes de pago
- Recálculo dinámico de pagos al realizar cambios
- Borrado de un pago con reparto de su importe entre los pendientes, o sustitución por un pago nuevo
- Seguimiento del estado de anticipos y pagos
- Exportación de datos a CSV

### Ahorros
- Creación y seguimiento de objetivos de ahorro
- Configuración de fechas objetivo y periodicidades
- Registro de movimientos de aportación regulares y extraordinarios
- Saldo `ahorrado` = valor inicial más movimientos; el valor inicial se puede corregir solo mientras no hay movimientos
- Visualización expandible de movimientos por objetivo
- Exportación de datos a CSV

### Categorías
- Creación y gestión de categorías personalizadas
- Asignación de categorías a recibos; extenderlas a movimientos de otros módulos es una propuesta (R-06)
- Organización alfabética con categoría "Otros" siempre al final
- Operaciones de eliminación individual y múltiple

### Cuentas
- Creación y gestión de cuentas financieras
- Soporte para diferentes tipos de cuentas (corriente, ahorro, etc.)
- Seguimiento de saldos actuales
- Vinculación con anticipos para origen y destino de pagos

### Usuarios y Autenticación
- Inicio de sesión seguro con opción para recordar credenciales
- Protección de rutas basada en autenticación y roles
- Panel de administración para gestión de usuarios (solo administradores)
- Creación, edición y eliminación de usuarios con diferentes niveles de acceso
- Personalización de la interfaz con preferencias por usuario
- Distinción administrativa por rol; restricciones de reader/limited_user y permisos granulares pendientes (S-01, S-12)

## Ajustes, zona horaria y mantenimiento

La pantalla de Ajustes (`/settings`) reúne, por pestañas, la personalización de cada usuario y la administración del sistema: General, Usuarios, Aspecto, Administrar recibos y Base de Datos. Los administradores ven todas y abren en General; el resto solo ve Aspecto.

### Documentación

- [Componente ProfileSettings](./components/ProfileSettings.md) - Pantalla de Ajustes
- [AjustesService](./services/AjustesService.md), [DbConfigService](./services/DbConfigService.md) y [MaintenanceDBService](./services/MaintenanceDBService.md) - Clientes de las APIs de ajustes, conexión y mantenimiento
- [Composable useZonaHoraria](./composables/useZonaHoraria.md) - Zona horaria de la aplicación: «hoy», año y mes en curso, y formato de fechas y horas
- [Composable useAjustesSesion](./composables/useAjustesSesion.md) - Ajustes que solo duran la sesión
- [API de Ajustes](./routes/ajustes.md), [API de conexión](./routes/conexionDB.md) y [API de mantenimiento](./routes/mantenimientoDB.md)
- [Ajustes del sistema (db_ajustes)](./db/db_ajustes.md), [Procedimiento de recibos del año](./db/generar_recibos_anio.md), [Conexión (db_utilsConn)](./db/db_utilsConn.md) y [Copias de seguridad (db_maintenance)](./db/db_maintenance.md)
- [Utilidades de tiempo](./utils/tiempo.md) y [Configuración de entorno](./config/env.md)

### Características clave

- Zona horaria de la aplicación: las horas se guardan en UTC y el ajuste decide el día, el mes y el año en curso, y la hora con que se muestran las fechas y los registros
- Creación automática de los recibos del año siguiente, con interruptor, vista previa y ejecución manual
- Opciones de sesión para que el administrador edite y borre recibos pagados de meses cerrados y declare fechas fuera del año del recibo (DC-21, DC-29)
- Apariencia general (Sistema, Claro u Oscuro) por usuario, recordada también en el navegador para no parpadear al cargar

## Otras pantallas

- [Calendario](./components/Calendar.md) - Vista anual de los cargos y totales por mes
- [Páginas vacías de la plantilla](./components/PaginasVacias.md) - Presupuestos, Transacciones, Automatización y Préstamos

## Mantenimiento del proyecto

- [Estado del proyecto](./mantenimiento/estado-del-proyecto.md) - Documento de relevo: cómo se trabaja, cómo funciona hoy y qué toca después
- [Registro de hallazgos y decisiones](./mantenimiento/registro-hallazgos.md) - Entrada y mapa del registro (decisiones DC, hallazgos y plan por fases), dividido en 3 partes que se leen en orden: [1 de 3](./mantenimiento/registro-hallazgos_1de3.md), [2 de 3](./mantenimiento/registro-hallazgos_2de3.md), [3 de 3](./mantenimiento/registro-hallazgos_3de3.md)

## Estado de implementación y cierre de revisión

El informe de [auditoría documental](./mantenimiento/auditoria-documentacion.md) diferencia diseño, implementación y fallos conocidos. Campos de permisos no equivalen a autorización aplicada (S-01); saldos manuales no equivalen a conciliación automática; aportaciones con periodicidad no equivalen a generación automática de movimientos. La sección 10 del registro y TODO incluyen las correcciones pendientes con sus IDs.

## Documentación de raíz y vigencia

Además de doc/, hay documentación que debe consultarse en la copia del repositorio (no es contenido público del visor):

| Archivo | Estado y fuente actual |
|---|---|
| `package.json.md` | Describe los comandos de `package.json`, no es un segundo manifiesto ejecutable |
| `DB_controlfinanciero.txt` | Especificación histórica; SQL y funcionalidades no deben darse por vigentes. R-09/R-10/R-11 |
| `DB_presupuestos.txt` | Borrador SQL histórico; la fuente de esquema son las migraciones. D-02/R-11 |
| `presupuestos.txt` | Requisitos pendientes: R-11/R-12/R-13, no pantalla implementada |
| `categorías.txt` | Ejemplos; ni catálogo impuesto ni jerarquía padre-hijo implementada |

Estos cinco archivos quedan clasificados por D-13. Esa clasificación no certifica, por sí sola, toda la documentación restante.
