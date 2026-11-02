# Páginas vacías de la plantilla

`Budgets.vue` (Presupuestos), `Transactions.vue` (Transacciones), `Automation.vue` (Automatización) y `Loans.vue` (Préstamos), en `src/views/pages`, son esqueletos de la plantilla Sakai: un `<script setup>` vacío y una barra de herramientas con botones sin acción. Excepción: `Budgets.vue` tiene desde U-11 (2026-10-30) un estado `showInactive` y un botón «Mostrar/Ocultar inactivos» preparado, que queda deshabilitado porque la vista no tiene datos. No hay API, servicio ni documentación de diseño que los respalden, salvo `doc/db/schema/presupuestos.md`, que describe un diseño sin implementar (D-02).

Por el mismo motivo, el Dashboard de inicio es el de la plantilla (U-01). Ver el registro de hallazgos (U-03).
