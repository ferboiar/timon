# Timón

A comprehensive home financial management application

## What is Timón for?

Timón is a comprehensive financial platform designed for efficient management of personal or family financial resources. The application allows users to manage their finances through six interconnected systems:

1. **Bills System**: Facilitates the control of periodic payments (monthly, bimonthly, quarterly, annual) with detailed tracking of charge dates and payment statuses.

2. **Advances System**: Allows management of loans or cash advances, with features to configure payment plans, track progress, and generate reports.

3. **Savings System**: Enables creation and tracking of savings goals with target dates, configurable periodicities, and detailed records of contribution movements.

4. **Categories System**: Provides a structure to classify financial movements, allowing detailed analysis of expenses and income according to their nature.

5. **Accounts System**: Manages financial accounts and a manually entered balance. Automatic consolidated account movements and reconciliation are not implemented.

6. **Users and Authentication System**: Provides access control and security for the application, including user management, authentication, role-based authorization, and interface customization.

These modules do not yet provide automatic accounting integration or reconciliation. Implemented behavior, known limitations and the remaining plan are documented in doc/mantenimiento/estado-del-proyecto.md (Spanish).

## Installation on Linux

### Prerequisites

- Node.js 20.9 or higher in the 20 series (see package.json)
- MariaDB 11.8 (DC-04)
- Git
- git-crypt (for secure handling of sensitive files)

### Installation Steps

1. **Install system dependencies**:

```bash
sudo apt update
sudo apt install nodejs npm mariadb-server git
sudo apt install git-crypt
```

2. **Clone the repository**:

```bash
git clone https://github.com/your-username/timon.git
cd timon
```

3. **Install project dependencies**:

```bash
npm install
```

4. **Configure the database**:

- Create a database for the project:

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE conta_hogar CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
CREATE USER 'user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON conta_hogar.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

- Create the database structure by applying, in order, the files in `backend/src/db/migrations/`:

```bash
# From the project root
for f in backend/src/db/migrations/*.sql; do mysql -u user -p conta_hogar < "$f"; done
```

The migrations create all the tables and relationships (users, accounts, bills, categories, advances, savings, etc.), without data. The first administrator user is created in step 6.

5. **Configure environment files**:

   Create the `backend/.env` file with the following content:

```
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRATION=24h
PORT_BACKEND=3000
```

   Create the `backend/src/db/.db_connection` file with the database configuration:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=user
DB_PASSWORD=your_password
DB_DATABASE=conta_hogar
```

6. **Create test admin user**:

To access the application, you'll need to create an initial administrator user. The project includes a script that automatically creates a user with administrator privileges:

```bash
# From the project root
node backend/src/scripts/createTestUser.mjs
```

This script will create an administrator user with the following credentials:
- Username: admin
- Password: password123

If the user already exists in the database, the script will reset their password to "password123", which is useful if you forget the administrator password.

> **IMPORTANT**: This user is only for development or testing environments. In a production environment, you must immediately change these credentials or create a new administrator user with secure credentials.

7. **Run the application**:

```bash
# For development environment (from the project root)
npm run dev
```

## Documentation and tests

Start with doc/mantenimiento/estado-del-proyecto.md; the current plan is in TODO and doc/mantenimiento/registro-hallazgos.md. Backend tests need a separate MariaDB test environment: see backend/test/README.md. Never point destructive tests at the application database.

## Development environment with GitHub Codespaces and git-crypt

### Environment Setup in GitHub Codespaces

1. **Create a Codespace** from the GitHub repository:
   - Go to the repository on GitHub
   - Click on the "Code" button
   - Select the "Codespaces" tab
   - Click on "Create codespace on main"

2. **Once inside the Codespace**:
   - The environment will come preconfigured with Node.js and the necessary VSCode extensions
   - Install git-crypt:
   
   ```bash
   sudo apt-get update
   sudo apt-get install git-crypt
   ```

3. **Configure sensitive files**:
   - The repository already has the `.env` and `.db_connection` files encrypted with git-crypt
   - You will need to unlock these files using the provided key

### Using git-crypt for sensitive files

Sensitive files like `.env` and `.db_connection` are encrypted in the repository to protect confidential information. To work with them:

1. **Unlock the repository with your key**:

```bash
git-crypt unlock /path/to/clave-git-crypt-timon.key
```

2. **If you need to initialize git-crypt in a new repository**:

```bash
git-crypt init
git-crypt export-key ~/clave-git-crypt-timon.key
```

3. **Configure which files to encrypt** by creating a `.gitattributes` file:

```
backend/.env filter=git-crypt diff=git-crypt
backend/src/db/.db_connection filter=git-crypt diff=git-crypt
```

4. **Workflow with git-crypt**:
   - Once the repository is unlocked, work normally with the files
   - You can commit and push as usual
   - Files will be automatically encrypted in the remote repository
   - Other developers will need the key to unlock and view these files

### Using from other computers

1. **Install git-crypt on the new computer**:

```bash
sudo apt-get install git-crypt
```

2. **Clone the repository**:

```bash
git clone https://github.com/your-username/timon.git
cd timon
```

3. **Unlock the sensitive files**:

```bash
git-crypt unlock /path/to/clave-git-crypt-timon.key
```

4. **Continue with development normally**

## Web Interface

### Structure

The templates consist of a couple of folders; the demos and layout have been separated so you can easily remove what is not needed for your application.

- `src/layout`: Main layout files, must be present.
- `src/views`: Demo pages such as the Dashboard.
- `public/demo`: Resources used in the demos.
- `src/assets/demo`: Styles used in the demos.
- `src/assets/layout`: Main layout SCSS files.

### Menu

The main menu is defined in the `src/layout/AppMenu.vue` file. Update the `model` property to define your own menu items.

### Layout Composable

The `src/layout/composables/layout.js` file is a composable that manages layout state changes, including dark mode, PrimeVue theme, menu modes, and states. If you change initial values like preset or colors, make sure to also apply them to the PrimeVue configuration in `main.js`.

In the context of UI development, a "Layout Composable" refers to a function that defines the visual structure and arrangement of elements within an interface. Essentially, it's responsible for organizing how components are displayed on the screen.

Therefore, a "Layout Composable" is a function that defines a specific design and can be reused and combined with other composables to build the complete interface.

### Tailwind CSS

The demonstration pages are developed with Tailwind CSS; however, the main application structure primarily uses custom CSS.

### Variables

The CSS variables used in the template derive their values from PrimeVue's styled mode presets. Use the files under `assets/layout/_variables.scss` to customize them according to your requirements.
