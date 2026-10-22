-- Migracion 0004: creacion automatica de los recibos del anio (DC-17, DC-24, DC-25)
-- 1) Tabla de ajustes del sistema: interruptor del evento y zona horaria de la aplicacion.
-- 2) Procedimiento generar_recibos_anio(simular, forzar, ahora): solo inserta, nunca modifica ni borra.
-- 3) Evento que lo lanza cada hora; el procedimiento solo actua a las 03:00 de la zona horaria configurada.
-- Las horas se guardan en UTC. Es repetible. Con el cliente de linea de comandos: mariadb conta_hogar < fichero.

CREATE TABLE IF NOT EXISTS `ajustes_sistema` (
  `clave` varchar(60) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

INSERT IGNORE INTO `ajustes_sistema` (`clave`, `valor`, `descripcion`) VALUES
('crear_recibos_automaticamente', '1', 'Si es 1, el evento crea los recibos del anio siguiente (desde el 1 de diciembre) y pone al dia los que falten'),
('zona_horaria', 'Europe/Madrid', 'Zona horaria de la aplicacion (nombre IANA). Las horas se guardan en UTC y se muestran y calculan en esta zona');

DROP EVENT IF EXISTS `generar_recibos_anio_diario`;
DROP EVENT IF EXISTS `generar_recibos_anio_evento`;
DROP PROCEDURE IF EXISTS `generar_recibos_anio`;

DELIMITER //

CREATE PROCEDURE `generar_recibos_anio`(IN p_simular TINYINT(1), IN p_forzar TINYINT(1), IN p_ahora DATETIME)
COMMENT 'Crea los recibos del anio siguiente (desde el 1 de diciembre) y pone al dia los que falten; solo inserta. p_ahora es UTC (NULL = ahora)'
proc: BEGIN
  DECLARE v_zona VARCHAR(64);
  DECLARE v_local DATETIME;
  DECLARE v_hoy DATE;
  DECLARE v_limite INT;
  DECLARE v_inicio DATETIME(6);
  DECLARE v_creados INT DEFAULT 0;
  DECLARE v_fechas INT DEFAULT 0;
  DECLARE v_errores INT DEFAULT 0;
  DECLARE v_fin TINYINT DEFAULT 0;
  DECLARE v_id INT;
  DECLARE v_anio INT;
  DECLARE cur CURSOR FOR SELECT `id`, `anio` FROM `tmp_gra_candidatos` ORDER BY `anio`, `id`;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_fin = 1;

  SET v_inicio = NOW(6);
  -- "Hoy" y la hora se calculan en la zona horaria de los ajustes (si no es valida, se usa UTC)
  SET v_zona = COALESCE((SELECT `valor` FROM `ajustes_sistema` WHERE `clave` = 'zona_horaria'), 'Europe/Madrid');
  SET v_local = COALESCE(CONVERT_TZ(COALESCE(p_ahora, UTC_TIMESTAMP()), '+00:00', v_zona), COALESCE(p_ahora, UTC_TIMESTAMP()));
  SET v_hoy = DATE(v_local);
  -- Nunca se crea un anio posterior al actual, salvo desde el 1 de diciembre, que permite el siguiente
  SET v_limite = YEAR(v_hoy) + IF(MONTH(v_hoy) = 12, 1, 0);

  IF p_forzar = 0 THEN
    IF COALESCE((SELECT `valor` FROM `ajustes_sistema` WHERE `clave` = 'crear_recibos_automaticamente'), '1') = '0' THEN
      SELECT 'La creacion automatica de recibos esta desactivada' AS aviso;
      LEAVE proc;
    END IF;
    IF HOUR(v_local) <> 3 THEN
      SELECT 'Fuera de la hora programada (03:00 en la zona horaria de los ajustes)' AS aviso;
      LEAVE proc;
    END IF;
  END IF;
  IF GET_LOCK('timon_generar_recibos', 0) <> 1 THEN
    SELECT 'Hay otra ejecucion en curso' AS aviso;
    LEAVE proc;
  END IF;

  DROP TEMPORARY TABLE IF EXISTS `tmp_gra_candidatos`;
  DROP TEMPORARY TABLE IF EXISTS `tmp_gra_resultado`;
  CREATE TEMPORARY TABLE `tmp_gra_candidatos` (`id` INT NOT NULL PRIMARY KEY, `anio` INT NOT NULL);
  CREATE TEMPORARY TABLE `tmp_gra_resultado` (`origen_id` INT, `nuevo_id` INT NULL, `concepto` VARCHAR(30), `anio_nuevo` INT, `fechas` INT, `primera` DATE, `ultima` DATE, `aviso` VARCHAR(120));

  -- Candidatos: el ultimo recibo de cada serie (sin sucesor), con replicar activado y de un anio anterior al limite
  INSERT INTO `tmp_gra_candidatos` (`id`, `anio`)
  SELECT r.`id`, YEAR(r.`fecha_inicial`) FROM `recibos` r
  WHERE r.`replicar` = 1 AND r.`fecha_inicial` IS NOT NULL AND YEAR(r.`fecha_inicial`) < v_limite
    AND NOT EXISTS (SELECT 1 FROM `recibos` s WHERE s.`recibo_origen_id` = r.`id`);

  OPEN cur;
  bucle: LOOP
    FETCH cur INTO v_id, v_anio;
    IF v_fin = 1 THEN
      LEAVE bucle;
    END IF;

    -- Cada serie va en su propia transaccion: un fallo no deja nada a medias ni frena a las demas
    anio_bloque: BEGIN
      DECLARE v_actual INT;
      DECLARE v_nuevo INT;
      DECLARE v_anio_nuevo INT;
      DECLARE v_ancla DATE;
      DECLARE v_mes0 DATE;
      DECLARE v_pagada DATE;
      DECLARE v_dia INT;
      DECLARE v_primera DATE;
      DECLARE v_ultima DATE;
      DECLARE v_paso INT;
      DECLARE v_importe DECIMAL(10,2);
      DECLARE v_activo TINYINT;
      DECLARE v_aviso VARCHAR(120);
      DECLARE v_n INT;
      DECLARE v_c INT DEFAULT 0;
      DECLARE v_f INT DEFAULT 0;
      DECLARE EXIT HANDLER FOR SQLEXCEPTION
      BEGIN
        ROLLBACK;
        SET v_errores = v_errores + 1;
      END;

      SET v_actual = v_id;
      SET v_anio_nuevo = v_anio;
      IF p_simular = 0 THEN
        START TRANSACTION;
      END IF;

      WHILE v_anio_nuevo < v_limite DO
        SET v_anio_nuevo = v_anio_nuevo + 1;

        SELECT `fecha_inicial`, CASE `periodicidad` WHEN 'mensual' THEN 1 WHEN 'bimestral' THEN 2 WHEN 'trimestral' THEN 3 ELSE 12 END
          INTO v_ancla, v_paso
          FROM `recibos` WHERE `id` = v_actual;
        SET v_mes0 = DATE_SUB(v_ancla, INTERVAL (DAY(v_ancla) - 1) DAY);

        -- Cadencia: los meses salen de la fecha inicial; el dia, del ultimo cargo pagado (si no hay, el de la fecha inicial)
        SET v_pagada = (SELECT `fecha` FROM `fechas_cargo` WHERE `recibo_id` = v_actual AND `estado` = 'cargado' ORDER BY `fecha` DESC, `id` DESC LIMIT 1);
        SET v_dia = COALESCE(DAY(v_pagada), DAY(v_ancla));
        SET v_aviso = IF(v_pagada IS NOT NULL AND MOD((YEAR(v_pagada) - YEAR(v_ancla)) * 12 + MONTH(v_pagada) - MONTH(v_ancla), v_paso) <> 0,
                         'El mes del ultimo pago no encaja con la cadencia de la fecha inicial', NULL);

        SELECT COUNT(*), MIN(f.`fecha`), MAX(f.`fecha`)
          INTO v_n, v_primera, v_ultima
          FROM (SELECT DATE_ADD(t.`m1`, INTERVAL (LEAST(v_dia, DAY(LAST_DAY(t.`m1`))) - 1) DAY) AS `fecha`
                  FROM (SELECT DATE_ADD(v_mes0, INTERVAL s.`n` MONTH) AS `m1`
                          FROM (SELECT (v_anio_nuevo - YEAR(v_ancla)) * 12 + m.`seq` - (MONTH(v_ancla) - 1) AS `n`
                                  FROM (SELECT 0 AS `seq` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) m) s
                         WHERE s.`n` >= 0 AND MOD(s.`n`, v_paso) = 0) t) f;

        IF v_n > 0 THEN
          IF p_simular = 1 THEN
            INSERT INTO `tmp_gra_resultado` (`origen_id`, `nuevo_id`, `concepto`, `anio_nuevo`, `fechas`, `primera`, `ultima`, `aviso`)
            SELECT `id`, NULL, `concepto`, v_anio_nuevo, v_n, v_primera, v_ultima, v_aviso FROM `recibos` WHERE `id` = v_id;
          ELSE
            -- Importe del ultimo cargo pagado (o el del recibo si no hay ninguno) y estado activo del ultimo cargo
            SET v_importe = (SELECT COALESCE(fc.`importe`, r.`importe`) FROM `fechas_cargo` fc JOIN `recibos` r ON r.`id` = fc.`recibo_id`
                             WHERE fc.`recibo_id` = v_actual AND fc.`estado` = 'cargado' ORDER BY fc.`fecha` DESC, fc.`id` DESC LIMIT 1);
            SET v_importe = COALESCE(v_importe, (SELECT `importe` FROM `recibos` WHERE `id` = v_actual));
            SET v_activo = COALESCE((SELECT `activo` FROM `fechas_cargo` WHERE `recibo_id` = v_actual ORDER BY `fecha` DESC, `id` DESC LIMIT 1), 1);

            INSERT INTO `recibos` (`concepto`, `importe`, `periodicidad`, `categoria_id`, `cuenta_id`, `propietario_id`, `es_privado`, `fecha_inicial`, `recibo_origen_id`, `replicar`)
            SELECT `concepto`, v_importe, `periodicidad`, `categoria_id`, `cuenta_id`, `propietario_id`, `es_privado`, v_primera, `id`, 1
              FROM `recibos` WHERE `id` = v_actual;
            SET v_nuevo = LAST_INSERT_ID();

            INSERT INTO `fechas_cargo` (`recibo_id`, `fecha`, `estado`, `comentario`, `activo`, `importe`)
            SELECT v_nuevo, f.`fecha`, 'pendiente', '', v_activo, NULL
              FROM (SELECT DATE_ADD(t.`m1`, INTERVAL (LEAST(v_dia, DAY(LAST_DAY(t.`m1`))) - 1) DAY) AS `fecha`
                      FROM (SELECT DATE_ADD(v_mes0, INTERVAL s.`n` MONTH) AS `m1`
                              FROM (SELECT (v_anio_nuevo - YEAR(v_ancla)) * 12 + m.`seq` - (MONTH(v_ancla) - 1) AS `n`
                                      FROM (SELECT 0 AS `seq` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) m) s
                             WHERE s.`n` >= 0 AND MOD(s.`n`, v_paso) = 0) t) f;

            INSERT INTO `tmp_gra_resultado` (`origen_id`, `nuevo_id`, `concepto`, `anio_nuevo`, `fechas`, `primera`, `ultima`, `aviso`)
            SELECT v_id, v_nuevo, `concepto`, v_anio_nuevo, v_n, v_primera, v_ultima, v_aviso FROM `recibos` WHERE `id` = v_nuevo;

            SET v_actual = v_nuevo;
            SET v_c = v_c + 1;
            SET v_f = v_f + v_n;
          END IF;
        END IF;
      END WHILE;

      IF p_simular = 0 THEN
        COMMIT;
        SET v_creados = v_creados + v_c;
        SET v_fechas = v_fechas + v_f;
      END IF;
    END anio_bloque;
  END LOOP bucle;
  CLOSE cur;

  -- Solo se anotan las ejecuciones que crean algo, fallan o se lanzan a mano (el evento no llena el registro)
  IF p_simular = 0 AND (v_creados > 0 OR v_errores > 0 OR p_forzar = 1) THEN
    INSERT INTO `mantenimiento_logs` (`operacion`, `detalles`, `duracion_ms`)
    VALUES ('Generar recibos del anio',
            CONCAT(v_creados, ' recibos y ', v_fechas, ' fechas creados hasta ', v_limite, IF(v_errores > 0, CONCAT(' (', v_errores, ' con error)'), '')),
            CAST(TIMESTAMPDIFF(MICROSECOND, v_inicio, NOW(6)) / 1000 AS SIGNED));
  END IF;

  DO RELEASE_LOCK('timon_generar_recibos');
  SELECT `origen_id`, `nuevo_id`, `concepto`, `anio_nuevo`, `fechas`, DATE_FORMAT(`primera`, '%Y-%m-%d') AS `primera`, DATE_FORMAT(`ultima`, '%Y-%m-%d') AS `ultima`, `aviso`
    FROM `tmp_gra_resultado` ORDER BY `origen_id`, `anio_nuevo`;
END proc //

CREATE EVENT `generar_recibos_anio_evento`
  ON SCHEDULE EVERY 1 HOUR STARTS TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY
  ON COMPLETION PRESERVE ENABLE
  COMMENT 'Cada hora lanza generar_recibos_anio, que solo actua a las 03:00 de la zona horaria de los ajustes'
  DO CALL `generar_recibos_anio`(0, 0, NULL) //

DELIMITER ;
