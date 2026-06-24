import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://reviewhub-backend-ki8w.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// Tự đính kèm JWT token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reviewhub-token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export { API_BASE_URL };
export default api;