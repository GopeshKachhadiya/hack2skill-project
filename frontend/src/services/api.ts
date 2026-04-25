import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – add auth header if needed
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor – normalize errors
api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error('[API Error]', error.message);
    return Promise.reject(error);
  }
);

export default api;
