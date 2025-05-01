# Optimizaciones de Base de Datos en Timon

Este documento describe las optimizaciones implementadas en la base de datos de Timon, incluyendo configuración de zona horaria e índices para mejorar el rendimiento.

## Índice
1. [Configuración de Zona Horaria](#configuración-de-zona-horaria)
   1. [Configuración en Aiven](#configuración-en-aiven)
   2. [Configuración en Instalación Local](#configuración-en-instalación-local)
   3. [Gestión de Cambio de Horario](#gestión-de-cambio-de-horario)
2. [Optimización mediante Índices](#optimización-mediante-índices)
   1. [Índices de Visibilidad](#índices-de-visibilidad)
   2. [Beneficios de los Índices](#beneficios-de-los-índices)
3. [Mantenimiento Automático](#mantenimiento-automático)
   1. [Tarea Programada Mensual](#tarea-programada-mensual)
   2. [Verificación y Monitoreo](#verificación-y-monitoreo)

---

## Configuración de Zona Horaria

La configuración correcta de la zona horaria es crucial para asegurar que todas las operaciones con fechas y horas se registren correctamente, especialmente en un entorno como España donde se utilizan cambios de horario estacionales.

### Configuración en Aiven

En Timon, utilizamos el servicio gestionado Aiven para nuestra base de datos MySQL. La configuración de zona horaria se realizó a través del panel de administración de Aiven:

1. **Acceso al panel de Aiven**:
   - Iniciar sesión en [console.aiven.io](https://console.aiven.io)
   - Seleccionar el servicio MySQL correspondiente

2. **Configuración de la zona horaria**:
   - Navegar a "Service Settings" o "Configuración del Servicio"
   - Localizar la sección "Advanced Configuration" o "Configuración Avanzada"
   - Configurar el parámetro `default_time_zone` con el valor `'Europe/Madrid'`
   - Guardar los cambios

3. **Verificación de la configuración**:
   ```sql
   SELECT @@global.time_zone, @@session.time_zone, NOW();
   ```
   
   Este comando debería mostrar un resultado como:
   ```
   @@global.time_zone | @@session.time_zone | NOW()
   Europe/Madrid      | Europe/Madrid       | fecha_local hora_local
   ```

### Configuración en Instalación Local

Si se utiliza una instalación local de MySQL (no gestionada), la configuración se realiza de manera diferente:

1. **Modificación del archivo de configuración**:
   - Editar el archivo `my.cnf` o `my.ini` (ubicación depende del sistema operativo)
   - Añadir la siguiente línea en la sección `[mysqld]`:
     ```
     default-time-zone = 'Europe/Madrid'
     ```
   - Reiniciar el servicio MySQL para aplicar los cambios

2. **Configuración en phpMyAdmin** (si se tiene acceso completo):
   - Editar el archivo `config.inc.php` de phpMyAdmin
   - Añadir o modificar:
     ```php
     $cfg['Servers'][$i]['SessionTimeZone'] = 'Europe/Madrid';
     ```
   - Esto configurará la zona horaria para todas las sesiones iniciadas a través de phpMyAdmin

### Gestión de Cambio de Horario

Usar el nombre de zona horaria `'Europe/Madrid'` en lugar de un offset fijo (como `'+01:00'` o `'+02:00'`) tiene la ventaja significativa de manejar automáticamente los cambios de horario estacional:

- El servidor MySQL ajustará automáticamente la hora cuando se produzca el cambio entre horario de verano (UTC+2) y horario estándar (UTC+1)
- Todas las consultas y operaciones con fechas reflejarán correctamente la hora local en España, independientemente de la época del año
- No es necesario realizar ajustes manuales cuando ocurren los cambios de horario (último domingo de marzo y último domingo de octubre)

Esta configuración es especialmente importante para operaciones programadas como backups, tareas de mantenimiento y procesos batch que deben ejecutarse a horas específicas locales.

---

## Optimización mediante Índices

Los índices son estructuras de datos adicionales que mejoran significativamente el rendimiento de las consultas en tablas con muchos registros, especialmente aquellas que se filtran frecuentemente por determinados campos.

### Índices de Visibilidad

En Timon, hemos implementado un sistema de permisos basado en visibilidad a nivel de registro mediante los campos `propietario_id` y `es_privado` en varias tablas. Para optimizar las consultas de filtrado por estos campos, hemos creado índices combinados:

```sql
-- Índices para campos de visibilidad en todas las tablas principales
CREATE INDEX idx_presupuestos_visibilidad ON presupuestos (propietario_id, es_privado);
CREATE INDEX idx_recibos_visibilidad ON recibos (propietario_id, es_privado);
CREATE INDEX idx_ahorros_visibilidad ON ahorros (propietario_id, es_privado);
CREATE INDEX idx_anticipos_visibilidad ON anticipos (propietario_id, es_privado);
CREATE INDEX idx_categorias_visibilidad ON categorias (propietario_id, es_privado);
CREATE INDEX idx_cuentas_visibilidad ON cuentas (propietario_id, es_privado);
```

Estos índices optimizan consultas con condiciones como:

```sql
SELECT * FROM presupuestos WHERE (es_privado = FALSE OR propietario_id = 2);
```

### Beneficios de los Índices

Los índices de visibilidad proporcionan varias ventajas:

1. **Mayor velocidad de respuesta**: Las consultas que filtran por propietario y privacidad son significativamente más rápidas
2. **Reducción de escaneos completos**: MySQL utiliza el índice para acceder directamente a los registros relevantes
3. **Mejor escalabilidad**: El rendimiento se mantiene estable incluso cuando la cantidad de registros crece
4. **Menor carga del servidor**: Se reduce el uso de CPU y memoria al procesar consultas de filtrado

Es importante destacar que los índices no alteran la forma en que se escriben las consultas, sino que son utilizados automáticamente por el optimizador de consultas de MySQL cuando determina que pueden mejorar el rendimiento.

---

## Mantenimiento Automático

Para mantener el rendimiento óptimo de la base de datos a lo largo del tiempo, hemos implementado tareas programadas de mantenimiento automático.

### Tarea Programada Mensual

Hemos configurado un evento programado en MySQL que ejecuta operaciones de análisis y optimización para todas las tablas principales:

```sql
-- Crear la tabla de logs de mantenimiento
CREATE TABLE IF NOT EXISTS mantenimiento_logs (
    id INT NOT NULL AUTO_INCREMENT,
    operacion VARCHAR(100) NOT NULL,
    detalles VARCHAR(255),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duracion_ms INT,
    PRIMARY KEY (id)
);

-- Crear el procedimiento almacenado de mantenimiento
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS realizar_mantenimiento_indices()
BEGIN
    DECLARE inicio DATETIME;
    DECLARE fin DATETIME;
    DECLARE duracion INT;
    
    -- Registrar tiempo de inicio
    SET inicio = NOW();
    
    -- Análisis de tablas (actualiza estadísticas)
    ANALYZE TABLE presupuestos;
    ANALYZE TABLE recibos;
    ANALYZE TABLE ahorros;
    ANALYZE TABLE anticipos;
    ANALYZE TABLE categorias;
    ANALYZE TABLE cuentas;
    
    -- Optimización de tablas (reorganiza índices y recupera espacio)
    OPTIMIZE TABLE presupuestos;
    OPTIMIZE TABLE recibos;
    OPTIMIZE TABLE ahorros;
    OPTIMIZE TABLE anticipos;
    OPTIMIZE TABLE categorias;
    OPTIMIZE TABLE cuentas;
    
    -- Calcular duración
    SET fin = NOW();
    SET duracion = TIMESTAMPDIFF(MICROSECOND, inicio, fin) / 1000;
    
    -- Registrar la ejecución en la tabla de logs
    INSERT INTO mantenimiento_logs (operacion, detalles, fecha, duracion_ms)
    VALUES ('Mantenimiento índices', 
            'Tablas: presupuestos, recibos, ahorros, anticipos, categorias, cuentas', 
            NOW(), 
            duracion);
END//

DELIMITER ;

-- Crear el evento programado (mensual a las 3:00 AM)
CREATE EVENT IF NOT EXISTS indice_mantenimiento_mensual
ON SCHEDULE 
    EVERY 1 MONTH
    STARTS DATE_FORMAT(
        -- Si hoy es día 1 y son menos de las 3:00 AM, programar para hoy
        -- De lo contrario, programar para el día 1 del próximo mes
        IF(
            DAY(CURDATE()) = 1 AND CURTIME() < '03:00:00',
            CURDATE(),
            DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL IF(DAY(CURDATE()) = 1, 1, 0) MONTH)
        ),
        '%Y-%m-%d 03:00:00'
    )
COMMENT 'Mantenimiento mensual de índices (día 1 a las 3:00 AM)'
DO CALL realizar_mantenimiento_indices();
```

Este sistema programado:

1. **Se ejecuta mensualmente**: El primer día de cada mes a las 3:00 AM (hora de España)
2. **Analiza tablas**: Actualiza las estadísticas internas que MySQL utiliza para optimizar consultas
3. **Optimiza tablas**: Reorganiza físicamente los índices y datos para mejorar el rendimiento
4. **Registra la actividad**: Guarda un registro detallado de cada operación de mantenimiento

### Verificación y Monitoreo

Para verificar que la tarea programada está funcionando correctamente:

1. **Consultar los eventos programados**:
   ```sql
   SHOW EVENTS;
   ```
   
   Esto mostrará todos los eventos programados, incluyendo `indice_mantenimiento_mensual`

2. **Revisar los logs de mantenimiento**:
   ```sql
   SELECT * FROM mantenimiento_logs ORDER BY fecha DESC LIMIT 10;
   ```
   
   Esta consulta mostrará los últimos 10 registros de mantenimiento

3. **Comprobar el estado del Event Scheduler**:
   ```sql
   SHOW VARIABLES LIKE 'event_scheduler';
   ```
   
   Debe mostrar "ON" para que los eventos programados se ejecuten

Si necesitas deshabilitar temporalmente el mantenimiento automático, puedes ejecutar:

```sql
ALTER EVENT indice_mantenimiento_mensual DISABLE;
```

Para habilitarlo nuevamente:

```sql
ALTER EVENT indice_mantenimiento_mensual ENABLE;
```

Este sistema de mantenimiento automático garantiza que los índices y las estructuras de datos de la base de datos se mantengan en condiciones óptimas sin intervención manual, contribuyendo a un rendimiento sostenido a lo largo del tiempo.

---

Esta configuración completa de zona horaria y mantenimiento de índices está diseñada para proporcionar un rendimiento consistente y confiable a la base de datos de Timon, asegurando que todas las operaciones con fechas sean correctas y que las consultas se ejecuten con la máxima eficiencia posible.