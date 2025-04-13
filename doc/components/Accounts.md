# Componente Accounts

Este documento proporciona documentación detallada sobre el componente `Accounts.vue`, encargado de gestionar las cuentas financieras en la aplicación Timon.

## Descripción General

El componente `Accounts` permite la administración completa de cuentas bancarias y otros tipos de cuentas financieras. Proporciona funcionalidad para:
- Crear, editar y eliminar cuentas
- Visualizar la lista completa de cuentas
- Gestionar diferentes tipos de cuentas (corriente, ahorro, etc.)
- Exportar datos de cuentas

## Datos y Propiedades

### Estados Principales

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `accounts` | `ref([])` | Lista de cuentas recuperadas de la base de datos |
| `selectedAccounts` | `ref([])` | Cuentas seleccionadas en la tabla para operaciones en lote |
| `account` | `ref({})` | Objeto que almacena los datos de la cuenta en edición |
| `tipos` | `ref([])` | Lista de tipos de cuentas permitidos en el sistema |

### Estados de Diálogos

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `accountDialog` | `ref(false)` | Controla la visibilidad del diálogo de edición de cuentas |
| `deleteAccountDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para eliminar una cuenta |
| `deleteSelectedAccountsDialog` | `ref(false)` | Controla la visibilidad del diálogo de confirmación para eliminar múltiples cuentas |

### Propiedades Computadas

| Propiedad | Descripción |
|-----------|-------------|
| `isFormValid` | Valida si el formulario de cuenta tiene todos los campos requeridos completados |

## Funciones Principales

### Gestión de Cuentas

| Función | Descripción |
|---------|-------------|
| `fetchAccounts()` | Recupera la lista de cuentas desde el servidor |
| `fetchTipos()` | Obtiene los tipos de cuentas permitidos en el sistema |
| `openNewAccount()` | Inicializa un nuevo objeto cuenta y abre el diálogo de creación |
| `editAccount(acc)` | Carga los datos de una cuenta existente para su edición |
| `saveAccount()` | Guarda una cuenta nueva o actualiza una existente |
| `deleteAccount()` | Elimina una cuenta seleccionada |
| `deleteSelectedAccounts()` | Elimina todas las cuentas seleccionadas en la tabla |

### Utilidades

| Función | Descripción |
|---------|-------------|
| `updateAccounts()` | Actualiza la lista de cuentas y muestra un mensaje de confirmación |
| `hideDialog()` | Cierra cualquier diálogo abierto |
| `capitalizeFirstLetter(string)` | Convierte la primera letra de un texto a mayúscula |

## Ciclo de Vida

En el evento `onMounted`, el componente:
1. Carga la lista de cuentas mediante `fetchAccounts()`
2. Obtiene los tipos de cuentas disponibles mediante `fetchTipos()`

## Estructura del Template

El template está estructurado en varias secciones:

1. **Barra de herramientas superior**: Con botones para crear, eliminar y actualizar cuentas
2. **Tabla principal de cuentas**: Muestra las cuentas con sus datos principales
3. **Diálogos**:
   - Diálogo de edición de cuentas
   - Diálogo de confirmación para eliminar una cuenta
   - Diálogo de confirmación para eliminar múltiples cuentas

## Validaciones

El componente implementa las siguientes validaciones:
- El nombre de la cuenta es obligatorio
- El tipo de cuenta es obligatorio
- La descripción no puede exceder los 255 caracteres

## Dependencias

El componente depende del servicio `AccService` para realizar todas las operaciones CRUD relacionadas con las cuentas bancarias.
