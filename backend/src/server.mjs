/**
 * Servidor principal de la API para la aplicación Timón
 *
 * Este archivo configura el servidor Express, registra los middlewares necesarios
 * como CORS y manejo de JSON, y establece las rutas para los diferentes módulos
 * de la API. Actúa como punto de entrada principal para todas las solicitudes HTTP
 * y coordina la comunicación entre los clientes y las funcionalidades del backend.
 *
 * @module server
 */

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

// Importaciones usando los subpath imports configurados en package.json
import { config } from '#backend/config/env.mjs';
import ahorrosRouter from '#backend/routes/ahorros.mjs';
import anticiposRouter from '#backend/routes/anticipos.mjs';
import authRouter from '#backend/routes/auth.mjs';
import categoriasRouter from '#backend/routes/categorias.mjs';
import dbConfigRouter from '#backend/routes/conexionDB.mjs';
import cuentasRouter from '#backend/routes/cuentas.mjs';
import recibosRouter from '#backend/routes/recibos.mjs';
import usersRouter from '#backend/routes/users.mjs';

const app = express();
const port = config.server.port; //ver en ./config/env.mjs

// Implementar Helmet para seguridad (incluye desactivar x-powered-by)
app.use(helmet());

// Usar el middleware cors
app.use(cors());

app.use(express.json());
app.use('/api/recibos', recibosRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/cuentas', cuentasRouter);
app.use('/api/ahorros', ahorrosRouter);
app.use('/api/anticipos', anticiposRouter);
app.use('/api/auth', authRouter); // Montar el router de autenticación
app.use('/api/db-config', dbConfigRouter);
app.use('/api/users', usersRouter); // Montar el router de usuarios

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
