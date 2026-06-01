import axios from 'axios';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

const authClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export const getCurrentUser = async (): Promise<IUser> => {
  const response = await authClient.get<{ user: IUser }>('/api/auth/user');
  return response.data.user;
};

export const logout = async (): Promise<void> => {
  await authClient.post('/api/auth/logout');
};
