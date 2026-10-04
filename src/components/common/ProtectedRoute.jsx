import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';

/**
 * Chặn route theo trạng thái đăng nhập và vai trò.
 * - Chưa đăng nhập      -> chuyển về /login (nhớ trang đang muốn vào để quay lại sau)
 * - Sai vai trò yêu cầu -> chuyển về /unauthorized
 */
const ProtectedRoute = ({ requiredRole }) => {
    const { isAuthenticated, user, restoring } = useAuth();
    const location = useLocation();

    // Chờ khôi phục phiên, tránh đá người dùng ra /login khi vừa F5
    if (restoring) {
        return (
            <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
                <Spin size="large" description="Đang tải..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
