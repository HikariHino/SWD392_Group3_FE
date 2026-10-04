import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/authApi';
import { clearSession, getStoredSession, saveSession, UNAUTHORIZED_EVENT } from '../services/authStorage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // restoring = đang khôi phục phiên từ localStorage lúc mới mở app
    const [restoring, setRestoring] = useState(true);

    const logout = useCallback(() => {
        clearSession();
        setUser(null);
    }, []);

    // Khôi phục phiên đăng nhập sau khi F5
    useEffect(() => {
        const session = getStoredSession();
        if (!session) {
            clearSession();
            setRestoring(false);
            return;
        }

        // Hiển thị ngay từ localStorage, rồi xác thực lại token với Backend
        setUser(session.user);
        let ignore = false;
        authApi
            .getMe()
            .then(({ data }) => {
                if (ignore) return;
                // /auth/me chỉ trả id, username, role -> giữ lại fullName đã lưu
                setUser((current) => ({ ...current, ...data }));
            })
            .catch(() => {
                // Token hỏng hoặc hết hạn -> interceptor 401 đã phát sự kiện đăng xuất
                if (!ignore) logout();
            })
            .finally(() => !ignore && setRestoring(false));

        return () => {
            ignore = true;
        };
    }, [logout]);

    // Bất kỳ request nào trả 401 -> hết phiên, đăng xuất
    useEffect(() => {
        window.addEventListener(UNAUTHORIZED_EVENT, logout);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
    }, [logout]);

    const login = useCallback(async (credentials) => {
        const { data } = await authApi.login(credentials);
        saveSession(data);
        setUser(data.user);
        return data.user;
    }, []);

    const value = useMemo(
        () => ({ user, setUser, login, logout, restoring, isAuthenticated: !!user }),
        [user, login, logout, restoring],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
    return context;
};
