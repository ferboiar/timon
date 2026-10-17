-- Migración 0001: línea base del esquema de conta_hogar
-- Origen: volcado de la BD viva (MariaDB 11.8.8 restaurada desde Aiven/MySQL 8.4.8), 2026-10-17.
-- Solo estructura: sin datos, sin contadores AUTO_INCREMENT y sin rutina ni evento de mantenimiento (migración 0002).
-- Se ejecuta dentro de una base ya creada con CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci.

-- Tablas, claves primarias, índices y columnas AUTO_INCREMENT

CREATE TABLE `ahorros` (
  `id` int NOT NULL AUTO_INCREMENT,
  `concepto` varchar(30) COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `ahorrado` decimal(10,2) DEFAULT NULL,
  `fecha_objetivo` date DEFAULT NULL,
  `periodicidad` enum('mensual','bimestral','trimestral','anual') COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `importe_periodico` decimal(10,2) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `propietario_id` int NOT NULL,
  `es_privado` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Si es privado, solo visible al propietario',
  PRIMARY KEY (`id`),
  KEY `idx_ahorros_visibilidad` (`propietario_id`,`es_privado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `ahorros_movimientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ahorro_id` int NOT NULL,
  `importe` decimal(10,2) NOT NULL,
  `fecha` date NOT NULL,
  `tipo` enum('regular','extraordinario') COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ahorro_id` (`ahorro_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `anticipos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `concepto` varchar(30) COLLATE utf8mb4_spanish_ci NOT NULL,
  `importe_total` decimal(10,2) NOT NULL,
  `pago_sugerido` decimal(10,2) DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin_prevista` date DEFAULT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `estado` enum('activo','pausado','cancelado','completado') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'activo',
  `cuenta_origen_id` int NOT NULL,
  `periodicidad` enum('mensual','bimestral','trimestral','anual') CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `propietario_id` int NOT NULL,
  `es_privado` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Si es privado, solo visible al propietario',
  PRIMARY KEY (`id`),
  KEY `cuenta_origen_id` (`cuenta_origen_id`),
  KEY `idx_anticipos_visibilidad` (`propietario_id`,`es_privado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `anticipos_pagos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `anticipo_id` int NOT NULL,
  `importe` decimal(10,2) NOT NULL,
  `fecha` date NOT NULL,
  `tipo` enum('regular','extraordinario') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'regular',
  `descripcion` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `estado` enum('pendiente','pagado','cancelado') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'pendiente',
  `cuenta_destino_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `anticipo_id` (`anticipo_id`),
  KEY `cuenta_destino_id` (`cuenta_destino_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `propietario_id` int NOT NULL,
  `es_privado` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Si es privado, solo visible al propietario',
  PRIMARY KEY (`id`),
  KEY `idx_categorias_visibilidad` (`propietario_id`,`es_privado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `cuentas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_spanish_ci NOT NULL,
  `tipo` enum('corriente','ahorro','inversión','conjunta','efectivo','tja crédito','otros') COLLATE utf8mb4_spanish_ci NOT NULL,
  `iban` varchar(34) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `saldo_actual` decimal(12,2) DEFAULT '0.00',
  `descripcion` text COLLATE utf8mb4_spanish_ci,
  `activa` tinyint(1) DEFAULT '1',
  `propietario_id` int NOT NULL,
  `es_privado` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Si es privada, solo visible al propietario',
  PRIMARY KEY (`id`),
  UNIQUE KEY `iban` (`iban`),
  KEY `idx_cuentas_visibilidad` (`propietario_id`,`es_privado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `fechas_cargo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recibo_id` int DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `estado` enum('cargado','pendiente') CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `comentario` text COLLATE utf8mb4_spanish_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `recibo_id` (`recibo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `mantenimiento_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `operacion` varchar(100) COLLATE utf8mb4_spanish_ci NOT NULL,
  `detalles` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `duracion_ms` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `presupuestos` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Identificador único autoincremental',
  `concepto` varchar(50) COLLATE utf8mb4_spanish_ci NOT NULL COMMENT 'Nombre descriptivo del presupuesto (ej: "Comida mensual")',
  `comentario` text COLLATE utf8mb4_spanish_ci COMMENT 'Notas adicionales u observaciones',
  `importe_base` decimal(12,2) NOT NULL COMMENT 'Cantidad de referencia para nuevos periodos',
  `periodicidad` enum('diario','semanal','mensual','bimestral','trimestral','semestral','anual','puntual') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'mensual' COMMENT 'Frecuencia de aplicación del presupuesto',
  `es_recibo` tinyint(1) DEFAULT '0' COMMENT 'Indica si es un presupuesto especial para gestión de recibos',
  `cuenta_id` int NOT NULL COMMENT 'Cuenta asociada para operaciones financieras',
  `categoria_id` int NOT NULL COMMENT 'Categoría de gasto asociada',
  `propietario_id` int NOT NULL COMMENT 'Usuario propietario del presupuesto',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del registro',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
  `es_privado` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Si es privado, solo visible al propietario',
  PRIMARY KEY (`id`),
  KEY `idx_categoria` (`categoria_id`),
  KEY `idx_cuenta` (`cuenta_id`),
  KEY `idx_usuario` (`propietario_id`),
  KEY `idx_presupuestos_visibilidad` (`propietario_id`,`es_privado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `presupuesto_periodos` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Identificador único autoincremental',
  `presupuesto_id` int NOT NULL COMMENT 'Presupuesto al que pertenece el periodo',
  `fecha_inicio` date NOT NULL COMMENT 'Fecha de inicio del periodo',
  `fecha_fin` date NOT NULL COMMENT 'Fecha de finalización del periodo',
  `importe_ajustado` decimal(12,2) NOT NULL COMMENT 'Importe ajustado para este periodo específico',
  `diferencia_acumulada` decimal(12,2) DEFAULT '0.00' COMMENT 'Saldo acumulado de periodos anteriores',
  `estado` enum('pendiente','activo','cerrado') COLLATE utf8mb4_spanish_ci DEFAULT 'pendiente' COMMENT 'Estado actual del periodo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del registro',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
  PRIMARY KEY (`id`),
  KEY `idx_presupuesto` (`presupuesto_id`),
  KEY `idx_fechas` (`fecha_inicio`,`fecha_fin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `recibos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `concepto` varchar(30) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `importe` decimal(10,2) DEFAULT NULL,
  `periodicidad` enum('mensual','bimestral','trimestral','anual') COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `categoria_id` int DEFAULT NULL,
  `cuenta_id` int NOT NULL DEFAULT '1',
  `propietario_id` int NOT NULL,
  `es_privado` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Si es privado, solo visible al propietario',
  `fecha_inicial` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_categoria_id` (`categoria_id`),
  KEY `idx_recibos_visibilidad` (`propietario_id`,`es_privado`),
  KEY `fk_recibos_cuenta` (`cuenta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `recibos_historico` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recibo_id` int NOT NULL,
  `fecha_pago` date NOT NULL,
  `importe` decimal(10,2) NOT NULL,
  `pagado` tinyint(1) DEFAULT '0',
  `notas` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `recibo_id` (`recibo_id`),
  KEY `idx_recibos_historico_fecha_pago` (`fecha_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `password` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `rol` enum('admin','user','limited_user','reader') CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `perm_recibos` enum('no','lectura','escritura') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'escritura',
  `perm_presupuestos` enum('no','lectura','escritura') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'escritura',
  `perm_ahorros` enum('no','lectura','escritura') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'escritura',
  `perm_anticipos` enum('no','lectura','escritura') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'escritura',
  `perm_transacciones` enum('no','lectura','escritura') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'escritura',
  `perm_categorias` enum('no','lectura','escritura') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'escritura',
  `perm_cuentas` enum('no','lectura','escritura') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'escritura',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username_UNIQUE` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `users_style_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `preferences` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id_UNIQUE` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Claves foráneas

ALTER TABLE `ahorros`
  ADD CONSTRAINT `fk_ahorros_propietario` FOREIGN KEY (`propietario_id`) REFERENCES `users` (`id`);

ALTER TABLE `ahorros_movimientos`
  ADD CONSTRAINT `ahorros_movimientos_ibfk_1` FOREIGN KEY (`ahorro_id`) REFERENCES `ahorros` (`id`) ON DELETE CASCADE;

ALTER TABLE `anticipos`
  ADD CONSTRAINT `anticipos_ibfk_1` FOREIGN KEY (`cuenta_origen_id`) REFERENCES `cuentas` (`id`),
  ADD CONSTRAINT `fk_anticipos_propietario` FOREIGN KEY (`propietario_id`) REFERENCES `users` (`id`);

ALTER TABLE `anticipos_pagos`
  ADD CONSTRAINT `anticipos_pagos_ibfk_1` FOREIGN KEY (`anticipo_id`) REFERENCES `anticipos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `anticipos_pagos_ibfk_2` FOREIGN KEY (`cuenta_destino_id`) REFERENCES `cuentas` (`id`);

ALTER TABLE `categorias`
  ADD CONSTRAINT `fk_categorias_propietario` FOREIGN KEY (`propietario_id`) REFERENCES `users` (`id`);

ALTER TABLE `cuentas`
  ADD CONSTRAINT `fk_cuentas_propietario` FOREIGN KEY (`propietario_id`) REFERENCES `users` (`id`);

ALTER TABLE `fechas_cargo`
  ADD CONSTRAINT `fechas_cargo_ibfk_1` FOREIGN KEY (`recibo_id`) REFERENCES `recibos` (`id`);

ALTER TABLE `presupuestos`
  ADD CONSTRAINT `fk_presupuesto_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`),
  ADD CONSTRAINT `fk_presupuesto_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id`),
  ADD CONSTRAINT `fk_presupuesto_usuario` FOREIGN KEY (`propietario_id`) REFERENCES `users` (`id`);

ALTER TABLE `presupuesto_periodos`
  ADD CONSTRAINT `fk_presupuesto_periodo` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuestos` (`id`) ON DELETE CASCADE;

ALTER TABLE `recibos`
  ADD CONSTRAINT `fk_categoria_id` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`),
  ADD CONSTRAINT `fk_recibos_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id`),
  ADD CONSTRAINT `fk_recibos_propietario` FOREIGN KEY (`propietario_id`) REFERENCES `users` (`id`);

ALTER TABLE `recibos_historico`
  ADD CONSTRAINT `recibos_historico_ibfk_1` FOREIGN KEY (`recibo_id`) REFERENCES `recibos` (`id`) ON DELETE CASCADE;

ALTER TABLE `users_style_preferences`
  ADD CONSTRAINT `fk_user_id_preferences` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
