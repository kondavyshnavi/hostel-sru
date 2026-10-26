import axios from 'axios';

// Use environment variable VITE_API_URL if configured (for separated cloud hosting like Render/Vercel)
// Otherwise fallback to relative '/api' (for local Vite proxy and Docker Nginx reverse proxy)
const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const API = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sru_hostel_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauth
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and token existed, clean up
      if (localStorage.getItem('sru_hostel_token')) {
        localStorage.removeItem('sru_hostel_token');
        localStorage.removeItem('sru_hostel_user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
