import express from 'express';
import recibosRouter from './routes/recibos.mjs';

const app = express();
const port = 3000;

app.use(express.json());
app.use('/api/recibos', recibosRouter);

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
