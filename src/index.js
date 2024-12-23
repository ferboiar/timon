//import express from 'express';

//const app = express();
//const port = 3000;

//app.get('/', (req, res) => {
//  res.send('¡Hola Mundo desde Timón!');
//});

//app.listen(port, () => {
//  console.log(`Timón escuchando en el puerto ${port}`);
//});

const { getRecibos } = require('./db/db_utils');

async function main() {
    try {
        const recibos = await getRecibos();
        console.log("Recibos:", recibos);
    } catch (error) {
        console.error("Error en la aplicación:", error);
    }
}

main();