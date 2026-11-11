-- Migración 0006: trazabilidad de autor y unicidad de categorías (F-50, F-22, DC-50, DC-51)
-- Añade `modificado_por` a recibos, ahorros, anticipos y presupuestos, y `created_at`/`updated_at` a recibos.
-- Añade el índice único `uq_categorias_nombre` (DC-02, F-22). Es repetible.
--
-- Reversión (solo con copia de seguridad y tras confirmar que no se necesita la traza):
-- ALTER TABLE `recibos` DROP FOREIGN KEY `fk_recibos_modificado_por`;
-- ALTER TABLE `recibos` DROP KEY `idx_recibos_modificado_por`;
-- ALTER TABLE `recibos` DROP COLUMN `modificado_por`, DROP COLUMN `updated_at`, DROP COLUMN `created_at`;
-- ALTER TABLE `ahorros` DROP FOREIGN KEY `fk_ahorros_modificado_por`;
-- ALTER TABLE `ahorros` DROP KEY `idx_ahorros_modificado_por`;
-- ALTER TABLE `ahorros` DROP COLUMN `modificado_por`;
-- ALTER TABLE `anticipos` DROP FOREIGN KEY `fk_anticipos_modificado_por`;
-- ALTER TABLE `anticipos` DROP KEY `idx_anticipos_modificado_por`;
-- ALTER TABLE `anticipos` DROP COLUMN `modificado_por`;
-- ALTER TABLE `presupuestos` DROP FOREIGN KEY `fk_presupuestos_modificado_por`;
-- ALTER TABLE `presupuestos` DROP KEY `idx_presupuestos_modificado_por`;
-- ALTER TABLE `presupuestos` DROP COLUMN `modificado_por`;
-- ALTER TABLE `categorias` DROP INDEX `uq_categorias_nombre`;
-- ADVERTENCIA: revertir `created_at` y `updated_at` de `recibos` pierde esas marcas. No se pueden reconstruir;
-- la migración las rellena con la hora de aplicación para las filas que ya existían.

-- Guarda previa: si hay categorías duplicadas, se falla antes de tocar el esquema. No se borran datos en silencio.
DROP PROCEDURE IF EXISTS `timon_0006_comprobar_categorias`;
DELIMITER //
CREATE PROCEDURE `timon_0006_comprobar_categorias`()
BEGIN
  IF (SELECT COUNT(*) FROM (
    SELECT `nombre` FROM `categorias` GROUP BY `nombre` HAVING COUNT(*) > 1
  ) AS `duplicadas`) > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '0006: hay categorias con el mismo nombre; resuelvelas antes de crear el indice unico';
  END IF;
END //
DELIMITER ;

CALL `timon_0006_comprobar_categorias`();
DROP PROCEDURE `timon_0006_comprobar_categorias`;

-- Columnas de trazabilidad. `modificado_por` es INT con signo, igual que `users.id` y `propietario_id` (int(11)).
ALTER TABLE `recibos`
  ADD COLUMN IF NOT EXISTS `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS `modificado_por` int(11) DEFAULT NULL;

ALTER TABLE `ahorros`
  ADD COLUMN IF NOT EXISTS `modificado_por` int(11) DEFAULT NULL;

ALTER TABLE `anticipos`
  ADD COLUMN IF NOT EXISTS `modificado_por` int(11) DEFAULT NULL;

ALTER TABLE `presupuestos`
  ADD COLUMN IF NOT EXISTS `modificado_por` int(11) DEFAULT NULL;

-- Índices y claves foráneas idempotentes (si ya existen, no se duplican).
DROP PROCEDURE IF EXISTS `timon_0006_modificado_por`;
DELIMITER //
CREATE PROCEDURE `timon_0006_modificado_por`(IN p_tabla VARCHAR(64), IN p_indice VARCHAR(64), IN p_fk VARCHAR(64))
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tabla AND INDEX_NAME = p_indice) = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD KEY `', p_indice, '` (`modificado_por`)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = p_tabla
        AND CONSTRAINT_NAME = p_fk AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD CONSTRAINT `', p_fk,
      '` FOREIGN KEY (`modificado_por`) REFERENCES `users` (`id`) ON DELETE SET NULL');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL `timon_0006_modificado_por`('recibos', 'idx_recibos_modificado_por', 'fk_recibos_modificado_por');
CALL `timon_0006_modificado_por`('ahorros', 'idx_ahorros_modificado_por', 'fk_ahorros_modificado_por');
CALL `timon_0006_modificado_por`('anticipos', 'idx_anticipos_modificado_por', 'fk_anticipos_modificado_por');
CALL `timon_0006_modificado_por`('presupuestos', 'idx_presupuestos_modificado_por', 'fk_presupuestos_modificado_por');
DROP PROCEDURE `timon_0006_modificado_por`;

-- Índice único de categorías (F-22, DC-02). La guarda anterior ya comprobó que no hay duplicados.
SET @sql = IF((SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categorias' AND INDEX_NAME = 'uq_categorias_nombre') = 0,
  'ALTER TABLE `categorias` ADD UNIQUE KEY `uq_categorias_nombre` (`nombre`)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
