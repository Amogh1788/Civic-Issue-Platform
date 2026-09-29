import axios from 'axios';

// Empty in development (Vite proxy). Set VITE_API_URL when deployed.
export const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: `${API_URL}/api` });

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token has expired, log out and go to the login page
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Converts legacy relative upload paths to the backend URL,
// while leaving absolute URLs (such as Supabase Storage URLs) unchanged.
export const fileUrl = (path) => {
  if (!path) return '';

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_URL}${path}`;
};

export const errorMessage = (err) =>
  err.response?.data?.message || 'Cannot reach the server. Check that the backend is running.';

export default api;
