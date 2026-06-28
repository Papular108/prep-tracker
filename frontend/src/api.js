import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem(REFRESH_TOKEN);
      if (refresh) {
        try {
          const res = await axios.post('http://localhost:8000/api/token/refresh/', { refresh });
          const newAccess = res.data.access;
          localStorage.setItem(ACCESS_TOKEN, newAccess);
          original.headers.Authorization = `Bearer ${newAccess}`;
          return api(original);
        } catch {
          // refresh failed — clear tokens and redirect
        }
      }
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;