# Documentación del Sistema de Anticipos y Cuentas

## Introducción

Timon es una aplicación financiera integral diseñada para la gestión eficiente de recursos económicos personales. Esta plataforma permite a los usuarios administrar sus finanzas a través de cinco sistemas interconectados: recibos, anticipos, ahorros, categorías y cuentas.

### Propósito de la aplicación

La aplicación Timon surge como respuesta a la necesidad de contar con una herramienta especializada para:
- Gestionar recibos periódicos con fechas de cargo y estados de pago
- Administrar préstamos y adelantos de dinero a través de planes de pago estructurados
- Planificar y controlar objetivos de ahorro con seguimiento de aportaciones
- Categorizar gastos e ingresos para un mejor análisis financiero
- Gestionar múltiples cuentas financieras con seguimiento de saldos y movimientos

### Sistemas principales

La plataforma está organizada en cinco sistemas interconectados que trabajan conjuntamente:

1. **Sistema de Recibos**: Facilita el control de pagos periódicos (mensuales, bimestrales, trimestrales) con seguimiento detallado de fechas de cargo y estados de pago.

2. **Sistema de Anticipos**: Permite la gestión de préstamos o adelantos de dinero, con funcionalidades para configurar planes de pago, seguimiento de avances y generación de reportes.

3. **Sistema de Ahorros**: Permite la creación y seguimiento de objetivos de ahorro con fechas objetivo, periodicidades configurables y registro detallado de movimientos de aportación.

4. **Sistema de Categorías**: Proporciona una estructura para clasificar los movimientos financieros, permitiendo un análisis detallado de gastos e ingresos según su naturaleza.

5. **Sistema de Cuentas**: Facilita la administración de diferentes tipos de cuentas financieras (corrientes, ahorros, efectivo), mostrando saldos actualizados y registrando todos los movimientos.

### Integración entre sistemas

Los cinco sistemas funcionan de manera interconectada:
- Los **recibos** ayudan a controlar pagos periódicos que afectan a las **cuentas** y se clasifican mediante **categorías**
- Los **anticipos** se vinculan a **cuentas** específicas para registrar origen y destino de los fondos
- Los **ahorros** permiten una planificación financiera organizada que complementa la gestión de **cuentas**
- Las **categorías** se aplican a los movimientos generados por **anticipos**, operaciones de **cuentas**, movimientos de **ahorros** y **recibos**
- Las **cuentas** reflejan el impacto de los **recibos**, **anticipos** y **ahorros** en forma de movimientos categorizados

Esta documentación técnica está dirigida principalmente a desarrolladores y administradores del sistema, proporcionando información detallada sobre la arquitectura, componentes, servicios y APIs que conforman cada uno de estos sistemas.

## Sistema de Recibos

El sistema de recibos permite gestionar pagos periódicos con sus respectivas fechas de cargo y estados de pago, facilitando el seguimiento y control de gastos recurrentes.

### Estructura del Sistema de Recibos

El sistema de recibos sigue una arquitectura de tres capas:

1. **Interfaz de Usuario** - Componente Vue para la gestión de recibos y sus fechas de cargo
2. **Servicios Cliente** - Clase que maneja la comunicación con el backend
3. **Backend** - API REST y funciones de acceso a la base de datos

### Documentación de Recibos

#### Interfaz de Usuario

- [Componente ListBills](../components/ListBills.md) - Gestión completa de recibos y fechas de cargo

#### Servicios Cliente

- [BillService](../services/BillService.md) - Cliente para la API de recibos

#### Backend

- [API de Recibos](../routes/recibos.md) - Rutas REST para recibos y fechas de cargo
- [Utilidades de Base de Datos](../db/db_utilsBill.md) - Funciones de acceso a datos de recibos

## Sistema de Anticipos

El sistema de anticipos permite gestionar préstamos o adelantos que se devuelven gradualmente a través de planes de pago configurables.

### Estructura del Sistema de Anticipos

El sistema de anticipos está organizado en tres capas principales:

1. **Interfaz de Usuario** - Componentes Vue que permiten la interacción del usuario
2. **Servicios Cliente** - Clases que manejan la comunicación entre la UI y el backend
3. **Backend** - API REST y funciones de acceso a la base de datos

### Documentación de Anticipos

#### Interfaz de Usuario

- [Componente Advances](../components/Advances.md) - Gestión completa de anticipos y pagos

#### Servicios Cliente

- [AdvService](../services/AdvService.md) - Cliente para la API de anticipos

