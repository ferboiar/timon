# Timón

A comprehensive home financial management application

## What is Timón for?

Timón is a comprehensive financial platform designed for efficient management of personal or family financial resources. The application allows users to manage their finances through six interconnected systems:

1. **Bills System**: Facilitates the control of periodic payments (monthly, bimonthly, quarterly, annual) with detailed tracking of charge dates and payment statuses.

2. **Advances System**: Allows management of loans or cash advances, with features to configure payment plans, track progress, and generate reports.

3. **Savings System**: Enables creation and tracking of savings goals with target dates, configurable periodicities, and detailed records of contribution movements.

4. **Categories System**: Provides a structure to classify financial movements, allowing detailed analysis of expenses and income according to their nature.

5. **Accounts System**: Facilitates the administration of different types of financial accounts (current, savings, cash), showing updated balances and recording all movements.

6. **Users and Authentication System**: Provides access control and security for the application, including user management, authentication, role-based authorization, and interface customization.

The integration between these systems allows for a complete financial management where each operation is properly reflected in the accounts and can be categorized for later analysis, thus offering a 360° view of personal finances.

## Installation on Linux

### Prerequisites

- Node.js (v16 or higher)
- MySQL (v8 or higher)
- Git
- git-crypt (for secure handling of sensitive files)

### Installation Steps

1. **Install system dependencies**:

```bash
sudo apt update
sudo apt install nodejs npm mysql-server git
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
CREATE DATABASE conta_hogar;
CREATE USER 'user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON conta_hogar.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

- Import the initial database structure from the `DB_estructura.txt` file:

```bash
# From the project root
mysql -u user -p conta_hogar < DB_estructura.txt
```

This file contains the complete database structure, with all necessary tables (users, accounts, bills, categories, advances, savings, etc.) as well as sample data to start working with. Importing this file will save you from having to manually create all the tables and relationships.

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