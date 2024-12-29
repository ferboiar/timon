import { getRecibos } from './db/db_utils.mjs';

async function main() {
    try {
        const recibos = await getRecibos();
        console.log('Recibos:', recibos);
    } catch (error) {
        console.error('Error en la aplicación:', error);
    }
}

main();