#### Backend

- [API de Anticipos](../routes/anticipos.md) - Rutas REST para anticipos y pagos
- [Utilidades de Base de Datos](../db/db_utilsAdv.md) - Funciones de acceso y lógica de negocio

## Sistema de Ahorros

El sistema de ahorros permite gestionar objetivos de ahorro con sus respectivos movimientos de aportación y consultar el progreso hacia metas financieras específicas.

### Estructura del Sistema de Ahorros

El sistema de ahorros sigue la misma arquitectura de tres capas:

1. **Interfaz de Usuario** - Componente Vue para la gestión de ahorros y sus movimientos
2. **Servicios Cliente** - Clase que maneja la comunicación con el backend
3. **Backend** - API REST y funciones de acceso a la base de datos

### Documentación de Ahorros

#### Interfaz de Usuario

- [Componente Savings](../components/Savings.md) - Gestión completa de ahorros y movimientos

#### Servicios Cliente

- [SavService](../services/SavService.md) - Cliente para la API de ahorros

#### Backend

- [API de Ahorros](../routes/ahorros.md) - Rutas REST para ahorros y movimientos
- [Utilidades de Base de Datos](../db/db_utilsSav.md) - Funciones de acceso a datos de ahorros

## Sistema de Categorías

El sistema de categorías permite gestionar las diferentes categorías utilizadas para clasificar elementos en la aplicación.

### Estructura del Sistema de Categorías

El sistema de categorías sigue la misma arquitectura de tres capas:

1. **Interfaz de Usuario** - Componente Vue para la gestión de categorías
2. **Servicios Cliente** - Clase que maneja la comunicación con el backend
3. **Backend** - API REST y funciones de acceso a la base de datos

### Documentación de Categorías

#### Interfaz de Usuario

- [Componente Categories](../components/Categories.md) - Gestión completa de categorías

#### Servicios Cliente

- [CatsService](../services/CatsService.md) - Cliente para la API de categorías

#### Backend

- [API de Categorías](../routes/categorias.md) - Rutas REST para categorías
- [Utilidades de Base de Datos](../db/db_utilsCats.md) - Funciones de acceso a datos de categorías

## Sistema de Cuentas

El sistema de cuentas permite gestionar diferentes tipos de cuentas financieras con sus saldos y movimientos asociados.

### Estructura del Sistema de Cuentas

El sistema de cuentas sigue la misma arquitectura de tres capas:

1. **Interfaz de Usuario** - Componentes Vue para gestionar cuentas
2. **Servicios Cliente** - Clases que manejan la comunicación con el backend
3. **Backend** - API REST y funciones de acceso a la base de datos

### Documentación de Cuentas

#### Interfaz de Usuario

- [Componente Accounts](../components/Accounts.md) - Gestión completa de cuentas financieras

#### Servicios Cliente

- [AccService](../services/AccService.md) - Cliente para la API de cuentas

#### Backend

- [API de Cuentas](../routes/cuentas.md) - Rutas REST para cuentas
- [Utilidades de Base de Datos](../db/db_utilsAcc.md) - Funciones de acceso a datos de cuentas

## Funcionalidades Clave

### Recibos
- Creación y gestión de recibos periódicos
- Configuración de periodicidades (mensual, bimestral, trimestral, anual)
- Seguimiento de fechas de cargo y sus estados (pendiente, pagado, rechazado)
- Filtrado avanzado por periodicidad, año y estado
- Visualización expandible de fechas de cargo por recibo
- Exportación de datos a CSV

### Anticipos
- Creación y gestión de anticipos
- Generación automática de planes de pago
- Recálculo dinámico de pagos al realizar cambios
- Seguimiento del estado de anticipos y pagos
- Exportación de datos a CSV

### Ahorros
- Creación y seguimiento de objetivos de ahorro
- Configuración de fechas objetivo y periodicidades
- Registro de movimientos de aportación regulares y extraordinarios
- Visualización expandible de movimientos por objetivo
- Exportación de datos a CSV

### Categorías
- Creación y gestión de categorías personalizadas
- Asignación de categorías a elementos del sistema
- Organización alfabética con categoría "Otros" siempre al final
- Operaciones de eliminación individual y múltiple

### Cuentas
- Creación y gestión de cuentas financieras
- Soporte para diferentes tipos de cuentas (corriente, ahorro, etc.)
- Seguimiento de saldos actuales
- Vinculación con anticipos para origen y destino de pagos
