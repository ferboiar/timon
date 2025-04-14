# Utilidades de Base de Datos para Cuentas

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con cuentas bancarias y financieras. Implementa operaciones CRUD básicas para la gestión completa de cuentas en la aplicación Timon.

## Características Principales

- Gestión completa de operaciones CRUD para cuentas bancarias y financieras
- Soporte para múltiples tipos de cuentas (corriente, ahorro, efectivo, etc.)
- Validación de códigos IBAN para prevenir duplicidades
- Control de estado de cuentas (activas e inactivas)
- Mantenimiento automático de saldos actualizados

## Estructura de Datos

### Tabla `cuentas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `nombre` | VARCHAR | Nombre descriptivo de la cuenta |
| `tipo` | ENUM | Tipo de cuenta (corriente, ahorro, efectivo, etc.) |
| `iban` | VARCHAR | Código IBAN de la cuenta (opcional) |
| `saldo_actual` | DECIMAL | Saldo actual de la cuenta |
| `descripcion` | TEXT | Descripción detallada (opcional) |
| `activa` | TINYINT | Estado de la cuenta (1 activa, 0 inactiva) |

## Funciones Principales

### Gestión de Cuentas

| Función | Descripción |
|---------|-------------|
| `getAccounts()` | Recupera todas las cuentas ordenadas alfabéticamente por nombre |
| `pushAccount(id, nombre, tipo, ...)` | Crea o actualiza una cuenta con todos sus atributos |
| `deleteAccounts(accounts)` | Elimina una o más cuentas especificadas por sus IDs |
| `getTipos()` | Obtiene los tipos de cuenta definidos en el esquema |

## Características Especiales

### Validación de IBAN

El módulo implementa una validación especial para códigos IBAN, asegurando que no se puedan crear dos cuentas con el mismo código, lo que podría llevar a problemas de integridad en la gestión financiera.

### Manejo de Estado

Las cuentas pueden marcarse como activas o inactivas, permitiendo a los usuarios mantener un registro histórico sin eliminar información importante.

## Validaciones y Manejo de Errores

- Verificación de duplicidad de IBAN antes de insertar o actualizar cuentas
- Validación de campos obligatorios (nombre y tipo de cuenta)
- Captura y reporte detallado de errores para facilitar la depuración
- Mensajes específicos para cada tipo de error en las operaciones de base de datos

## Consideraciones de Rendimiento

- Las operaciones de lectura y escritura están optimizadas mediante el uso de índices en los campos más consultados
- Se utiliza un pool de conexiones para minimizar el tiempo de establecimiento de conexiones a la base de datos

## Referencias

- [API de Cuentas](../routes/cuentas.md) - Rutas que utilizan estas funciones
- [Documentación de AccService](../services/AccService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Accounts](../components/Accounts.md) - Interfaz de usuario para cuentas
