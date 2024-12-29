import axios from 'axios';

export async function fetchRecibos() {
    try {
        const response = await axios.get('/api/recibos');
        return response.data;
    } catch (error) {
        console.error('Error al obtener los recibos:', error);
        throw error;
    }
}
