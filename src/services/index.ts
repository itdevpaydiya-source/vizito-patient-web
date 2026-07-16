import axios, { AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

// Get API base URL from Vite environment variables or default to localhost API
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach bearer token if it exists in localStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      // Check for user object in localStorage
      const userString = localStorage.getItem('vizito_user');
      let token: string | null = null;

      if (userString) {
        const user = JSON.parse(userString);
        token = user?.token || null;
      }

      // Fallback to standalone vizito_token if vizito_user doesn't have it or isn't set
      if (!token) {
        token = localStorage.getItem('vizito_token');
      }

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error reading auth token from localStorage:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors like 401 Unauthorized
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Clear auth details on unauthorized response
        localStorage.removeItem('vizito_user');
        localStorage.removeItem('vizito_token');

        // Redirect to login screen if window object exists
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
