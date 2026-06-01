import axios from 'axios';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

const authClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

authClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getCurrentUser = async (): Promise<IUser> => {
  const response = await authClient.get<{ user: IUser }>('/api/auth/user');
  return response.data.user;
};

export const logout = async (): Promise<void> => {
  localStorage.removeItem('token');
};