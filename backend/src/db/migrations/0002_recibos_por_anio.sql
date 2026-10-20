-- Migracion 0002: recibo por anio (DC-14 a DC-18 del registro de mantenimiento)
-- Solo estructura y aditiva: no borra ni modifica datos ni tablas existentes.
-- Se aplica sobre una base que ya tiene la linea base 0001.

-- Importe real de cada cargo. NULL mientras esta pendiente (se usa el del recibo); al pagarlo guardara el importe cobrado.
ALTER TABLE `fechas_cargo`
  ADD COLUMN `importe` decimal(10,2) DEFAULT NULL AFTER `fecha`,
  ADD KEY `idx_fechas_cargo_fecha` (`fecha`);

-- Vinculo de cada recibo con el del anio anterior (como mucho un sucesor) y marca para dejar de replicarlo.
ALTER TABLE `recibos`
  ADD COLUMN `recibo_origen_id` int DEFAULT NULL AFTER `fecha_inicial`,
  ADD COLUMN `replicar` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Si es 0, no se crea el recibo del siguiente ejercicio' AFTER `recibo_origen_id`,
  ADD UNIQUE KEY `uq_recibos_origen` (`recibo_origen_id`),
  ADD CONSTRAINT `fk_recibos_origen` FOREIGN KEY (`recibo_origen_id`) REFERENCES `recibos` (`id`);
