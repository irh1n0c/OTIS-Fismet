// frontend/src/services/api.ts
import axios from 'axios';

interface Reporte {
  _id: string;
  departamento: string;
  nombreCliente: string;
  metrologo: string;
  codigoEquipo: string;
  imagenesEquipo: Array<{
    url: string;
    public_id: string;
  }>;
  fecha: string;
}

const apiClient = axios.create({
  //baseURL: 'http://192.168.100.33:5000/api'
  //baseURL: 'http://localhost:5000/api', // 
});

export const subirReporte = async (formData: FormData) => {
  const response = await apiClient.post<{ msg: string; reporte: Reporte }>('/api/reportes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Obtiene todos los reportes (para el dashboard del admin)
 */
export const obtenerReportes = async (): Promise<Reporte[]> => {
  const response = await apiClient.get<Reporte[]>('/api/reportes');
  return response.data;
};