import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Get keycloak instance from context
let keycloakInstance = null;

// Function to set keycloak instance
export const setKeycloakInstance = (instance) => {
  keycloakInstance = instance;
};

// Add token interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from keycloak instance
    if (keycloakInstance && keycloakInstance.token) {
      config.headers.Authorization = `Bearer ${keycloakInstance.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Error response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors (redirect to login)
    if (error.response && error.response.status === 401) {
      // The logout will be handled by the component using the context
      console.error('Unauthorized request - authentication required');
    }
    return Promise.reject(error);
  }
);

export default api;
