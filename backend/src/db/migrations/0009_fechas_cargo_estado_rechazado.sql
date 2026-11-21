-- Migración 0009: estado `rechazado` en fechas_cargo (DC-01)
-- Amplía el ENUM de `fechas_cargo.estado` con `rechazado` (el banco devolvió el recibo).
-- Los valores existentes conservan su orden; `rechazado` se añade al final.
-- `rechazado` no escribe historial (recibos_historico no existe desde DC-14), cuenta
-- como pendiente (DC-01) y puede volver a `pendiente`.
-- Repetible: si la columna ya admite `rechazado`, no se ejecuta el ALTER.
-- Requiere la 0001: si la tabla no existe, el ALTER falla y el error se ve.
--
-- Reversión (solo con copia y tras comprobar que no queda ninguna fila en `rechazado`):
--   UPDATE `fechas_cargo` SET `estado` = 'pendiente' WHERE `estado` = 'rechazado';
--   ALTER TABLE `fechas_cargo`
--     MODIFY COLUMN `estado` enum('cargado','pendiente')
--     CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL;

SET @estado_actual = (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fechas_cargo'
    AND COLUMN_NAME = 'estado'
);

SET @sql = IF(
  COALESCE(@estado_actual, '') LIKE '%''rechazado''%',
  'SELECT 1',
  'ALTER TABLE `fechas_cargo` MODIFY COLUMN `estado` enum(''cargado'',''pendiente'',''rechazado'') CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL'
);

PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;
