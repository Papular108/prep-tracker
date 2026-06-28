import axios from 'axios';
import { ACCESS_TOKEN } from './constants'; // Import the constant

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use(
  (config) => {
    // Use the imported constant instead of the hardcoded string
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;