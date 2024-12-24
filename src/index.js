import { getRecibos } from './db/db_utils.js';

async function main() {
    try {
        const recibos = await getRecibos();
        console.log("Recibos:", recibos);
    } catch (error) {
        console.error("Error en la aplicación:", error);
    }
}

main();