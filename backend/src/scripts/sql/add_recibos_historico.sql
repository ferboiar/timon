-- Añadir la tabla recibos_historico para almacenar el historial de pagos
CREATE TABLE IF NOT EXISTS `recibos_historico` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recibo_id` int NOT NULL,
  `fecha_pago` date NOT NULL,    
  `concepto` varchar(30) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `importe` decimal(10,2) DEFAULT NULL,
  `categoria_id` int DEFAULT NULL,
  `cuenta_id` int NOT NULL,
  `propietario_id` int NOT NULL,
  `es_privado` tinyint(1) NOT NULL DEFAULT '0',
  `periodicidad` enum('mensual','bimestral','trimestral','anual') COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `comentario` text COLLATE utf8mb4_spanish_ci,
  PRIMARY KEY (`id`),
  KEY `recibo_id` (`recibo_id`),
  CONSTRAINT `fk_historico_recibo` FOREIGN KEY (`recibo_id`) REFERENCES `recibos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Añadir la columna fecha_inicial a la tabla recibos
ALTER TABLE recibos ADD COLUMN fecha_inicial DATE DEFAULT NULL;

-- Actualizar los recibos existentes con fecha_inicial basada en la primera fecha de cargo
UPDATE recibos r
SET fecha_inicial = (
    SELECT MIN(fc.fecha)
    FROM fechas_cargo fc
    WHERE fc.recibo_id = r.id
)
WHERE r.fecha_inicial IS NULL;

-- Añadir índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_recibos_historico_fecha_pago ON recibos_historico(fecha_pago);
