## Informe de cierre de iteración

### Objetivo y alcance

- F-20: retirar `BillService.getBillById`, que llamaba a un endpoint inexistente y no tenía ningún consumidor en el repositorio. No se crea `GET /api/recibos/:id`.
- F-21: cerrar el hallazgo como decisión DC-43 — el saldo de cuentas es manual y no se calcula a partir de movimientos hasta que lo habilite el modelo común de movimientos (R-02); no se promete conciliación automática.
- Inclusiones: retirada del método y de su fila documental, fila DC-43, actualización de F-20/F-21 en el registro, nota del saldo en la documentación de Cuentas y sincronización de relevo, TODO e informes.
- Exclusiones: rutas, esquema, migraciones, `db_utils.mjs`, `db_utilsAcc.mjs`, vistas y `Accounts.vue`; permisos, S-11 y la cláusula histórica de la fila F-46.

### Base

- Rama `correccion/fase-1-F20-F21-recibos-cuentas`, creada desde `main` en `0821bf14dc48c53acec038f6830fad7c963c2a57`.
- PR anterior: #59 (D-25), fusionado el 2026-11-05T10:12:25Z.
- Cambios locales conocidos y ajenos a la iteración: `backend/src/db/.db_connection` modificado y `.cline/` sin seguimiento. Ninguno se prepara.

### Cambios

- Código: `src/service/BillService.js` pierde `getBillById`; el resto de métodos queda intacto.
- Interfaz: no aplicable (ninguna vista cambia).
- Pruebas: no se añaden; no hay infraestructura de pruebas de servicios del frontend y el cambio es una retirada sin consumidores.
- Documentación: `doc/services/BillService.md` (fila eliminada), `doc/components/Accounts.md` (nueva sección «Saldo de la cuenta»), `doc/db/db_utilsAcc.md` y `doc/index.md` citan F-21 con DC-43.
- Seguimiento: fila **DC-43** en el registro; F-20 y F-21 actualizados en la sección 5; plan de la sección 10; relevo §0, §2, §3, §4 y §5; TODO.
- Esquema y API: no aplicable.

### Documentación revisada

| Archivo | Revisado | Modificado | Motivo o no aplicable |
|---|---|---|---|
| `src/service/BillService.js` | Sí | Sí | Retirada de `getBillById` |
| `doc/services/BillService.md` | Sí | Sí | Fila del método retirado |
| `doc/components/Accounts.md` | Sí | Sí | Saldo manual (F-21, DC-43) |
| `doc/db/db_utilsAcc.md` | Sí | Sí | Cita de DC-43 |
| `doc/index.md` | Sí | Sí | Cita de DC-43 |
| `doc/mantenimiento/registro-hallazgos_1de3.md` | Sí | Sí | DC-43 |
| `doc/mantenimiento/registro-hallazgos_2de3.md` | Sí | Sí | F-20 y F-21 |
| `doc/mantenimiento/registro-hallazgos_3de3.md` | Sí | Sí | Plan de la sección 10 |
| `doc/mantenimiento/estado-del-proyecto_1de3.md` | Sí | Sí | §0, §2 y §3 |
| `doc/mantenimiento/estado-del-proyecto_2de3.md` | Sí | Sí | §4 y §5 |
| `TODO` | Sí | Sí | Reanudación, estado y F-20/F-21 |
| `doc/routes/recibos.md` | Sí | No | Solo documenta `GET /api/recibos`; no había que retirar ninguna ruta |
| `README.md`, `README_en.md` | Sí | No | Ya describen el saldo como manual |
| `doc/utils/csv.md`, `doc/mantenimiento/instruccion-persistente*.md` | Sí | No | Sin relación con el cambio |

### Verificación

| Comprobación | Comando/entorno | Resultado real |
|---|---|---|
| Sintaxis | `node --check src/service/BillService.js` | Sin salida; código 0 |
| Lint | `npx eslint src/service/BillService.js` | Sin errores ni avisos |
| Sin referencias en código | `grep -rn 'getBillById' src backend` | 0 coincidencias |
| Build del frontend | `npm run build:frontend` (salida a fichero) | `✓ built in 20.46s`, `EXIT:0`, `dist` generado |
| Espacios | `git diff --check` y `git diff --no-index --check` del informe | Limpios |
| Alcance | `git diff --name-only` | Solo los ficheros de la tabla |

### No verificado

- **Prueba manual de interfaz**: no se ejecutó porque no cambia el comportamiento de ninguna pantalla; lo único que cambia es la desaparición de un método sin consumidores.
- **Suite del backend** (`npm run test:backend`): no ejecutada; no hay cambios de backend.
- **Smoke test con `curl`**: no se hizo; no hay cambios de API ni de servidor que comprobar. El equivalente funcional es el build del frontend.

### Estado al preparar el informe

- Parche aplicado en la rama `correccion/fase-1-F20-F21-recibos-cuentas`; sin `git add`.
- Verificación automática completa y en verde; sin bloqueos.
- Archivos nuevos: este informe. El resto son modificaciones.

### Continuidad

- Siguiente trabajo: F-28 (caminos de mensajes del servidor sin prometer cobertura universal). Después, F-30/F-31.
- Qué leer: `doc/mantenimiento/registro-hallazgos_2de3.md` (fila DC-43 y F-21), `doc/components/Accounts.md` y la sección 0 del relevo.
- Qué no asumir: que el PR esté fusionado, que el saldo se calcule automáticamente o que vaya a hacerse sin aprobar R-02.
