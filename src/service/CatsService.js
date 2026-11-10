import { API_BASE_URL, apiClient } from '@/config/api';

const API_URL = `${API_BASE_URL}/api/categorias`;

export class CatsService {
    // Obtener todas las categorías
    static async getCategorias() {
        try {
            const response = await apiClient.get(API_URL);
            return response.data;
        } catch (error) {
            console.error('Error al obtener las categorías:', error);
            throw error;
        }
    }

    // Guardar una categoría (crear o actualizar)
    static async saveCategoria(categoria) {
        try {
            const response = await apiClient.post(API_URL, categoria);
            return response.data;
        } catch (error) {
            console.error('Error al guardar la categoría:', error);
            throw error;
        }
    }

    // Eliminar una o más categorías
    static async deleteCategorias(categoriaIds) {
        try {
            const response = await apiClient.delete(API_URL, {
                data: { categoriaIds }
            });
            return response.data;
        } catch (error) {
            console.error('Error al eliminar la(s) categoría(s):', error);
            throw error;
        }
    }
}
