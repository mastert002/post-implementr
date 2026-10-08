import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');

const client = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication
export const auth = {
  register: (email: string, password: string) =>
    client.post('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
  logout: () => client.post('/auth/logout'),
};

// Records
export const records = {
  list: (params?: any) =>
    client.get('/api/records', { params }),
  create: (data: any) =>
    client.post('/api/records', data),
  getDetail: (id: number) =>
    client.get(`/api/records/${id}`),
  confirm: (id: number, data: any) =>
    client.post(`/api/records/${id}/confirm`, data),
  revertToPending: (id: number, comment: string) =>
    client.post(`/api/records/${id}/revert`, { comment }),
  getConfirmations: (id: number) =>
    client.get(`/api/records/${id}/confirmations`),
  delete: (id: number) =>
    client.delete(`/api/records/${id}`),
};

export default client;
