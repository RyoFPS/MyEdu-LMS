import axios from 'axios';
import toast from 'react-hot-toast';

// Dynamically determine API URL based on current hostname
// This allows the app to work on both localhost and network IP
const getApiUrl = (): string => {
  // If VITE_API_URL is explicitly set and not localhost, use it
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Replace localhost with current hostname so it works on network too
    const currentHost = window.location.hostname;
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      return envUrl.replace('localhost', currentHost).replace('127.0.0.1', currentHost);
    }
    return envUrl;
  }
  // Default: use same hostname as the frontend, port 8000
  return `http://${window.location.hostname}:8000/api`;
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
          toast.error('Session expired. Please login again.');
        }
      } else if (status === 403) {
        toast.error('You do not have permission to perform this action.');
      } else if (status === 419) {
        toast.error('Session expired. Please refresh the page.');
      } else if (status === 422) {
        const messages = data.errors
          ? Object.values(data.errors).flat().join('\n')
          : data.message || 'Validation error';
        toast.error(messages as string);
      } else if (status === 500) {
        toast.error('Server error. Please try again later.');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

export default api;
