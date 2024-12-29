import express from 'express';
import { getRecibos } from './db/db_utils.mjs';

const app = express();
const port = 3000;

app.get('/api/recibos', async (req, res) => {
    const filters = req.query;
    try {
        const recibos = await getRecibos(filters);
        res.json(recibos);
    } catch (error) {
        if (error.message.startsWith('Filtro no válido')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al obtener los recibos' });
        }
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
