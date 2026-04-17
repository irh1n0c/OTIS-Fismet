// frontend/src/services/api.ts
import axios from 'axios';

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

export interface IBloque {
  _id: string;
  departamento: string | null;
  nombreCliente: string;
  reportes: IReporteIndividual[];
  createdAt: string;
  updatedAt: string;
}

export interface IReportesPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IReportesPaginadosResponse {
  data: IBloque[];
  pagination: IReportesPagination;
}

interface ISubirReporteResponse {
  msg: string;
  bloque: IBloque;
}

export const API_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: import.meta.env.DEV ? '' : (API_URL ? API_URL.replace(/\/$/, '') : '')
});

export const subirReporte = async (formData: FormData): Promise<ISubirReporteResponse> => {
  const response = await apiClient.post<ISubirReporteResponse>('/api/reportes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const obtenerReportes = async (): Promise<IBloque[]> => {
  const response = await apiClient.get('/api/reportes');
  const data = response.data;

  if (!Array.isArray(data)) {
    throw new Error('Respuesta invalida del servidor: se esperaba un array de bloques');
  }

  return data as IBloque[];
};

export const obtenerReportesPaginados = async (
  page: number,
  limit: number
): Promise<IReportesPaginadosResponse> => {
  const response = await apiClient.get<IReportesPaginadosResponse>('/api/reportes', {
    params: { page, limit }
  });

  const data = response.data;
  if (!data || !Array.isArray(data.data) || !data.pagination) {
    throw new Error('Respuesta invalida del servidor: se esperaba una respuesta paginada.');
  }

  return data;
};

export const anadirImagenesReporte = async (formData: FormData): Promise<IBloque> => {
  const response = await apiClient.patch<{ msg: string, bloque: IBloque }>('/api/reportes/imagenes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.bloque;
};

export const crearNuevoBloque = async (nombreCliente: string): Promise<IBloque> => {
  const response = await apiClient.post<{ msg: string, bloque: IBloque }>('/api/reportes/bloque', {
    departamento: null,
    nombreCliente
  });
  return response.data.bloque;
};

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

export const eliminarEquipo = async (
  bloqueId: string,
  reporteId: string
): Promise<IBloque> => {
  const response = await apiClient.delete<{ msg: string, bloque: IBloque }>(
    `/api/reportes/${bloqueId}/${reporteId}`
  );
  return response.data.bloque;
};

export const obtenerEquipo = async (
  bloqueId: string,
  reporteId: string
): Promise<IReporteIndividual> => {
  const response = await apiClient.get<{ msg: string, reporte: IReporteIndividual }>(
    `/api/reportes/${bloqueId}/${reporteId}`
  );
  return response.data.reporte;
};

export const buscarEquipoPorCodigo = async (codigoEquipo: string): Promise<{ bloque: IBloque, reporte: IReporteIndividual }> => {
  const response = await apiClient.get<{ msg: string, bloque: IBloque, reporte: IReporteIndividual }>(
    `/api/reportes/buscar/${codigoEquipo}`
  );
  return {
    bloque: response.data.bloque,
    reporte: response.data.reporte
  };
};
