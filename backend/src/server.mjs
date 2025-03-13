import cors from 'cors';
import express from 'express';
import categoriasRouter from './routes/categorias.mjs';
import cuentasRouter from './routes/cuentas.mjs'; // Importar cuentasRouter
import recibosRouter from './routes/recibos.mjs';

const app = express();
const port = 3000;

// Usar el middleware cors
app.use(cors());

app.use(express.json());
app.use('/api/recibos', recibosRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/cuentas', cuentasRouter); // Usar cuentasRouter

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
