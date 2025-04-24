# Timón

Una aplicación de gestión financiera doméstica integral

## ¿Para qué sirve Timón?

Timón es una plataforma financiera integral diseñada para la gestión eficiente de recursos económicos personales o familiares. La aplicación permite a los usuarios administrar sus finanzas a través de seis sistemas interconectados:

1. **Sistema de Recibos**: Facilita el control de pagos periódicos (mensuales, bimestrales, trimestrales, anuales) con seguimiento detallado de fechas de cargo y estados de pago.

2. **Sistema de Anticipos**: Permite la gestión de préstamos o adelantos de dinero, con funcionalidades para configurar planes de pago, seguimiento de avances y generación de reportes.

3. **Sistema de Ahorros**: Permite la creación y seguimiento de objetivos de ahorro con fechas objetivo, periodicidades configurables y registro detallado de movimientos de aportación.

4. **Sistema de Categorías**: Proporciona una estructura para clasificar los movimientos financieros, permitiendo un análisis detallado de gastos e ingresos según su naturaleza.

5. **Sistema de Cuentas**: Facilita la administración de diferentes tipos de cuentas financieras (corrientes, ahorros, efectivo), mostrando saldos actualizados y registrando todos los movimientos.

6. **Sistema de Usuarios y Autenticación**: Proporciona control de acceso y seguridad para la aplicación, incluyendo gestión de usuarios, autenticación, autorización basada en roles y personalización de la interfaz.

La integración entre estos sistemas permite una gestión financiera completa donde cada operación se refleja adecuadamente en las cuentas y puede categorizarse para un análisis posterior, ofreciendo así una visión 360° de las finanzas personales.

## Instalación en Linux

### Requisitos previos

- Node.js (v16 o superior)
- MySQL (v8 o superior)
- Git
- git-crypt (para el manejo seguro de archivos sensibles)

### Pasos de instalación

1. **Instalar las dependencias del sistema**:

```bash
sudo apt update
sudo apt install nodejs npm mysql-server git
sudo apt install git-crypt
```

2. **Clonar el repositorio**:

```bash
git clone https://github.com/tu-usuario/timon.git
cd timon
```

3. **Instalar dependencias del proyecto**:

```bash
npm install
```

4. **Configurar la base de datos**:

- Crear una base de datos para el proyecto:

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE conta_hogar;
CREATE USER 'user'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON conta_hogar.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

- Importar la estructura inicial de la base de datos desde el archivo `DB_estructura.txt`:

```bash
# Desde la raíz del proyecto
mysql -u user -p conta_hogar < DB_estructura.txt
```

Este archivo contiene la estructura completa de la base de datos, con todas las tablas necesarias (usuarios, cuentas, recibos, categorías, anticipos, ahorros, etc.) así como datos de ejemplo para empezar a trabajar. La importación de este archivo te ahorrará tener que crear manualmente todas las tablas y relaciones.

5. **Configurar archivos de entorno**:

   Crear el archivo `backend/.env` con el siguiente contenido:

```
JWT_SECRET=tu_secreto_jwt_seguro
JWT_EXPIRATION=24h
PORT_BACKEND=3000
```

   Crear el archivo `backend/src/db/.db_connection` con la configuración de la base de datos:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=user
DB_PASSWORD=tu_password
DB_DATABASE=conta_hogar
```

6. **Ejecutar la aplicación**:

```bash
# Para el backend
cd backend
node src/server.mjs

# Para el frontend (desde la raíz del proyecto)
npm run dev
```

## Entorno de desarrollo con GitHub Codespaces y git-crypt

### Configuración del entorno en GitHub Codespaces

1. **Crear un Codespace** desde el repositorio de GitHub:
   - Ve al repositorio en GitHub
   - Haz clic en el botón "Code"
   - Selecciona la pestaña "Codespaces"
   - Haz clic en "Create codespace on main"

2. **Una vez dentro del Codespace**:
   - El entorno vendrá preconfigurado con Node.js y las extensiones necesarias para VSCode
   - Instalar git-crypt:
   
   ```bash
   sudo apt-get update
   sudo apt-get install git-crypt
   ```

3. **Configurar los archivos sensibles**:
   - El repositorio ya tiene los archivos `.env` y `.db_connection` cifrados con git-crypt
   - Necesitarás desbloquear estos archivos usando la clave proporcionada

### Uso de git-crypt para archivos sensibles

Los archivos sensibles como `.env` y `.db_connection` están cifrados en el repositorio para proteger información confidencial. Para trabajar con ellos:

1. **Desbloquear el repositorio con tu clave**:

```bash
git-crypt unlock /ruta/a/clave-git-crypt-timon.key
```

2. **En caso de necesitar iniciar git-crypt en un nuevo repositorio**:

```bash
git-crypt init
git-crypt export-key ~/clave-git-crypt-timon.key
```

3. **Configurar qué archivos encriptar** creando un archivo `.gitattributes`:

```
backend/.env filter=git-crypt diff=git-crypt
backend/src/db/.db_connection filter=git-crypt diff=git-crypt
```

4. **Flujo de trabajo con git-crypt**:
   - Una vez desbloqueado el repositorio, trabaja normalmente con los archivos
   - Puedes hacer commits y push como siempre
   - Los archivos se cifrarán automáticamente en el repositorio remoto
   - Otros desarrolladores necesitarán la clave para desbloquear y ver estos archivos

### Uso desde otros equipos

1. **Instalar git-crypt en el nuevo equipo**:

```bash
sudo apt-get install git-crypt
```

2. **Clonar el repositorio**:

```bash
git clone https://github.com/tu-usuario/timon.git
cd timon
```

3. **Desbloquear los archivos sensibles**:

```bash
git-crypt unlock /ruta/a/clave-git-crypt-timon.key
```

4. **Continuar con el desarrollo normalmente**

## Interfaz web

### Estructura

Los templates consisten en un par de carpetas, las demos y el layout se han separado para que puedas eliminar fácilmente lo que no es necesario para tu aplicación.

- `src/layout`: Archivos principales del layout, deben estar presentes.
- `src/views`: Páginas demo como el Dashboard.
- `public/demo`: Recursos utilizados en las demo.
- `src/assets/demo`: Estilos utilizados en las demo.
- `src/assets/layout`: Archivos SCSS del layout principal.

### Menú

El menú principal está definido en el archivo `src/layout/AppMenu.vue`. Actualiza la propiedad `model` para definir tus propios elementos de menú.

### Layout Composable

El archivo `src/layout/composables/layout.js` es un componible (composable) que gestiona los cambios de estado del layout, incluyendo el modo oscuro, el tema de PrimeVue, los modos y estados del menú. Si cambias los valores iniciales como el preset o los colores, asegúrate de aplicarlos también en la configuración de PrimeVue en `main.js`.

En el contexto de desarrollo de interfaces de usuario un "Layout Composable" se refiere a una función que define la estructura visual y la disposición de los elementos dentro de una interfaz. En esencia, se encarga de organizar cómo se muestran los componentes en la pantalla.

Por lo tanto, un "Layout Composable" es una función que define un diseño específico y que puede ser reutilizada y combinada con otros composables para construir la interfaz completa.

### Tailwind CSS

Las páginas de demostración están desarrolladas con Tailwind CSS, sin embargo, la estructura principal de la aplicación utiliza principalmente CSS personalizado.

### Variables

Las variables CSS utilizadas en el template derivan sus valores de los presets de modo estilizado de PrimeVue. Utiliza los archivos bajo `assets/layout/_variables.scss` para personalizarlos según tus requisitos.