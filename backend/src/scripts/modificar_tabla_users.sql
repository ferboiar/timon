-- Cambiar el nombre de user_id a id
ALTER TABLE `users` CHANGE COLUMN `user_id` `id` INT NOT NULL AUTO_INCREMENT;

-- Añadir la columna username
ALTER TABLE `users` ADD COLUMN `username` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL AFTER `id`;

-- Añadir índice único para username
ALTER TABLE `users` ADD UNIQUE INDEX `username_UNIQUE` (`username`);