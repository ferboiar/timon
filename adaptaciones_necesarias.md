// Archivo para adaptar ListBills.vue para implementar la generación automática de fechas
// Cambios principales necesarios:

1. Modificar la estructura del modelo de datos para incluir fecha_inicial:
   ```javascript
   const bill = ref({
       id: null,
       concepto: '',
       categoria: '',
       cuenta_id: null,
       importe: 0,
       periodicidad: '',
       fecha_inicial: null, // Nuevo campo para establecer la fecha inicial
       cargo: Array(6)
           .fill()
           .map(() => ({
               id: null,
               fecha: null,
               estado: 'pendiente',
               comentario: '',
               activo: 1
           }))
   });
   ```

2. Modificar la función guardarRecibo para incluir fecha_inicial en la petición al backend:
   ```javascript
   async function guardarRecibo() {
       submitted.value = true;

       // Asegurarse de que todos los campos de la estructura bill estén definidos
       bill.value = {
           id: bill.value.id || null,
           concepto: bill.value.concepto || '',
           periodicidad: bill.value.periodicidad || '',
           importe: parseFloat(bill.value.importe) || 0,
           categoria: bill.value.categoria || '',
           cuenta_id: bill.value.cuenta_id || null,
           fecha_inicial: bill.value.fecha_inicial ? new Date(bill.value.fecha_inicial) : null,
           cargo: bill.value.cargo.map((c) => ({
               id: c.id ?? null,
               fecha: c.fecha ? new Date(c.fecha) : null,
               estado: c.estado ?? 'pendiente',
               comentario: c.comentario ?? '',
               activo: c.activo ?? 1
           }))
       };

       // Ajustar la zona horaria para fecha_inicial
       if (bill.value.fecha_inicial) {
           const fechaInicialLocal = new Date(bill.value.fecha_inicial.getTime() - bill.value.fecha_inicial.getTimezoneOffset() * 60000);
           bill.value.fecha_inicial = fechaInicialLocal;
       }

       // Ajustar la zona horaria para todos los cargos donde haya fecha
       bill.value.cargo.forEach((c, index) => {
           if (c.fecha) {
               const fechaLocal = new Date(c.fecha.getTime() - c.fecha.getTimezoneOffset() * 60000);
               bill.value.cargo[index].fecha = fechaLocal;
           }
       });

       // ...resto del código de guardarRecibo()
   }
   ```

3. Añadir un nuevo elemento en el diálogo para seleccionar entre establecer fechas manualmente o usar generación automática:
   ```html
   <div class="grid grid-cols-12 gap-4 mb-4">
       <div class="col-span-12">
           <label class="font-bold mb-3">Tipo de programación</label>
           <div class="flex gap-4">
               <RadioButton v-model="modoFechas" value="manual" inputId="modo-manual" />
               <label for="modo-manual">Fechas manuales</label>
               <RadioButton v-model="modoFechas" value="auto" inputId="modo-auto" />
               <label for="modo-auto">Generar fechas automáticamente</label>
           </div>
       </div>
   </div>

   <div v-if="modoFechas === 'auto'" class="grid grid-cols-12 gap-4 mb-4">
       <div class="col-span-6">
           <label for="fecha_inicial" class="block font-bold mb-3">Fecha inicial</label>
           <DatePicker id="fecha_inicial" v-model="bill.fecha_inicial" dateFormat="dd/mm/yy" showIcon :showOnFocus="false" showButtonBar />
           <small v-if="submitted && modoFechas === 'auto' && !bill.fecha_inicial" class="text-red-500">La fecha inicial es obligatoria para la generación automática.</small>
       </div>
   </div>

   <div v-if="modoFechas === 'manual'" class="grid grid-cols-12 gap-2">
       <!-- Aquí irían los controles existentes para las fechas manuales -->
   </div>
   ```

