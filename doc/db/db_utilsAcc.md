# Utilidades de Base de Datos para Cuentas

## Descripción General

Este módulo contiene todas las funciones de acceso a la base de datos relacionadas con cuentas bancarias y financieras. Implementa operaciones CRUD básicas para la gestión completa de cuentas en la aplicación Timon.

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

### getAccounts()

```javascript
async function getAccounts()
```

Recupera todas las cuentas de la base de datos, ordenadas alfabéticamente por nombre.

**Retorna:** Array de objetos de cuenta.

### pushAccount(id, nombre, tipo, iban, saldo_actual, descripcion, activa)

```javascript
async function pushAccount(id, nombre, tipo, iban = null, saldo_actual = 0, descripcion = null, activa = 1)
```

Crea o actualiza una cuenta en la base de datos:
- Si `id` es proporcionado y válido, actualiza la cuenta existente
- Si `id` es null, crea una nueva cuenta

**Parámetros:**
- `id` - ID de la cuenta existente o null para crear nueva
- `nombre` - Nombre de la cuenta (requerido)
- `tipo` - Tipo de cuenta (requerido)
- `iban` - Código IBAN (opcional)
- `saldo_actual` - Saldo actual (por defecto 0)
- `descripcion` - Descripción detallada (opcional)
- `activa` - Estado de la cuenta (por defecto 1)

**Validaciones:**
- Verifica duplicidad de IBAN y lanza un error específico si ya existe

### deleteAccounts(accounts)

```javascript
async function deleteAccounts(accounts)
```

Elimina una o más cuentas de la base de datos.

**Parámetros:**
- `accounts` - Un ID único o un array de IDs de cuentas a eliminar

### getTipos()

```javascript
async function getTipos()
```

Obtiene los tipos de cuenta válidos definidos en el esquema de la base de datos para el campo `tipo` de la tabla `cuentas`.

**Retorna:** Array de strings con los valores permitidos para el tipo de cuenta.

## Manejo de Conexiones

Todas las funciones implementan un patrón consistente para el manejo de conexiones:
1. Obtienen una conexión del pool mediante `getConnection()`
2. Ejecutan operaciones dentro de un bloque try/catch
3. Liberan la conexión en un bloque finally para garantizar que se devuelve al pool

## Manejo de Errores

Las funciones incluyen un manejo de errores específico para:
- Detectar y reportar errores de duplicidad de IBAN
- Capturar y relanzar cualquier otro error con información adicional
- Registrar mensajes detallados en consola para facilitar la depuración

## Referencias

- [API de Cuentas](../routes/cuentas.md) - Rutas que utilizan estas funciones
- [Documentación de AccService](../services/AccService.md) - Cliente que eventualmente llama a estas funciones
- [Componente Accounts](../components/Accounts.md) - Interfaz de usuario para cuentas
