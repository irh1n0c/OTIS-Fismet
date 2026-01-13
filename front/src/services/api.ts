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

export const API_URL = import.meta.env.VITE_API_URL || ''; // <-- Esto leerá lo que acabas de poner en Vercel
// (Asegúrate de que esta sea la URL exacta que copiaste de Render, SIN barra al final)

const apiClient = axios.create({
  baseURL: API_URL
});

console.log("API URL configurada:", API_URL);
// const apiClient = axios.create({
//   // baseURL (comentada) es correcto para que funcione el proxy de Vite
// });


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


/**
 * Añade más imágenes a un reporte existente.
 */
export const anadirImagenesReporte = async (formData: FormData): Promise<IBloque> => {
  // Nota: La respuesta del backend devuelve { msg, bloque }
  // Asumimos que la respuesta de Axios ya extrae 'data'
  const response = await apiClient.patch<{ msg: string, bloque: IBloque }>('/api/reportes/imagenes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.bloque; // Devuelve solo el bloque actualizado
};

export const crearNuevoBloque = async (departamento: string, nombreCliente: string): Promise<IBloque> => {
  const response = await apiClient.post<{ msg: string, bloque: IBloque }>('/api/reportes/bloque', {
    departamento,
    nombreCliente
  });
  return response.data.bloque;
};