4. Añadir validación para asegurarse de que se proporciona fecha_inicial cuando se usa el modo automático:
   ```javascript
   if (modoFechas.value === 'auto' && !bill.value.fecha_inicial) {
       toast.add({ severity: 'error', summary: 'Error', detail: 'La fecha inicial es obligatoria para la generación automática.', life: 5000 });
       return;
   }

   if (modoFechas.value === 'manual' && bill.value.periodicidad !== 'anual' && bill.value.periodicidad !== 'mensual') {
       // Comprobar fechas de cargo duplicadas para recibos trimestrales o bimestrales
       const fechas = bill.value.cargo.map((c) => (c.fecha ? c.fecha.toISOString().split('T')[0] : null)).filter((f) => f !== null);
       const fechasUnicas = new Set(fechas);
       if (fechas.length !== fechasUnicas.size) {
           toast.add({ severity: 'error', summary: 'Error', detail: 'Hay fechas de cargo duplicadas. Por favor, rectifique.', life: 5000 });
           return;
       }
   }
   ```

5. Modificar la función editBill para cargar correctamente fecha_inicial cuando se edita un recibo existente:
   ```javascript
   function editBill(prod, openFCDialog = false) {
       bill.value = {
           id: prod.id,
           concepto: prod.concepto,
           categoria: prod.categoria,
           cuenta_id: prod.cuenta_id,
           importe: prod.importe,
           periodicidad: prod.periodicidad,
           fecha_inicial: prod.fecha_inicial ? new Date(prod.fecha_inicial) : null,
           cargo: [
               // Primer elemento con datos existentes
               {
                   id: prod.fc_id ?? null,
                   fecha: prod.fecha ? new Date(prod.fecha) : null,
                   activo: prod.activo ?? 1,
                   estado: prod.estado ?? 'pendiente',
                   comentario: prod.comentario ?? ''
               },
               // Resto de elementos (5 elementos adicionales)
               ...Array(5)
                   .fill()
                   .map(() => ({
                       id: null,
                       fecha: null,
                       activo: 1,
                       estado: 'pendiente',
                       comentario: ''
                   }))
           ]
       };

       // Determinar el modo de edición (automático o manual) según si hay fecha_inicial o no
       modoFechas.value = prod.fecha_inicial ? 'auto' : 'manual';

       // ... resto del código de editBill()
   }
   ```

6. Añadir botones para generar nuevas fechas en la interfaz:
   ```html
   <Button v-if="prod.periodicidad !== 'anual'" icon="pi pi-calendar-plus" outlined rounded class="ml-2" 
           @click="generateDates(prod.id)" v-tooltip="'Generar nuevas fechas'" />
   ```

7. Implementar la función para generar nuevas fechas:
   ```javascript
   async function generateDates(reciboId) {
       try {
           const response = await BillService.generateBillDates(reciboId);
           toast.add({ severity: 'success', summary: 'Éxito', detail: response.message, life: 3000 });
           // Actualizar la lista de recibos
           updateBills('all');
       } catch (error) {
           toast.add({ severity: 'error', summary: 'Error', detail: `Error al generar nuevas fechas: ${error.message}`, life: 5000 });
           console.error('generateDates(). Error:', error);
       }
   }
   ```

8. Añadir un botón para los administradores que permita actualizar las fechas de todos los recibos:
   ```html
   <Button v-if="isAdmin" label="Actualizar fechas" icon="pi pi-calendar" severity="secondary" class="mr-2" 
           @click="updateAllDates" v-tooltip="'Actualizar fechas de todos los recibos'" />
   ```

9. Implementar la función para actualizar todas las fechas:
   ```javascript
   async function updateAllDates() {
       try {
           const response = await BillService.updateAllBillsDates();
           toast.add({ severity: 'success', summary: 'Éxito', detail: `Proceso completado: ${response.actualizados} de ${response.total} recibos actualizados`, life: 5000 });
           // Actualizar la lista de recibos
           updateBills('all');
       } catch (error) {
           toast.add({ severity: 'error', summary: 'Error', detail: `Error al actualizar fechas: ${error.message}`, life: 5000 });
           console.error('updateAllDates(). Error:', error);
       }
   }
   ```
