# Esquema de Base de Datos - Timón

Esta sección documenta la estructura de la base de datos de Timón, organizada según los principales sistemas funcionales de la aplicación.

## Información General de la Base de Datos

- **Nombre de la base de datos**: `conta_hogar`
- **Versión del servidor**: MySQL 8.0.35
- **Charset principal**: utf8mb4
- **Collation**: utf8mb4_spanish_ci
- **Motor de almacenamiento**: InnoDB

## Configuración del Servidor

```sql
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
```

## Sistemas Principales

1. [Sistema de Recibos](./recibos.md) - Gestión de pagos periódicos y sus fechas de cargo
2. [Sistema de Anticipos](./anticipos.md) - Control de préstamos y sus planes de pago
3. [Sistema de Ahorros](./ahorros.md) - Seguimiento de objetivos de ahorro y aportaciones
4. [Sistema de Categorías](./categorias.md) - Clasificación de movimientos financieros
5. [Sistema de Cuentas](./cuentas.md) - Administración de diferentes tipos de cuentas financieras
6. [Sistema de Usuarios](./usuarios.md) - Control de acceso y personalización
7. [Sistema de Presupuestos](./presupuestos.md) - Gestión de presupuestos y periodos

## Diagrama de Relaciones Principales

```
+------------+       +---------------+       +------------+
| categorias |<------| recibos       |------>| fechas_    |
+------------+       +---------------+       | cargo      |
      ^                                      +------------+
      |                                            |
      v                                            v
+------------+       +---------------+       +------------+
| presupuest |<------| periodos_     |       | cuentas    |
| os         |       | presupuesto   |       +------------+
+------------+       +---------------+             ^
      ^                     |                      |
      |                     v                      |
      |              +---------------+       +------------+
      +--------------| recibos_      |       | anticipos  |
                     | periodos      |       +------------+
                     +---------------+             |
                                                   v
                                            +------------+
                                            | anticipos_ |
                                            | pagos      |
                                            +------------+
```

## Convenciones del Esquema

- Todos los IDs son de tipo `INT` con auto-incremento
- Las fechas utilizan `DATE` para días específicos y `TIMESTAMP` para auditoría
- Los importes monetarios usan `DECIMAL(10,2)` o `DECIMAL(12,2)`
- Se usan enumeraciones (`ENUM`) para estados y tipos predefinidos
- Los campos de auditoría incluyen `created_at` y `updated_at`