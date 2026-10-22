-- Migracion 0003: un recibo por anio (DC-14)
-- Parte los recibos cuyas fechas de cargo caen en mas de un anio en un recibo por anio, enlazados con recibo_origen_id,
-- y elimina recibos_historico (sus cargos pagados ya estan en fechas_cargo).
-- Es repetible: si todos los recibos tienen fechas de un solo anio, no modifica nada.

DROP TABLE IF EXISTS `zz_partes_recibos`;
SET @base_id = (SELECT COALESCE(MAX(`id`), 0) FROM `recibos`);

-- Un trozo por cada (recibo, anio) posterior al primer anio del recibo, con el id que tendra el recibo nuevo
CREATE TABLE `zz_partes_recibos` AS
SELECT p.recibo_id, p.anio, p.primera, p.nuevo_id,
       COALESCE(LAG(p.nuevo_id) OVER (PARTITION BY p.recibo_id ORDER BY p.anio), p.recibo_id) AS origen_id
FROM (
  SELECT fc.recibo_id, YEAR(fc.fecha) AS anio, MIN(fc.fecha) AS primera,
         @base_id + ROW_NUMBER() OVER (ORDER BY fc.recibo_id, YEAR(fc.fecha)) AS nuevo_id
  FROM `fechas_cargo` fc
  JOIN (SELECT `recibo_id`, MIN(YEAR(`fecha`)) AS anio_base FROM `fechas_cargo` WHERE `fecha` IS NOT NULL GROUP BY `recibo_id`) b ON b.recibo_id = fc.recibo_id
  WHERE fc.fecha IS NOT NULL AND YEAR(fc.fecha) > b.anio_base
  GROUP BY fc.recibo_id, YEAR(fc.fecha)
) p;

-- Fecha inicial de cada trozo: primera fecha del anio en la secuencia anclada en la fecha inicial del recibo original
ALTER TABLE `zz_partes_recibos` ADD COLUMN `paso` tinyint NULL, ADD COLUMN `inicio` date NULL;
UPDATE `zz_partes_recibos` p JOIN `recibos` r ON r.id = p.recibo_id
SET p.paso = CASE r.periodicidad WHEN 'mensual' THEN 1 WHEN 'bimestral' THEN 2 WHEN 'trimestral' THEN 3 ELSE 12 END;
UPDATE `zz_partes_recibos` p JOIN `recibos` r ON r.id = p.recibo_id
SET p.inicio = DATE_ADD(r.fecha_inicial, INTERVAL CAST(CEIL(GREATEST((p.anio - YEAR(r.fecha_inicial)) * 12 - (MONTH(r.fecha_inicial) - 1), 0) / p.paso) * p.paso AS SIGNED) MONTH)
WHERE r.fecha_inicial IS NOT NULL;
UPDATE `zz_partes_recibos` SET `inicio` = `primera` WHERE `inicio` IS NULL OR YEAR(`inicio`) <> `anio`;

-- Un recibo nuevo por trozo (en orden de id, para que el origen exista antes que su sucesor)
INSERT INTO `recibos` (`id`, `concepto`, `importe`, `periodicidad`, `categoria_id`, `cuenta_id`, `propietario_id`, `es_privado`, `fecha_inicial`, `recibo_origen_id`, `replicar`)
SELECT p.nuevo_id, r.concepto, r.importe, r.periodicidad, r.categoria_id, r.cuenta_id, r.propietario_id, r.es_privado, p.inicio, p.origen_id, r.replicar
FROM `zz_partes_recibos` p JOIN `recibos` r ON r.id = p.recibo_id
ORDER BY p.nuevo_id;

-- Los cargos pasan al recibo de su anio
UPDATE `fechas_cargo` fc JOIN `zz_partes_recibos` p ON p.recibo_id = fc.recibo_id AND p.anio = YEAR(fc.fecha)
SET fc.recibo_id = p.nuevo_id;

DROP TABLE `zz_partes_recibos`;
DROP TABLE IF EXISTS `recibos_historico`;
