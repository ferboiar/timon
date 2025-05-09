# Migración de estructura para Recibos y Cuentas

Este documento detalla los cambios realizados en la estructura de la base de datos para la gestión de recibos y su relación con las cuentas bancarias.

## Contexto y Motivación

Inicialmente, la relación entre recibos y cuentas bancarias se había implementado de forma que cada fecha de cargo (tabla `fechas_cargo`) estaba asociada a una cuenta bancaria específica. Con el tiempo, se observó que este diseño presentaba varios problemas:

1. **Inconsistencia conceptual**: El recibo, como entidad completa, debería tener una asociación única con una cuenta bancaria.
2. **Redundancia de datos**: La misma cuenta se repetía en múltiples fechas de cargo del mismo recibo.
3. **Complejidad de gestión**: Dificultaba las operaciones de filtrado y agrupación por cuenta.
4. **Posibilidad de inconsistencias**: Diferentes fechas de cargo del mismo recibo podrían tener diferentes cuentas asociadas.

Para solucionar estos problemas, se decidió migrar el campo `cuenta_id` de la tabla `fechas_cargo` a la tabla `recibos`.

## Cambios en la Estructura

### Antes de la migración

#### Tabla `recibos`
```sql
CREATE TABLE `recibos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `concepto` varchar(30) COLLATE utf8mb4_spanish_ci NOT NULL,
  `periodicidad` enum('mensual','bimestral','trimestral') COLLATE utf8mb4_spanish_ci NOT NULL,
  `importe` decimal(10,2) NOT NULL,
  `categoria_id` int NOT NULL,
  `propietario_id` int NOT NULL,
  -- No existía campo cuenta_id
  PRIMARY KEY (`id`),
  KEY `categoria_id` (`categoria_id`),
  KEY `idx_recibos_propietario` (`propietario_id`),
  CONSTRAINT `fk_recibos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`),
  CONSTRAINT `fk_recibos_propietario` FOREIGN KEY (`propietario_id`) REFERENCES `users` (`id`)
);
```

#### Tabla `fechas_cargo`
```sql
CREATE TABLE `fechas_cargo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recibo_id` int DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `estado` enum('pendiente','pagado','rechazado') COLLATE utf8mb4_spanish_ci DEFAULT 'pendiente',
  `comentario` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `cuenta_id` int NOT NULL,  -- Campo cuenta_id estaba aquí
  PRIMARY KEY (`id`),
  KEY `recibo_id` (`recibo_id`),
  KEY `fk_cuenta_id` (`cuenta_id`),
  CONSTRAINT `fk_fechas_cargo_recibo` FOREIGN KEY (`recibo_id`) REFERENCES `recibos` (`id`),
  CONSTRAINT `fk_cuenta_id` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id`)
);
```

### Después de la migración

#### Tabla `recibos`
```sql
CREATE TABLE `recibos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `concepto` varchar(30) COLLATE utf8mb4_spanish_ci NOT NULL,
  `periodicidad` enum('mensual','bimestral','trimestral') COLLATE utf8mb4_spanish_ci NOT NULL,
  `importe` decimal(10,2) NOT NULL,
  `categoria_id` int NOT NULL,
  `cuenta_id` int NOT NULL,  -- Nuevo campo añadido
  `propietario_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `categoria_id` (`categoria_id`),
  KEY `idx_recibos_propietario` (`propietario_id`),
  KEY `fk_recibos_cuenta` (`cuenta_id`),
  CONSTRAINT `fk_recibos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`),
  CONSTRAINT `fk_recibos_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id`),
  CONSTRAINT `fk_recibos_propietario` FOREIGN KEY (`propietario_id`) REFERENCES `users` (`id`)
);
```

#### Tabla `fechas_cargo`
```sql
CREATE TABLE `fechas_cargo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recibo_id` int DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `estado` enum('pendiente','pagado','rechazado') COLLATE utf8mb4_spanish_ci DEFAULT 'pendiente',
  `comentario` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  -- Ya no existe campo cuenta_id
  PRIMARY KEY (`id`),
  KEY `recibo_id` (`recibo_id`),
  CONSTRAINT `fk_fechas_cargo_recibo` FOREIGN KEY (`recibo_id`) REFERENCES `recibos` (`id`)
);
```

## Script de Migración

Para realizar la migración de datos de la forma más segura posible, se desarrolló el siguiente script SQL:

```sql
-- Paso 1: Iniciar transacción para asegurar la integridad
START TRANSACTION;

-- Paso 2: Añadir columna cuenta_id a la tabla recibos
ALTER TABLE recibos 
ADD COLUMN cuenta_id INT NOT NULL DEFAULT 1 AFTER categoria_id;

-- Paso 3: Añadir clave foránea en recibos para cuenta_id
ALTER TABLE recibos
ADD CONSTRAINT fk_recibos_cuenta FOREIGN KEY (cuenta_id) REFERENCES cuentas(id);

-- Paso 4: Eliminar la clave foránea existente en fechas_cargo para cuenta_id
ALTER TABLE fechas_cargo
DROP FOREIGN KEY fk_cuenta_id;

-- Paso 5: Eliminar la columna cuenta_id de fechas_cargo
ALTER TABLE fechas_cargo
DROP COLUMN cuenta_id;

-- Paso 6: Verificar que no hay problemas con los datos
SELECT 
    (SELECT COUNT(*) FROM recibos WHERE cuenta_id IS NULL) AS recibos_sin_cuenta;
    
-- Si todo está correcto y recibos_sin_cuenta es 0, confirmamos la transacción
COMMIT;
```

## Ajustes en el Código

La migración requirió cambios en varios componentes del sistema:

1. **API de Recibos**: Se modificó para validar y requerir el campo `cuenta_id` en las operaciones de creación y actualización de recibos.
2. **Funciones de Base de Datos**: Se actualizó `pushRecibo()` para incluir el parámetro `cuenta_id`.
3. **Servicio Cliente**: Se actualizó `BillService` para enviar `cuenta_id` en las peticiones.
4. **Interfaz de Usuario**: Se añadió un desplegable para seleccionar la cuenta bancaria en los formularios de creación y edición de recibos.

## Beneficios del Cambio

La migración del campo `cuenta_id` de `fechas_cargo` a `recibos` proporcionó varios beneficios:

1. **Mayor coherencia conceptual**: La relación entre recibos y cuentas ahora refleja mejor la realidad del dominio.
2. **Reducción de redundancia**: La cuenta se almacena una sola vez por recibo.
3. **Simplificación de consultas**: Las consultas que involucran recibos y cuentas son más simples y eficientes.
4. **Mejor integridad de datos**: Se elimina la posibilidad de inconsistencias en la asociación de cuentas.
5. **Interfaz de usuario más clara**: El formulario de recibos ahora tiene un único selector de cuenta, lo que mejora la experiencia del usuario.

## Notas sobre `propietario_id`

El campo `propietario_id` ya estaba correctamente implementado en la tabla `recibos`, lo que permite:

1. **Control de acceso**: Identificar al propietario del recibo para operaciones de autorización.
2. **Filtrado por propietario**: Mostrar a cada usuario solo sus propios recibos.
3. **Visibilidad selectiva**: Cuando se combina con el campo `es_privado`, permite definir qué recibos son visibles para otros usuarios.

La implementación garantiza que el `propietario_id` se asigna automáticamente desde el token JWT del usuario autenticado, eliminando la necesidad de que el cliente lo proporcione explícitamente.