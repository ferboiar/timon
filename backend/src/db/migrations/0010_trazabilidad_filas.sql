-- Migración 0010: trazabilidad por fila en subrecursos y catálogos (F-53, DC-74)
-- Añade `modificado_por` a anticipos_pagos, ahorros_movimientos, fechas_cargo, categorias y cuentas:
-- int(11) con signo y NULL, igual que `users.id` y que la migración 0006, con índice propio y clave
-- foránea a `users` (`ON DELETE SET NULL`). Es repetible: las columnas usan IF NOT EXISTS y el índice
-- y la clave se comprueban en information_schema antes de crearse.
--
-- DC-74: el autor es el de la fila que la ruta crea o edita directamente; las filas derivadas por
-- recálculo, generación de plan, reparto posterior a un borrado o completación de fechas quedan NULL,
-- y el padre conserva al usuario. Sin relleno histórico: las filas existentes quedan a NULL.
-- No se añade updated_at a estas cinco tablas.
--
-- Reversión (solo con copia de seguridad y tras confirmar que no se necesita la traza):
-- ALTER TABLE `anticipos_pagos` DROP FOREIGN KEY `fk_anticipos_pagos_modificado_por`;
-- ALTER TABLE `anticipos_pagos` DROP KEY `idx_anticipos_pagos_modificado_por`;
-- ALTER TABLE `anticipos_pagos` DROP COLUMN `modificado_por`;
-- ALTER TABLE `ahorros_movimientos` DROP FOREIGN KEY `fk_ahorros_movimientos_modificado_por`;
-- ALTER TABLE `ahorros_movimientos` DROP KEY `idx_ahorros_movimientos_modificado_por`;
-- ALTER TABLE `ahorros_movimientos` DROP COLUMN `modificado_por`;
-- ALTER TABLE `fechas_cargo` DROP FOREIGN KEY `fk_fechas_cargo_modificado_por`;
-- ALTER TABLE `fechas_cargo` DROP KEY `idx_fechas_cargo_modificado_por`;
-- ALTER TABLE `fechas_cargo` DROP COLUMN `modificado_por`;
-- ALTER TABLE `categorias` DROP FOREIGN KEY `fk_categorias_modificado_por`;
-- ALTER TABLE `categorias` DROP KEY `idx_categorias_modificado_por`;
-- ALTER TABLE `categorias` DROP COLUMN `modificado_por`;
-- ALTER TABLE `cuentas` DROP FOREIGN KEY `fk_cuentas_modificado_por`;
-- ALTER TABLE `cuentas` DROP KEY `idx_cuentas_modificado_por`;
-- ALTER TABLE `cuentas` DROP COLUMN `modificado_por`;

-- Columnas de trazabilidad por fila (F-53, DC-74).
ALTER TABLE `anticipos_pagos`
  ADD COLUMN IF NOT EXISTS `modificado_por` int(11) DEFAULT NULL;

ALTER TABLE `ahorros_movimientos`
  ADD COLUMN IF NOT EXISTS `modificado_por` int(11) DEFAULT NULL;

ALTER TABLE `fechas_cargo`
  ADD COLUMN IF NOT EXISTS `modificado_por` int(11) DEFAULT NULL;

ALTER TABLE `categorias`
  ADD COLUMN IF NOT EXISTS `modificado_por` int(11) DEFAULT NULL;

ALTER TABLE `cuentas`
  ADD COLUMN IF NOT EXISTS `modificado_por` int(11) DEFAULT NULL;

-- Índices y claves foráneas idempotentes (si ya existen, no se duplican).
-- El índice no es opcional: InnoDB lo exige para la FK y `ON DELETE SET NULL` lo usa para localizar las filas.
DROP PROCEDURE IF EXISTS `timon_0010_modificado_por`;
DELIMITER //
CREATE PROCEDURE `timon_0010_modificado_por`(IN p_tabla VARCHAR(64), IN p_indice VARCHAR(64), IN p_fk VARCHAR(64))
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

CALL `timon_0010_modificado_por`('anticipos_pagos', 'idx_anticipos_pagos_modificado_por', 'fk_anticipos_pagos_modificado_por');
CALL `timon_0010_modificado_por`('ahorros_movimientos', 'idx_ahorros_movimientos_modificado_por', 'fk_ahorros_movimientos_modificado_por');
CALL `timon_0010_modificado_por`('fechas_cargo', 'idx_fechas_cargo_modificado_por', 'fk_fechas_cargo_modificado_por');
CALL `timon_0010_modificado_por`('categorias', 'idx_categorias_modificado_por', 'fk_categorias_modificado_por');
CALL `timon_0010_modificado_por`('cuentas', 'idx_cuentas_modificado_por', 'fk_cuentas_modificado_por');
DROP PROCEDURE `timon_0010_modificado_por`;
