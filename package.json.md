{
    "name": "timon",
    "version": "0.1.0",
    "description": "Aplicación de contabilidad doméstica",
    "main": "index.js",
    "type": "module",
    "scripts": {
      // Scripts del Backend
      "start:backend": "node backend/src/index.js",
      "dev:backend": "nodemon backend/src/index.js",
      "test:backend": "echo \"Error: no test specified\" && exit 1",
  
      // Scripts del Frontend
      "dev:frontend": "cd frontend && vite",
      "build:frontend": "cd frontend && vite build",
      "preview:frontend": "cd frontend && vite preview",
      "lint:frontend": "cd frontend && eslint --fix . --ext .vue,.js,.jsx,.cjs,.mjs --fix --ignore-path .gitignore",
  
      //Scripts combinados
      "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
      "build": "npm run build:frontend",
      "start": "npm run start:backend"
    },
    "keywords": [
      "contabilidad",
      "finanzas",
      "hogar",
      "presupuesto",
      "finanzas personales"
    ],
    "author": "Fer",
    "license": "MIT",
    "dependencies": {
      // Dependencias del Backend
      "express": "^4.20.0",
      "mysql2": "^3.12.0",
  
      // Dependencias del Frontend
      "@primevue/themes": "^4.2.4",
      "chart.js": "3.3.2",
      "primeicons": "^7.0.0",
      "primevue": "^4.2.4",
      "vue": "^3.4.34",
      "vue-router": "^4.4.0"
    },
    "devDependencies": {
      // Dependencias del Backend
      "nodemon": "^3.0.1",
  
      // Dependencias del Frontend
      "@primevue/auto-import-resolver": "^4.2.4",
      "@rushstack/eslint-patch": "^1.8.0",
      "@vitejs/plugin-vue": "^5.0.5",
      "@vue/eslint-config-prettier": "^9.0.0",
      "autoprefixer": "^10.4.19",
      "eslint": "^8.57.0",
      "eslint-plugin-vue": "^9.23.0",
      "postcss": "^8.4.40",
      "prettier": "^3.2.5",
      "sass": "^1.55.0",
      "tailwindcss": "^3.4.6",
      "tailwindcss-primeui": "^0.3.2",
      "unplugin-vue-components": "^0.27.3",
      "vite": "^5.3.1",
      "concurrently": "^8.2.1"
    },
    "engines": {
      "node": ">=20.9.0-1003 <21.0.0"
    },
    "repository": {
      "type": "git",
      "url": "https://github.com/ferboiar/timon.git"
    },
    "homepage": "https://github.com/ferboiar/timon#readme",
    "bugs": {
      "url": "https://github.com/ferboiar/timon/issues"
    }
  }