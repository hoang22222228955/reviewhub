import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080',
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

export default api;
