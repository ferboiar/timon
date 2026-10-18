# Utilidades de Base de Datos para Cuentas

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con cuentas bancarias y financieras. Implementa operaciones CRUD básicas para la gestión completa de cuentas en la aplicación Timon.

## Características Principales

- Gestión completa de operaciones CRUD para cuentas bancarias y financieras
- Soporte para múltiples tipos de cuentas (corriente, ahorro, efectivo, etc.)
- Validación de códigos IBAN para prevenir duplicidades
- Control de estado de cuentas (activas e inactivas)
- El saldo (`saldo_actual`) se edita a mano; ninguna operación lo actualiza (hallazgo F-21)

## Estructura de Datos

### Tabla `cuentas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Clave primaria |
| `nombre` | VARCHAR | Nombre descriptivo de la cuenta |
| `tipo` | ENUM | Tipo de cuenta (corriente, ahorro, efectivo, etc.) |
| `iban` | VARCHAR | Código IBAN de la cuenta (opcional y único). Sin IBAN se guarda NULL, no una cadena vacía |
| `saldo_actual` | DECIMAL | Saldo actual de la cuenta |
| `descripcion` | TEXT | Descripción detallada (opcional) |
| `activa` | TINYINT | Estado de la cuenta (1 activa, 0 inactiva) |
| `propietario_id` | INT | Usuario que creó la cuenta; se guarda al crearla (F-01) |

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

El IBAN es opcional y único (`UNIQUE KEY iban`). El índice rechaza dos cuentas con el mismo código y `pushAccount` traduce el error de duplicado en un error con código `IBAN_DUPLICADO` y el mensaje «El IBAN … ya está asignado a la cuenta «…».», para que la ruta responda 409.

El índice único admite varios NULL pero no varias cadenas vacías. Por eso `pushAccount` guarda NULL cuando el IBAN llega vacío o con solo espacios y elimina los espacios de los extremos (F-06). Así puede haber varias cuentas sin IBAN.

### Manejo de Estado

Las cuentas pueden marcarse como activas o inactivas, permitiendo a los usuarios mantener un registro histórico sin eliminar información importante.

## Validaciones y Manejo de Errores

- Detección de IBAN duplicado mediante el índice único, con un mensaje específico
- Validación de campos obligatorios (nombre y tipo de cuenta)
- Captura y reporte detallado de errores para facilitar la depuración
- Mensajes específicos para cada tipo de error en las operaciones de base de datos

## Consideraciones de Rendimiento

- Las operaciones de lectura y escritura están optimizadas mediante el uso de índices en los campos más consultados
- Se utiliza un pool de conexiones para minimizar el tiempo de establecimiento de conexiones a la base de datos

## Trazas en el log

Cada operación deja trazas en el log del backend con el formato «módulo - acción: datos» (DC-09):

| Traza | Cuándo |
|-------|--------|
| `pushAccount - Nueva cuenta: … IBAN: …` | Al crear una cuenta; «sin IBAN» si no tiene |
| `pushAccount - Actualizando la cuenta …` | Al editar una cuenta |
| `pushAccount - IBAN normalizado: "" -> null` | Cuando el IBAN llega vacío o con espacios |
| `Error: Entrada duplicada para IBAN: …` | Cuando el IBAN ya existe |

## Referencias

- [API de Cuentas](../routes/cuentas.md) - Rutas que utilizan estas funciones
- [Documentación de AccService](../services/AccService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Accounts](../components/Accounts.md) - Interfaz de usuario para cuentas
