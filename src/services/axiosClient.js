import axios from 'axios';
import { getToken, UNAUTHORIZED_EVENT } from './authStorage';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5110/api',
});

axiosClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // 401 ở màn đăng nhập là "sai tài khoản/mật khẩu", không phải hết phiên -> để trang Login tự xử lý
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        if (error.response?.status === 401 && !isLoginRequest) {
            window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
        }
        return Promise.reject(error);
    },
);

export default axiosClient;
