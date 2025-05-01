# Sistema de Permisos - Documentación Técnica

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Estructura de Base de Datos](#estructura-de-base-de-datos)
   2.1 [Permisos a nivel de módulo funcional](#permisos-a-nivel-de-módulo-funcional)  
   2.2 [Visibilidad a nivel de registro](#visibilidad-a-nivel-de-registro)
3. [Implementación y Lógica](#implementación-y-lógica)
4. [Casos de Uso Típicos](#casos-de-uso-típicos)
5. [Consultas Comunes](#consultas-comunes)
6. [Diagrama de Relaciones](#diagrama-de-relaciones)
7. [Consideraciones de Diseño](#consideraciones-de-diseño)

---

## Introducción

El sistema de permisos de Timón proporciona un control granular sobre el acceso a la información y funcionalidades de la aplicación, diseñado específicamente para un entorno de gestión financiera familiar. La implementación se basa en dos conceptos principales que se complementan entre sí:

1. **Permisos a nivel de módulo funcional**: Determina qué módulos de la aplicación puede ver y modificar cada usuario.
2. **Visibilidad a nivel de registro**: Define qué registros específicos puede ver cada usuario dentro de un módulo al que tiene acceso.

Esta documentación se centra en la implementación a nivel de base de datos de estos dos enfoques y su interacción.

---

## Estructura de Base de Datos

### Permisos a nivel de módulo funcional

#### Campos de permisos en la tabla `users`

La tabla `users` incluye campos específicos para gestionar los permisos por cada módulo funcional de la aplicación:

```sql
CREATE TABLE `users` (
  /* Campos básicos de usuario... */
  `perm_recibos` ENUM('no','lectura','escritura') NOT NULL DEFAULT 'escritura',
  `perm_presupuestos` ENUM('no','lectura','escritura') NOT NULL DEFAULT 'escritura',
  `perm_ahorros` ENUM('no','lectura','escritura') NOT NULL DEFAULT 'escritura',
  `perm_anticipos` ENUM('no','lectura','escritura') NOT NULL DEFAULT 'escritura',
  `perm_transacciones` ENUM('no','lectura','escritura') NOT NULL DEFAULT 'escritura',
  `perm_categorias` ENUM('no','lectura','escritura') NOT NULL DEFAULT 'escritura',
  `perm_cuentas` ENUM('no','lectura','escritura') NOT NULL DEFAULT 'escritura'
  /* Otros campos... */
);
```

#### Definición de valores de permisos

Cada columna `perm_[modulo]` puede tener uno de estos tres valores:

| Valor | Descripción |
|-------|-------------|
| `no` | Sin acceso al módulo. El usuario no puede ver ni interactuar con esta funcionalidad. |
| `lectura` | Acceso de solo lectura. El usuario puede ver los datos pero no puede crear, modificar o eliminar registros. |
| `escritura` | Acceso completo. Incluye todas las capacidades de lectura más la habilidad de crear, modificar y eliminar registros. |

Es importante destacar que el permiso de `escritura` implica automáticamente la capacidad de `lectura`. No es necesario otorgar ambos permisos por separado.

#### Estructura completa de permisos en `users`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único del usuario |
| `username` | VARCHAR(50) | Nombre de usuario |
| `email` | VARCHAR(100) | Correo electrónico |
| `password` | VARCHAR(100) | Contraseña encriptada |
| `rol` | ENUM | Rol general: 'admin', 'user', 'limited_user', 'reader' |
| `perm_recibos` | ENUM | Nivel de acceso al módulo de recibos |
| `perm_presupuestos` | ENUM | Nivel de acceso al módulo de presupuestos |
| `perm_ahorros` | ENUM | Nivel de acceso al módulo de ahorros |
| `perm_anticipos` | ENUM | Nivel de acceso al módulo de anticipos |
| `perm_transacciones` | ENUM | Nivel de acceso al módulo de transacciones |
| `perm_categorias` | ENUM | Nivel de acceso al módulo de categorías |
| `perm_cuentas` | ENUM | Nivel de acceso al módulo de cuentas |
| `created_at` | TIMESTAMP | Fecha de creación del registro |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

### Visibilidad a nivel de registro

Para permitir la visibilidad a nivel de registro individual, cada tabla principal incluye dos campos:

- `propietario_id`: Identifica al usuario propietario del registro
- `es_privado`: Bandera booleana que indica si el registro solo es visible para su propietario

#### Estructura en tablas principales

Las siguientes tablas incluyen este control de visibilidad:

| Tabla | Campo Propietario | Campo Privacidad | FK a Users |
|-------|-------------------|------------------|------------|
| `presupuestos` | `propietario_id` | `es_privado` | ✓ |
| `recibos` | `propietario_id` | `es_privado` | ✓ |
| `ahorros` | `propietario_id` | `es_privado` | ✓ |
| `anticipos` | `propietario_id` | `es_privado` | ✓ |
| `categorias` | `propietario_id` | `es_privado` | ✓ |
| `cuentas` | `propietario_id` | `es_privado` | ✓ |

Ejemplo de estructura en la tabla `presupuestos`:

```sql
CREATE TABLE `presupuestos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  /* Otros campos... */
  `propietario_id` INT NOT NULL COMMENT 'Usuario propietario del presupuesto',
  `es_privado` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Si es privado, solo visible al propietario',
  /* Más campos... */
  CONSTRAINT `fk_presupuesto_usuario` FOREIGN KEY (`propietario_id`) REFERENCES `users` (`id`)
);
```

#### Definición de los campos de visibilidad

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `propietario_id` | INT | Clave foránea a la tabla `users` que identifica al usuario propietario del registro |
| `es_privado` | BOOLEAN | Cuando es `TRUE`, el registro solo es visible para su propietario. Cuando es `FALSE`, es visible para todos los usuarios con acceso al módulo correspondiente |

---

## Implementación y Lógica

### Flujo de control de acceso

El sistema de permisos implementa un flujo de control en dos niveles secuenciales:

1. **Primer nivel: Acceso al módulo** - Se verifica si el usuario tiene permisos para el módulo solicitado.
2. **Segundo nivel: Visibilidad de registros** - Solo se muestran los registros que cumplen los criterios de visibilidad.

#### Lógica de control a nivel de base de datos

El control de acceso se implementa mediante consultas SQL que combinan ambos niveles:

```sql
-- Pseudocódigo para obtener presupuestos accesibles para un usuario
SELECT * 
FROM presupuestos
WHERE (es_privado = FALSE OR propietario_id = [id_usuario_actual])
-- Aquí pueden añadirse filtros adicionales según necesidad
ORDER BY created_at DESC;
```

Este patrón se aplica a cada tabla principal del sistema.

---

## Casos de Uso Típicos

### 1. Usuario con acceso limitado a ciertos módulos

**Escenario**: Un usuario (cónyuge) que puede gestionar completamente recibos pero solo consultar presupuestos.

```sql
-- Configuración de permisos para el usuario
UPDATE users
SET perm_recibos = 'escritura',
    perm_presupuestos = 'lectura'
WHERE id = 3;  -- ID del usuario cónyuge
```

### 2. Registro privado solo visible para su propietario

**Escenario**: Un presupuesto personal para gastos que solo debe ser visible para el propietario.

```sql
-- Creación de un presupuesto privado
INSERT INTO presupuestos 
(concepto, importe_base, periodicidad, cuenta_id, categoria_id, propietario_id, es_privado)
VALUES 
('Gastos personales', 150.00, 'mensual', 2, 5, 2, TRUE);
```

### 3. Actualización de permisos

**Escenario**: Cambiar los permisos de un usuario para denegar acceso a un módulo.

```sql
-- Denegar acceso al módulo de anticipos
UPDATE users
SET perm_anticipos = 'no'
WHERE id = 3;
```

---

## Consultas Comunes

### Verificación de permisos de módulo

```sql
-- Verificar si un usuario tiene acceso de escritura a un módulo específico
SELECT username, perm_presupuestos
FROM users
WHERE id = [id_usuario] AND perm_presupuestos = 'escritura';
```

### Obtener registros respetando visibilidad

```sql
-- Obtener todos los ahorros visibles para un usuario
SELECT a.*
FROM ahorros a
WHERE (a.es_privado = FALSE OR a.propietario_id = [id_usuario]);
```

### Contar elementos visibles por módulo

```sql
-- Contar cuántos presupuestos puede ver un usuario
SELECT COUNT(*) AS total_presupuestos
FROM presupuestos
WHERE (es_privado = FALSE OR propietario_id = [id_usuario]);
```

---

## Diagrama de Relaciones

El siguiente diagrama muestra las relaciones entre la tabla `users` y las tablas principales con respecto al sistema de permisos:

```
+------------------+
|      users       |
+------------------+
| id               |
| username         |
| email            |
| password         |
| rol              |
| perm_recibos     |
| perm_presupuestos|
| perm_ahorros     |
| perm_anticipos   |
| perm_transacciones|
| perm_categorias  |
| perm_cuentas     |
+------------------+
        ^
        |
        | propietario_id (1:N)
        |
+------------------+     +------------------+
|   presupuestos   |     |     recibos      |
+------------------+     +------------------+
| id               |     | id               |
| ...              |     | ...              |
| propietario_id   |     | propietario_id   |
| es_privado       |     | es_privado       |
+------------------+     +------------------+
        
+------------------+     +------------------+
|     ahorros      |     |    anticipos     |
+------------------+     +------------------+
| id               |     | id               |
| ...              |     | ...              |
| propietario_id   |     | propietario_id   |
| es_privado       |     | es_privado       |
+------------------+     +------------------+

+------------------+     +------------------+
|    categorias    |     |     cuentas      |
+------------------+     +------------------+
| id               |     | id               |
| ...              |     | ...              |
| propietario_id   |     | propietario_id   |
| es_privado       |     | es_privado       |
+------------------+     +------------------+
```

En este diagrama:
- Cada tabla principal tiene una relación N:1 con la tabla `users` a través del campo `propietario_id`
- La tabla `users` contiene los permisos de módulo para cada usuario
- Los campos `es_privado` en cada tabla principal controlan la visibilidad a nivel de registro

---

## Consideraciones de Diseño

### Ventajas del enfoque implementado

1. **Simplicidad**: El sistema es fácil de entender y mantener, utilizando campos directos en las tablas.

2. **Flexibilidad**: Permite configurar permisos diferentes para cada módulo y usuario.

3. **Granularidad**: Combina permisos a nivel de módulo y visibilidad a nivel de registro.

4. **Eficiencia**: Las consultas de filtrado son directas y pueden aprovechar índices.

### Limitaciones actuales

1. **Escalabilidad de módulos**: Añadir un nuevo módulo funcional requiere modificar la tabla `users`.

2. **Herencia de permisos**: No hay mecanismo automático para heredar permisos entre registros relacionados.

### Recomendaciones de implementación

1. **Índices recomendados**: Para optimizar el rendimiento de las consultas de visibilidad:

```sql
-- Crear índices para campos de visibilidad
CREATE INDEX idx_presupuestos_visibilidad ON presupuestos (propietario_id, es_privado);
CREATE INDEX idx_recibos_visibilidad ON recibos (propietario_id, es_privado);
-- Y así sucesivamente para las demás tablas
```

2. **Gestión de relaciones**: Al eliminar un usuario, revisar o reasignar sus registros:

```sql
-- Ejemplo: Reasignar registros antes de eliminar un usuario
UPDATE presupuestos SET propietario_id = [nuevo_propietario_id] WHERE propietario_id = [usuario_a_eliminar];
-- Repetir para las demás tablas
DELETE FROM users WHERE id = [usuario_a_eliminar];
```

---

Este sistema de permisos proporciona un balance adecuado entre simplicidad y funcionalidad para una aplicación de gestión financiera familiar, permitiendo controlar tanto el acceso a las funciones como la visibilidad de los datos específicos según las necesidades de privacidad.