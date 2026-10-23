# Esquema de Base de Datos - Timón

Esta sección documenta la estructura de la base de datos de Timón, organizada según los principales sistemas funcionales de la aplicación.

## Información General de la Base de Datos

- **Nombre de la base de datos**: `conta_hogar`
- **Versión del servidor**: MariaDB 11.8 (DC-04)
- **Charset principal**: utf8mb4
- **Collation**: utf8mb4_spanish_ci
- **Motor de almacenamiento**: InnoDB
- **Fuente del esquema**: las migraciones de `backend/src/db/migrations` (DC-13); los documentos de esta carpeta son de diseño y pueden ir por detrás

## Configuración del Servidor

```sql
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
```

## Sistemas Principales

1. Recibos (`recibos`, `fechas_cargo`; un recibo por año, DC-14): [db_utilsBill](../db_utilsBill.md) y [generar_recibos_anio](../generar_recibos_anio.md)
2. Anticipos (`anticipos`, `anticipos_pagos`): [db_utilsAdv](../db_utilsAdv.md)
3. Ahorros (`ahorros`, `ahorros_movimientos`): [db_utilsSav](../db_utilsSav.md)
4. Categorías (`categorias`): [db_utilsCats](../db_utilsCats.md)
5. Cuentas (`cuentas`): [db_utilsAcc](../db_utilsAcc.md)
6. Usuarios y preferencias de estilo (`users`, `users_style_preferences`): [db_utilsUsers](../db_utilsUsers.md)
7. [Sistema de Presupuestos](./presupuestos.md) - Gestión de presupuestos y periodos
8. [Sistema de Permisos](./permisos.md) - Control de acceso y visibilidad de datos
9. Ajustes del sistema y mantenimiento (`ajustes_sistema`, `mantenimiento_logs`): [db_ajustes](../db_ajustes.md)

## Optimizaciones de la Base de Datos

1. [Configuraciones y Optimizaciones](./optimizaciones.md) - Zona horaria, índices y mantenimiento automático

## Diagrama de Relaciones Principales

> Diagrama de diseño: no incluye `recibo_origen_id` (un recibo por año) ni `ajustes_sistema`, `recibos_periodos` no existe (D-02) y `recibos_historico` se eliminó en la migración 0003.

```
+------------+       +--------------+          +-------------+
| users      |<------| recibos      |--------->| fechas_     |
+------------+       +--------------+          | cargo       |
      |              |propietario_id|          +-------------+
      |              |es_privado    |                  |
      |              +--------------+                  |
      |                     |                          |
      |                     |                          |
      |                     v                          v
      |              +--------------+          +--------------+
      +------------->| categorias   |          | cuentas      |
      |              +--------------+          +--------------+
      |              |propietario_id|          |propietario_id|
      |              |es_privado    |          |es_privado    |
      |              +--------------+          +--------------+
      |                     |                         |
      |                     |                         |
      |                     v                         |
      |              +--------------+                 |
      +------------->| presupuestos |<----------------+
      |              +--------------+
      |              |propietario_id|
      |              |es_privado    |
      |              +--------------+
      |                      |
      |                      |
      |                      v
      |              +--------------+
      |              | presupuesto_ |
      |              | periodos     |
      |              +--------------+
      |                      |
      |                      |
      |                      v
      |              +--------------+
      |              | recibos_     |
      |              | periodos     |
      |              +--------------+
      |
      |
      |              +--------------+          +-------------+
      +------------->| ahorros      |--------->| ahorros_    |
      |              +--------------+          | movimientos |
      |              |propietario_id|          +-------------+
      |              |es_privado    |
      |              +--------------+
      |
      |
      |              +--------------+          +-------------+
      +------------->| anticipos    |--------->| anticipos_  |
                     +--------------+          | pagos       |
                     |propietario_id|          +-------------+
                     |es_privado    |
                     +--------------+
```

## Convenciones del Esquema

- Todos los IDs son de tipo `INT` con auto-incremento
- Las fechas utilizan `DATE` para días específicos y `TIMESTAMP` para auditoría
- Los importes monetarios usan `DECIMAL(10,2)` o `DECIMAL(12,2)`
- Se usan enumeraciones (`ENUM`) para estados y tipos predefinidos
- Los campos de auditoría incluyen `created_at` y `updated_at`
- El sistema de permisos utiliza el campo `propietario_id` y `es_privado` en las tablas principales para control de visibilidad
- Los permisos a nivel de módulo funcional se definen en la tabla `users` mediante campos `perm_[modulo]`