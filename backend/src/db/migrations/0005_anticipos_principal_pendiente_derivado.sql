-- Migracion 0005: principal guardado e importe pendiente derivado en anticipos (DC-38, F-14)
-- anticipos.importe_original guarda el principal. El importe pendiente deja de guardarse: es importe_original menos la suma de los pagos pagados.
-- Rellena el principal con el importe_total guardado mas los pagos pagados, pasa a activo los anticipos completados
-- (completado se deduce del importe pendiente) y retira anticipos.importe_total.
-- Es repetible: si importe_total ya no existe, no vuelve a calcular el principal.

ALTER TABLE `anticipos` ADD COLUMN IF NOT EXISTS `importe_original` decimal(10,2) DEFAULT NULL AFTER `concepto`;

SET @tiene_total = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anticipos' AND COLUMN_NAME = 'importe_total');
SET @sql = IF(@tiene_total > 0,
  'UPDATE `anticipos` a SET a.importe_original = a.importe_total + COALESCE((SELECT SUM(p.importe) FROM `anticipos_pagos` p WHERE p.anticipo_id = a.id AND p.estado = ''pagado''), 0) WHERE a.importe_original IS NULL',
  'SELECT 1');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

ALTER TABLE `anticipos` MODIFY COLUMN `importe_original` decimal(10,2) NOT NULL;
UPDATE `anticipos` SET `estado` = 'activo' WHERE `estado` = 'completado';
ALTER TABLE `anticipos` DROP COLUMN IF EXISTS `importe_total`;
