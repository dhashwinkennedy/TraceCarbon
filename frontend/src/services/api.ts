import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
export const API_PREFIX = '/api/v1';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}${API_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to attach bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('scope3track_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If the data is FormData, remove Content-Type so the browser sets multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ detail?: any; message?: string }>) => {
    if (error.response?.status === 401) {
      // Clear token
      sessionStorage.removeItem('scope3track_token');
      sessionStorage.removeItem('scope3track_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }

    let detailMessage = 'An unexpected error occurred';
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data.detail === 'string') {
        detailMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        // FastAPI validation error array
        detailMessage = data.detail
          .map((d: any) => `${d.loc?.join('.') || 'field'}: ${d.msg}`)
          .join('; ');
      } else if (data.message) {
        detailMessage = data.message;
      }
    } else if (error.message) {
      detailMessage = error.message;
    }

    const err = new Error(detailMessage);
    (err as any).response = error.response;
    (err as any).status = error.response?.status;
    return Promise.reject(err);
  }
);

export default apiClient;
