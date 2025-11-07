// frontend/src/services/api.ts
import axios from 'axios';

// --- NUEVAS INTERFACES (basadas en tu MongoModelo.js) ---

// 1. Interface para el reporte individual (el sub-documento)
export interface IReporteIndividual {
  _id: string;
  fecha: string;
  metrologo: string;
  codigoEquipo: string;
  imagenesEquipo: Array<{
    url: string;
    public_id: string;
  }>;
}


// 2. Interface para el documento principal (el Bloque)
// Esta es la misma que usas en FormularioEnvio.tsx
export interface IBloque {
  _id: string;
  departamento: string;
  nombreCliente: string;
  reportes: IReporteIndividual[];
  createdAt: string; // Añadido por timestamps
  updatedAt: string; // Añadido por timestamps
}

// 3. Interface para la respuesta al crear un reporte
interface ISubirReporteResponse {
  msg: string;
  bloque: IBloque; // El backend devuelve el 'bloque' actualizado
}

// --- CLIENTE AXIOS (Correcto como está) ---

const apiClient = axios.create({
  // baseURL (comentada) es correcto para que funcione el proxy de Vite
});


// --- FUNCIONES DE API (Corregidas) ---

/**
 * Sube un nuevo reporte y lo añade a un bloque.
 */
export const subirReporte = async (formData: FormData): Promise<ISubirReporteResponse> => {
  // El tipo de respuesta ahora es ISubirReporteResponse
  const response = await apiClient.post<ISubirReporteResponse>('/api/reportes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data; // Devuelve { msg: '...', bloque: {...} }
};

/**
 * Obtiene todos los Bloques de reportes.
 */
export const obtenerReportes = async (): Promise<IBloque[]> => {
  // Ahora promete y devuelve un array de IBloque[], no Reporte[]
  const response = await apiClient.get<IBloque[]>('/api/reportes');
  return response.data; // Devuelve el array de bloques
};


