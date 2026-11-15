-- Migración 0008: versión de token por usuario (S-04a, DC-62)
-- Permite revocar los JWT emitidos sin esperar a su caducidad. Es repetible.
--
-- Reversión (solo con copia de seguridad y tras confirmar que no se necesitan
-- las sesiones emitidas):
-- ALTER TABLE `users` DROP COLUMN `token_version`;

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `token_version` int(11) NOT NULL DEFAULT 0;
