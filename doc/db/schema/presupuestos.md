# Sistema de Gestión de Presupuestos - Documentación Técnica

## Tabla de Contenidos
1. [Estructura de la Base de Datos](#estructura-de-la-base-de-datos)  
   1.1 [Tabla: presupuestos](#tabla-presupuestos)  
   1.2 [Tabla: periodos_presupuesto](#tabla-periodos_presupuesto)  
   1.3 [Tabla: recibos_periodos](#tabla-recibos_periodos)  
2. [Flujo de Trabajo](#flujo-de-trabajo)  
   2.1 [Creación de Presupuestos](#creación-de-presupuestos)  
   2.2 [Generación de Periodos](#generación-de-periodos)  
   2.3 [Ajustes Manuales](#ajustes-manuales)  
3. [Casos de Uso](#casos-de-uso)  
   3.1 [Presupuesto Mensual con Ajustes](#presupuesto-mensual-con-ajustes)  
   3.2 [Gestión de Recibos Especiales](#gestión-de-recibos-especiales)  
4. [Consultas Comunes](#consultas-comunes)  
5. [Diagrama de Relaciones](#diagrama-de-relaciones)  

---

## Introducción al Sistema de Presupuestos

El Sistema de Gestión de Presupuestos permite a los usuarios planificar sus gastos futuros mediante la definición de presupuestos por categoría, con diferentes periodicidades, y hacer seguimiento de su cumplimiento. El sistema se integra con el resto de módulos de la aplicación Timón, permitiendo:

- **Planificación financiera**: Establecer límites de gasto por categoría y periodo
- **Seguimiento de ejecución**: Comparar gastos reales vs. presupuestados
- **Acumulación de saldos**: Gestionar el superávit o déficit entre periodos
- **Integración con recibos**: Vincular recibos periódicos a presupuestos específicos

---

## Estructura de la Base de Datos

### Tabla: presupuestos
- **Descripción**: Configuración base de los presupuestos que define las reglas generales para la generación de períodos
- **Propósito**: Almacena los presupuestos maestros que sirven como plantilla para crear períodos concretos
- **Campos clave**:
  - `importe_base`: Valor de referencia que se asignará por defecto a cada nuevo periodo
  - `periodicidad`: Define la frecuencia con que se generan automáticamente los periodos
  - `es_recibo`: Marca presupuestos especiales para gestión de recibos periódicos

| Campo           | Tipo                          | Descripción                                                                 |
|-----------------|-------------------------------|-----------------------------------------------------------------------------|
| id              | INT AUTO_INCREMENT            | Identificador único                                                        |
| concepto        | VARCHAR(50)                   | Nombre descriptivo del presupuesto (Ej: "Comida mensual")                  |
| comentario      | TEXT                          | Notas adicionales u observaciones                                          |
| importe_base    | DECIMAL(12,2)                 | Cantidad de referencia para nuevos periodos (Debe ser > 0)                 |
| periodicidad    | ENUM(...)                     | Frecuencia: diario, semanal, mensual, bimestral, trimestral, semestral, anual, puntual |
| es_recibo       | BOOLEAN                       | True = Presupuesto especial para gestión de recibos                        |
| cuenta_id       | INT                           | Cuenta bancaria asociada (FK a cuentas.id) donde se registrarán los gastos |
| categoria_id    | INT                           | Categoría de gasto asociada (FK a categorias.id) para clasificación        |
| user_id         | INT                           | Usuario responsable del presupuesto (FK a users.id)                        |
| created_at      | TIMESTAMP                     | Fecha de creación automática del registro                                  |
| updated_at      | TIMESTAMP                     | Fecha de última actualización automática                                   |

**Índices**:  
- `idx_categoria`: Optimiza búsquedas y reportes por categoría  
- `idx_cuenta`: Acelera operaciones relacionadas con cuentas  
- `idx_usuario`: Mejora la gestión y filtrado por usuario  

**Relaciones**:
- `presupuestos.categoria_id` → `categorias.id`: Vincula con el catálogo de categorías de gastos
- `presupuestos.cuenta_id` → `cuentas.id`: Asocia con la cuenta bancaria donde se registran los movimientos
- `presupuestos.user_id` → `users.id`: Identifica al usuario responsable del presupuesto

---

### Tabla: periodos_presupuesto
- **Descripción**: Gestiona la ejecución concreta de cada periodo presupuestario
- **Propósito**: Materializa el presupuesto maestro en períodos específicos (meses, trimestres, etc.)
- **Campos clave**:
  - `importe_ajustado`: Permite modificar el importe base para adaptarlo a circunstancias especiales
  - `diferencia_acumulada`: Registra el saldo (positivo o negativo) de periodos anteriores
  - `estado`: Controla el ciclo de vida del periodo (pendiente → activo → cerrado)

| Campo                  | Tipo              | Descripción                                                                 |
|------------------------|-------------------|-----------------------------------------------------------------------------|
| id                     | INT AUTO_INCREMENT| Identificador único                                                        |
| presupuesto_id         | INT               | Presupuesto maestro asociado (FK a presupuestos.id)                        |
| fecha_inicio           | DATE              | Fecha de inicio del periodo (Ej: 2025-05-01)                                |
| fecha_fin              | DATE              | Fecha de finalización del periodo (Ej: 2025-05-31)                          |
| importe_ajustado       | DECIMAL(12,2)     | Importe modificado para este periodo específico (puede variar del base)     |
| diferencia_acumulada   | DECIMAL(12,2)     | Saldo acumulado de periodos anteriores (Positivo = Superávit, Negativo = Déficit) |
| estado                 | ENUM(...)         | Estado actual: pendiente (futuro), activo (actual), cerrado (finalizado)   |
| created_at             | TIMESTAMP         | Fecha de creación automática del registro                                  |
| updated_at             | TIMESTAMP         | Fecha de última actualización automática                                   |

**Índices**:
- `idx_presupuesto`: Optimiza la búsqueda por presupuesto maestro
- `idx_fechas`: Mejora consultas por rangos de fechas

**Relaciones**:
- `periodos_presupuesto.presupuesto_id` → `presupuestos.id`: Vincula con el presupuesto maestro (ON DELETE CASCADE)

**Ejemplo de Datos**:
```sql
INSERT INTO periodos_presupuesto 
  (presupuesto_id, fecha_inicio, fecha_fin, importe_ajustado, estado)
VALUES
  (1, '2025-05-01', '2025-05-31', 600.00, 'activo');
```

---

### Tabla: recibos_periodos
- **Descripción**: Vincula recibos existentes con periodos específicos de presupuesto
- **Propósito**: Permite gestionar recibos recurrentes dentro del sistema de presupuestos
- **Nota**: Esta tabla solo se utiliza cuando el presupuesto tiene `es_recibo = 1`

| Campo                   | Tipo             | Descripción                                                   |
|-------------------------|------------------|---------------------------------------------------------------|
| periodo_presupuesto_id  | INT              | Periodo asociado (FK a periodos_presupuesto.id)               |
| recibo_id               | INT              | Recibo vinculado (FK a recibos.id) de la tabla existente      |
| importe_esperado        | DECIMAL(12,2)    | Importe teórico que se espera del recibo para este periodo    |
| importe_recibido        | DECIMAL(12,2)    | Importe real efectivamente recibido/pagado (0 por defecto)    |

**Índices**:
- Clave primaria compuesta sobre (`periodo_presupuesto_id`, `recibo_id`)

**Relaciones**:
- `recibos_periodos.periodo_presupuesto_id` → `periodos_presupuesto.id`: Vincula con el período específico
- `recibos_periodos.recibo_id` → `recibos.id`: Asocia con el recibo existente en el sistema

**Particularidades**:
- Esta tabla funciona como una tabla de enlace (junction table) entre recibos y periodos
- Permite asociar múltiples recibos a un mismo periodo de presupuesto
- Facilita el seguimiento de recibos esperados vs. realmente pagados

---

## Flujo de Trabajo

### Creación de Presupuestos

El sistema permite crear dos tipos principales de presupuestos:

#### 1. **Presupuesto estándar**:
Para gastos regulares categorizados (alimentación, ocio, transporte, etc.)

```sql
-- Ejemplo: Presupuesto mensual para comida
INSERT INTO presupuestos (
  concepto, 
  importe_base, 
  periodicidad, 
  cuenta_id, 
  categoria_id, 
  user_id
) VALUES (
  'Comida', 
  600.00, 
  'mensual', 
  2,  -- ID de cuenta principal
  7,  -- ID de categoría "comida"
  1   -- ID del usuario administrador
);
```

#### 2. **Presupuesto para Recibos**:
Especial para gestionar gastos recurrentes como servicios, seguros o suscripciones

```sql
INSERT INTO presupuestos (
  concepto,
  es_recibo,
  importe_base,
  periodicidad,
  cuenta_id,
  categoria_id,
  user_id
) VALUES (
  'Recibos servicios',
  1,               -- Marcado como presupuesto de recibos
  0.00,            -- Se calculará automáticamente sumando los recibos asociados
  'mensual',
  1,               -- ID de cuenta corriente principal
  2,               -- ID de categoría "servicios"
  1                -- ID del usuario administrador
);
```

### Generación de Periodos

Los periodos se generan automáticamente según la periodicidad definida, mediante un proceso programado:

```javascript
// Pseudocódigo para generación de periodos
function generarPeriodos() {
  // Obtener presupuestos activos que necesitan nuevos periodos
  const presupuestos = obtenerPresupuestosActivos();
  
  presupuestos.forEach(presupuesto => {
    // No generar para presupuestos puntuales (se crean manualmente)
    if (presupuesto.periodicidad !== 'puntual') {
      // Calcula fechas y valores según la periodicidad
      const nuevoPeriodo = calcularNuevoPeriodo(presupuesto);
      
      // Crear registro en la base de datos
      insertarPeriodo(nuevoPeriodo);
    }
  });
}

// Función auxiliar para calcular fechas según periodicidad
function calcularNuevoPeriodo(presupuesto) {
  let fechaInicio, fechaFin;
  
  // Determinar fechas según periodicidad
  switch(presupuesto.periodicidad) {
    case 'mensual': 
      // Primer y último día del siguiente mes
      // ...
      break;
    case 'trimestral':
      // Primer y último día del siguiente trimestre
      // ...
      break;
    // otros casos...
  }
  
  return {
    presupuesto_id: presupuesto.id,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    importe_ajustado: presupuesto.importe_base,
    estado: 'pendiente'
  };
}
```

### Ajustes Manuales

El sistema permite realizar ajustes para adaptarse a circunstancias especiales:

#### 1. **Modificar Importe de Periodo**:
Por ejemplo, ajustar un presupuesto mensual que requiere un incremento temporal:

```sql
-- Ejemplo: Aumentar presupuesto de comida para un mes con eventos especiales
UPDATE periodos_presupuesto
SET importe_ajustado = 750.00
WHERE id = 45;
```

#### 2. **Crear Periodo Manual** (casos especiales):
Para situaciones particulares como meses con más semanas o presupuestos extraordinarios:

```sql
-- Ejemplo: Diciembre con 5 semanas requiere un presupuesto ajustado
INSERT INTO periodos_presupuesto (
  presupuesto_id,
  fecha_inicio,
  fecha_fin,
  importe_ajustado,
  estado
) VALUES (
  1,                -- ID del presupuesto maestro "Comida"
  '2025-12-01',     -- Inicio mes de diciembre
  '2025-12-31',     -- Fin mes de diciembre
  650.00,           -- Importe ajustado para 5 semanas en vez de 4
  'activo'          -- Estado actual
);
```

## Casos de Uso

### Presupuesto Mensual con Ajustes

**Escenario**: Presupuesto de 520€/mes para comida (calculado como 130€/semana x 4 semanas), con diciembre ajustado a 650€ (130€/semana x 5 semanas).

#### 1. **Configuración Inicial**:
```sql
-- Creación del presupuesto base
INSERT INTO presupuestos (...) VALUES ('Comida', 520.00, 'mensual', ...);
```

#### 2. **Generación Automática**:
Los períodos se generan automáticamente con el importe base:

| Periodo | Importe Ajustado | Estado |
|------------------|------------------|----------|
| Nov 2025 | 520.00 | Cerrado |
| Dic 2025 | 520.00 | Activo |

#### 3. **Ajuste Manual**:
El mes de diciembre tiene 5 semanas en lugar de 4, así que se ajusta manualmente:

```sql
-- Presupuesto base: 130€/semana
-- Ajuste para diciembre: 130€ x 5 = 650€
UPDATE periodos_presupuesto 
SET importe_ajustado = 650.00
WHERE fecha_inicio = '2025-12-01';
```

**Beneficio**: Este ajuste permite una gestión más precisa, considerando la variabilidad natural de los meses en el calendario.

### Gestión de Recibos Especiales

#### Caso 2a: Seguro anual dividido en plazos

**Escenario**: Seguro anual de 600€ pagado en dos recibos semestrales de 300€ cada uno.

1. **Vincular Recibo**:
```sql
-- Asociar dos recibos de seguro a sus respectivos periodos
INSERT INTO recibos_periodos 
  (periodo_presupuesto_id, recibo_id, importe_esperado)
VALUES
  (101, 15, 300.00),  -- Primer semestre
  (102, 16, 300.00);  -- Segundo semestre
```

2. **Registrar Pago**:
Cuando se realiza el pago del primer recibo, se actualiza su estado:

```sql
-- Registrar que el primer pago semestral se ha efectuado
UPDATE recibos_periodos
SET importe_recibido = 300.00
WHERE recibo_id = 15;
```

**Beneficio**: Permite distribuir gastos grandes en varios periodos y hacer seguimiento de su ejecución.

#### Caso 2b: Gestión de recibos periódicos regulares

```sql
-- Convertir un presupuesto normal en presupuesto de recibos
UPDATE presupuestos 
SET es_recibo = 1
WHERE id = 3;

-- Vincular un recibo existente (ej: factura de internet) al periodo actual
INSERT INTO recibos_periodos (
  periodo_presupuesto_id,
  recibo_id,
  importe_esperado
) VALUES (
  15,                -- ID del periodo presupuestario actual
  8,                 -- ID del recibo de internet
  120.00             -- Importe esperado para este mes
);
```

**Beneficio**: Facilita el seguimiento de recibos recurrentes y su impacto en el presupuesto.

## Consultas Comunes

### Disponibilidad Actual
Para conocer cuánto queda disponible del presupuesto en el periodo activo:

```sql
-- Consulta que muestra cuánto se ha gastado y cuánto queda disponible
-- para cada presupuesto activo
SELECT
  p.concepto AS Presupuesto,
  pp.importe_ajustado AS Presupuestado,
  COALESCE(SUM(t.importe), 0) AS Gastado,
  (pp.importe_ajustado - COALESCE(SUM(t.importe), 0)) AS Disponible,
  CASE 
    WHEN pp.importe_ajustado > 0 
    THEN ROUND((COALESCE(SUM(t.importe), 0) / pp.importe_ajustado) * 100, 1)
    ELSE 0
  END AS PorcentajeUsado
FROM periodos_presupuesto pp
JOIN presupuestos p ON pp.presupuesto_id = p.id
LEFT JOIN transacciones t ON pp.id = t.periodo_id
WHERE pp.estado = 'activo'
GROUP BY pp.id, p.concepto, pp.importe_ajustado
ORDER BY PorcentajeUsado DESC;
```

### Histórico de Diferencias
Para analizar la evolución de un presupuesto específico a lo largo del tiempo:

```sql
-- Consulta que muestra el historial de periodos para un presupuesto
-- incluyendo los saldos acumulados
SELECT
  fecha_inicio,
  fecha_fin,
  importe_ajustado AS Presupuestado,
  (SELECT COALESCE(SUM(importe), 0) 
   FROM transacciones 
   WHERE periodo_id = pp.id) AS Gastado,
  diferencia_acumulada AS SaldoAcumulado,
  estado
FROM periodos_presupuesto pp
WHERE presupuesto_id = 2  -- ID del presupuesto a analizar
ORDER BY fecha_inicio DESC;
```

## Diagrama de Relaciones

El siguiente diagrama muestra las principales relaciones entre las tablas del sistema:

```nomnoml
#direction: down
#spacing: 50
#fontSize: 14
#font: Calibri
#lineWidth: 1.5
#background: transparent
#edges: rounded
#fill:rgb(204, 198, 179); rgb(204, 198, 179)

[presupuestos]
[periodos_presupuesto]
[recibos_periodos]
[recibos]
[categorias]
[cuentas]
[users]
  
// Relaciones "1 a muchos" (||--o{)
[presupuestos] +-> 1..* [periodos_presupuesto]
[presupuestos] +-> 1..* [recibos_periodos]
  
// Relaciones "0 a muchos" (}o--||)
[periodos_presupuesto] o-> 0..* [recibos]
  
// Relaciones simples (}|--|)
[presupuestos] --> usa [categorias]
[presupuestos] --> asociado a [cuentas]
[presupuestos] --> pertenece a [users]
```

### Integración con el Sistema Existente

El Sistema de Presupuestos se integra con los módulos existentes de Timón:

1. **Con Sistema de Categorías**: Utiliza las mismas categorías del sistema principal
2. **Con Sistema de Cuentas**: Vincula presupuestos con cuentas específicas
3. **Con Sistema de Recibos**: Asocia recibos existentes a periodos presupuestarios
4. **Con Sistema de Usuarios**: Asigna responsables a cada presupuesto

Esta integración permite una gestión financiera holística, conectando la planificación presupuestaria con la ejecución real de gastos y la gestión de recibos periódicos.