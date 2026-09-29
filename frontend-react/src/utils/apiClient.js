// import axios from 'axios';
// import { toast } from 'react-hot-toast';

// const BASE_URL = 'http://localhost:8086/api';

// const apiClient = axios.create({
//   baseURL: BASE_URL,
//   headers: {
//     'Content-Type': 'application/json'
//   }
// });

// const refreshAccessToken = async () => {
//   try {
//     const refreshToken = localStorage.getItem('refreshToken');
//     if (!refreshToken) return null;

//     const response = await axios.post(`${BASE_URL}/auth/refresh`, {
//       refreshToken: refreshToken
//     });

//     const { token, refreshToken: newRefreshToken } = response.data;
    
//     localStorage.setItem('accessToken', token);
//     localStorage.setItem('refreshToken', newRefreshToken);
    
//     return token;
//   } catch (error) {
//     return null;
//   }
// };

// apiClient.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('accessToken');
//     if (token) {
//       config.headers['Authorization'] = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// apiClient.interceptors.response.use(
//   (response) => {
//     return response; 
//   },
//   async (error) => {
//     const originalRequest = error.config;

//     if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh')) {
//       return Promise.reject(error);
//     }

//     if (error.response && error.response.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true; 

//       const newAccessToken = await refreshAccessToken();

//       if (newAccessToken) {
  
//         originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
//         return apiClient(originalRequest);
//       } else {
//         localStorage.removeItem('accessToken');
//         localStorage.removeItem('refreshToken');
//         localStorage.removeItem('user');
        
//         toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        
//         setTimeout(() => {
//           window.location.href = '/login'; 
//         }, 1500);
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default apiClient;

import axios from 'axios';
import { toast } from 'react-hot-toast';

const BASE_URL = 'http://localhost:8086/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================
//  SINGLE-FLIGHT REFRESH
//  Chỉ gọi 1 lần dù có 5-10 request cùng fail
// ============================================================
let refreshPromise = null;

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken || refreshToken === 'undefined') {
        console.warn('[Auth] Không có refreshToken hợp lệ');
        return null;
      }

      const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const data = res.data || {};
      const newAccessToken = data.token || data.accessToken;
      const newRefreshToken = data.refreshToken;

      if (!newAccessToken) {
        console.warn('[Auth] BE không trả accessToken mới');
        return null;
      }

      localStorage.setItem('accessToken', newAccessToken);
      // ✅ CHỈ ghi đè refreshToken nếu BE trả cái mới
      if (newRefreshToken && newRefreshToken !== 'undefined') {
        localStorage.setItem('refreshToken', newRefreshToken);
      }

      return newAccessToken;
    } catch (err) {
      console.error('[Auth] Refresh failed:', err?.response?.status, err?.message);
      return null;
    } finally {
      refreshPromise = null;   // reset để lần sau refresh lại được
    }
  })();

  return refreshPromise;
};

// ============================================================
//  REQUEST INTERCEPTOR
// ============================================================
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && token !== 'undefined') {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
//  RESPONSE INTERCEPTOR
// ============================================================
let sessionExpiredShown = false;   // tránh spam toast

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ✅ GUARD 1: config có thể undefined (network timeout)
    if (!originalRequest) return Promise.reject(error);

    const url = originalRequest.url || '';
    const status = error.response?.status;

    // ✅ GUARD 2: Bỏ qua auth endpoints
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/register')
    ) {
      return Promise.reject(error);
    }

    // ✅ GUARD 3: Chỉ retry khi 401 và chưa retry lần nào
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        // Retry với token mới
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }

      // ============ REFRESH THẤT BẠI ============
      // Chỉ clear token, GIỮ user để UI không crash
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // ⚠️ KHÔNG xóa 'user' → giữ context
      // localStorage.removeItem('user');

      // Tránh spam toast nếu nhiều request cùng fail
      if (!sessionExpiredShown) {
        sessionExpiredShown = true;
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');

        setTimeout(() => {
          sessionExpiredShown = false;
          window.location.href = '/login';
        }, 1500);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;