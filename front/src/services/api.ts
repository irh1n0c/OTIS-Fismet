// frontend/src/services/api.ts
import axios from 'axios';

// --- NUEVAS INTERFACES (basadas en tu MongoModelo.js) ---

// 1. Interface para el reporte individual (el sub-documento)
export interface IReporteIndividual {
  _id: string;
  fecha: string;
  metrologo: string;
  codigoEquipo: string;
  observaciones: string;
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
  // En DEV: dejamos baseURL vacío para que Vite proxy maneje /api
  // En PROD: usamos VITE_API_URL (no hay proxy de Vite en build)
  baseURL: import.meta.env.DEV ? '' : (API_URL ? API_URL.replace(/\/$/, '') : '')
});

export const subirReporte = async (formData: FormData): Promise<ISubirReporteResponse> => {
  // El tipo de respuesta ahora es ISubirReporteResponse
  const response = await apiClient.post<ISubirReporteResponse>('/api/reportes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data; // Devuelve { msg: '...', bloque: {...} }
};
export const obtenerReportes = async (): Promise<IBloque[]> => {
  // Ahora promete y devuelve un array de IBloque[], no Reporte[]
  const response = await apiClient.get('/api/reportes');
  const data = response.data;
  if (!Array.isArray(data)) {
    throw new Error('Respuesta inválida del servidor: se esperaba un array de bloques');
  }
  return data as IBloque[]; // Devuelve el array de bloques
};


/**
 * Añade más imágenes a un reporte existente.
 */
export const anadirImagenesReporte = async (formData: FormData): Promise<IBloque> => {
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

/**
 * Actualiza los campos de un equipo (reporte) existente
 */
export const actualizarEquipo = async (
  bloqueId: string,
  reporteId: string,
  datos: Partial<IReporteIndividual>
): Promise<IBloque> => {
  const response = await apiClient.patch<{ msg: string, bloque: IBloque }>(
    `/api/reportes/${bloqueId}/${reporteId}`,
    datos
  );
  return response.data.bloque;
};

/**
 * Elimina un equipo (reporte) de la base de datos
 */
export const eliminarEquipo = async (
  bloqueId: string,
  reporteId: string
): Promise<IBloque> => {
  const response = await apiClient.delete<{ msg: string, bloque: IBloque }>(
    `/api/reportes/${bloqueId}/${reporteId}`
  );
  return response.data.bloque;
};

/**
 * Obtiene un equipo específico
 */
export const obtenerEquipo = async (
  bloqueId: string,
  reporteId: string
): Promise<IReporteIndividual> => {
  const response = await apiClient.get<{ msg: string, reporte: IReporteIndividual }>(
    `/api/reportes/${bloqueId}/${reporteId}`
  );
  return response.data.reporte;
};

/**
 * Busca un equipo por código
 */
export const buscarEquipoPorCodigo = async (codigoEquipo: string): Promise<{ bloque: IBloque, reporte: IReporteIndividual }> => {
  const response = await apiClient.get<{ msg: string, bloque: IBloque, reporte: IReporteIndividual }>(
    `/api/reportes/buscar/${codigoEquipo}`
  );
  return {
    bloque: response.data.bloque,
    reporte: response.data.reporte
  };
};