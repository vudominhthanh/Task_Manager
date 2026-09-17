import axios from 'axios';
import { toast } from 'react-hot-toast';

const BASE_URL = 'http://localhost:8086/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    const response = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });

    const { token, refreshToken: newRefreshToken } = response.data;
    
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', newRefreshToken);
    
    return token;
  } catch (error) {
    return null;
  }
};

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    return response; 
  },
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; 

      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
  
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
        return apiClient(originalRequest);
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        
        setTimeout(() => {
          window.location.href = '/auth'; 
        }, 1500);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;