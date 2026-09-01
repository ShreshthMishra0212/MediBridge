import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auto-attach authorization token if present
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("medibridge_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor for token expiry/401 handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear storage and trigger redirect/reload to login
      localStorage.removeItem("medibridge_token");
      localStorage.removeItem("medibridge_user");
      window.dispatchEvent(new Event("medibridge_unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default client;
